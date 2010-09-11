//ユニコード文字列
(function (/*window, undefined*/) {

	/*Remove the jQuery in this extension from the global scope. */
	$ = jQuery = jQuery.noConflict(true);	//using true strips window.jQuery as well as window.$. 
		//  N.B. not having a global jQuery will break jQuery plugins.

/******************************************************************************
 *	Attach listener for browser's load and unload events (N.B. Does not mean page load/move).
 *	Devnote: FuriganaInjector.onLoad() is effectively it's init() function.
 ******************************************************************************/
 
window.addEventListener("load", function(e) { FuriganaInjector.onLoad(e); }, false);
window.addEventListener("unload", function(e) { FuriganaInjector.onUnload(e); }, false); 

/******************************************************************************
 *	Attach listener for "SetKanjiByMaxFOUValRequest" events if the page loaded is the 'Simple 
 *	  Kanji Selection' page.
 ******************************************************************************/
var setKanjiLevelURI = "chrome://furiganainjector/locale/user_guides/simple_kanji_level_selector.html";

//Devnote: element "appcontent" is defined by Firefox. Use "messagepane" for Thunderbird
document.getElementById("appcontent").addEventListener("DOMContentLoaded", 
	function() {
		if (content.document.URL == setKanjiLevelURI) {
			content.document.addEventListener("SetKanjiByMaxFOUValRequest", 
				function(evt) { FuriganaInjector.onSetKanjiByMaxFOUValRequest(evt); }, false, true);
			//N.B. By testing it seems the "SetKanjiByMaxFOUValRequest" event listener is destroyed when 
			//  the document is closed, so there is no need for a matching removeEventListener();
		}
	}, 
	false);

var FuriganaInjector = {

	initialized: false, 
	furiganaServerUrl: null,
	prefs: null,
	versionUpdatingFrom: null,
	userKanjiRegex: null,
	kanjiAdjustMenuItems: [], 
	strBundle: null,
	furiganaSvrReqBatches: {}, //This object will be used like a hash
	furiganaServiceURLsList: [ "http://fi.yayakoshi.net/furiganainjector", "http://fi2.yayakoshi.net/furiganainjector" ],
	wwwjdicServerURL: null,
	
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
		
		this.consoleService = Components.classes["@mozilla.org/consoleservice;1"]
        	.getService(Components.interfaces.nsIConsoleService);
		
		try{
			var tempEM = Components.classes["@mozilla.org/extensions/manager;1"].getService(Components.interfaces.nsIExtensionManager);
			var tempFIAddon = tempEM.getItemForID("furiganainjector@yayakoshi.net");
			if (this.getPref("last_version") != tempFIAddon.version)
				this.versionUpdatingFrom = this.getPref("last_version");
			this.setPref("last_version", tempFIAddon.version);
		} catch (err) {
			dump("There was an error retrieving the add-on's version. Debug and fix.\n" + err.toString());
		}
		
		this.userKanjiRegex = new RegExp("[" + FIVocabAdjuster.getSimpleKanjiList() + "]");
		
		//ServerSelector defined in server_selector_obj.js. Selects a working furiganaServerUrl asynchronously.
		var fiSvrSel = new ServerSelector(this.furiganaServiceURLsList, this.onServerConfirm, this.onNoFuriganaServerFound );

		try {
			document.getElementById("open-tests-window-menuitem").hidden = !this.getPref("enable_tests");
		} catch (err) {
			dump("There was an error setting the visibility of the 'open-tests-window-menuitem' object. Debug and fix.\n");
		}
	},
	
	onServerConfirm: function(svrUrl/*, contextObj*/) {
	
		FuriganaInjector.furiganaServerUrl = svrUrl;
		//FuriganaInjector.consoleService.logStringMessage("FuriganaInjector service at " + FuriganaInjector.furiganaServerUrl + " confirmed");
		document.getElementById("furiganainjector-statusbarpanel").tooltipText = "";
		FuriganaInjector.setCurrentStatusIconAndCmdModes();	//should be the same as FuriganaInjector.setStatusIcon("default");, for valid pages ??
		document.getElementById("furigana-injector-menu-lbl").disabled = false;

		if (!FuriganaInjector.initialized ) {
			getBrowser().addProgressListener(FuriganaInjectorWebProgressListener, Components.interfaces.nsIWebProgress.NOTIFY_STATE_DOCUMENT);
			getBrowser().tabContainer.addEventListener("TabSelect", FuriganaInjector.onTabSelectionChange, false);
			//Devnote: just setting the onpopupshowing attribute in overlay.xul didn't seem to work. Besides, the event object will probably be needed later for context actions
			document.getElementById("contentAreaContextMenu").addEventListener("popupshowing", FuriganaInjector.onShowContextMenu, false);
			document.getElementById("contentAreaContextMenu").addEventListener("popuphidden", FuriganaInjector.onHideContextMenu, false);
			/*** New event listeners version 2.3? 
			 * Todo: make all of this named functions,
			 * Todo: remove event listeners in the onUnload function
			 */
			document.getElementById("status-icon-context-menu").addEventListener("popupshowing", function (event) {
				FuriganaInjector.processContextSection(true);
			}, false);
			document.getElementById("process-context-section-context-menuitem").addEventListener("command", function (event) {
				FuriganaInjector.processContextSection(true);
			}, false);
			document.getElementById("process-whole-page-context-menuitem").addEventListener("command", function (event) {
				FuriganaInjector.processWholeDocument();
			}, false);
			document.getElementById("furiganainjector-statusbarpanel").addEventListener("command", function (event) {
				var pState = FuriganaInjector.currentContentProcessed(); 
				if (pState == 'processing')
					;/*do nothing*/
				else if (pState)
					FuriganaInjector.revertAllRubys(); 
				else
					FuriganaInjector.processWholeDocument(); 
			}, false);
			document.getElementById("remove-page-furigana-context-menuitem").addEventListener("command", function (event) {
				FuriganaInjector.revertAllRubys();
			}, false);
			document.getElementById("fi-process-link-text-menuitem").addEventListener("command", function (event) {
				FuriganaInjector.setPref('process_link_text', this.hasAttribute('checked'));	//_this_ is the menuitem element
			}, false);
			document.getElementById("fi-open-options-menuitem").addEventListener("command", function (event) {
				FuriganaInjector.openOptionsWindow();
			}, false);
			document.getElementById("fi-open-install-welcome-menuitem").addEventListener("command", function (event) {
try {
				FIInstallationWelcomeFX.addTabWithLoadListener();
} catch (err) { alert(err); }
			}, false);
		}
		
		FuriganaInjector.initialized = true;
		
		//Now find a WWWJDIC server
		var wwwjdicSvrSel = new ServerSelector(
			[ "http://www.csse.monash.edu.au/~jwb/cgi-bin/wwwjdic.cgi", "http://ryouko.imsb.nrc.ca/cgi-bin/wwwjdic", 
				"http://jp.msmobiles.com/cgi-bin/wwwjdic", "http://www.aa.tufs.ac.jp/~jwb/cgi-bin/wwwjdic.cgi", 
				"http://wwwjdic.sys5.se/cgi-bin/wwwjdic.cgi", "http://www.edrdg.org/cgi-bin/wwwjdic/wwwjdic"],
			FuriganaInjector.confirmWWWJDICServer, FuriganaInjector.onNoWWWJDICServerFound);
	},
	
	onNoFuriganaServerFound: function(/*contextObj*/) {
		document.getElementById("furiganainjector-statusbarpanel").tooltipText = FuriganaInjector.strBundle.getString("tooltipTextNoFuriganaServerFound");
		/*Then schedule more server checks*/
		if (!FuriganaInjector["serverRecheckInterval"])
			FuriganaInjector.serverRecheckInterval = 30000;	//30 secs
//FuriganaInjector.consoleService.logStringMessage("Notice: none of the furigana servers could be connected to. Scheduling another check in " + FuriganaInjector.serverRecheckInterval/1000 + " secs.");
		setTimeout(function() {
				if (!FuriganaInjector["furiganaServerUrl"]) //Just in case the server was selected somehow in the meantime.
					var fiSvrSel = new ServerSelector(FuriganaInjector.furiganaServiceURLsList, FuriganaInjector.onServerConfirm, FuriganaInjector.onNoFuriganaServerFound, "mod_furiganainjector");
			}, FuriganaInjector.serverRecheckInterval);
		/*DEBUG DISABLED FuriganaInjector.serverRecheckInterval *= 2;
		if (FuriganaInjector.serverRecheckInterval >= 3600000)
			FuriganaInjector.serverRecheckInterval = 3600000;	//cap at 1hr.*/
	},

	confirmWWWJDICServer: function(svrUrl/*, contextObj*/) {
		FuriganaInjector.wwwjdicServerURL = svrUrl;
		FuriganaInjector.consoleService.logStringMessage("WWWJDIC service at " + svrUrl + " confirmed");
	},

	onNoWWWJDICServerFound: function(/*contextObj*/) {
		FuriganaInjector.consoleService.logStringMessage("Error: none of the WWWJDIC servers could be connected to.");
	},
	
	onUnload: function() {
		//try {
		FuriganaInjectorPrefsObserver.unregister();
		if (this.initialized) {
			getBrowser().removeProgressListener(FuriganaInjectorWebProgressListener);
			getBrowser().tabContainer.removeEventListener("TabSelect", this.onTabSelectionChange, false);
			document.getElementById("contentAreaContextMenu").removeEventListener("popupshowing", this.onShowContextMenu, false);
			document.getElementById("contentAreaContextMenu").removeEventListener("popuphidden", this.onHideContextMenu, false);
		}
		//} catch (err) {
		//	dump("Error during FuriganaInjector.onUnload(): " + err.toString() + "\n");
		//}
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
			document.getElementById("process-context-section-context-menuitem").setAttribute("disabled", alreadyProcessed);
			document.getElementById("process-whole-page-context-menuitem").setAttribute("disabled", alreadyProcessed);
		} else {
			FuriganaInjector.setStatusIcon("disabled");
			document.getElementById("process-context-section-context-menuitem").setAttribute("disabled", true);
			document.getElementById("process-whole-page-context-menuitem").setAttribute("disabled", true);
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
			var exclusionKanji = FIVocabAdjuster.getSimpleKanjiList();
			var kanjiAdjustMenuItem;
			var kanjiAdjustMenuItemLabel;
			var kanjiAdjustMenuItemOnCmd;
			for (var x = 0; x < selText.length && kanjiCount <= 4; x++) {
				currKanji = selText.charAt(x);
				if (FIVocabAdjuster.isUnihanChar(currKanji)) {
					kanjiCount++;
					if (exclusionKanji.indexOf(currKanji) >= 0) {
						kanjiAdjustMenuItemLabel = FuriganaInjector.strBundle.getFormattedString("menuLabelShowFuriganaForX", [ currKanji ]);
						kanjiAdjustMenuItemOnCmd = "FIVocabAdjuster.removeKanjiFromExclusionList('" + currKanji + 
							"'); FuriganaInjector.postRemoveKanjiFromExclusionList();";
					} else {
						kanjiAdjustMenuItemLabel = FuriganaInjector.strBundle.getFormattedString("menuLabelIgnoreFuriganaForX", [ currKanji ]);
						kanjiAdjustMenuItemOnCmd = "FIVocabAdjuster.addKanjiToExclusionList('" + currKanji + 
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
			if (FIVocabAdjuster.tooEasy(FuriganaInjector.rubyBaseText(rubyElems[x])))
				FuriganaInjector.revertRuby(rubyElems[x]);
		}
	},
  	
  	/******************************************************************************
  	 *	Meat
	 ******************************************************************************/
	queueAllTextNodesOfElement: function(doc, elem) {
		var includeLinkText = FuriganaInjector.getPref("process_link_text");
		var xPathPattern = 'descendant-or-self::*[not(ancestor-or-self::head) and not(ancestor::select) and not(ancestor-or-self::script)and not(ancestor-or-self::ruby)' + (includeLinkText ? '' : ' and not(ancestor-or-self::a)') + ']/text()[normalize-space(.) != ""]';

		try {
			var iterator = doc.evaluate(xPathPattern, elem, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
			var nodeCtr = 100;
			//in case this called multiple times on one page (i.e. a multi-frame page), raise the nodeCtr
			for (idx in this.kanjiTextNodes) {
				if (!isNaN(idx) && nodeCtr < idx)
					nodeCtr = idx + 1;
			}
			var thisNode;
			while (thisNode = iterator.iterateNext()) {
				if (thisNode.textContent.match(/[\u3400-\u9FBF]/))	//Kanji (a.k.a. chinese ideograph) range
					this.kanjiTextNodes[nodeCtr++] = thisNode;
			}
		} catch (e) {
			alert( 'Error during XPath document iteration: ' + e );
		}
	}, 
	
	/*	Take kanjiTextNodes up to the batch size specified and put them in one object. That single object 
	 *	  can be re-submitted easily to a secondary server if the current one fails.*/
	unshiftKanjiTxtNdToBatch: function(keepAllRuby) {
		var batchData = {textToFuriganize: []};
		var tmpLen = 0;
		for (key in this.kanjiTextNodes) {
			batchData.textToFuriganize[key] = this.kanjiTextNodes[key]; 
			tmpLen += batchData.textToFuriganize[key].data.length;
			delete this.kanjiTextNodes[key];
			if (tmpLen > 20000)	//Only process this amount per request to the server.
				break;
		}
		batchData.keepAllRuby = keepAllRuby;
		var tmpDt = new Date();
		var reqTimestampId = tmpDt.getTime();
		this.furiganaSvrReqBatches[reqTimestampId] = batchData;
		return reqTimestampId;
	},
	
	processWholeDocument: function() {
		//Todo: once ruby is supported natively, execute the code found in css_fontsize_fix_for_rt.js in the chrome version.
		content.document.body.setAttribute("furigana-injection", "processing");
		this.kanjiTextNodes = {};
		this.submittedKanjiTextNodes = {};
		if (!content.frames || content.frames.length == 0) {
			this.queueAllTextNodesOfElement(content.document, content.document.body);
		} else {
			var framesList = content.frames;
			for (var x = 0; x < framesList.length; x++) {
				this.queueAllTextNodesOfElement(framesList[x].document, framesList[x].document.body)
			}
		}
		this.startFuriganizeAJAX(this.furiganaServiceURLsList, this.unshiftKanjiTxtNdToBatch(false), this.processWholeDocumentCallback);
	}, 
	
	processWholeDocumentCallback: function(processingResult) {
		FuriganaInjector.setCurrentContentProcessed(processingResult);
		FuriganaInjector.setStatusIcon(FuriganaInjector.currentContentProcessed() === true ? "processed" : "failed"); 
		//Todo: activate_wwwjdic_lookup.js
		$("rt", content.document).bind("mouseenter", showRubyDopplegangerAndRequestGloss);
	}, 
	
	processContextSection: function() {
		this.kanjiTextNodes = {};
		this.submittedKanjiTextNodes = {};
		var selectionObject = content.getSelection();
		var selText = selectionObject.toString();
		var parentBlockElem = document.popupNode;
		//The element types below are deliberately chosen. A similar rule such as 'style.display == "block" || .. "table"' was considered but rejected.
		while (!["P", "TABLE", "DIV", "BODY", "FRAME", "IFRAME", "Q", "PRE", "SAMP"].indexOf(parentBlockElem.tagName) < 0) 
			parentBlockElem = parentBlockElem.parentNode;

		if (selText.length == 0) {
			if (parentBlockElem.tagName == "BODY") {
				this.queueAllTextNodesOfElement(parentBlockElem.ownerDocument, parentBlockElem);
				this.startFuriganizeAJAX(this.furiganaServiceURLsList, this.unshiftKanjiTxtNdToBatch(false), FuriganaInjector.processWholeDocumentCallback);
			} else {
				//Blink the context block that has been selected
				setTimeout(function() { parentBlockElem.style.visibility = "hidden"}, 400 );
				setTimeout(function() { parentBlockElem.style.visibility = "visible"}, 600 );
				setTimeout(function() { parentBlockElem.style.visibility = "hidden"}, 700 );
				setTimeout(function() { parentBlockElem.style.visibility = "visible"}, 800 );
				setTimeout(function() { 
					FuriganaInjector.queueAllTextNodesOfElement(parentBlockElem.ownerDocument, parentBlockElem);
					FuriganaInjector.startFuriganizeAJAX(FuriganaInjector.furiganaServiceURLsList, this.unshiftKanjiTxtNdToBatch(false), FuriganaInjector.processContextSectionCallback);
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
				this.kanjiTextNodes[nodeCtr++] = startTextNode;
			} else {
				this.kanjiTextNodes[nodeCtr++] = startTextNode;
				try {
					var xPathPattern = "following::*/text()";
					var iterator = content.document.evaluate(xPathPattern, startTextNode, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
					var thisNode ;
					while (thisNode = iterator.iterateNext()) {
						if (endTextNode.compareDocumentPosition(thisNode) != Node.DOCUMENT_POSITION_PRECEDING)
							break;
						if (thisNode.textContent.match(/[\u3400-\u9FBF]/)) 	//Kanji (a.k.a. chinese ideograph) range
							this.kanjiTextNodes[nodeCtr++] = thisNode;
					}
				} catch (e) {
					alert( 'Error during XPath document iteration: ' + e );
				}
				this.kanjiTextNodes[nodeCtr++] = endTextNode;
			}
			this.startFuriganizeAJAX(this.furiganaServiceURLsList, this.unshiftKanjiTxtNdToBatch(true), this.processContextSectionCallback);
		}
	}, 
	
	processContextSectionCallback: function(processingResult) {
		if (FuriganaInjector.currentContentProcessed() !== true) {	//i.e. page not already _fully_ processed once.
			FuriganaInjector.setCurrentContentProcessed(processingResult ? "partially_processed" : false);
			FuriganaInjector.setStatusIcon(processingResult ? "partially_processed" : "failed"); 	
		}
		//Todo: activate_wwwjdic_lookup.js
		$("rt", content.document).bind("mouseenter", showRubyDopplegangerAndRequestGloss);
	}, 

	startFuriganizeAJAX: function(urlsList, reqTimestampId, completionCallback) {
		var postData = "";
		var batchData = FuriganaInjector.furiganaSvrReqBatches[reqTimestampId];
		for (key in batchData.textToFuriganize) {
			postData += "&" + key + "=" + encodeURIComponent(batchData.textToFuriganize[key].data);
			this.submittedKanjiTextNodes[key] = batchData.textToFuriganize[key];
		}
		postData = postData.substr(1);
		var xhr = new XMLHttpRequest();
		xhr.urlsList = urlsList;	//Will only be referenced if the request fails.
		xhr.reqTimestampId = reqTimestampId;
		xhr.completionCallback = completionCallback;
		xhr.keepAllRubies = batchData.keepAllRubies;
		xhr.onreadystatechange = this.furiganizeAJAXStateChangeHandler;
		xhr.onerror = function(error) {
			//FuriganaInjector.consoleService.logStringMessage("XHR error: " + JSON.stringify(error));
		}
		xhr.open("POST", FuriganaInjector.furiganaServerUrl, true);
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
if (FuriganaInjector.submittedKanjiTextNodes[key]) {
//FuriganaInjector.consoleService.logStringMessage(JSON.stringify(returnData[key]));
					//Todo: figure out why content.document is okay, rather than needing submittedKanjiTextNodes[key].ownerDocument ...
					var tempDocFrag = content.document.createDocumentFragment();
					var dummyParent = content.document.createElement("DIV");
					dummyParent.innerHTML = returnData[key];
					while(dummyParent.firstChild)
						tempDocFrag.appendChild(dummyParent.firstChild);
					FuriganaInjector.submittedKanjiTextNodes[key].parentNode.replaceChild(tempDocFrag, FuriganaInjector.submittedKanjiTextNodes[key]);
					delete FuriganaInjector.submittedKanjiTextNodes[key];
} else { alert("development error: key \"" + key + "\" had an empty value in the returnData"); }
				}
				delete FuriganaInjector.furiganaSvrReqBatches[this.reqTimestampId];
				if (!FuriganaInjectorUtilities.isEmpty(this.kanjiTextNodes)) {	//start another async request for the remainder.
					FuriganaInjector.startFuriganizeAJAX(this.urlsList, this.reqTimestamp, this.completionCallback);
				} else {
					//processWholeDocumentCallback() or processContextSectionCallback()
					this.completionCallback(true); 
				}
			} else {
				var tmpIdx = this.urlsList.indexOf(FuriganaInjector.furiganaServerUrl);
				if (tmpIdx)
					this.urlsList.splice(tmpIdx, 1);
				if (this.urlsList.length == 0)
					FuriganaInjector.onNoServerFoundAfterReseek(this);
				else
					var tempSvrSel = new ServerSelector(this.urlsList, FuriganaInjector.updateServerURLAfterRequestFailure, 
						FuriganaInjector.onNoServerFoundAfterReseek, "mod_furiganainjector", 
						this/*including the xhr object so it can be passed back from the callback*/);
				//alert("Error: the status of the reply from mod_furiganainjector was " + this.status + " instead of 200(OK)");
				//this.completionCallback(false);
			}
		}
	},

	updateServerURLAfterRequestFailure: function(svrUrl, failedXHR) {
//FuriganaInjector.consoleService.logStringMessage("updateServerURLAfterRequestFailure()");
		var oldServerUrl = FuriganaInjector.furiganaServerUrl;
		FuriganaInjector.furiganaServerUrl = svrUrl;
		//FuriganaInjector.consoleService.logStringMessage("FuriganaInjector service at " + svrUrl + " selected after failure requesting from " + oldServerUrl);
		FuriganaInjector.startFuriganizeAJAX(failedXHR.urlsList, failedXHR.reqTimestampId, failedXHR.completionCallback);
	},

	onNoServerFoundAfterReseek: function(failedXHR) {
//FuriganaInjector.consoleService.logStringMessage("onNoServerFoundAfterReseek()");
		FuriganaInjector.furiganaServerUrl = null;
		delete FuriganaInjector.furiganaSvrReqBatches[failedXHR.reqTimestampId];	//dequeue
		document.getElementById("furiganainjector-statusbarpanel").tooltipText = FuriganaInjector.strBundle.getString("tooltipTextNoFuriganaServerFound");
		FuriganaInjector.setStatusIcon("disabled");
		alert("Sorry- the furigana servers have failed.");
	},
	
	stripRubyForSimpleKanji: function(origStr) {
		var newStr = "";
		var offset = 0;
		var currRubyBeginOffset = origStr.indexOf("<ruby>", 0);
		if (currRubyBeginOffset < 0)
			return origStr;
var safetCtr = 0;
		while (currRubyBeginOffset >= 0 && safetCtr < 100) {
			var rubySubstr = origStr.substring(currRubyBeginOffset, origStr.indexOf("</ruby>", currRubyBeginOffset) + 7);
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
//if (safetCtr > 90) FuriganaInjector.consoleService.logStringMessage("safetCtr = " + safetCtr);
		newStr += origStr.substring(offset);
		return newStr;
	},

	hasOnlySimpleKanji: function(rubySubstr) {
		var foundKanji = rubySubstr.match(/[\u3400-\u9FBF]/g);	//Kanji (a.k.a. chinese ideograph) range
		if (foundKanji) {
			for (var x = 0; x < foundKanji.length; x++) {
				if (!this.userKanjiRegex.exec(foundKanji[x]))
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
			FuriganaInjector.revertRuby(tempRubyElem);
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
	
	revertRuby: function (rubyElem) {
		var parentElement = rubyElem.parentNode;
		var newTextNode  = rubyElem.ownerDocument.createTextNode("");
		newTextNode.data = this.rubyBaseText(rubyElem);
		parentElement.insertBefore(newTextNode, rubyElem);
		parentElement.removeChild(rubyElem);
		parentElement.normalize();
	},
	
	//Devnote: the XHMTL Ruby Support extension sometimes inserts html elements such as:
	//  "転載" --> "<ruby><rb>転<span class="ruby-text-lastLetterBox">載</span></rb><rp>(</rp><rt> ....".
	//  Note that there is a <span> element inside the <rb> element. For this reason iterations for text nodes go to a second level.
	//Devnote: if ruby are natively supported by firefox then the second loop for children such as the span class should be skipped.
	rubyBaseText: function (rubyElem) {
		var tempChildNodes;
		var rbText = "";
		tempRBNodes = rubyElem.getElementsByTagName("RB");
		for (var r = 0; r < tempRBNodes.length; r++) {
			tempChildNodes = tempRBNodes[r].childNodes;
			for (var x = 0; x < tempChildNodes.length; x++) {
				if (tempChildNodes[x].nodeType == Node.TEXT_NODE) {
					rbText += tempChildNodes[x].data;
				} else if(tempChildNodes[x].nodeType == Node.ELEMENT_NODE) {
					for (var y = 0; y < tempChildNodes[x].childNodes.length; y++) {
						if (tempChildNodes[x].childNodes[y].nodeType == Node.TEXT_NODE)
							rbText += tempChildNodes[x].childNodes[y].data;
					}
				}
			}
		}
		return rbText;
	},
	
	rubySupportedNatively: function() {
		var dummyElem = document.createElement("P");
		dummyElem.style.display = "block";
		dummyElem.style.display = "ruby";
		var rubyNativeSupport = dummyElem.style.display == "ruby";
		dummyElem = null;
		return rubyNativeSupport;
	},
	
	setCurrentContentProcessed: function(processingResult) {
		//If Ruby XHTML Support extension is being used, call it's delayedReformRubyElement() method for all rubies.
		if (window["RubyService"] !== "undefined" && !FuriganaInjector.rubySupportedNatively()) {
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
				FIVocabAdjuster.flagSimpleKanjiListForReset();
				this.userKanjiRegex = new RegExp("[" + FIVocabAdjuster.getSimpleKanjiList() + "]");
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
			FIVocabAdjuster.flagSimpleKanjiListForReset();
			break;
		}
	}
}

/******************************************************************************
 *	Utilities, wrapped to avoid namespace clash
 ******************************************************************************/
var FuriganaInjectorUtilities = {

	/***** Simple object check ******/
	isEmpty: function (obj) {
		for(var prop in obj) {
			if(obj.hasOwnProperty(prop))
				return false;
		}
		return true;
	},
	
	/*** a mozilla-specific version number comparison function ******/
	compareVersions: function(a,b) {
		var x = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
			.getService(Components.interfaces.nsIVersionComparator)
			.compare(a,b);

		return x;
	}
//dump("1.0pre vs 1.0 = " + compareVersions("1.0pre", "1.0"));

	
}

/********* The contents of vocabadjuster **************/

var FIVocabAdjuster = {

	//Various patterns to match different japanese scripts
	kanjiPattern: "(?:[\u3400-\u9FBF][\u3005\u3400-\u9FBF]*)",	//"\u3005" is "々", the kanji repeater character
	kanjiRevPattern: "[^\u3005\u3400-\u9FBF]",	//N.B. no attempt to made to avoid leading "々" char
	hiraganaPattern: "[\u3042\u3044\u3046\u3048\u304A-\u3093]",
	hiraganaRevPattern: "[^\u3042\u3044\u3046\u3048\u304A-\u3093]",
	kanjiHiraganaPattern: "[\u3005\u3042\u3044\u3046\u3048\u304A-\u3093\u3400-\u9FBF]",	//N.B. no attempt to made to avoid leading "々" char
	
	_simpleKanjiList: null, 

	tooEasy: function(word) {
		var ignore = this.getSimpleKanjiList();	//just to make sure this._simpleKanjiList is initialized for tooEasy_NoInit()
		return this.tooEasy_NoInit(word);
	}, 

	tooEasy_NoInit: function(word) {
		var charTemp;
		for (var charPos = 0; charPos < word.length; charPos++) {
			charTemp = word.charAt(charPos);
			if (this.isUnihanChar(charTemp) && this._simpleKanjiList.indexOf(charTemp) < 0) {
				return false;
			}
		}
		return true;
	},

	removeSimpleWords: function(matchingTextNodeInstances) {
		var tni;
		var mi;
		var replacementArray;
		var ignore = this.getSimpleKanjiList();	//just to make sure this._simpleKanjiList is initialized for tooEasy_NoInit()
		for (var x = 0; x < matchingTextNodeInstances.length; x++) {
			tni = matchingTextNodeInstances[x];
			replacementArray = [];
			for (var y = 0; y < tni.matchInstances.length; y++) {
				mi = tni.matchInstances[y];
				if (!this.tooEasy_NoInit(mi.word)) {
					replacementArray.push(mi);
				}
			}
			tni.matchInstances.splice(0, tni.matchInstances.length);
			for (var y = 0; y < replacementArray.length; y++) {
				tni.matchInstances[y] = replacementArray[y];
			}
		}
		return matchingTextNodeInstances;
	},
	
	addKanjiToExclusionList: function(kanjiChar) {
		var temp_pref_string = FuriganaInjector.getPref("exclusion_kanji");
		if (temp_pref_string.indexOf(kanjiChar) >= 0) {
			if (FuriganaInjector.getPref("enable_tests"))
				alert("addKanjiToExclusionList(): The kanji \"" + kanjiChar + "\" is already in the kanji exclusion list");
		} else {
			temp_pref_string += kanjiChar;
			FuriganaInjector.setPref("exclusion_kanji", temp_pref_string);
			this.flagSimpleKanjiListForReset();
		}
	},
	
	removeKanjiFromExclusionList: function(kanjiChar) {
		var temp_pref_string = FuriganaInjector.getPref("exclusion_kanji");
		if (temp_pref_string.indexOf(kanjiChar) < 0) {
			if (FuriganaInjector.getPref("enable_tests"))
				alert("removeKanjiFromExclusionList(): The kanji \"" + kanjiChar + "\" is not in the kanji exclusion list");
		} else {
			temp_pref_string = temp_pref_string.replace(kanjiChar, "");
			FuriganaInjector.setPref("exclusion_kanji", temp_pref_string);
			this.flagSimpleKanjiListForReset();
		}
	},
	
	/* N.B. No detection for the "CJK Compatibility Ideographs"or "CJK Ideographs Ext B"*/
	//Todo: initialise a RegExp object, use kanjiRevPattern
	isUnihanChar: function(testChar) {
		return testChar >= "\u3400" && testChar <= "\u9FBF";
	}, 

	getSimpleKanjiList: function() {
		if (!this._simpleKanjiList) { 
			var temp_pref_string = FuriganaInjector.getPref("exclusion_kanji");
			this._simpleKanjiList = temp_pref_string.replace(RegExp(FIVocabAdjuster.kanjiRevPattern ,"g"), "");
		}
		return this._simpleKanjiList;
	},
	
	flagSimpleKanjiListForReset: function() {
		this._simpleKanjiList = null;
	}

};
/************ End of the contents of vocab adjuster ****************/

})();
