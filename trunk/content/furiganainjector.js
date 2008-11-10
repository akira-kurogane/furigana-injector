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
		
		//Devnote: element "appcontent" is defined by Firefox. Use "messagepane" for Thunderbird
		document.getElementById("appcontent").addEventListener("DOMContentLoaded", this.onPageLoad, true);
		
		getBrowser().addProgressListener(FuriganaInjectorWebProgressListener, Components.interfaces.nsIWebProgress.NOTIFY_STATE_DOCUMENT);
		getBrowser().tabContainer.addEventListener("TabSelect", this.onTabSelectionChange, false);

		this.prefs = Components.classes["@mozilla.org/preferences-service;1"].
			getService(Components.interfaces.nsIPrefService).getBranch("extensions.furiganainjector.");
		FuriganaInjectorPrefsObserver.register(this.prefs);
		
		try{
			var tempEM = Components.classes["@mozilla.org/extensions/manager;1"].getService(Components.interfaces.nsIExtensionManager);
			var tempFIAddon = tempEM.getItemForID("furiganainjector@yayakoshi.net");
			this.setPref("last_version", tempFIAddon.version);
		} catch (err) {
			dump("There was an error retrieving the add-on's version. Debug and fix.\n" + err.toString());
		}
	
		//Devnote: just setting the onpopupshowing attribute in overlay.xul didn't seem to work. Besides, the event object will probably be needed later for context actions
		document.getElementById("contentAreaContextMenu").addEventListener("popupshowing", this.onShowContextMenu, false);
		document.getElementById("contentAreaContextMenu").addEventListener("popuphidden", this.onHideContextMenu, false);
	
		FIMecabParser.init();
		if (!FIMecabParser.initialized) {
			this.initialized = false;
			this.onUnload();
			return;
		}

		var ignore = VocabAdjuster.getSimpleKanjiList();	//just to make sure VocabAdjuster._simpleKanjiList is initialized for VocabAdjuster.tooEasy()
		FuriganaInjector.setStatusIcon("default");
		
		this.initialized = true;
		
		try {
			document.getElementById("open-tests-window-menuitem").hidden = !this.getPref("enable_tests");
		} catch (err) {
			dump("There was an error setting the visibility of the 'open-tests-window-menuitem' object. Debug and fix.\n");
		}
	},
	
	onUnload: function() {
		//try {
		FuriganaInjectorPrefsObserver.unregister();
		getBrowser().removeProgressListener(FuriganaInjectorWebProgressListener);
		getBrowser().tabContainer.removeEventListener("TabSelect", this.onTabSelectionChange, false);
		document.getElementById("appcontent").removeEventListener("DOMContentLoaded", this.onPageLoad, true);
		document.getElementById("contentAreaContextMenu").removeEventListener("popupshowing", this.onShowContextMenu, false);
		document.getElementById("contentAreaContextMenu").removeEventListener("popuphidden", this.onHideContextMenu, false);
		//} catch (err) {
		//	dump("Error during FuriganaInjector.onUnload(): " + err.toString() + "\n");
		//}
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
		var selectionObject = content.getSelection();
		var selText = selectionObject.toString();
		var parentBlockElem = document.popupNode;
		//The element types below are deliberately chosen. A similar rule such as 'style.display == "block" || .. "table"' was considered but rejected.
		while (!["P", "TABLE", "DIV", "BODY", "FRAME", "IFRAME", "Q", "PRE", "SAMP"].indexOf(parentBlockElem.tagName) < 0) 
			parentBlockElem = parentBlockElem.parentNode;

		if (selText.length == 0) {
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
			if (selectionObject.anchorNode.compareDocumentPosition(selectionObject.focusNode) == Node.DOCUMENT_POSITION_PRECEDING || 
				(selectionObject.anchorNode == selectionObject.focusNode && selectionObject.anchorOffset > selectionObject.focusOffset)) {
				var oldAnchorNode = selectionObject.anchorNode;
				var oldAnchorOffset = selectionObject.anchorOffset;
				selectionObject.collapseToStart();
				selectionObject.extend(oldAnchorNode, oldAnchorOffset);
			}
			var selectionTextBlock = new FITextBlock(selectionObject.anchorNode.ownerDocument, selectionObject.anchorNode, selectionObject.anchorOffset, selectionObject.focusNode, selectionObject.focusOffset);
			selectionTextBlock.expandToFullContext();
			selectionObject.collapseToStart();
			this.parseTextBlockForWordVsYomi(selectionTextBlock);
			selectionTextBlock.insertRubyElements();
			this.processContextSectionCallback(true);
		}
	}, 
	
	processContextSectionCallback: function(processingResult) {
		FuriganaInjector.setCurrentContentProcessed(processingResult ? "partially_processed" : false);
		FuriganaInjector.setStatusIcon(processingResult ? "partially_processed" : "failed"); 		 
	}, 

	lookupAndInjectFurigana: function(textNodesParentElement, callbackFunc) {
		var ignore = VocabAdjuster.getSimpleKanjiList();	//To re-initialize VocabAdjuster._simpleKanjiList
		var textBlocks = this.getTextBlocks(textNodesParentElement, FuriganaInjector.getPref("process_link_text"));
		var tempCharCount = 0;
		for (var x = 0; x < textBlocks.length; x++) {
			this.parseTextBlockForWordVsYomi(textBlocks[x]);
			tempCharCount += textBlocks[x].concatText.length;
			textBlocks[x].insertRubyElements();
		}
		
		callbackFunc(true);
	},
	
	parseTextBlockForWordVsYomi: function (textBlock) {
		FIMecabParser.parse(textBlock.concatText);
		var surface = new String();
		var feature = new String();
		var length = new Number();
		var features = [];
		while (FIMecabParser.next(surface, feature, length)) {	
			if (surface.value.match(VocabAdjuster.kanjiPattern) && !VocabAdjuster.tooEasy(surface.value)) {
				features = feature.value.split(",");
				if (features.length > 7) {
					textBlock.wordsVsYomis.push( {word: surface.value, yomi: FuriganaInjector.converKatakanaToHiragana(features[7]) } );//convert to hiragana
				} //else {	//No reading was found for the surface value, probably because it was a  rare/difficult word not in the mecab dic. 
					//Usually these are given the result "<surface_value>: 名詞,一般,*,*,*,*,*"
					//Devnote: should I try to place readings by seeing if a likely match can be found in kanjidict? E.g. 蜀 has only one kunyomi (いもむし)
				//}
			}
		}
	},
	
	//Devnote: there is potential for this to be significantly shortened by using NodeIterator which will become available in FF3.1
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
	
	//Devnote: there is potential for this to be significantly shortened by using NodeIterator which will become available in FF3.1
	getPrevTextOrElemNode: function(nd, topElem) {
		var foundNode;
		if (nd.previousSibling) {
			foundNode = nd.previousSibling;
			while (foundNode.hasChildNodes())	//go to the bottom-most lastChild.
				foundNode = foundNode.lastChild;
		} else { //no previous sibling. Go up, then go to last child, and the last child if child has children, etc.
			if (nd.parentNode == topElem)
				return null;
			foundNode = nd.parentNode;
if (!foundNode) alert("Error: the getPrevTextOrElemNode() function went beyond the top of the DOM heirarchy");	//TODO delete
			}
		if (foundNode.nodeType == Node.TEXT_NODE || foundNode.nodeType == Node.ELEMENT_NODE)
			return foundNode;
		return this.getPrevTextOrElemNode(foundNode, topElem);
	},
	
	//Devnote: there is potential for this to be significantly shortened by using NodeIterator which will become available in FF3.1
	getTextBlocks: function(topElem, includeLinkText) {
		var safetyCtr = 0;
		var textBlocks = [];
		var tempTextNodes = [];
		var tempTextBlock = new FITextBlock(topElem.ownerDocument);
		
		//Find the first text or element child of topElem. Return an empty set if none exist.
		if (!topElem.hasChildNodes()) 
			return textBlocks;
		var currNode = topElem.firstChild;
		if (currNode.nodeType != Node.TEXT_NODE && currNode.nodeType != Node.ELEMENT_NODE)
			currNode = this.getNextTextOrElemNode(currNode, topElem);
		if (!currNode)
			return textBlocks;
		
		while (currNode && safetyCtr < 2000) {	//Devnote: it seems it's quite easy for a HTML document to have thousands of nodes, so this safetyCtr constraint can easily truncate processing mid-page.
			if (currNode.nodeType == Node.TEXT_NODE && currNode.data.match(/^[\s\t\r\n]*$/)) {	//whitespace-only text node
				//no action. Just progress to the next node.
			} else if (currNode.nodeType == Node.ELEMENT_NODE) {
				//dump("doing a " + currNode.tagName + " element with display type = \"" + document.defaultView.getComputedStyle(currNode, "").display + "\"\n");
				var currElemStyle = document.defaultView.getComputedStyle(currNode, "");
				if (!includeLinkText && currNode.tagName == "A") {	//is a link and preference "process_link_text" is false
					if (currNode.nextSibling) {
						currNode = currNode.nextSibling;
						continue;
					} else if (currNode.hasChildNodes()) {
						currNode = currNode.lastChild;	//From this lastChild the node will be progressed to next sibling of the parent or sibling of an ancestor by "getNextTextOrElemNode(currNode, topElem);"
					}
					//else no action. //Will be progressed to next sibling or sibling of ancestor by "getNextTextOrElemNode(currNode);"
				} else if (tempTextBlock.textNodes.length == 0 || currElemStyle.display == "inline") {
					//no action. Just progress to the next node.
				} else if (currElemStyle.display == "none" || currElemStyle.visibility == "hidden") { //skip this element and all it's children
					if (currNode.nextSibling) {
						currNode = currNode.nextSibling;
						continue;
					} else if (currNode.hasChildNodes()) {
						currNode = currNode.lastChild;	//From this lastChild the node will be progressed to next sibling of the parent or sibling of an ancestor by "getNextTextOrElemNode(currNode, topElem);"
					}
					//else no action. //Will be progressed to next sibling or sibling of ancestor by "getNextTextOrElemNode(currNode);"
				} else {
					textBlocks.push(tempTextBlock);
					tempTextBlock = new FITextBlock(topElem.ownerDocument);
				}
			} else if (currNode.nodeType == Node.TEXT_NODE) {
				//dump("doing a text node with \"" + currNode.data + "\"\n");
				var parentTag = currNode.parentNode && currNode.parentNode.nodeType == Node.ELEMENT_NODE ? currNode.parentNode.tagName : null;
				tempTextBlock.addTextNode(currNode, Array("RUBY", "RBC", "RB", "RTC", "RT").indexOf(parentTag) >= 0);
			} else {
				dump("Error: doing a " + currNode.nodeType + " node (only text or element nodes were expected.)\n");
			}
			currNode = this.getNextTextOrElemNode(currNode, topElem);
			safetyCtr++;
		}
		if (tempTextBlock.textNodes.length > 0) {
			textBlocks.push(tempTextBlock);
		}
		return textBlocks;
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
		//If Ruby XHTML Support extension is being used, call it's delayedReformRubyElement() method for all rubies.
		if (window.RubyService && !RubyInserter.rubySupportedNatively()) {
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
			} else if (prefName == "last_version") {	//an ascii-type string
				return this.prefs.setCharPref(prefName, newPrefVal);
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

/******************************************************************************
 *	Plug for text blocks that will be parsed and replaced as a group.
 ******************************************************************************/
function FITextBlock(ownerDoc, selStartNode, selStartOffset, selEndNode, selEndOffset) {
	this.ownerDocument = ownerDoc;
	this.selStartNode = selStartNode;		//Should be the focusNode
	this.selStartOffset = selStartOffset;
	this.selEndNode = selEndNode;	//Should be the anchorNode
	this.selEndOffset = selEndOffset;
	this.textNodes = [ ];
	this.skipRubyInserts = [ ];
	this.concatText = "";
	this.wordsVsYomis = [ ];
	
	//Devnote: there is potential for this to be shortened by using NodeIterator which will become available in FF3.1
	if (this.selStartNode) {
		if (!this.selEndNode)
			alert("Development error: no selEndNode specified despite there being a selStartNode");
		if (this.selStartNode.compareDocumentPosition(this.selEndNode) == Node.DOCUMENT_POSITION_PRECEDING)
			alert("Development error: the selEndNode (" + this.selEndNode.data + ") is before the selStartNode (" + this.selStartNode.data + ")");

		this.addTextNode(this.selStartNode, null);
		var currNode = FuriganaInjector.getNextTextOrElemNode(this.selStartNode, null);
		while (currNode.nodeType != Node.TEXT_NODE)
			currNode = FuriganaInjector.getNextTextOrElemNode(currNode, null);

		while (currNode && this.selEndNode.compareDocumentPosition(currNode) == Node.DOCUMENT_POSITION_PRECEDING) {
			this.addTextNode(currNode, null);
			currNode = FuriganaInjector.getNextTextOrElemNode(currNode, null);
			while (currNode.nodeType != Node.TEXT_NODE)
				currNode = FuriganaInjector.getNextTextOrElemNode(currNode, null);
		}
		if (this.selStartNode != this.selEndNode) 
			this.addTextNode(this.selEndNode, null);
	}
}

FITextBlock.prototype.addTextNode = function(txtnd, skipRuby) {
	this.textNodes.push(txtnd);
	this.skipRubyInserts.push(skipRuby);
	this.concatText += txtnd.data;
}

FITextBlock.prototype.addTextNodeAtFront = function(txtnd, skipRuby) {
	this.textNodes.unshift(txtnd);
	this.skipRubyInserts.unshift(skipRuby);
	this.concatText = txtnd.data + this.concatText;
}

FITextBlock.prototype.insertRubyElements = function() {
	if (this.wordsVsYomis.length > 0) {
		var separatedWordsVsYomis = [];
		var currWvY = this.wordsVsYomis.shift(); //N.B. this will eventually clear the wordsVsYomis member array
		var currTextNodeIdx = 0;
		while (currWvY && currTextNodeIdx < this.textNodes.length) {	//check against currTextNodeIdx is just for safety
			var currTextNode = this.textNodes[currTextNodeIdx];
			if (currTextNode.data.match(currWvY.word)) {
				if (!separatedWordsVsYomis[currTextNodeIdx])
					separatedWordsVsYomis[currTextNodeIdx] = [ ];
				separatedWordsVsYomis[currTextNodeIdx].push(currWvY);
				currWvY = this.wordsVsYomis.shift();
			} else {
				currTextNodeIdx++;
				if (currTextNodeIdx >= this.textNodes.length) {	//if text nodes exhausted without a match, discard that word and go back to the first text node
					//Devnote: there is no handling yet to split word-yomi pairs into two separate pairs if a word crosses a text node boundary. E.g.
					//this.possibleTextNodeBoundaryRubies.push(currWvY);	//E.g. <p>"Tokyo" means <b>east<b> gate: <b>東</b>京</p>
					currWvY = this.wordsVsYomis.shift();
					currTextNodeIdx = 0;
				}
			}
		}
		for (var x = 0; x < this.textNodes.length; x++) {
			if (!this.skipRubyInserts[x] && separatedWordsVsYomis[x]) {
				var strTemp = this.textNodes[x].data;
				var tempWordVsYomis = [ ];
				if (this.textNodes[x] == this.selStartNode || this.textNodes[x] == this.selEndNode) {
					if (this.textNodes[x] == this.selStartNode && this.textNodes[x] == this.selEndNode)
						strTemp = strTemp.substring(this.selStartOffset,  this.selEndOffset);
					else if (this.textNodes[x] == this.selStartNode)
						strTemp = strTemp.substring(this.selStartOffset);
					else if (this.textNodes[x] == this.selEndNode)
						strTemp = strTemp.substring(0, this.selEndOffset);
					for (var y = 0; y < separatedWordsVsYomis[x].length; y++) {
						if (strTemp.indexOf(separatedWordsVsYomis[x][y].word) >= 0)
							tempWordVsYomis.push(separatedWordsVsYomis[x][y]);
		}
				} else {
					tempWordVsYomis = separatedWordsVsYomis[x];
	}
				RubyInserter.replaceTextNode(this.ownerDocument, this.textNodes[x], tempWordVsYomis);
			}
		}
	}
	//This FITextBlock is now invalid- delete everything.
	this.textNodes = null;
	this.skipRubyInserts = null;
	this.concatText = null;
	this.wordsVsYomis = null;
},

FITextBlock.prototype.expandToFullContext = function() {
	if (!this.textNodes)
		alert("Error: expandToFullContext() called on a FITextBlock object that had an uninitialized or empty textNodes array member");

	//hiragana: \u3041-\u309F; katakana:  \u30A1-\u30FF; cjk ideographs: \u3400-\u4DBF and \u4E00-\u9FFF; half-width katakana: \uFF65-\uFF9F
	//fullwidth ! and ?: \uFF01, \uFF1F; half-width katakana period: \uFF61
	var reSentenceBoundaryAtStart = /^[^\w\u3041-\u309F\u30A1-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uFF65-\uFF9F]*[\.\?!。！？ \uFF61]/; 
	var reSentenceBoundaryAtEnd = /[\.\?!。！？ \uFF61][^\w\u3041-\u309F\u30A1-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uFF65-\uFF9F]*$/;
	var reSentenceBoundaryAnywhere = /[\.\?!。！？ \uFF61]/;

	var safetyCtr = 0;
	var currNode = this.textNodes[0];
	if (reSentenceBoundaryAtStart.test(currNode.data)) {	//if a period found before word/numeral chars, do not attempt to expand back from the startnode
		//Nothing. 
	} else {
		currNode = FuriganaInjector.getPrevTextOrElemNode(currNode, null);
		while (currNode && safetyCtr < 1000) {
			if (currNode.nodeType == Node.TEXT_NODE) {
				if (reSentenceBoundaryAtEnd.test(currNode.data))	//Do not even add the text node if there's a period after all word/numerical chars)
					break;
				this.addTextNodeAtFront(currNode, true);
				if (reSentenceBoundaryAnywhere(currNode.data))	//look for a period, break if found;
					break;
			} else {	//currNode.nodeType == Node.ELEMENT_NODE
				if (["P", "TABLE", "DIV", "BODY", "FRAME", "IFRAME", "Q", "PRE", "SAMP"].indexOf(currNode.tagName) >= 0) 
					break;
			}
			safetyCtr++;
			currNode = FuriganaInjector.getPrevTextOrElemNode(currNode, null);
		}
	}

	safetyCtr = 0;
	currNode = this.textNodes[this.textNodes.length - 1];
	if (reSentenceBoundaryAtEnd.test(currNode.data)) {	//if  period after all word/numeral chars, do not attempt to expand forwards from the end
		//Nothing. 
	} else {
		currNode = FuriganaInjector.getNextTextOrElemNode(currNode, null);
		while (currNode && safetyCtr < 1000) {
			if (currNode.nodeType == Node.TEXT_NODE) {
				if (reSentenceBoundaryAtStart.test(currNode.data))	//Do not even add the text node if there's a period at the start of it
					break;
				this.addTextNode(currNode, true);
				if (reSentenceBoundaryAnywhere(currNode.data))	//look for a period, break if found;
					break;
			} else {	//currNode.nodeType == Node.ELEMENT_NODE
				if (["P", "TABLE", "DIV", "BODY", "FRAME", "IFRAME", "Q", "PRE", "SAMP"].indexOf(currNode.tagName) >= 0) 
					break;
			}
			safetyCtr++;
			currNode = FuriganaInjector.getNextTextOrElemNode(currNode, null);
		}
	}

}
