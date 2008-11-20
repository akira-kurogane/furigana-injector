//ユニコード文字列

/******************************************************
 *	Unit Tests 
 ******************************************************/
var utmodKanjiDictionary = new UnitTestModule("KanjiDictionary", [

	new FIUnitTestItem("gradeList()", 
		function() { 
			var junk;
			try {
				junk = KanjiDictionary.gradeList();
				this.caughtErrString = "Should have thrown an error when null grade list was input";
				return false;
			} catch (err) {}
			try {
				junk = KanjiDictionary.gradeList(0);
				this.caughtErrString = "Should have thrown an error when grade list = 0 was input";
				return false;
			} catch (err) {}
			try {
				junk = KanjiDictionary.gradeList(9);
				this.caughtErrString = "Should have thrown an error when grade list > 8 was input";
				return false;
			} catch (err) {}
			try {
				junk = KanjiDictionary.gradeList("name string");
				this.caughtErrString = "Should have thrown an error when a non-numeric grade list was input";
				return false;
			} catch (err) {}
			var grade1String = KanjiDictionary.gradeList(1);
			return typeof grade1String == "string" && grade1String.length == 80;	//hard-code value for Grade 1 kanji list
		}
	), 

	new FIUnitTestItem("freqOfUseList()", 
		function() { 
			var fouList300_449 = KanjiDictionary.freqOfUseList(300, 449);
			return typeof fouList300_449 == "object" && fouList300_449.length == 150; 
		}
	), 

	new FIUnitTestItem("maxFOUValue()", 
		function() { 
			var matches = KanjiDictionary.maxFOUValue() == "2501"; 
			if (!matches && KanjiDictionary.maxFOUValue() > "1900" && KanjiDictionary.maxFOUValue() < "4000") {
				throw("The maximum frequency-of-use value in the dictionary data seems to have changed to " + KanjiDictionary.maxFOUValue() + 
					", compared to the hard-coded test value of 2501");
			} else {
				return true;
			}
		}
	), 

	new FIUnitTestItem("internal _freqOfUseOrder[] check", 
		function() { 
			var maxFOU = KanjiDictionary._freqOfUseOrder.length - 1;
			for (var x = 1; x <= maxFOU; x++) {
				if (!KanjiDictionary._freqOfUseOrder[x]) {
					throw("There was a gap in the frequency-of-use sequence, at position " + x);
					break;
				}
			}
			return true; 
		}
	)
	
	]
);

FuriganaInjectorUnitTester.addUTM(utmodKanjiDictionary);
