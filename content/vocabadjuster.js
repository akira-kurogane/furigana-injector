//ユニコード文字列

var VocabAdjuster = {

	kanjiPattern: "(?:[\u3400-\u9FBF][\u3005\u3400-\u9FBF]*)",	//"\u3005" is "々", the kanji repeater character
	kanjiRevPattern: "[^\u3005\u3400-\u9FBF]",	//N.B. no attempt to made to avoid leading "々" char
	hiraganaPattern: "[\u3042\u3044\u3046\u3048\u304A-\u3093]",
	hiraganaRevPattern: "[^\u3042\u3044\u3046\u3048\u304A-\u3093]",
	kanjiHiraganaPattern: "[\u3005\u3042\u3044\u3046\u3048\u304A-\u3093\u3400-\u9FBF]",	//N.B. no attempt to made to avoid leading "々" char

	tooEasy: function(word) {
		var charTemp;
		for (var charPos = 0; charPos < word.length; charPos++) {
			charTemp = word.charAt(charPos);
			if (this.isUnihanChar(charTemp) && this._simpleKanjiList.indexOf(charTemp) < 0) {
				return false;
			}
		}
		return true;
	}, 

	removeSimpleWordsFromDictMatches: function(dictMatches) {
		var ignore = this.getSimpleKanjiList();	//just to make sure this._simpleKanjiList is initialized for tooEasy()
		replacementArray = [];
		for (var y = 0; y < dictMatches.length; y++) {
			mi = dictMatches[y];
			if (!this.tooEasy(mi.word)) {
				replacementArray.push(mi);
			}
		}
		return replacementArray;
	},

	removeSimpleWords: function(matchingTextNodeInstances) {
		var tni;
		var mi;
		var replacementArray;
		var ignore = this.getSimpleKanjiList();	//just to make sure this._simpleKanjiList is initialized for tooEasy()
		for (var x = 0; x < matchingTextNodeInstances.length; x++) {
			tni = matchingTextNodeInstances[x];
			replacementArray = [];
			for (var y = 0; y < tni.matchInstances.length; y++) {
				mi = tni.matchInstances[y];
				if (!this.tooEasy(mi.word)) {
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
				alert("addKanjiToExclusionList(): The kanji \"" + kanjiChar + "\" is already in the kanji exlcusion list");
		} else {
			temp_pref_string += kanjiChar;
			FuriganaInjector.setPref("exclusion_kanji", temp_pref_string);
		}
	},
	
	removeKanjiFromExclusionList: function(kanjiChar) {
		var temp_pref_string = FuriganaInjector.getPref("exclusion_kanji");
		if (temp_pref_string.indexOf(kanjiChar) < 0) {
			if (FuriganaInjector.getPref("enable_tests"))
				alert("removeKanjiFromExclusionList(): The kanji \"" + kanjiChar + "\" is not in the kanji exlcusion list");
		} else {
			temp_pref_string = temp_pref_string.replace(kanjiChar, "");
			FuriganaInjector.setPref("exclusion_kanji", temp_pref_string);
		}
	},
	
	/* N.B. No detection for the "CJK Compatibility Ideographs"or "CJK Ideographs Ext B"*/
	//Todo: initialise a RegExp object, use kanjiRevPattern
	isUnihanChar: function(testChar) {
		return testChar >= "\u3400" && testChar <= "\u9FBF";
	}, 
	
	_simpleKanjiList: null, 

	getSimpleKanjiList: function() {
		if (!this._simpleKanjiList) { 
			var temp_pref_string = FuriganaInjector.getPref("exclusion_kanji");
			this._simpleKanjiList = temp_pref_string.replace(RegExp(VocabAdjuster.kanjiRevPattern ,"g"), "");
		}
		return this._simpleKanjiList;
	},
	
	flagSimpleKanjiListForReset: function() {
		this._simpleKanjiList = null;
	}

};
