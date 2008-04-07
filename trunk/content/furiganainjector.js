//ユニコード文字列

var FuriganaInjector = {

	initialized: false, 
	prefs: null,
	yomiDict: null,
	kanjiAdjustMenuItems: [], 
	strBundle: null,
	
	/******************************************************************************
	 *	Event handlers
	 *	Devnote: FuriganaInjector.onLoad() is effectively it's init() function.
	 *	Devnote: there are two listeners to catch page movement events:
	 *		appcontent's DOMContentLoaded event:- Calls onPageLoad()
	 *		gBrowser's web progress listener's onStateChange():- Calls onWindowProgressStateStop()
	 *	Todo: see if the appcontent event functions can be handled by the web progress listener's 
	 *	  functions instead.
	 ******************************************************************************/
	onLoad: function() {
	
		this.strBundle = document.getElementById("fi_strings");
		if (!this.strBundle) {
			alert ("Major error- the 'fi_strings' file could not be loaded. The Furigana Injector extension will not work without it.");
			return;
		}
	
		var dictLoadResult = this.loadYomikataDictionary();
		
		//Devnote: element "appcontent" is defined by Firefox. Use "messagepane" for Thunderbird
		document.getElementById("appcontent").addEventListener("DOMContentLoaded", this.onPageLoad, true);
		
		getBrowser().addProgressListener(FuriganaInjectorWebProgressListener, Components.interfaces.nsIWebProgress.NOTIFY_STATE_DOCUMENT);

		this.prefs = Components.classes["@mozilla.org/preferences-service;1"].
			getService(Components.interfaces.nsIPrefService).getBranch("extensions.furiganainjector.");
		FuriganaInjectorPrefsObserver.register(this.prefs);
	
		//Devnote: just setting the onpopupshowing attribute in overlay.xul didn't seem to work. Besides, the event object will probably be needed later for context actions
		document.getElementById("contentAreaContextMenu").addEventListener("popupshowing", this.onShowContextMenu, false);
		document.getElementById("contentAreaContextMenu").addEventListener("popuphidden", this.onHideContextMenu, false);
		
		this.initialized = true;
		
		try {
			document.getElementById("open-tests-window-menuitem").hidden = !this.getPref("enable_tests");
		} catch (err) {
			dump("There was an error setting the visibility of the 'open-tests-window-menuitem' object. Debug and fix.\n");
		}
	},
	
	onUnload: function() {
		FuriganaInjectorPrefsObserver.unregister();
		getBrowser().removeProgressListener(FuriganaInjectorWebProgressListener);
		document.getElementById("appcontent").removeEventListener("DOMContentLoaded", this.onPageLoad, true);
		document.getElementById("contentAreaContextMenu").removeEventListener("popupshowing", this.onShowContextMenu, false);
		document.getElementById("contentAreaContextMenu").removeEventListener("popuphidden", this.onHideContextMenu, false);
	},
	
	onPageLoad: function() {
		var bodyElem = content.document.body;
		if (FuriganaInjector.getPref("auto_process_all_pages") && FuriganaInjector.currentContentProcessed() !== true) 
			FuriganaInjector.processWholeDocument();
	},
	
	onWindowProgressStateStop: function(aProgress, aRequest, aStatus) {
		var alreadyProcessed = FuriganaInjector.currentContentProcessed() === true;
		FuriganaInjector.setStatusIcon(alreadyProcessed ? "processed" : "default");
		document.getElementById("process-whole-page-command").setAttribute("disabled", alreadyProcessed);
	},
	
	/******************************************************************************
	 *	GUI
	 ******************************************************************************/
	setStatusIcon: function(processing_state) {
		document.getElementById("furiganainjector-statusbarpanel").setAttribute("processing_state", processing_state);
	},

	onShowContextMenu: function(e) {
		//N.B. the "disabled" attribute doesn't seem to be effective. I use hidden instead.
		var pageProcessed = FuriganaInjector.currentContentProcessed() === true;
		document.getElementById("process-whole-page-context-menuitem").hidden = pageProcessed;
		//N.B. No check if a context area is a ruby or has ruby elements has been developed so far.
		//This could be developed by reverting the multistate respose of currentContentProcessed() to bool returns, and making a node version, e.g.
		//var selectionProcessed = FuriganaInjector.nodeProcessed(node); //checks if node or node's ancest has "furigana-injected" attribute = true.
		document.getElementById("process-context-section-context-menuitem").hidden = pageProcessed;
		document.getElementById("remove-page-furigana-context-menuitem").hidden = !pageProcessed;
		var selText = content.getSelection().toString();
		if (selText.length > 0) {
			var kanjiCount = 0;
			var currKanji;
			var exclusionKanji = VocabAdjuster.getSimpleKanjiList();
			var kanjiAdjustMenuItem;
			var kanjiAdjustMenuItemLabel;
			var kanjiAdjustMenuItemOnCmd;
			for (var x = 0; x < selText.length && kanjiCount <= 4; x++) {
				currKanji = selText.charAt(x);
				if (VocabAdjuster.isUnihanChar(currKanji)) {
					kanjiCount++;
					if (exclusionKanji.indexOf(currKanji) >= 0) {
						kanjiAdjustMenuItemLabel = FuriganaInjector.strBundle.getFormattedString("menuLabelShowFuriganaForX", [ currKanji ]);
						kanjiAdjustMenuItemOnCmd = "VocabAdjuster.removeKanjiFromExclusionList('" + currKanji + "'); FuriganaInjector.processContextSection(false);";
							
					} else {
						kanjiAdjustMenuItemLabel = FuriganaInjector.strBundle.getFormattedString("menuLabelIgnoreFuriganaForX", [ currKanji ]);
						kanjiAdjustMenuItemOnCmd = "VocabAdjuster.addKanjiToExclusionList('" + currKanji + "'); FuriganaInjector.processContextSection(false)";
					}
					document.getElementById("contentAreaContextMenu").addMenuItem
					var kanjiAdjustMenuItem = document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "menuitem");
					kanjiAdjustMenuItem.setAttribute("label", kanjiAdjustMenuItemLabel);
					kanjiAdjustMenuItem.setAttribute("oncommand", kanjiAdjustMenuItemOnCmd);
					document.getElementById("contentAreaContextMenu").insertBefore(kanjiAdjustMenuItem, 
						document.getElementById("process-context-section-context-menuitem"));
					FuriganaInjector.kanjiAdjustMenuItems.push(kanjiAdjustMenuItem);
				}
			}
		}
	},

	onHideContextMenu: function(e) {
		var menuItemToDelete;
		while (FuriganaInjector.kanjiAdjustMenuItems.length > 0) {
			menuItemToDelete = FuriganaInjector.kanjiAdjustMenuItems.pop();
			document.getElementById("contentAreaContextMenu").removeChild(menuItemToDelete);
		}
	}, 
	
	initStatusbarPopup: function() {
		document.getElementById("fi-process-all-pages-menuitem").setAttribute("checked", FuriganaInjector.getPref("auto_process_all_pages"));
		document.getElementById("fi-process-link-text-menuitem").setAttribute("checked", FuriganaInjector.getPref("process_link_text"));
		return true;
	},

	openOptionsWindow: function() {
		window.openDialog("chrome://furiganainjector/content/options.xul", "", "centerscreen,chrome,resizable=yes,dependent=yes");
	},
  	
  	/******************************************************************************
  	 *	Meat
	 ******************************************************************************/
	processWholeDocument: function() {
		FuriganaInjector.lookupAndInjectFurigana(content.document.body, FuriganaInjector.processWholeDocumentCallback);
		//Devnote: the asynchronously returned processing result of frames will be ignored. This is a deliberate 
		//  choice not to provide detailed handling for frames. Also note that frames within frames will be ignored.
		var framesList = content.frames;
		for (var x = 0; x < framesList.length; x++) {
			FuriganaInjector.lookupAndInjectFurigana(framesList[x].document.body, function() {} );
		}
	}, 
	
	processWholeDocumentCallback: function(processingResult) {
		FuriganaInjector.setCurrentContentProcessed(processingResult);
		FuriganaInjector.setStatusIcon(FuriganaInjector.currentContentProcessed() === true ? "processed" : "failed"); 
	}, 
	
	processContextSection: function(useAllDictMatches) {
		var selectionObject = content.getSelection();
		var selText = selectionObject.toString();
		
		if (selText.length == 0) {
			var parentBlockElem = document.popupNode;
			if (document.popupNode.nodeType == Node.TEXT_NODE) 
				parentBlockElem.parentNode;
			while (!["P", "TABLE", "DIV", "BODY", "FRAME", "IFRAME", "Q", "PRE", "SAMP"].indexOf(parentBlockElem.tagName) < 0) 
				parentBlockElem = parentBlockElem.parentNode;
			if (parentBlockElem.tagName == "BODY") {
				FuriganaInjector.processWholeDocument();
			} else {
				//Blink the context block that has been selected
				setTimeout(function() { parentBlockElem.style.visibility = "hidden"}, 400 );
				setTimeout(function() { parentBlockElem.style.visibility = "visible"}, 600 );
				setTimeout(function() { parentBlockElem.style.visibility = "hidden"}, 700 );
				setTimeout(function() { parentBlockElem.style.visibility = "visible"}, 800 );
				setTimeout(function() { 
					FuriganaInjector.lookupAndInjectFurigana(parentBlockElem, FuriganaInjector.processContextSectionCallback);
					}, 810);
			}
			
		} else {
			//N.B. this will execute synchronously, i.e. it doesn't use setTimeout() like the whole-page or context-block processing.
			//Check if the selection is selected back-to-front and reverse it if so.
			if (selectionObject.anchorNode.compareDocumentPosition(selectionObject.focusNode) == 2 /*Node.DOCUMENT_POSITION_PRECEDING*/ || 
				(selectionObject.anchorNode == selectionObject.focusNode && selectionObject.anchorOffset > selectionObject.focusOffset)) {
				var oldAnchorNode = selectionObject.anchorNode;
				var oldAnchorOffset = selectionObject.anchorOffset;
				selectionObject.collapseToStart();
				selectionObject.extend(oldAnchorNode, oldAnchorOffset);
			}			
			var followingHiraganaRegex = new RegExp("^(" + VocabAdjuster.hiraganaPattern + "{1,5})");
			var followingHiraganaResult = followingHiraganaRegex.exec(selectionObject.focusNode.data.substr(selectionObject.focusOffset));
			if (followingHiraganaResult) {
				selectionObject.extend(selectionObject.focusNode, selectionObject.focusOffset + followingHiraganaResult[1].length);
				selText = selectionObject.toString();
			}
			var dictMatches = FuriganaInjector.findAllDictionaryMatches(selText);
			if (useAllDictMatches != true) 
				VocabAdjuster.removeSimpleWordsFromDictMatches(dictMatches);
			
			var lowestCommonParent = content.document.body;
			if (selectionObject.anchorNode.parentNode == selectionObject.focusNode.parentNode) {
				lowestCommonParent = selectionObject.anchorNode.parentNode;
			} else {	//Todo: isn't there are more convenient DOM function for finding the lowest common ancestor node?
				var anchorAncestors = [];
				var focusAncestors = [];
				var tempNode = selectionObject.anchorNode;
				while (tempNode.parentNode && (tempNode.parentNode.nodeType != Node.ELEMENT_NODE || tempNode.parentNode.tagName != "BODY")) {
					tempNode = tempNode.parentNode;
					anchorAncestors.push(tempNode);
				}
				anchorAncestors.reverse();
				tempNode = selectionObject.focusNode;
				while (tempNode.parentNode && (tempNode.parentNode.nodeType != Node.ELEMENT_NODE || tempNode.parentNode.tagName != "BODY")) {
					tempNode = tempNode.parentNode;
					focusAncestors.push(tempNode);
				}
				focusAncestors.reverse();
				for (var d = 0; d < anchorAncestors.length && d < focusAncestors.length; d++) {
					if (anchorAncestors[d] != focusAncestors[d])
						break;
					lowestCommonParent = anchorAncestors[d];
				}
			}
			var docTextNodes = this.findNonRubyTextNodes(lowestCommonParent, false);
			var range = selectionObject.getRangeAt(0);
			for (var x = 0; x < docTextNodes.length; x++) {
				if (range.comparePoint(docTextNodes[x], 0) == 0 || docTextNodes[x] == selectionObject.anchorNode)
					RubyInserter.replaceTextNode(content.document, docTextNodes[x], dictMatches);
			}
			selectionObject.collapseToStart();
			this.processContextSectionCallback(true);
		}
	}, 
	
	processContextSectionCallback: function(processingResult) {
		FuriganaInjector.setCurrentContentProcessed(processingResult ? "partially_processed" : false);
		FuriganaInjector.setStatusIcon(processingResult ? "partially_processed" : "failed"); 		 
	}, 

	lookupAndInjectFurigana: function(textNodesParentElement, callbackFunc) {
		var maxDictionaryRuntime = 5000;	//5 secs
		this.setStatusIcon("processing");
		setTimeout(function() {
				var processingResult = true;
				try {
//var startTime = new Date();
					var matchingTextNodeInstances = FuriganaInjector.parseTextNodesForDictionaryMatches(textNodesParentElement, maxDictionaryRuntime);
/*var dictFinishTime = new Date();
var totalWordsCount = 0;
for (var zz = 0; zz < matchingTextNodeInstances.length; ++zz) {
	totalWordsCount += matchingTextNodeInstances[zz].matchInstances.length;
}
dump("Dictionary search of " + totalWordsCount + " words in " + matchingTextNodeInstances.length + 
	" text nodes took " + (dictFinishTime - startTime) + " milliseconds\n");*/
					VocabAdjuster.removeSimpleWords(matchingTextNodeInstances);
//var removeSimpleWordsTime = new Date();
//dump("removeSimpleWordsTime() took " + (removeSimpleWordsTime - dictFinishTime) + " milliseconds\n");
					if (typeof matchingTextNodeInstances != "object")
						throw("Invalid result came from FuriganaInjector.parseTextNodesForDictionaryMatches() or VocabAdjuster.removeSimpleWords()");
					if (matchingTextNodeInstances.length > 0) {
						var tn;
						for (var x = 0; x < matchingTextNodeInstances.length; x++) {
							tn = matchingTextNodeInstances[x];
							RubyInserter.replaceTextNode(textNodesParentElement.ownerDocument, tn.textNode, tn.matchInstances);
						}
					}
//var rubyInsertFinishTime = new Date();
//dump("Ruby insert took " + (rubyInsertFinishTime - removeSimpleWordsTime) + " milliseconds\n");
				} catch(err) {
					alert(err.toString());
					processingResult = false;
				}
				callbackFunc(processingResult);
			}, 0);
	},

	findNonRubyTextNodes: function(elem, includeLinkText) {
		var textNodes = new Array();
		elem.normalize();	//Drop whitespace-only text nodes and merges adjacent text nodes.
		for(var nodeI = 0; nodeI < elem.childNodes.length; nodeI++) {
			if(elem.childNodes[nodeI].nodeType == Node.TEXT_NODE) {
				textNodes.push(elem.childNodes[nodeI]);
			} else if (elem.childNodes[nodeI].nodeType == Node.ELEMENT_NODE && elem.childNodes[nodeI].tagName != "RUBY" && 
				(includeLinkText == true || elem.childNodes[nodeI].tagName != "A")) {
				textNodes = textNodes.concat(this.findNonRubyTextNodes(elem.childNodes[nodeI], includeLinkText));
			}
		}
		return textNodes;
	}, 

	parseTextNodesForDictionaryMatches: function(textNodesParentElement, maxRuntime) {
		var timeLimited = maxRuntime && maxRuntime > 100;	//must be at least 0.1 secs
		var startTime = new Date();
		var currTime;
		var curpos = 0;
		var text_nodes = this.findNonRubyTextNodes(textNodesParentElement, FuriganaInjector.getPref("process_link_text"));	
		//Devnote: a side effect of findNonRubyTextNodes() is that all text nodes will be normalize()'d.
		var currTextNode;
		var matchTextNodes = [];
		var textNodeMatchInstances;
		var wordMatchResult;
		var matchlen;
		var kPat = VocabAdjuster.kanjiPattern;
		var hPat = VocabAdjuster.hiraganaPattern;
		var kRevPat = VocabAdjuster.kanjiRevPattern;
		var hkPat = VocabAdjuster.kanjiHiraganaPattern;
		var maxSearchPhraseLen = 5;
		var kanjiWordRegex = new RegExp("(?:^|" + kRevPat + ")(" + kPat + hkPat +"{0," + (maxSearchPhraseLen - 1) + "})", "g");	
		var regexMatchVals;
		for (var i = 0; i < text_nodes.length; i++) {
			currTextNode = text_nodes[i];
			textNodeMatchInstances = [];
			curpos = 0;
			var lastRegexMatchResult = regexMatchVals = kanjiWordRegex.exec(currTextNode.data);	//using "lastRegexMatchResult" to avoid warning about using assignment operators in while() loop
			while (lastRegexMatchResult) {
				matchlen = {};
				wordMatchResult = { word: regexMatchVals[1] };
				wordMatchResult.yomi = this.yomiDict.findLongestMatch(wordMatchResult.word, matchlen);
				if (wordMatchResult.yomi) {
					wordMatchResult.word= wordMatchResult.word.substr(0, matchlen.value);
					textNodeMatchInstances.push( { word: wordMatchResult.word, yomi: wordMatchResult.yomi } );
				} 
				kanjiWordRegex.lastIndex = regexMatchVals.index + wordMatchResult.word.length;
				lastRegexMatchResult = regexMatchVals = kanjiWordRegex.exec();	//using "lastRegexMatchResult" to avoid warning about using assignment operators in while() loop
			}
			if (textNodeMatchInstances.length > 0)
				matchTextNodes.push( { textNode: currTextNode, matchInstances: textNodeMatchInstances } );
			if (timeLimited) {
				currTime = new Date();
				if (currTime - startTime > maxRuntime) //time-limiting functionality
					break;
			}
		}
		return matchTextNodes;
	}, 

	findAllDictionaryMatches: function(selectionText) {
		var matchInstances = [];
		var wordMatchResult;
		var matchlen;
		var kPat = VocabAdjuster.kanjiPattern;
		var hPat = VocabAdjuster.hiraganaPattern;
		var kRevPat = VocabAdjuster.kanjiRevPattern;
		var hkPat = VocabAdjuster.kanjiHiraganaPattern;
		var maxSearchPhraseLen = 5;
		var kanjiWordRegex = new RegExp("(?:^|" + kRevPat + ")(" + kPat + hkPat +"{0," + (maxSearchPhraseLen - 1) + "})", "g");	
		var regexMatchVals;
		var curpos = 0;
		var lastRegexMatchResult = regexMatchVals = kanjiWordRegex.exec(selectionText);	//using "lastRegexMatchResult" to avoid warning about using assignment operators in while() loop
		while (lastRegexMatchResult) {
			matchlen = {};
			wordMatchResult = { word: regexMatchVals[1] };
			wordMatchResult.yomi = this.yomiDict.findLongestMatch(wordMatchResult.word, matchlen);
			if (wordMatchResult.yomi) {
				wordMatchResult.word= wordMatchResult.word.substr(0, matchlen.value);
				matchInstances.push( { word: wordMatchResult.word, yomi: wordMatchResult.yomi } );
			} 
			kanjiWordRegex.lastIndex = regexMatchVals.index + wordMatchResult.word.length;
			lastRegexMatchResult = regexMatchVals = kanjiWordRegex.exec();	//using "lastRegexMatchResult" to avoid warning about using assignment operators in while() loop
		}
		return matchInstances;
	},
	
	revertRubys: function(parentElement) {
		var rubyNodeList = parentElement.getElementsByTagName("RUBY");
		var rubyElemArray = [];
		var tempRubyElem;
		for (var x = 0; x < rubyNodeList.length; x++) {	//converting the NodeList to a standard array so that Array.pop() can be used.
			rubyElemArray[x] = rubyNodeList[x];
		}
		while (rubyElemArray.length > 0) {
			tempRubyElem = rubyElemArray.pop();
			RubyInserter.revertRuby(tempRubyElem);
		}
		FuriganaInjector.setCurrentContentProcessed(false);
		var allRubysReverted = content.document.getElementsByTagName("RUBY").length == 0;
		FuriganaInjector.setStatusIcon(allRubysReverted ? "default" : "partially_processed"); 
	}, 
	
	revertAllRubys: function() {
		FuriganaInjector.revertRubys(content.document.body);
		for (var x = 0; x < content.frames.length; x++) {
			FuriganaInjector.revertRubys(content.frames[x].document.body);
		}
	},
	
	setCurrentContentProcessed: function(processingResult) {
		//*** Block below is temporary requirement for Firefox 3 betas in combination with version 2.0 or 2.1 of XHTML Ruby Support ***
		if (RubyService && RubyService.isGecko19OrLater) {
			try {
				var rubyNodeList = content.document.getElementsByTagName("RUBY");
				var rubyElemArray = [];
				var tempRubyElem;
				for (var x = 0; x < rubyNodeList.length; x++) {
					RubyService.delayedReformRubyElement(rubyNodeList[x]);
				}
			} catch (err) {
				//
			}
		}
		//*** End of temporary block for Firefox 3 betas in combination with version 2.0 of XHTML Ruby Support ***
		var bodyElem = content.document.body;
		if (processingResult) {
			bodyElem.setAttribute("furigana-injection", processingResult.toString());
		} else {
			if (bodyElem.hasAttribute("furigana-injection"))
				bodyElem.removeAttribute("furigana-injection");
		}
	},
	
	currentContentProcessed: function() {
		var bodyElem = content.document.body;
		if (!bodyElem || !bodyElem.hasAttribute("furigana-injection"))
			return false;
		var attrbStringVal = bodyElem.getAttribute("furigana-injection");
		return attrbStringVal == "true" ? true : (attrbStringVal == "false" ? false : attrbStringVal);
	},
		
	/******************************************************************************
	 *	XPCOM
	 ******************************************************************************/
	loadYomikataDictionary: function() {
	
		this.yomiDict = Components.classes["@yayakoshi.net/yomikatadictionary;1"].getService();
		this.yomiDict = this.yomiDict.QueryInterface(Components.interfaces.iYomikataDictionary);
		
		var tempFile = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties)
			.get("ProfD", Components.interfaces.nsIFile);
		tempFile.append("extensions");
		tempFile.append("furiganainjector@yayakoshi.net");
		if (!tempFile.exists()) {
			alert("No 'furiganainjector@yayakoshi.net' folder (or development folder config file) was found in the extensions folder");
			return false;
		}
		var yomidictDataFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
		if (!tempFile.isDirectory()) {/********* Development environment use only  *********/
			var dev_extension_path = "";
			var fstream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
			var sstream = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance(Components.interfaces.nsIScriptableInputStream);
			fstream.init(tempFile, -1, 0, 0);
			sstream.init(fstream); 
			var str = sstream.read(4096);
			while (str.length > 0) {
			  dev_extension_path += str;
			  str = sstream.read(4096);
			}
			sstream.close();
			fstream.close();
			
			yomidictDataFile.initWithPath(dev_extension_path);
		} else { /**** End of development environment **************/
		
       		yomidictDataFile.initWithPath(tempFile.path);
        }
		yomidictDataFile.append("content");
		yomidictDataFile.append("yomikata.dat");
		if (!yomidictDataFile.exists()) {
			alert("** Furigana Injector extension**\nThe file 'yomikata.dat' could not be found to load the dictionary.\n");
			return false;
		}
        return this.yomiDict.loadFromFile(yomidictDataFile);
	},
		
	/******************************************************************************
	 *	Extension preferences
	 ******************************************************************************/
	getPref: function(prefName) {
		var prefNames = this.prefs.getChildList("", {});
		if (prefNames.indexOf(prefName) < 0) {
			throw "FuriganaInjector does not have a preference called \"" + prefName + "\"";
		}
		var prefType = this.prefs.getPrefType(prefName);
		if (prefType == this.prefs.PREF_BOOL) {
			return this.prefs.getBoolPref(prefName);
		} else if (prefType == this.prefs.PREF_INT) {
			return this.prefs.getIntPref(prefName);
		} else {	//N.B. Mozilla evaluates 'complex' types as nsIPrefBranch.PREF_STRING
			if (prefName == "exclusion_kanji") {
				return this.prefs.getComplexValue(prefName, Components.interfaces.nsISupportsString).data;
			//} else if (prefName == "known_string_preference") {
			//	return this.prefs.getCharPref(prefName);
			} else {
				throw "FuriganaInjector does not know the type of the \"" + prefName + "\" preference";
			}
		}
		
	}, 
	
	setPref: function(prefName, newPrefVal) {
		var prefNames = this.prefs.getChildList("", {});
		if (prefNames.indexOf(prefName) < 0) {
			throw "FuriganaInjector does not have a preference called \"" + prefName + "\"";
		}
		var prefType = this.prefs.getPrefType(prefName);
		if (prefType == this.prefs.PREF_BOOL) {
			this.prefs.setBoolPref(prefName, newPrefVal);
		} else if (prefType == this.prefs.PREF_INT) {
			this.prefs.setIntPref(prefName, newPrefVal);
		} else {	//N.B. Mozilla evaluates 'complex' types as nsIPrefBranch.PREF_STRING
			if (prefName == "exclusion_kanji") {
				var newPrefValStr = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
				newPrefValStr.data = newPrefVal;
				this.prefs.setComplexValue(prefName, Components.interfaces.nsISupportsString, newPrefValStr);
			//} else if (prefName == "known_string_preference") {
			//	return this.prefs.setCharPref(prefName, newPrefVal);
			} else {
				throw "FuriganaInjector does not know the type of the \"" + prefName + "\" preference";
			}
		}
	}, 
	
	onSetKanjiByMaxFOUValRequest: function(evt) {
		if (!evt.target.hasAttribute("kanjiVal") || evt.target.getAttribute("kanjiVal") < 0) {
			alert("Programming error: The button that triggered the 'SetKanjiByMaxFOUVal' event didn't have a valid 'kanjiVal' attribute");
			return;
		}
		var newMinFOUVal = evt.target.getAttribute("kanjiVal");
		FuriganaInjector.setPref("exclusion_kanji", KanjiDictionary.freqOfUseList(1, newMinFOUVal).join(""));
		alert(FuriganaInjector.strBundle.getFormattedString("alertExclusionKanjiSetToX", [ newMinFOUVal ]));
	}

};


/******************************************************************************
 *	FuriganaInjector's browser progress listener
 ******************************************************************************/
var FuriganaInjectorWebProgressListener = {

	QueryInterface: function(aIID) {
		if (aIID.equals(Components.interfaces.nsIWebProgressListener) || 
			aIID.equals(Components.interfaces.nsISupportsWeakReference) || 
			aIID.equals(Components.interfaces.nsISupports))
			return this;
		throw Components.results.NS_NOINTERFACE;
	},

	onLocationChange: function() {},

	onStateChange: function(aProgress, aRequest, aFlag, aStatus) { 
		if (aFlag & Components.interfaces.nsIWebProgressListener.STATE_STOP &&
			aFlag & Components.interfaces.nsIWebProgressListener.STATE_IS_WINDOW) {
			FuriganaInjector.onWindowProgressStateStop(aProgress, aRequest, aStatus);
		}
	},
	
	onProgressChange: function() {},
	onStatusChange: function() {},
	onSecurityChange: function() {},
	onLinkIconAvailable: function() {}
};


/******************************************************************************
 *	FuriganaInjector's preferences observer.
 ******************************************************************************/
var FuriganaInjectorPrefsObserver =	{

	_branch: null,
	
	register: function(prefsBranch) {
		this._branch = prefsBranch;
		this._branch.QueryInterface(Components.interfaces.nsIPrefBranch2);
		this._branch.addObserver("", this, false);
	},

	unregister: function() {
		if(!this._branch) 
			return;
		this._branch.removeObserver("", this);
	},

	observe: function(aSubject, aTopic, aData) {
		if(aTopic != "nsPref:changed") 
			return;
		switch (aData) {
		case "exclusion_kanji":
			VocabAdjuster.flagSimpleKanjiListForReset();
			break;
		//case "auto_process_all_pages":
		//	break;
		}
	}
}
