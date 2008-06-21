//ユニコード文字列

var RubyInserter = {

	replaceTextNode: function(ownerDocument, origTextNode, matchingInstances) {
		var kPat = VocabAdjuster.kanjiPattern;
		var hPat = VocabAdjuster.hiraganaPattern;
		var hkPat = VocabAdjuster.kanjiHiraganaPattern;
		var kMixRegex = new RegExp("^(" + kPat + "+)$");
		var khMixRegex = new RegExp("^(" + kPat + "+)(" + hPat +"+)$");
		var khkMixRegex = new RegExp("^(" + kPat + "+)(" + hPat +"+)(" + kPat +"+)$");
		var khkhMixRegex = new RegExp("^(" + kPat + "+)(" + hPat +"+)(" + kPat +"+)(" + hPat +"+)$");
		//Todo: change this to a very long k+h+k+?h+?k+?h+? ... pattern, and use it as far as it matches?
		var regexResult;
		var rb_vals;
		var rt_vals;
		
		var targetParent = origTextNode.parentNode;
		var dummyParent = ownerDocument.createElement("div");
		var mi;
		var currTextNode;
		var word_offset;
		var followingTextNode
		dummyParent.appendChild(origTextNode.cloneNode(false));
		for (var i = 0; i < matchingInstances.length; i++) {
		
			mi = matchingInstances[i];
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
			
			regexResult = kMixRegex.exec(mi.word);
			if (regexResult) {
				dummyParent.insertBefore(RubyInserter.newRubyElement(ownerDocument, mi.word, mi.yomi), followingTextNode);
				continue;	//next mi
			}
			
			regexResult = khMixRegex.exec(mi.word);
			if (regexResult) {
				rb_vals = regexResult.slice(1, 3);
				rt_vals = [ mi.yomi.substr(0, mi.yomi.length - regexResult[2].length), ""];
				dummyParent.insertBefore(RubyInserter.newRubyElement(ownerDocument, rb_vals, rt_vals), followingTextNode);
				continue;	//next mi
			}
			
			regexResult = khkMixRegex.exec(mi.word);
			if (regexResult) {
				rb_vals = regexResult.slice(1, 4);	//[K1, h2, K3]
				rt_vals = mi.yomi.split(regexResult[2]);	//[h1, h3]
				rt_vals = rt_vals.splice(1, 0, "");	//[h1, "", h3]
				dummyParent.insertBefore(RubyInserter.newRubyElement(ownerDocument, rb_vals, rt_vals), followingTextNode);
				continue;	//next mi
			}
			
			regexResult = khkhMixRegex.exec(mi.word);
			if (regexResult) {
				rb_vals = regexResult.slice(1, 5);	//[K1, h2, K3, h4]
				rt_vals = mi.yomi.substr(0, mi.yomi.length - regexResult[4].length).split(regexResult[2]);	//[h1, h3]
				//N.B. design flaw: the above will fail if H2 occurs within the yomi of K1.
				rt_vals.splice(1, 0, "");	//[h1, "", h3]
				rt_vals[3] = "";	//[h1, "", h3, ""]
				dummyParent.insertBefore(RubyInserter.newRubyElement(ownerDocument, rb_vals, rt_vals), followingTextNode);
				continue;	//next mi
			}
			//dump("Programming Error- unmatched pattern type for word " + mi.word + "/" + mi.yomi + "\n");
			Utilities.log("Programming Error- unmatched pattern type for word " + mi.word + "/" + mi.yomi + "\n");
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
		while (dummyParent.hasChildNodes()) {
			targetParent.insertBefore(dummyParent.firstChild, origTextNode);
		}
		targetParent.removeChild(origTextNode);
		dummyParent = null;
	}, 
	
	newRubyElement: function(ownerDocument, rb_vals, rt_vals) {
		var new_ruby = ownerDocument.createElement("ruby");
		//new_ruby.setAttribute('_moz-userdefined', true);	//this didn't have any apparent affect in testing 2007/12/29
		new_ruby.setAttribute('moz-ruby-parsed', "done");	//Removing this will prevent CSS styling from the Ruby Support extension from being applied
		
		if (typeof rb_vals == "object") {	//i.e. this is complex ruby
			for (var x = 0; x < rb_vals.length; x++) {
				if (rb_vals[x] == rt_vals[x])
					rt_vals[x] = "";
			}
			new_ruby.innerHTML = "<rbc><rb>" + rb_vals.join("</rb><rb>") + "</rb></rbc>" +
				"<rtc><rt>" + rt_vals.join("</rt><rt>") + "</rt></rtc>";
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
	rubyBaseText: function (rubyElem) {
		var tempChildNodes;
		var rbText = "";
		tempChildNodes = rubyElem.getElementsByTagName("RB");
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
		return rbText;
	}
	
};
