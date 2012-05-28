/***************************************************************
 *	This script set to run_at document load. See manifest.json.
 ***************************************************************/
var userKanjiRegexp;
var includeLinkText = false;
chrome.extension.sendRequest({message: "config_values_request"}, function(response) {
	userKanjiRegexp = new RegExp("[" + response.userKanjiList + "]");
	includeLinkText = JSON.parse(response.includeLinkText);
	//Having received the config data, start searching for relevant kanji
	//If none find, do nothing for now except start a listener for node insertions
	if (findKanjiTextNode(document.body))
		chrome.extension.sendRequest({message: "init_tab_for_fi"});
	else
		document.addEventListener("DOMNodeInserted", DOMNodeInsertedHandler);
//document.addEventListener("DOMCharacterDataModified", function(e) { console.log("DOMCharacterDataModified: " + e.newValue); } );
});


function DOMNodeInsertedHandler(e) {
	if (findKanjiTextNode(e.target)) {
		document.removeEventListener("DOMNodeInserted", DOMNodeInsertedHandler);
		chrome.extension.sendRequest({message: "init_tab_for_fi"});
	}
}

function findKanjiTextNode(topNode) {
	var xPathPattern = '//*[not(ancestor-or-self::head) and not(ancestor::select) and not(ancestor-or-self::script)and not(ancestor-or-self::ruby)' + (includeLinkText ? '' : ' and not(ancestor-or-self::a)') + ']/text()[normalize-space(.) != ""]';
	try {
		var iterator = document.evaluate(xPathPattern, topNode, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
		var thisNode ;
		while (thisNode = iterator.iterateNext()) {
			if (thisNode.textContent.match(/[\u3400-\u9FBF]/)) {
				if(!hasOnlySimpleKanji(thisNode.textContent))
					return true;
			}
		}
	} catch (e) {
		console.log( 'Furigana Injector error during XPath document iteration: ' + e );
		//alert( 'Furigana Injector error during XPath document iteration: ' + e );
	}
	return false;
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
