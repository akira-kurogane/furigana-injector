//ユニコード文字列

var RubyInserter = {

	replacementNodesForTextSpan: function(ownerDocument, origText, matchingInstances) {
		var dummyParent = ownerDocument.createElement("div");
		dummyParent.appendChild(ownerDocument.createTextNode(origText));
		var mi;
		var currTextNode;
		var word_offset;
		var followingTextNode
		
		for (var i = 0; i < matchingInstances.length; i++) {
		
			mi = matchingInstances[i];
		
			//Skipping any words that are not pure hiragana and kanji compounds, e.g. "ラテン語"
			if (!mi.word.match(/^[\u3005\u3042\u3044\u3046\u3048\u304A-\u3093\u3400-\u9FBF]+$/))
				continue;

			for (var x = 0; x < dummyParent.childNodes.length; x++) {
				currTextNode = dummyParent.childNodes[x];
				if (currTextNode.nodeType != Node.TEXT_NODE) 
					continue;	//next node in dummyParent
				word_offset = currTextNode.data.indexOf(mi.word);
				if (word_offset >= 0) 
					break;	//found the correct text node
			}
			if (word_offset < 0) {
				continue;	//next mi
			}
			
			currTextNode.deleteData(word_offset, mi.word.length);
			followingTextNode = currTextNode.splitText(word_offset);
			
			var regexResult = mi.word.match(/^[\u3400-\u9FBF][\u3005\u3400-\u9FBF]*$/);
			if (regexResult) {
				dummyParent.insertBefore(RubyInserter.newRubyElement(ownerDocument, mi.word, mi.yomi), followingTextNode);
				continue;	//next mi
			}
			
			//TODO: Remove or disable this check once development is stable.
			var yomiCheckRegex = new RegExp("^" + mi.word.replace(/([\u3400-\u9FBF][\u3005\u3400-\u9FBF]*)/g, ".+") + "$");
			if (!mi.yomi.match(yomiCheckRegex)) {
				dummyParent.insertBefore(ownerDocument.createTextNode(mi.word), followingTextNode);	//re-insert the original word string
				FIMecabParser.consoleService.logStringMessage("The yomi \"" + mi.yomi + "\" doesn't seem to be compatible with the word \"" + mi.word + "\"");
				continue;	//next mi
			}

			var kanjiSubStrs = mi.word.match(/([\u3400-\u9FBF][\u3005\u3400-\u9FBF]*)/g);
			if (kanjiSubStrs) {
				var rb_vals = [];
				var rt_vals = [];
				var tempWord = mi.word;
				var tempYomi = mi.yomi;
				var kanjiStartPos;
				var nextKanjiStartPos;
				var followingOkurigana;
				for (var x = 0; x < kanjiSubStrs.length; x++) {
					kanjiStartPos = tempWord.indexOf(kanjiSubStrs[x]);
					if (kanjiStartPos > 0) {	//non-kanji substring in tempWord before the kanji word
						rb_vals.push(tempWord.substr(0, kanjiStartPos));
						rt_vals.push("");
						tempWord = tempWord.substring(kanjiStartPos);	//delete tempWord up to that length
						tempYomi = tempYomi.substring(kanjiStartPos);	//delete tempYomi up to that length
					}
					if (x < kanjiSubStrs.length - 1) {
						nextKanjiStartPos = tempWord.indexOf(kanjiSubStrs[x + 1]);
						followingOkurigana = tempWord.substring(kanjiSubStrs[x].length, nextKanjiStartPos);
						rb_vals.push(kanjiSubStrs[x]);
						rt_vals.push(tempYomi.substring(0, tempYomi.indexOf(followingOkurigana)));
						rb_vals.push(tempWord.substring(kanjiSubStrs[x].length, nextKanjiStartPos));
						rt_vals.push("");
						tempWord = tempWord.substring(nextKanjiStartPos);	//delete tempWord up to that length
						tempYomi = tempYomi.substring(tempYomi.indexOf(followingOkurigana) + followingOkurigana.length);	//delete tempYomi up to that length
					} else {
						rb_vals.push(kanjiSubStrs[x]);
						tempWord = tempWord.substring(kanjiSubStrs[x].length);
						rt_vals.push(tempYomi.substring(0, tempYomi.length - tempWord.length));
						rb_vals.push(tempWord);	//non-kanji trailing part
						rt_vals.push("");
					}
				}
//FIMecabParser.consoleService.logStringMessage("final rbs = [\"" + rb_vals.join("\", \"") + "\"] and rts = [\"" + rt_vals.join("\", \"") + "\"]");
				dummyParent.insertBefore(RubyInserter.newRubyElement(ownerDocument, rb_vals, rt_vals), followingTextNode);
				continue;	//next mi
			}

			//dump("Programming Error- unmatched pattern type for word " + mi.word + "/" + mi.yomi + "\n");
FIMecabParser.consoleService.logStringMessage("Programming Error- unmatched pattern type for word " + mi.word + "/" + mi.yomi + "\n");
			dummyParent.insertBefore(RubyInserter.newRubyElement(ownerDocument, mi.word, mi.yomi), followingTextNode);
			
		}
		
		dummyParent.normalize();
		var tempNode = dummyParent.firstChild;
		var deletionNode;
		while (tempNode) {
			if (tempNode.nodeType == Node.TEXT_NODE && tempNode.data.length == 0) {
				deletionNode = tempNode;
				tempNode = tempNode.nextSibling;
				dummyParent.removeChild(deletionNode);
			} else {
				tempNode = tempNode.nextSibling;
			}
		}
		
		return dummyParent;
	}, 
	
	newRubyElement: function(ownerDocument, rb_vals, rt_vals) {
		var new_ruby = ownerDocument.createElement("ruby");
		//TODO: check if this attribute is still needed by recent versions of the XHTML Ruby Support module
		new_ruby.setAttribute('moz-ruby-parsed', "done");	//Removing this will prevent CSS styling from the Ruby Support extension from being applied
		
		if (typeof rb_vals == "object") {	//i.e. this is complex ruby
			for (var x = 0; x < rb_vals.length; x++) {
				if (rb_vals[x] == rt_vals[x])
					rt_vals[x] = "";
			}
			new_ruby.innerHTML = "<rbc><rb>" + rb_vals.join("</rb><rb>") + "</rb></rbc>" +
				"<rp>(</rp><rtc><rt>" + rt_vals.join("</rt><rt>") + "</rt></rtc><rp>)</rp>";
		} else {
			new_ruby.innerHTML = "<rb>" + rb_vals + "</rb><rp>(</rp><rt>" + rt_vals + "</rt><rp>)</rp>";
		}
		return new_ruby;
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
	}
};
