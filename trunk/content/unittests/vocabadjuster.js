//ユニコード文字列

/******************************************************
 *	Unit Tests 
 ******************************************************/
var utmodVocabAdjuster = new UnitTestModule("VocabAdjuster", [

	new UnitTestItem("Basic var existence", 
		function() { 
			return VocabAdjuster && typeof VocabAdjuster == "object"; 
		}
	), 
	
	new UnitTestItem("removeSimpleWords(matchingTextNodeInstances)", 
		function() { 
			var allSimpleKanji = VocabAdjuster.getSimpleKanjiList();
			var simpleKanji1 = allSimpleKanji.charAt(0);
			var simpleKanji2 = allSimpleKanji.charAt(allSimpleKanji.length - 1);
			var difficultKanji1 = "譫";
			var difficultKanji2 = "黶";
			if(allSimpleKanji.indexOf(difficultKanji1) >= 0 || allSimpleKanji.indexOf(difficultKanji2) >= 0) 
				throw("N/A. Test-use difficult level kanji found in user's list of 'simple' kanji.");
			if (!simpleKanji1)
				throw("N/A. The Kanji Exclusion list is presently empty");
			var simpleWords = [
				simpleKanji1, 
				"ああ" + simpleKanji1, 
				simpleKanji1 + simpleKanji2, 
				"ああ" + simpleKanji1 + simpleKanji2, 
				simpleKanji1 + "られる"
			];
			var difficultWords = [
				simpleKanji1 + difficultKanji1, 
				simpleKanji1 + difficultKanji1 + "すて", 
				"ああ" + simpleKanji1 + difficultKanji1 + "すて", 
				difficultKanji1, 
				difficultKanji1 + difficultKanji2, 
				difficultKanji1 + "すて",
				"ああ" + difficultKanji1
			];
			var testMatches = [];
			for (var x = 0; x < simpleWords.length; x++) 
				testMatches.push( { word: simpleWords[x], yomi: "dummy yomikata" } );
			for (var x = 0; x < difficultWords.length; x++) 
				testMatches.push( { word: difficultWords[x], yomi: "dummy yomikata" } );
			var junkTextNode = document.createTextNode("");
			var junkTextNodeInstances = { textNode: junkTextNode, matchInstances: testMatches } 
			VocabAdjuster.removeSimpleWords( [junkTextNodeInstances] ); //an array of one text node instance
			var returnedWords = [];
			for (var y = 0; y < junkTextNodeInstances.matchInstances.length; y++) 
				returnedWords.push(junkTextNodeInstances.matchInstances[y].word);
			return returnedWords.length > 0 && returnedWords.sort().join() == difficultWords.sort().join();
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
	), 
	
	new UnitTestItem("getSimpleKanjiList()", 
		function() { 
			var resultList = VocabAdjuster.getSimpleKanjiList();
			if (typeof resultList != "string") {
				this.caughtErrMsg = "Result is not a string";
				return false;
			}
			if (typeof resultList == "string" && resultList.length == 0) {
				this.caughtErrMsg = "List of Simple kanji is empty. Ignore if list was intentionally empty.";
				return false;
			}
			for (var x = 0; x < resultList.length; x++) {
				if (!VocabAdjuster.isUnihanChar(resultList.charAt(0))) {
					this.caughtErrMsg = "The non-kanji char \"" + resultList.charAt(0) + "\" was found.";
					return false;
				}
				if (resultList.indexOf(resultList.charAt(0), x + 1) > 0) {
					this.caughtErrMsg = "The char \"" + resultList.charAt(0) + "\" was found twice.";
					return false;
				}
			}
			return true;
		}
	), 
	
	new UnitTestItem("flagSimpleKanjiListForReset()", 
		function() { 
			//To preserve the existing preferences after testing this routine gets and sets the FuriganaInjector object's preference value directly
			var testResult = false;
			var before_pref_string = FuriganaInjector.getPref("exclusion_kanji");
			var difficultKanji = "譫";
			if (before_pref_string.indexOf(difficultKanji) >= 0) {
				throw("N/A. Test-use difficult level kanji found in user's list of 'simple' kanji.");
			}
			VocabAdjuster.flagSimpleKanjiListForReset();
			FuriganaInjector.setPref("exclusion_kanji", before_pref_string + difficultKanji);
			var afterList = VocabAdjuster.getSimpleKanjiList();
			testResult = afterList.indexOf(difficultKanji) >= 0;
			FuriganaInjector.setPref("exclusion_kanji", before_pref_string);
			return testResult;
		}
	) 
	
	]
);

FuriganaInjectorUnitTester.addUTM(utmodVocabAdjuster);
