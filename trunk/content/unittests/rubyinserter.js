//ユニコード文字列

/******************************************************
 *	Unit Tests 
 ******************************************************/
var utmodRubyInserter = new UnitTestModule("RubyInserter", [

	new FIUnitTestItem("Basic var existence", 
		function() { 
			return RubyInserter && typeof RubyInserter == "object"; 
		}
	), 
		
	new FIUnitTestItem("replaceTextNode(ownerDocument, origTextNode, matchingInstances)", 
		function() { 
			var dummyDiv = content.document.createElement("div");
			var origTextNode = content.document.createTextNode("例日本語の文字列。取り込む。");
			dummyDiv.appendChild(origTextNode);
			var matchingInstances = [
				{ word: "日本語", yomi: "nihongo" }, 
				{ word: "文字列", yomi: "もじれつ" }, 
				{ word: "取り込む", yomi: "とりこむ" }
				//TODO: should I include some bad matches in here, e.g. 'surfaces' changed from full-width to half-width or v.v. 
				//  to test that they are ignored/matched suitably?
			];
			RubyInserter.replaceTextNode(content.document, origTextNode, matchingInstances);

			return dummyDiv.childNodes.length == 7 && dummyDiv.childNodes[0].data == "例" && 
				dummyDiv.childNodes[1].tagName == "RUBY" && dummyDiv.childNodes[1].getAttribute("moz-ruby-parsed") == "done" && 
				dummyDiv.childNodes[1].innerHTML == "<rb>日本語</rb><rp>(</rp><rt>nihongo</rt><rp>)</rp>" && 
				dummyDiv.childNodes[2].data == "の" && 
				dummyDiv.childNodes[3].tagName == "RUBY" && dummyDiv.childNodes[3].getAttribute("moz-ruby-parsed") == "done" && 
				dummyDiv.childNodes[3].innerHTML == "<rb>文字列</rb><rp>(</rp><rt>もじれつ</rt><rp>)</rp>" && 
				dummyDiv.childNodes[4].data == "。" && 
				dummyDiv.childNodes[5].tagName == "RUBY" && dummyDiv.childNodes[3].getAttribute("moz-ruby-parsed") == "done" && 
				dummyDiv.childNodes[5].innerHTML == "<rbc><rb>取</rb><rb>り</rb><rb>込</rb><rb>む</rb></rbc>" + 
					"<rtc><rt>と</rt><rt></rt><rt>こ</rt><rt></rt></rtc>" && 
				dummyDiv.childNodes[6].data == "。";
		}
	), 

	new FIUnitTestItem("RubyInserter.newRubyElement(ownerDocument, rb_val, rt_val)", 
		function() { 
			var simpleDummyRuby = RubyInserter.newRubyElement(content.document, "RBTEXT", "RTTEXT");
			if (!simpleDummyRuby || simpleDummyRuby.tagName != "RUBY" || !simpleDummyRuby.hasChildNodes()) 
				return false;
			if (simpleDummyRuby.innerHTML != "<rb>RBTEXT</rb><rp>(</rp><rt>RTTEXT</rt><rp>)</rp>") {
				return false;
			}
			
			var complexDummyRuby = RubyInserter.newRubyElement(content.document, ["RB1", "RB2"], ["RT1", ""]);
			if (!complexDummyRuby || complexDummyRuby.tagName != "RUBY" || !complexDummyRuby.hasChildNodes()) 
				return false;
			return complexDummyRuby.innerHTML == "<rbc><rb>RB1</rb><rb>RB2</rb></rbc><rtc><rt>RT1</rt><rt></rt></rtc>";
		}
	) , 

	new FIUnitTestItem("revertRuby(rubyElem)", 
		function() { 
			var dummyDiv = content.document.createElement("div");
			var headTextNode = content.document.createTextNode("RBTEXT in leading text node: ");
			dummyDiv.appendChild(headTextNode);
			var rubyElem2 = content.document.createElement("RUBY"); 
			rubyElem2.innerHTML = "<rb>RBTEXT</rb><rp>(</rp><rt>RTTEXT</rt><rp>)</rp";
			var rubyElem3 = content.document.createElement("RUBY");
			rubyElem3.innerHTML = "<rbc><rb>取</rb><rb>り</rb><rb>込</rb><rb>む</rb></rbc>" + 
					"<rtc><rt>と</rt><rt></rt><rt>こ</rt><rt></rt></rtc>";
			dummyDiv.appendChild(rubyElem2);
			dummyDiv.appendChild(rubyElem3);
			var trailingTextNode = content.document.createTextNode("。");
			dummyDiv.appendChild(trailingTextNode);
			
			//Devnote: no testing for the type of badly-formatted ruby which has text outside of the RB, RP or RT tags.

			RubyInserter.revertRuby(rubyElem2);
			if (!dummyDiv.innerHTML.match(/^RBTEXT in leading text node: RBTEXT<ruby[^\>]*><rbc><rb>取<\/rb><rb>り<\/rb><rb>込<\/rb><rb>む<\/rb><\/rbc><rtc><rt>と<\/rt><rt><\/rt><rt>こ<\/rt><rt><\/rt><\/rtc><\/ruby>。$/i))
				return false;
			
			RubyInserter.revertRuby(rubyElem3);
			return dummyDiv.innerHTML.match(/^RBTEXT in leading text node: RBTEXT取り込む。$/i);
		}
	) 
	
	//No way to unit-test rubySupportedNatively, except by comparing the result against a fixed list of Firefox versions vs true/false (and all would be false for now).
		
	]
);

FuriganaInjectorUnitTester.addUTM(utmodRubyInserter);
