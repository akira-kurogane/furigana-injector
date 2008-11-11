//ユニコード文字列

/******************************************************
 *	Unit Tests 
 ******************************************************/
var utmodFuriganaInjector = new UnitTestModule("FuriganaInjector", [

	new UnitTestItem("Basic var existence", 
		function() { 
			return FuriganaInjector && typeof FuriganaInjector == "object"; 
		}
	), 

	new UnitTestItem("Current initialization status", 
		function() { 
			return FuriganaInjector.initialized; 
		}
	), 

	new UnitTestItem("FuriganaInjectorWebProgressListener existence", 
		function() { 
			return FuriganaInjectorWebProgressListener && typeof FuriganaInjectorWebProgressListener == "object"; 
		}
	), 

	new UnitTestItem("FuriganaInjectorPrefsObserver existence", 
		function() { 
			return FuriganaInjectorPrefsObserver && typeof FuriganaInjectorPrefsObserver == "object"; 
		}
	), 
		
	new UnitTestItem("getPref(prefName)", 
		function() { 
			var bPrefGetVal = FuriganaInjector.getPref("auto_process_all_pages");
			return typeof bPrefGetVal == "boolean";
		}
	), 
		
	new UnitTestItem("setPref(prefName, val)", 
		function() { 
			var origBoolVal = FuriganaInjector.getPref("auto_process_all_pages");
			if (typeof origBoolVal != "boolean")
				throw("Preliminary step 'getPref(\"auto_process_all_pages\")' failed to retrieve a boolean value");
			FuriganaInjector.setPref("auto_process_all_pages", !origBoolVal);	//reverse the pref value
			if (FuriganaInjector.getPref("auto_process_all_pages") == origBoolVal) 
				return false;
			FuriganaInjector.setPref("auto_process_all_pages", origBoolVal);	//restore the pref value
			return FuriganaInjector.getPref("auto_process_all_pages") == origBoolVal;
		}
	), 
		
	new UnitTestItem("isUnihanChar(testChar)", 
		function() { 
			return VocabAdjuster.isUnihanChar("一") /*\u4E00*/ && VocabAdjuster.isUnihanChar("件") /*\u4EF6*/ && //common ideographs
				VocabAdjuster.isUnihanChar("\u9FBB") && VocabAdjuster.isUnihanChar("\u3400") &&	//less common ideographs
				VocabAdjuster.isUnihanChar("\u34FF") && VocabAdjuster.isUnihanChar("\u4DB5") && 	//less common ideographs
				//False cases below
				!VocabAdjuster.isUnihanChar("0") && !VocabAdjuster.isUnihanChar("a") &&   //latin
				!VocabAdjuster.isUnihanChar("\u0113") && !VocabAdjuster.isUnihanChar("\u0E05") &&   //extended latin, thai
				!VocabAdjuster.isUnihanChar("ぁ") && !VocabAdjuster.isUnihanChar("を") &&   //hiragana
				!VocabAdjuster.isUnihanChar("マ") && !VocabAdjuster.isUnihanChar("\u31FD") &&   //katakana, ext. katakan
				!VocabAdjuster.isUnihanChar("９") && !VocabAdjuster.isUnihanChar("ｹ") &&   //fullwidth latin and half-width katakana
				!VocabAdjuster.isUnihanChar("\u3109") && !VocabAdjuster.isUnihanChar("\u31B7") &&   //bopomofo
				!VocabAdjuster.isUnihanChar("\u2EC7") && !VocabAdjuster.isUnihanChar("\u2F00") &&   //CJK radical, Ki radical
				!VocabAdjuster.isUnihanChar("\u31C1");  //CJK stroke
		}
	)
	
	//TODO:
	//FuriganaInjector.lookupAndInjectFurigana(text_parent_element, process_links)
	//FuriganaInjector.parseTextBlockForWordVsYomi(textBlock, ignoreVocabAdjuster) - test in co-ord with VocabAdjuster
	//getNextTextOrElemNode(nd, topElem) 
	//getPrevTextOrElemNode(nd, topElem)
	//getTextBlocks(topElem, includeLinkText)	//N.B. maybe this functionality will be moved into FITextBlock.prototype
	//converKatakanaToHiragana(katakanaStr)
	//revertRubys(parentElement)
		
	]
);

FuriganaInjectorUnitTester.addUTM(utmodFuriganaInjector);

/******* Testing notes ********************************************************
	There are number of GUI events, or window-level events that can only be tested by manual 
	  GUI testing. These are:
	  	* That the onLoad(), onPageLoad(), onUnload(), onLocationChange(), and 
	  	  onWindowProgressStateStop actions occur.
	  	* The options window, status bar menu and context menu open when clicked, and that 
	  	  the actions for their items also work when clicked.
	  	* That the statusbar icon changes to the correct icon after various actions.
	  	* That processWholeDocument does do the whole document, and the 
	  	  processWholeDocumentCallback() function is called at the end.
	  	* Ditto for the context selection functions.
	  	* revertAllRubys()
 ******************************************************************************/


/*****************************************************************/
var utmodFuriganaInjectorPrefsObserver = new UnitTestModule("FuriganaInjectorPrefsObserver", [

	new UnitTestItem("Basic var existence", 
		function() { 
			return FuriganaInjectorPrefsObserver && typeof FuriganaInjectorPrefsObserver == "object"; 
		}
	), 

	new UnitTestItem("_branch member exists and supports nsIPrefBranch2", 
		function() { 
			return FuriganaInjectorPrefsObserver._branch && typeof FuriganaInjectorPrefsObserver._branch == "object" && 
				(FuriganaInjectorPrefsObserver._branch instanceof Components.interfaces.nsIPrefBranch2);
		}
	)
	
	//It would be ideal if FuriganaInjectorPrefsObserver could also be confirmed to be attached 
	// as an observer to the preferences events.
		
	]
);

FuriganaInjectorUnitTester.addUTM(utmodFuriganaInjectorPrefsObserver);


/*****************************************************************/
var utmodFITextBlock = new UnitTestModule("FITextBlock", [
	
	new UnitTestItem("new FITextBlock(doc, startnode, startoffset, endnode, endoffset)", //test that addTextNode() and a addTextNodeAtFront() have the correct effect- check using fib.concatText;
		function() { 			
			var dummyDiv = content.document.createElement("DIV");
			var textNode0 = content.document.createTextNode("text node 0.");
			var textNode1 = content.document.createTextNode("text node 1.");
			var textNode2 = content.document.createTextNode("text node 2.");
			var textNode3 = content.document.createTextNode("text node 3.");
			var textNode4 = content.document.createTextNode("text node 4.");
			var textNode5 = content.document.createTextNode("text node 5.");
			dummyDiv.appendChild(textNode0);
			dummyDiv.appendChild(textNode1);
			dummyDiv.appendChild(textNode2);
			dummyDiv.appendChild(textNode3);
			dummyDiv.appendChild(textNode4);
			dummyDiv.appendChild(textNode5);
			
			var tempFiTB = new FITextBlock(dummyDiv.ownerDocument, textNode1, 2, textNode4, textNode4.data.length - 4);
			
			return !tempFiTB.skipRubyInserts[0]&& !tempFiTB.skipRubyInserts[1] && //nodes 1 and 2
				!tempFiTB.skipRubyInserts[2] && !tempFiTB.skipRubyInserts[3] && //nodes 3 and 4
				tempFiTB.concatText == (textNode1.data + textNode2.data + textNode3.data + textNode4.data) &&
				tempFiTB.ownerDocument == dummyDiv.ownerDocument && 
				tempFiTB.selStartOffset == 2 && tempFiTB.selEndOffset == (textNode4.data.length - 4);

		}
	),
	
	new UnitTestItem("addTextNode() and addTextNodeAtFront()", //test that addTextNode() and a addTextNodeAtFront() have the correct effect- check using fib.concatText;
		function() { 			
			var dummyDiv = content.document.createElement("DIV");
			var textNode0 = content.document.createTextNode("text node 0.");
			var textNode1 = content.document.createTextNode("text node 1.");
			var textNode2 = content.document.createTextNode("text node 2.");
			var textNode3 = content.document.createTextNode("text node 3.");
			var textNode4 = content.document.createTextNode("text node 4.");
			var textNode5 = content.document.createTextNode("text node 5.");
			var textNode6 = content.document.createTextNode("text node 6.");
			var textNode7 = content.document.createTextNode("text node 7.");
			var textNode8 = content.document.createTextNode("text node 8.");
			dummyDiv.appendChild(textNode0);
			dummyDiv.appendChild(textNode1);
			dummyDiv.appendChild(textNode2);
			dummyDiv.appendChild(textNode3);
			dummyDiv.appendChild(textNode4);
			dummyDiv.appendChild(textNode5);
			dummyDiv.appendChild(textNode6);
			dummyDiv.appendChild(textNode7);
			dummyDiv.appendChild(textNode8);
			
			var tempFiTB = new FITextBlock(dummyDiv.ownerDocument, textNode3, 0, textNode5, textNode5.data.length);
			
			tempFiTB.addTextNodeAtFront(textNode2, true);
			tempFiTB.addTextNode(textNode6, false);
			tempFiTB.addTextNode(textNode7, true);
			tempFiTB.addTextNodeAtFront(textNode1, false);
			
			return !tempFiTB.skipRubyInserts[0]&& tempFiTB.skipRubyInserts[1] && //nodes 1 and 2
				!tempFiTB.skipRubyInserts[2] && !tempFiTB.skipRubyInserts[3] && !tempFiTB.skipRubyInserts[4] && //nodes 3, 4 & 5
				!tempFiTB.skipRubyInserts[5] && tempFiTB.skipRubyInserts[6] && //nodes 6 & 7
				tempFiTB.concatText == (textNode1.data + textNode2.data + textNode3.data + textNode4.data + textNode5.data + textNode6.data 
					+ textNode7.data);
		}
	),
	
	//TODO:
	/*new UnitTestItem("expandToFullContext()", 	//test expandToFullContext does the right thing - expands back and forward, also stops on the right boundaries 
		//  (sentence boundary, certain element types such as TABLE, P, etc.)
		function() { 			
			var dummyBody = content.document.createElement("body");
			var dummyDiv = content.document.createElement("div");
			dummyDiv.innerHTML = "例日本語の文字列。取り込む。<a href=''>参照</a>。<ruby><rb>既</rb><rp>(</rp><rt>すで</rt><rp>)</rp></ruby>にあるルビー。";
			dummyBody.appendChild(dummyDiv);
			
			
			return zzzzzzzzz;
		}
	),*/

	new UnitTestItem("insertRubyElements()", 
		function() { 
			var dummyBody = content.document.createElement("body");
			var dummyDiv = content.document.createElement("div");
			dummyDiv.innerHTML = "例日本語の文字列。取り込む。<a href=''>参照</a>。<ruby><rb>既</rb><rp>(</rp><rt>すで</rt><rp>)</rp></ruby>にあるルビー。";
			dummyBody.appendChild(dummyDiv);

			var bIncludeLinkText = false;
			var tempFiTB = new FITextBlock(dummyDiv.ownerDocument, dummyDiv.firstChild, 0, dummyDiv.lastChild, dummyDiv.lastChild.data.length, 
				true);	//N.B. this time include text inside links
			//N.B. The FITextBlock(ownerDoc, startNode, startOffset, endNode, endOffset) constructor should automatically mark 
			//  textnodes inside ruby tags to be skipped for further ruby insertion. 

			tempFiTB.wordsVsYomis.push( {word: "例", yomi: "れい" } );
			tempFiTB.wordsVsYomis.push( {word: "文字", yomi: "もじ" } );
			tempFiTB.wordsVsYomis.push( {word: "列", yomi: "れつ" } );
			tempFiTB.wordsVsYomis.push( {word: "取り込む", yomi: "とりこむ" } );
			tempFiTB.wordsVsYomis.push( {word: "参照", yomi: "さんしょう" } );	//SHOULD be included if links are to being processed.
			tempFiTB.wordsVsYomis.push( {word: "照", yomi: "エラー" } );	//should not appear at all
			tempFiTB.wordsVsYomis.push( {word: "既", yomi: "すで" } );	//should not cause an extra ruby
			
			tempFiTB.insertRubyElements();
			var bResult = dummyDiv.innerHTML.match(/^<ruby[^\>]*><rb>例<\/rb><rp>\(<\/rp><rt>れい<\/rt><rp>\)<\/rp><\/ruby>日本語の<ruby[^\>]*><rb>文字<\/rb><rp>\(<\/rp><rt>もじ<\/rt><rp>\)<\/rp><\/ruby><ruby[^\>]*><rb>列<\/rb><rp>\(<\/rp><rt>れつ<\/rt><rp>\)<\/rp><\/ruby>。<ruby[^\>]*><rbc><rb>取<\/rb><rb>り<\/rb><rb>込<\/rb><rb>む<\/rb><\/rbc><rtc><rt>と<\/rt><rt><\/rt><rt>こ<\/rt><rt><\/rt><\/rtc><\/ruby>。<a href=""><ruby[^\>]*><rb>参照<\/rb><rp>\(<\/rp><rt>さんしょう<\/rt><rp>\)<\/rp><\/ruby><\/a>。<ruby[^\>]*><rb>既<\/rb><rp>\(<\/rp><rt>すで<\/rt><rp>\)<\/rp><\/ruby>にあるルビー。$/i);

			if (!bResult)
				return false;

			tempFiTB = null;
			dummyDiv = null;
			dummyBody = null;

			dummyBody = content.document.createElement("body");
			dummyDiv = content.document.createElement("div");
			dummyDiv.innerHTML = "例日本語の文字列。<a href=''>参照</a>。";
			dummyBody.appendChild(dummyDiv);

			bIncludeLinkText = false;
			tempFiTB = new FITextBlock(dummyDiv.ownerDocument, dummyDiv.firstChild, 0, dummyDiv.lastChild, dummyDiv.lastChild.data.length, 
				false); //N.B. This time skip text inside links

			tempFiTB.wordsVsYomis.push( {word: "例", yomi: "れい" } );
			tempFiTB.wordsVsYomis.push( {word: "文字", yomi: "もじ" } );
			tempFiTB.wordsVsYomis.push( {word: "列", yomi: "れつ" } );
			tempFiTB.wordsVsYomis.push( {word: "参照", yomi: "さんしょう" } );	//should NOT be included if links are to being processed.
			
			tempFiTB.insertRubyElements();
			var bResult = dummyDiv.innerHTML.match(/^<ruby[^\>]*><rb>例<\/rb><rp>\(<\/rp><rt>れい<\/rt><rp>\)<\/rp><\/ruby>日本語の<ruby[^\>]*><rb>文字<\/rb><rp>\(<\/rp><rt>もじ<\/rt><rp>\)<\/rp><\/ruby><ruby[^\>]*><rb>列<\/rb><rp>\(<\/rp><rt>れつ<\/rt><rp>\)<\/rp><\/ruby>。<a href="">参照<\/a>。$/i);
					
			return bResult ? true : false;

		}
	)
		
	]
);

FuriganaInjectorUnitTester.addUTM(utmodFITextBlock);
