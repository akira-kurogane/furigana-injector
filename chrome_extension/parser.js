﻿var extBgPort = chrome.extension.connect();
extBgPort.onMessage.addListener(onExtBgMsgRecieved);
var userKanjiRegexp;
var includeLinkText;
var kanjiTextNodes = {};	//This object will be used like a hash
var submittedKanjiTextNodes = {};

chrome.extension.sendRequest({message: "config_values_request"}, function(response) {
	userKanjiRegexp = new RegExp("[" + response.userKanjiList + "]");
	includeLinkText = JSON.parse(response.includeLinkText);
	//Init anything for the page?
});

/*****************
 *	Functions
 *****************/
function scanForKanjiTextNodes() {
	//Scan all text for /[\u3400-\u9FBF]/, then add each text node that isn't made up only of kanji only in the user's simple kanji list
	var xPathPattern = '//*[not(ancestor-or-self::head) and not(ancestor::select) and not(ancestor-or-self::script)and not(ancestor-or-self::ruby)' + (includeLinkText ? '' : ' and not(ancestor-or-self::a)') + ']/text()[normalize-space(.) != ""]';

	var foundNodes = {};
	var maxTextLength = 2730;	//There's a input buffer length limit in Mecab.
	var splitNodes = {};	//for holding nodes that need to be split up due to excessive string length.
	try {
		var iterator = document.evaluate(xPathPattern, document.body, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
		var nodeCtr = 100;
		var thisNode ;
		while (thisNode = iterator.iterateNext()) {
			if (thisNode.textContent.match(/[\u3400-\u9FBF]/)) {
				if (hasOnlySimpleKanji(thisNode.textContent) === false) {
					foundNodes[nodeCtr] = thisNode;
					if (thisNode.textContent.length > maxTextLength) {
						splitNodes[nodeCtr] = shortTextParts(thisNode.textContent, maxTextLength);
						nodeCtr += splitNodes[nodeCtr].length - 1;	//make a gap in the idx range to splice these in later.
					}
				}
			}
			nodeCtr++;
		}
	} catch (e) {
		alert( 'Error during XPath document iteration: ' + e );
	}
	//Devnote: doing this split of long text nodes after the XPath iteration above 
	//   because editing any node above apparently invalidates the iterator
	for (x in splitNodes) {
		x = x - 0;	//force x to be numeric type
		var currNode = foundNodes[x];
		var textParts = splitNodes[x];
		currNode.data = textParts[0];
		//if (!currNode.data.match(/[\u3400-\u9FBF]/) || hasOnlySimpleKanji(currNode.data) !== false)
		//	delete foundNodes[x];
		for (var y = 1; y < textParts.length; y++) {
			if (currNode.nextSibling)
				currNode = currNode.parentNode.insertBefore(document.createTextNode(textParts[y]), currNode.nextSibling);
			else
				currNode = currNode.parentNode.appendChild(document.createTextNode(textParts[y]));
			//if (currNode.data.match(/[\u3400-\u9FBF]/) || hasOnlySimpleKanji(currNode.data) === false)
				foundNodes[x + y] = currNode;	
		}
	}
	return foundNodes;
}

function submitKanjiTextNodes(keepAllRuby) {
	var msgData = {message: "text_to_furiganize", keepAllRuby: keepAllRuby};
	msgData.textToFuriganize = {};
	var strLength = 0;
	for (key in kanjiTextNodes) {
		if (kanjiTextNodes[key] && kanjiTextNodes[key].data) {
			strLength += kanjiTextNodes[key].data.length;
			msgData.textToFuriganize[key] = kanjiTextNodes[key].data;	//reduce the nodes just to strings for passing to the background page.
			submittedKanjiTextNodes[key] = kanjiTextNodes[key];
		}
		delete kanjiTextNodes[key];	//unset each member as done.
		if (strLength > 3500)	//Stop on length of 3500 chars (apparently ~50kb data in POST form).
			break;
	}
	extBgPort.postMessage(msgData);
}

function hasOnlySimpleKanji(rubySubstr) {
	var foundKanji = rubySubstr.match(/[\u3400-\u9FBF]/g);
	if (foundKanji) {
		for (var x = 0; x < foundKanji.length; x++) {
			if (!userKanjiRegexp.exec(foundKanji[x]))
				return false;
		}
	} else {
		return null;
	}
	return true;
}

function revertRubies() {
	var rubies = document.getElementsByTagName("RUBY");
	while (rubies.length > 0) {
		var rubyElem = rubies.item(0);	//this iterates because this item will be removed, shortening the list
		var newText = "";
		var childNd = rubyElem.firstChild;
		while (childNd) {
			newText += childNd.nodeType == Node.TEXT_NODE ? childNd.data : (childNd.tagName != "RT" && childNd.tagName != "RP" ? childNd.innerText : "");
			childNd = childNd.nextSibling;
		}
		rubyElem.parentNode.replaceChild(document.createTextNode(newText), rubyElem);
	}
	document.body.removeAttribute("fiprocessed");
}

function shortTextParts(origTxt, maxLength) {
	if (!maxLength)	//error
		return [origTxt];
	var substrParts = [];
	var offset = 0;
	while (offset + maxLength < origTxt.length) {
		var strTemp = origTxt.substr(offset, maxLength);
		var matches = strTemp.match(/^[\s\S]+[。\?\!？！]/);	//characters that end a sentence 
		if (matches)
			strTemp = matches[0];
		substrParts.push(strTemp);
		offset += strTemp.length;
	}
	substrParts.push(origTxt.substr(offset));
	return substrParts;
}

function isEmpty(obj) {
	for(var prop in obj) {
		if(obj.hasOwnProperty(prop))
			return false;
	}
	return true;
}

/*** Events ***/
function onExtBgMsgRecieved(data) {
	if (data.message && data.message == "toggle_furigana") {
		if (document.body.hasAttribute("fiprocessed")) {
			revertRubies();
			extBgPort.postMessage({message: "reset_page_action_icon"});	//icon can only be changed by background page
			kanjiTextNodes = {};
		} else if (document.body.hasAttribute("fiprocessing")) {
			//alert("Wait a sec, still awaiting a reply from the furigana server.");
		} else {
			kanjiTextNodes = scanForKanjiTextNodes();
			if (!isEmpty(kanjiTextNodes)) {
				document.body.setAttribute("fiprocessing", "true");
				submitKanjiTextNodes(false);	//The background page will respond with data including a "furiganizedTextNodes" member, see below.
			} else {
				alert("No text with kanji above your level found. Sorry, false alarm!");
			}
		}
	} else if (data.furiganizedTextNodes) {	//i.e. the response from submitKanjiTextNodes()
		for (key in data.furiganizedTextNodes) {
			if (submittedKanjiTextNodes[key]) {	//Todo: check the node still valid?
				var tempDocFrag = document.createDocumentFragment();
				var dummyParent = document.createElement("DIV");
				dummyParent.innerHTML = data.furiganizedTextNodes[key];
				while(dummyParent.firstChild)
					tempDocFrag.appendChild(dummyParent.firstChild);
				submittedKanjiTextNodes[key].parentNode.replaceChild(tempDocFrag, submittedKanjiTextNodes[key]);
				delete submittedKanjiTextNodes[key];
			}
		}
		if (!isEmpty(kanjiTextNodes)) {
			submitKanjiTextNodes(false);
		} else {
			kanjiTextNodes = {};	//clear the entire hash. Delete this logic if requests are processed in multiple batches.
			document.body.removeAttribute("fiprocessing");
			document.body.setAttribute("fiprocessed", "true");
			extBgPort.postMessage({message: "show_page_processed"});
		}
	} else if (data.message && data.message == "xhr_request_timeout") {
		alert("Request to fetch data from furigana server timed out. Sorry.");
		document.body.removeAttribute("fiprocessing");
		extBgPort.postMessage({message: "reset_page_action_icon"});
	} else if (data.message && data.message == "xhr_request_failed") {
		alert("Request to fetch data from furigana server failed (" + 
			(data.status === 0 ? "server died mid-request" : "status: " + data.status) + ")");
		extBgPort.postMessage({message: "reset_page_action_icon"});
		document.body.removeAttribute("fiprocessing");
	} else if (data.message && data.message == "wwwjdic_gloss" && 
		reflectWWWJDICGloss /*a function in activate_wwwjdic_lookup.js*/) {
		reflectWWWJDICGloss(data);
	} else {
		alert("Unexpected msg received in onExtBgMsgReceived()" + JSON.stringify(data).substr(0,200));
	}
}
