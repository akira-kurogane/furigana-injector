//ユニコード文字列

var FuriganaInjector = {

	initialized: false, 
	prefs: null,
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
	
		FIMecabParser.init();
		if (!FIMecabParser.initialized) {
			this.initialized = false;
			//this.OnUnload()??
			return;
		}
		
		//Devnote: element "appcontent" is defined by Firefox. Use "messagepane" for Thunderbird
		document.getElementById("appcontent").addEventListener("DOMContentLoaded", this.onPageLoad, true);
		
		getBrowser().addProgressListener(FuriganaInjectorWebProgressListener, Components.interfaces.nsIWebProgress.NOTIFY_STATE_DOCUMENT);
		getBrowser().tabContainer.addEventListener("TabSelect", this.onTabSelectionChange, false);

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
		//dump("Event listener, prefs stuff finished\n");
		var ignore = VocabAdjuster.getSimpleKanjiList();	//just to make sure VocabAdjuster._simpleKanjiList is initialized for tooEasy()
		FuriganaInjector.setStatusIcon("default");
		/*********** SimpleMecab dev testing ************************ /
		var surface = new String();
		var feature = new String();
		var length = new Number();
		var readings = [];
		FIMecabParser.parse("東京から大阪まで");
		var retVal;
		do {
			retVal = FIMecabParser.next(surface, feature, length);
			if (retVal)
				dump("\t" + surface.value + ": " + feature.value + ", " + length +"\n");
			if(surface.value.length === 0) continue; //skip "BOS/EOS"
		} while(retVal);
		dump("Finished the parse()\n");
		/ ************* End of MecabLib dev test section ************/
	},
	
	onUnload: function() {
		FuriganaInjectorPrefsObserver.unregister();
		getBrowser().removeProgressListener(FuriganaInjectorWebProgressListener);
		getBrowser().tabContainer.removeProgressListener(this.onTabSelectionChange);
		document.getElementById("appcontent").removeEventListener("DOMContentLoaded", this.onPageLoad, true);
		document.getElementById("contentAreaContextMenu").removeEventListener("popupshowing", this.onShowContextMenu, false);
		document.getElementById("contentAreaContextMenu").removeEventListener("popuphidden", this.onHideContextMenu, false);
	},
	
	onPageLoad: function() {
		if(content.document.contentType == "text/html") {
			if (FuriganaInjector.getPref("auto_process_all_pages") && FuriganaInjector.currentContentProcessed() !== true) 
				FuriganaInjector.processWholeDocument();
		}
	},
	
	onWindowProgressStateStop: function(aProgress, aRequest, aStatus) {
		FuriganaInjector.setCurrentStatusIconAndCmdModes();
	},
	
	onTabSelectionChange: function(event) {
		FuriganaInjector.setCurrentStatusIconAndCmdModes();
	},
	
	setCurrentStatusIconAndCmdModes: function() {
		if(content.document.contentType == "text/html") {
			var alreadyProcessed = FuriganaInjector.currentContentProcessed() === true;
			FuriganaInjector.setStatusIcon(alreadyProcessed ? "processed" : "default");
			document.getElementById("process-context-section-command").setAttribute("disabled", alreadyProcessed);
			document.getElementById("process-whole-page-command").setAttribute("disabled", alreadyProcessed);
		} else {
			FuriganaInjector.setStatusIcon("disabled");
			document.getElementById("process-context-section-command").setAttribute("disabled", true);
			document.getElementById("process-whole-page-command").setAttribute("disabled", true);
		}
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
alert("processContextSection() is not redeveloped yet");
this.processContextSectionCallback(true);
return;
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
		var ignore = VocabAdjuster.getSimpleKanjiList();	//To re-initialize VocabAdjuster._simpleKanjiList
		var textNodesByBlock = this.getTextBlocks(textNodesParentElement);
		//alert(textNodesByBlock.length + " blocks of text");
		for (var x = 0; x < textNodesByBlock.length; x++) {
			var currentBlockText = "";
			for (var y = 0; y < textNodesByBlock[x].length; y++)
				currentBlockText += textNodesByBlock[x][y].data;
			if (!currentBlockText.match(VocabAdjuster.kanjiPattern))	//Skip text segments that don't contain at least one kanji
				continue;
			var currTextNode = textNodesByBlock[x].shift();
			var currTextNodeLen = currTextNode.data.length;
			var tempLen = 0;
			var readings = [];
			FIMecabParser.parse(currentBlockText);
			var wordsVsYomis = [];
			var surface = new String();
			var feature = new String();
			var length = new Number();
			var features = [];
			var recombinedTotalSurface = "";	//debug use
//var startTime = new Date();
			while (FIMecabParser.next(surface, feature, length)) {	//Devnote: this length maybe differ to surface.value.length if the return surfaces concatenate to a slightly differnt string (e.g. whitespace reduced, half-width/full-width etc. Need to analyze.
//FIMecabParser.consoleService.logStringMessage("Receieved " + surface.value + "\t" + features.value);
				recombinedTotalSurface += surface.value;
				tempLen += surface.value.length;
				if (tempLen >= currTextNodeLen) {
					if (wordsVsYomis.length > 0) {
						RubyInserter.replaceTextNode(textNodesParentElement.ownerDocument, currTextNode, wordsVsYomis);
						wordsVsYomis = [];
					}
					currTextNode = textNodesByBlock[x].shift();
					if (!currTextNode) {
						//Components.utils.reportError("Ran out of text nodes. Processing the word " + surface.value + "\n");
						break;
					}
					tempLen = tempLen > currTextNode.data.length ? tempLen - currTextNode.data.length:  0;	//TO FIX: This is rough!
					currTextNodeLen = currTextNode.data.length;
				}
				if (surface.value.match(VocabAdjuster.kanjiPattern) && !VocabAdjuster.tooEasy(surface.value)) {
					features = feature.value.split(",");
					if (features.length > 7) {
						wordsVsYomis.push( {word: surface.value, yomi: this.converKatakanaToHiragana(features[7]) } );//convert to hiragana
//dump("Adding " + surface.value + ": " + feature.value + "\n");
					} else {
dump("Debug: Not adding " + surface.value + ": " + feature.value + "\n");
					}
				}
			};
			//if (currentBlockText.replace(/[\u3000\s\t\r\n]/g, "") != recombinedTotalSurface.replace(/[\u3000\s\t\r\n]/g, ""))
			//	Components.utils.reportError("The parsed text:\n" + currentBlockText.replace(/([\u0080-\uFFFD])[\s\t\r\n]+/g, "\1") + 
			//		"\n did not match the concatenated returned 'surface' strings:\n" + recombinedTotalSurface + "\n\n");
			if (wordsVsYomis.length > 0)
				RubyInserter.replaceTextNode(textNodesParentElement.ownerDocument, currTextNode, wordsVsYomis);
		}
/*var dictFinishTime = new Date();
var totalWordsCount = 0;
for (var zz = 0; zz < textNodesByBlock.length; ++zz) {
	totalWordsCount += textNodesByBlock[zz].textNodesByBlock.length;
}
dump("Mecab parse of " + textNodesByBlock.length + " blocks containing " + xxx??? + " in " + ????.length + 
	" text nodes took " + (dictFinishTime - startTime) + " milliseconds\n");
.....
var rubyInsertFinishTime = new Date();
dump("Ruby insert took " + (rubyInsertFinishTime - dictFinishTime) + " milliseconds\n");*/
		
		callbackFunc(true);
	},
	
	getNextTextOrElemNode: function(nd, topElem) {
		var foundNode;
		if (nd.nodeType == Node.ELEMENT_NODE && nd.hasChildNodes()) {
			foundNode = nd.firstChild;
		} else if (nd.nextSibling) {
			foundNode = nd.nextSibling;
		} else {
			var tempParent = nd.parentNode;
			if (tempParent == topElem)
				return null;
			while (!tempParent.nextSibling) {
				if (tempParent == topElem || !tempParent.parentNode)
					return null;
				tempParent = tempParent.parentNode;
			}
			foundNode = tempParent.nextSibling;
		}
		if (foundNode.nodeType == Node.TEXT_NODE || foundNode.nodeType == Node.ELEMENT_NODE)
			return foundNode;
		return this.getNextTextOrElemNode(foundNode, topElem);
	},
	
	getTextBlocks: function(topElem) {
		var safetyCtr = 0;
		var textNodesByBlock = [];
		var tempTextNodes = [];
		
		//Find the first text or element child of topElem. Return an empty set if none exist.
		if (!topElem.hasChildNodes()) 
			return textNodesByBlock;
		var currNode = topElem.firstChild;
		if (currNode.nodeType != Node.TEXT_NODE && currNode.nodeType != Node.ELEMENT_NODE)
			currNode = this.getNextTextOrElemNode(currNode, topElem);
		if (!currNode)
			return textNodesByBlock;
		
		while (currNode && safetyCtr < 1000) {
			if (currNode.nodeType == Node.TEXT_NODE && currNode.data.match(/^[\s\t\r\n]*$/)) {	//whitespace-only text node
				//no action. Just progress to the next node.
			} else if (currNode.nodeType == Node.ELEMENT_NODE) {
				//dump("doing a " + currNode.tagName + " element with display type = \"" + document.defaultView.getComputedStyle(currNode, "").display + "\"\n");
				var currElemStyle = document.defaultView.getComputedStyle(currNode, "");
				if (tempTextNodes.length == 0 || currElemStyle.display == "inline") {
					//no action. Just progress to the next node.
				} else if (currElemStyle.display == "none" || currElemStyle.visibility == "hidden") {	//skip this element and all it's children
					if (currNode.nextSibling) {
						currNode = currNode.nextSibling;
						continue;
					} else if (currNode.hasChildNodes()) {
						currNode = currNode.lastChild;	//From this lastChild the node will be progressed to next sibling of the parent or sibling of an ancestor by "getNextTextOrElemNode(currNode, topElem);"
					}
					//else no action. //Will be progressed to next sibling or sibling of ancestor by "getNextTextOrElemNode(currNode);"
				} else {
					textNodesByBlock.push(tempTextNodes);
					tempTextNodes = [];
				}
			} else if (currNode.nodeType == Node.TEXT_NODE) {
				//dump("doing a text node with \"" + currNode.data + "\"\n");
				tempTextNodes.push(currNode);
			} else {
				dump("Error: doing a " + currNode.nodeType + " node (only text or element nodes were expected.)\n");
			}
			currNode = this.getNextTextOrElemNode(currNode, topElem);
			safetyCtr++;
		}
		if (tempTextNodes.length > 0) {
			textNodesByBlock.push(tempTextNodes);
		}
		return textNodesByBlock;
	},
	
	converKatakanaToHiragana: function(katakanaStr) {
		var newStr = "";
		var pos;
		for (var x = 0; x < katakanaStr.length; x++) {
			pos = katakanaStr.charCodeAt(x);
			newStr += pos >= 0x3091 && pos <= 0x30F6 ? String.fromCharCode(pos - 0x60) : katakanaStr.charAt(x);
		}
		return newStr
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
		alert("parseTextNodesForDictionaryMatches() is not redeveloped yet");
		var parsedTextNodes = [];
		return parsedTextNodes;
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
		//*** Devnote: maybe it isn't so temporary after all. Need to confirm behaviour in Firefox 3 proper.
		if (window.RubyService && RubyService.isGecko19OrLater) {
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
			var ignore = VocabAdjuster.getSimpleKanjiList();	//To re-initialize VocabAdjuster._simpleKanjiList
			break;
		//case "auto_process_all_pages":
		//	break;
		}
	}
}
