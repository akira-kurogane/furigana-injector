//ユニコード文字列

var RubyInserter = {

	replaceTextNode: function(ownerDocument, origTextNode, matchingInstances) {
		var tempDocFrag = ownerDocument.createDocumentFragment();
		var dummyParent = ownerDocument.createElement("DIV");
		dummyParent.innerHTML = this.insertRubiesAsHTML(origTextNode.data, matchingInstances);
		var original_len = dummyParent.childNodes.length
		while(dummyParent.firstChild)
			tempDocFrag.appendChild(dummyParent.firstChild);
		origTextNode.parentNode.replaceChild(tempDocFrag, origTextNode);
	},
	
	insertRubiesAsHTML: function(origText, matchingInstances) {
		var mi;
		var newHTMLPieces = [ ];
		var word_offset;
		var search_base_offset = 0;
		
		for (var i = 0; i < matchingInstances.length; i++) {
		
			mi = matchingInstances[i];
		
			//Skipping any words that are not pure hiragana and kanji compounds, e.g. "ラテン語"
			if (!mi.word.match(/^[\u3005\u3042\u3044\u3046\u3048\u304A-\u3093\u3400-\u9FBF]+$/))
				continue;

			word_offset = origText.indexOf(mi.word, search_base_offset);
			if (word_offset < 0) 
				continue;	//couldn't find a match

			newHTMLPieces.push(origText.substr(search_base_offset, word_offset - search_base_offset));
			search_base_offset = word_offset + mi.word.length;
			
			var regexResult = mi.word.match(/^[\u3400-\u9FBF][\u3005\u3400-\u9FBF]*$/);
			if (regexResult) {
				newHTMLPieces.push(RubyInserter.newRubyHTML(mi.word, mi.yomi));
				continue;	//next mi
			}
			
			//TODO: Remove or disable this check once development is stable.
			var yomiCheckRegex = new RegExp("^" + mi.word.replace(/([\u3400-\u9FBF][\u3005\u3400-\u9FBF]*)/g, ".+") + "$");
			if (!mi.yomi.match(yomiCheckRegex)) {
				newHTMLPieces.push(mi.word);//re-insert the original word string
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
				newHTMLPieces.push(RubyInserter.newRubyHTML(rb_vals, rt_vals));
				continue;	//next mi
			}

			//dump("Programming Error- unmatched pattern type for word " + mi.word + "/" + mi.yomi + "\n");
FIMecabParser.consoleService.logStringMessage("Programming Error- unmatched pattern type for word " + mi.word + "/" + mi.yomi + "\n");
			newHTMLPieces.push(RubyInserter.newRubyHTML(mi.word, mi.yomi));
			
		}
		
		newHTMLPieces.push(origText.substr(search_base_offset));	//the last section of the string
		
		return newHTMLPieces.join("");
	}, 
	
	newRubyHTML: function(rb_vals, rt_vals) {
		//TODO: check if this attribute is still needed by recent versions of the XHTML Ruby Support module
		//new_ruby.setAttribute('moz-ruby-parsed', "done");	//Removing this will prevent CSS styling from the Ruby Support extension from being applied
		
		if (typeof rb_vals == "object") {	//i.e. this is complex ruby
			for (var x = 0; x < rb_vals.length; x++) {
				if (rb_vals[x] == rt_vals[x])
					rt_vals[x] = "";
			}
			newRubyStr = "<ruby><rbc><rb>" + rb_vals.join("</rb><rb>") + "</rb></rbc>" +
				"<rp>(</rp><rtc><rt>" + rt_vals.join("</rt><rt>") + "</rt></rtc><rp>)</rp></ruby>";
		} else {
			newRubyStr = "<ruby><rb>" + rb_vals + "</rb><rp>(</rp><rt>" + rt_vals + "</rt><rp>)</rp></ruby>";
		}
		return newRubyStr;
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
