//ユニコード文字列

var FuriganaInjector = {

	initialized: false, 
	serverUrl: null,
	prefs: null,
	versionUpdatingFrom: null,
	userKanjiRegex: null,
	kanjiAdjustMenuItems: [], 
	strBundle: null,
	kanjiTextNodes: {},
	
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

		this.prefs = Components.classes["@mozilla.org/preferences-service;1"].
			getService(Components.interfaces.nsIPrefService).getBranch("extensions.furiganainjector.");
		FuriganaInjectorPrefsObserver.register(this.prefs);
		
		try{
			var tempEM = Components.classes["@mozilla.org/extensions/manager;1"].getService(Components.interfaces.nsIExtensionManager);
			var tempFIAddon = tempEM.getItemForID("furiganainjector@yayakoshi.net");
			if (this.getPref("last_version") != tempFIAddon.version)
				this.versionUpdatingFrom = this.getPref("last_version");
			this.setPref("last_version", tempFIAddon.version);
		} catch (err) {
			dump("There was an error retrieving the add-on's version. Debug and fix.\n" + err.toString());
		}
		
		userKanjiRegex = new RegExp("[" + VocabAdjuster.getSimpleKanjiList() + "]");
		
		//serverSelector defined in server_selector_obj.js. Selects a working serverUrl asynchronously.
		serverSelector.startTestLoop(
			[ "http://fi.yayakoshi.net/furiganainjector", "http://fi2.yayakoshi.net/furiganainjector" ], 
			this.onServerConfirm, this.onNoServerFound );

		try {
			document.getElementById("open-tests-window-menuitem").hidden = !this.getPref("enable_tests");
		} catch (err) {
			dump("There was an error setting the visibility of the 'open-tests-window-menuitem' object. Debug and fix.\n");
		}
	},
	
	onServerConfirm: function(svrUrl) {
	
		FuriganaInjector.serverUrl = svrUrl;
		document.getElementById("furigana-injector-menu-lbl").disabled = false;
		
		//Disabling pageLoad ... not required a.t.m.
		//document.getElementById("appcontent").addEventListener("DOMContentLoaded", FuriganaInjector.onPageLoad, true);
		
		getBrowser().addProgressListener(FuriganaInjectorWebProgressListener, Components.interfaces.nsIWebProgress.NOTIFY_STATE_DOCUMENT);
		getBrowser().tabContainer.addEventListener("TabSelect", FuriganaInjector.onTabSelectionChange, false);
		
		//Devnote: just setting the onpopupshowing attribute in overlay.xul didn't seem to work. Besides, the event object will probably be needed later for context actions
		document.getElementById("contentAreaContextMenu").addEventListener("popupshowing", FuriganaInjector.onShowContextMenu, false);
		document.getElementById("contentAreaContextMenu").addEventListener("popuphidden", FuriganaInjector.onHideContextMenu, false);
		
		FuriganaInjector.initialized = true;
	},
	
	onNoServerFound: function() {
		document.getElementById("furiganainjector-statusbarpanel").tooltipText = FuriganaInjector.strBundle.getString("tooltipTextNoFuriganaServerFound");
	},
	
	onUnload: function() {
		//try {
		FuriganaInjectorPrefsObserver.unregister();
		if (this.initialized) {
			getBrowser().removeProgressListener(FuriganaInjectorWebProgressListener);
			getBrowser().tabContainer.removeEventListener("TabSelect", this.onTabSelectionChange, false);
			//document.getElementById("appcontent").removeEventListener("DOMContentLoaded", this.onPageLoad, true);
			document.getElementById("contentAreaContextMenu").removeEventListener("popupshowing", this.onShowContextMenu, false);
			document.getElementById("contentAreaContextMenu").removeEventListener("popuphidden", this.onHideContextMenu, false);
		}
		//} catch (err) {
		//	dump("Error during FuriganaInjector.onUnload(): " + err.toString() + "\n");
		//}
	},
	
	//onPageLoad: function() {}, //disabled
	
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
 		if (e.target.id != "contentAreaContextMenu")	//Context menu sub-menu events will bubble to here too. Ignore them.
 			return;
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
						kanjiAdjustMenuItemOnCmd = "VocabAdjuster.removeKanjiFromExclusionList('" + currKanji + 
							"'); FuriganaInjector.postRemoveKanjiFromExclusionList();";
					} else {
						kanjiAdjustMenuItemLabel = FuriganaInjector.strBundle.getFormattedString("menuLabelIgnoreFuriganaForX", [ currKanji ]);
						kanjiAdjustMenuItemOnCmd = "VocabAdjuster.addKanjiToExclusionList('" + currKanji + 
							"'); FuriganaInjector.postAddKanjiToExclusionList('" + currKanji + "')";
					}
					document.getElementById("furigana-injector-submenu").addMenuItem
					var kanjiAdjustMenuItem = document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "menuitem");
					kanjiAdjustMenuItem.setAttribute("label", kanjiAdjustMenuItemLabel);
					kanjiAdjustMenuItem.setAttribute("oncommand", kanjiAdjustMenuItemOnCmd);
					document.getElementById("furigana-injector-submenu").appendChild(kanjiAdjustMenuItem);
					FuriganaInjector.kanjiAdjustMenuItems.push(kanjiAdjustMenuItem);
				}
			}
		}
	},

	onHideContextMenu: function(e) {
 		if (e.target.id != "contentAreaContextMenu")	//Context menu sub-menu events will bubble to here too. Ignore them.
 			return;
		var menuItemToDelete;
		while (FuriganaInjector.kanjiAdjustMenuItems.length > 0) {
			menuItemToDelete = FuriganaInjector.kanjiAdjustMenuItems.pop();
			document.getElementById("furigana-injector-submenu").removeChild(menuItemToDelete);
		}
	}, 
	
	initStatusbarPopup: function() {
		document.getElementById("fi-process-link-text-menuitem").setAttribute("checked", FuriganaInjector.getPref("process_link_text"));
		return true;
	},

	openOptionsWindow: function() {
		window.openDialog("chrome://furiganainjector/content/options.xul", "", "centerscreen,chrome,resizable=yes,dependent=yes");
	},
	
	postRemoveKanjiFromExclusionList: function() {	//i.e. after Show-furigana-for-X
		if (FuriganaInjector.currentContentProcessed() === true) {	//i.e. page already _fully_ processed once.
			this.processWholeDocument();	//Redo it all- should be quick because the existing rubies will be skipped.
		} else {
			this.processContextSection();	//Just do the one spot the user had selected.
		}
	},
	
	postAddKanjiToExclusionList: function(newKanji) {	//i.e. after Ignore-furigana-for-X
		var rubyElems = content.document.getElementsByTagName("RUBY");
		for (var x= 0; x < rubyElems.length; x++) {
			if (VocabAdjuster.tooEasy(RubyInserter.rubyBaseText(rubyElems[x])))
				RubyInserter.revertRuby(rubyElems[x]);
		}
	},
  	
  	/******************************************************************************
  	 *	Meat
	 ******************************************************************************/
	queueAllTextNodesOfElement: function(elem) {
		var includeLinkText = FuriganaInjector.getPref("process_link_text");
		var xPathPattern = 'descendant-or-self::*[not(ancestor-or-self::head) and not(ancestor::select) and not(ancestor-or-self::script)and not(ancestor-or-self::ruby)' + (includeLinkText ? '' : ' and not(ancestor-or-self::a)') + ']/text()[normalize-space(.) != ""]';

		try {
			var iterator = content.document.evaluate(xPathPattern, elem, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
			var nodeCtr = 100;
			var thisNode;
			while (thisNode = iterator.iterateNext()) {
				if (thisNode.textContent.match(/[\u3400-\u9FBF]/))
					kanjiTextNodes[nodeCtr++] = thisNode;
			}
		} catch (e) {
			alert( 'Error during XPath document iteration: ' + e );
		}
	}, 
	
	processWholeDocument: function() {
		content.document.body.setAttribute("furigana-injection", "processing");
		kanjiTextNodes = {};
		FuriganaInjector.queueAllTextNodesOfElement(content.document.body);
		//Todo: Add matching nodes found in frames as well?
		//var framesList = content.frames;
		//for (var x = 0; x < framesList.length; x++) {
		//	this.queueAllTextNodesOfElement(framesList[x].document.body)
		//}
		FuriganaInjector.startFuriganizeAJAX(FuriganaInjector.processWholeDocumentCallback, false);
	}, 
	
	processWholeDocumentCallback: function(processingResult) {
		FuriganaInjector.setCurrentContentProcessed(processingResult);
		FuriganaInjector.setStatusIcon(FuriganaInjector.currentContentProcessed() === true ? "processed" : "failed"); 
	}, 
	
	processContextSection: function() {
		kanjiTextNodes = {};
		var selectionObject = content.getSelection();
		var selText = selectionObject.toString();
		var parentBlockElem = document.popupNode;
		//The element types below are deliberately chosen. A similar rule such as 'style.display == "block" || .. "table"' was considered but rejected.
		while (!["P", "TABLE", "DIV", "BODY", "FRAME", "IFRAME", "Q", "PRE", "SAMP"].indexOf(parentBlockElem.tagName) < 0) 
			parentBlockElem = parentBlockElem.parentNode;

		if (selText.length == 0) {
			if (parentBlockElem.tagName == "BODY") {
				FuriganaInjector.queueAllTextNodesOfElement(parentBlockElem);
				FuriganaInjector.startFuriganizeAJAX(FuriganaInjector.processWholeDocumentCallback, false);
			} else {
				//Blink the context block that has been selected
				setTimeout(function() { parentBlockElem.style.visibility = "hidden"}, 400 );
				setTimeout(function() { parentBlockElem.style.visibility = "visible"}, 600 );
				setTimeout(function() { parentBlockElem.style.visibility = "hidden"}, 700 );
				setTimeout(function() { parentBlockElem.style.visibility = "visible"}, 800 );
				setTimeout(function() { 
					FuriganaInjector.queueAllTextNodesOfElement(parentBlockElem);
					FuriganaInjector.startFuriganizeAJAX(FuriganaInjector.processContextSectionCallback, false);
				}, 810);
			}
			
		} else {
			//Check if the selection is selected back-to-front and reverse it if so.
			if (selectionObject.anchorNode.compareDocumentPosition(selectionObject.focusNode) == Node.DOCUMENT_POSITION_PRECEDING || 
				(selectionObject.anchorNode == selectionObject.focusNode && selectionObject.anchorOffset > selectionObject.focusOffset)) {
				var oldAnchorNode = selectionObject.anchorNode;
				var oldAnchorOffset = selectionObject.anchorOffset;
				selectionObject.collapseToStart();
				selectionObject.extend(oldAnchorNode, oldAnchorOffset);
			}
			
			//Split start and end text nodes as necessary so any preceding or following text 
			//  in the same element can be excluded as separate nodes.
			var origAnchorOffset = selectionObject.anchorOffset;
			var origFocusOffset = selectionObject.focusOffset;
			var singleTextNode = selectionObject.anchorNode == selectionObject.focusNode;
			var startTextNode = selectionObject.anchorNode;
			var endTextNode = selectionObject.focusNode;
			if (origAnchorOffset != 0) {
				startTextNode = selectionObject.anchorNode.splitText(origAnchorOffset);
				if (singleTextNode)
					endTextNode = startTextNode;
			}
			if (singleTextNode) {
				endTextNode.splitText(origFocusOffset - origAnchorOffset);
			} else if (origAnchorOffset != endTextNode.length) {
				endTextNode.splitText(origFocusOffset);
			}

			var nodeCtr = 100;
			if (singleTextNode) {
				kanjiTextNodes[nodeCtr++] = startTextNode;
			} else {
				kanjiTextNodes[nodeCtr++] = startTextNode;
				try {
					var xPathPattern = "following::*/text()";
					var iterator = content.document.evaluate(xPathPattern, startTextNode, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
					var thisNode ;
					while (thisNode = iterator.iterateNext()) {
						if (endTextNode.compareDocumentPosition(thisNode) != Node.DOCUMENT_POSITION_PRECEDING)
							break;
						if (thisNode.textContent.match(/[\u3400-\u9FBF]/)) 
							kanjiTextNodes[nodeCtr++] = thisNode;
					}
				} catch (e) {
					alert( 'Error during XPath document iteration: ' + e );
				}
				kanjiTextNodes[nodeCtr++] = endTextNode;
			}
			FuriganaInjector.startFuriganizeAJAX(FuriganaInjector.processContextSectionCallback, true);
		}
	}, 
	
	processContextSectionCallback: function(processingResult) {
		if (FuriganaInjector.currentContentProcessed() !== true) {	//i.e. page not already _fully_ processed once.
			FuriganaInjector.setCurrentContentProcessed(processingResult ? "partially_processed" : false);
			FuriganaInjector.setStatusIcon(processingResult ? "partially_processed" : "failed"); 	
		}
	}, 

	startFuriganizeAJAX: function(completionCallback, keepAllRubies) {
		if (isEmpty(kanjiTextNodes)) {
			alert("DEBUG: no difficult-kanji text nodes found");
			return;
		}
		var postData = "";
		for (key in kanjiTextNodes)
			postData += "&" + key + "=" + encodeURIComponent(kanjiTextNodes[key].data);
		postData = postData.substr(1);
		var xhr = new XMLHttpRequest();
		xhr.completionCallback = completionCallback;
		xhr.keepAllRubies = keepAllRubies ? true : false;
		xhr.onreadystatechange = this.furiganizeAJAXStateChangeHandler; // Implemented elsewhere.
		xhr.onerror = function(error) {
			console.log("XHR error: " + JSON.stringify(error));
		}
		xhr.open("POST", FuriganaInjector.serverUrl, true);
		xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
		//xhr.setRequestHeader("Content-Length", postData.length);
		xhr.send(postData);
	},

	furiganizeAJAXStateChangeHandler: function() {
		if(this.readyState == 4) {
			if (this.status == 200) {
				var returnData = JSON.parse(this.responseText);
				for (key in returnData){
					if (!this.keepAllRubies)
						returnData[key] = FuriganaInjector.stripRubyForSimpleKanji(returnData[key]);
if (kanjiTextNodes[key]) {
					var tempDocFrag = content.document.createDocumentFragment();
					var dummyParent = content.document.createElement("DIV");
					dummyParent.innerHTML = returnData[key];
					while(dummyParent.firstChild)
						tempDocFrag.appendChild(dummyParent.firstChild);
					kanjiTextNodes[key].parentNode.replaceChild(tempDocFrag, kanjiTextNodes[key]);
} else { alert("development error: key \"" + key + "\" had an empty value in the returnData"); }
				}
				//processWholeDocumentCallback() or processContextSectionCallback()
				this.completionCallback(true); 
			} else {
				alert("Error: the status of the reply from mod_furiganainjector was " + this.status + " instead of 200(OK)");
				this.completionCallback(false);
			}
		}
	},
	
	stripRubyForSimpleKanji: function(origStr) {
		var newStr = "";
		var offset = 0;
		var currRubyBeginOffset = origStr.indexOf("<ruby>", 0);	//Todo: make case-insestive
		if (currRubyBeginOffset < 0)
			return origStr;
var safetCtr = 0;
		while (currRubyBeginOffset >= 0 && safetCtr < 100) {
			rubySubstr = origStr.substring(currRubyBeginOffset, origStr.indexOf("</ruby>", currRubyBeginOffset) + 7);
			if (FuriganaInjector.hasOnlySimpleKanji(rubySubstr)) {
				newStr += origStr.substring(offset, currRubyBeginOffset);
				newStr += rubySubstr.replace(
					/<ruby>(?:<rb>)?([^<]*)(?:<\/rb>)?(\s*)(?:<r[pt]>[^<]*<\/r[pt]>)*(\s*)<\/ruby>/, 
					"$1$2$3", "i");
				offset = currRubyBeginOffset + rubySubstr.length;
			}
			currRubyBeginOffset = origStr.indexOf("<ruby>", currRubyBeginOffset + 1);
safetCtr++;
		}
if (safetCtr > 90) console.log("safetCtr = " + safetCtr);
		newStr += origStr.substring(offset);
		return newStr;
	},

	hasOnlySimpleKanji: function(rubySubstr) {
		var foundKanji = rubySubstr.match(/[\u3400-\u9FBF]/g);
		if (foundKanji) {
			for (var x = 0; x < foundKanji.length; x++) {
				if (!userKanjiRegex.exec(foundKanji[x]))
					return false;
			}
		}
		return true;
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
		//Devnote: this function will not find <RB>..<RT>.. tag sets that existed without being properly 
		//  enclosed within <RUBY> tags. I.e. any badly formatted tags such as these that were 
		//  originally in the document will be left untouched, whereas properly formatted ones will be reverted.
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
				var rubyNodeList = content.document.getElementsByTagName("RUBY");	//N.B. the return val is a NodeList object, not a standard array.
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
			if (prefName == "exclusion_kanji" || prefName == "last_version" ) {
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
				VocabAdjuster.flagSimpleKanjiListForReset();
				userKanjiRegex = new RegExp("[" + VocabAdjuster.getSimpleKanjiList() + "]");
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
		if (!evt.target.hasAttribute("selectedFOUKanjiSubset")) {
			alert("Programming error: The button that triggered the 'SetKanjiByMaxFOUVal' event had an empty/false 'selectedFOUKanjiSubset' attribute");
			return;
		}
		var newUserKanjList = evt.target.getAttribute("selectedFOUKanjiSubset");
		FuriganaInjector.setPref("exclusion_kanji", newUserKanjList);
		alert(FuriganaInjector.strBundle.getFormattedString("alertExclusionKanjiSetToX", [ newUserKanjList.length ]));
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
		}
	}
}

/********* Simple object check utility ****************/
function isEmpty(obj) {
	for(var prop in obj) {
		if(obj.hasOwnProperty(prop))
			return false;
	}
	return true;
}

