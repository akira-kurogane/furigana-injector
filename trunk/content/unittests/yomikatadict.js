//ユニコード文字列

var utmodYomikataDictionary = new UnitTestModule("YomikataDictionary", [

	new UnitTestItem("Basic var existence", 
		function() { 
			return FuriganaInjector.yomiDict && typeof FuriganaInjector.yomiDict == "object"; 
		}
	), 
		
	/*new UnitTestItem("loadFromFile(nsLocaleFileObj)", 
		function() { 
			throw("This test not implemented yet");
		}
	), */
		
	new UnitTestItem("findExact(word)", 
		function() { 
			var testCases = [
				{ searchPhrase: "当選", expectedYomikataResult: "とうせん" }, 
				{ searchPhrase: "はい了解", expectedYomikataResult: "" },
				{ searchPhrase: "当駅です", expectedYomikataResult: "" },
				{ searchPhrase: "族関係", expectedYomikataResult: "" },	//tail part of several words
				{ searchPhrase: "意味を", expectedYomikataResult: "" },	//incomplete root to four entries
				{ searchPhrase: "導電", expectedYomikataResult: "どうでん" }, //a complete word, but also the root to four others
				{ searchPhrase: "引き込む", expectedYomikataResult: "ひきこむ" }　//"引き" and "込む" are both valid entries by themselves
			];
			var yomikataResult;
			for (var x = 0; x < testCases.length; x++) {
				testCase = testCases[x];
			matchLength = {};
				yomikataResult = FuriganaInjector.yomiDict.findExact(testCase.searchPhrase);
				if (testCase.expectedYomikataResult != yomikataResult) {
					this.caughtErrMsg = "Failed on " + testCase.searchPhrase + ". \"" + testCase.expectedYomikataResult + 
						"\" expected, \"" + yomikataResult + "\" returned.";
					return false;
				}
			}
			return true;
		}
	), 
		
	new UnitTestItem("findLongestMatch(word, lengthOut)", 
		function() { 
			var testCases = [
				{ searchPhrase: "当選", expectedYomikataResult: "とうせん", expectedLength: 2 }, 
				{ searchPhrase: "当駅です", expectedYomikataResult: "とうえき", expectedLength: 2 }, 
				{ searchPhrase: "はい了解", expectedYomikataResult: "", expectedLength: null }, 
				{ searchPhrase: "予想日", expectedYomikataResult: "よそうび", expectedLength: 3 }, //the substring "予想" is a valid entry by itself
				{ searchPhrase: "め込み", expectedYomikataResult: "", expectedLength: null }, //is a part of many entries, eg. 埋め込み, 締め込み
				{ searchPhrase: "編み上げる", expectedYomikataResult: "あみあげる", expectedLength: 5 }
			];
			var yomikataResult;
			var matchLength;
			for (var x = 0; x < testCases.length; x++) {
				testCase = testCases[x];
			matchLength = {};
				yomikataResult = FuriganaInjector.yomiDict.findLongestMatch(testCase.searchPhrase, matchLength);
				if (testCase.expectedYomikataResult != yomikataResult || 
					(testCase.expectedLength && testCase.expectedLength != matchLength.value)) {
					this.caughtErrMsg = "Failed on " + testCase.searchPhrase + ". " + testCase.expectedYomikataResult + 
						"/len=" + testCase.expectedLength + " expected, " + yomikataResult + "/len=" + matchLength.value + " returned.";
					return false;
				}
			}
			return true;
		}
	)
		
	]
);

FuriganaInjectorUnitTester.addUTM(utmodYomikataDictionary);
