//ユニコード文字列

/******************************************************
 *	Unit Tests 
 ******************************************************/
var utmodFIMecabParser = new UnitTestModule("FIMecabParser", [

	new UnitTestItem("Basic var existence", 
		function() { 
			return FIMecabParser && typeof FIMecabParser == "object"; 
		}
	), 

	new UnitTestItem("Current initialization status", 
		function() { 
			return FIMecabParser.initialized; 
		}
	), 

//test that FIMecabParser.mecabrcFile file exists and dump it's output to the page.
	new UnitTestItem("mecabrcFile exists", 
		function() { 
			var bExistsAndReadable = FIMecabParser.mecabrcFile.exists() && FIMecabParser.mecabrcFile.isFile() && FIMecabParser.mecabrcFile.isReadable();
			this.infoMessage = "Path = " + FIMecabParser.mecabrcFile.path + "\n\n";
			var strFileContent = "";
			var fstream = Components.classes["@mozilla.org/network/file-input-stream;1"]
									.createInstance(Components.interfaces.nsIFileInputStream);
			var sstream = Components.classes["@mozilla.org/scriptableinputstream;1"]
									.createInstance(Components.interfaces.nsIScriptableInputStream);
			fstream.init(FIMecabParser.mecabrcFile, -1, 0, 0);
			sstream.init(fstream); 

			var str = sstream.read(4096);
			while (str.length > 0) {
			  strFileContent += str;
			  str = sstream.read(4096);
			}

			sstream.close();
			fstream.close();
			this.infoMessage += "<pre>" + strFileContent + "</pre>\n";
			
			return bExistsAndReadable;
		}
	),

	//Add more parse examples, maybe in a group?

	new UnitTestItem("mecabComponent member exists and supports iSimpleMecab", 
		function() { 
			return FIMecabParser.mecabComponent && typeof FIMecabParser.mecabComponent == "object" && 
				(FIMecabParser.mecabComponent instanceof Components.interfaces.iSimpleMecab);
		}
	),

	new UnitTestItem("Version, dictionary and current error detail", 
		function() { 
			var results = "Version = " + FIMecabParser.mecabComponent.version + ";\nDictionary info = \"" + 
					FIMecabParser.mecabComponent.dictionaryInfo + "\"\n"; 
			var errString = FIMecabParser.mecabComponent.error;
			results += "Current error string " + (errString == "" ? "is empty/null" : "= \"" + errString + "\"");
			this.infoMessage = "<pre>" + results + "</pre>\n";
			return true;
		}
	), 

	new UnitTestItem("parse(\"東京から大阪まで\")", 
		function() { 
			var surface = new String();
			var feature = new String();
			var length = new Number();
			var surfaces = [];
			var features = [];
			FIMecabParser.mecabComponent.parse("東京から大阪まで");
			var retVal;
			do {
				retVal = FIMecabParser.mecabComponent.next(surface, feature, length);
				if (retVal) {
					if(surface.value.length === 0) continue; //skip "BOS/EOS"
					surfaces.push(surface.value);
					features.push(feature.value);
				}
			} while(retVal);

			return surfaces.length == 4 && features.length == 4 &&
				surfaces[0] == "東京" && features[0] == "名詞,固有名詞,地域,一般,*,*,東京,トウキョウ,トーキョー" && 
				surfaces[1] == "から" && features[1] == "助詞,格助詞,一般,*,*,*,から,カラ,カラ" && 
				surfaces[2] == "大阪" && features[2] == "名詞,固有名詞,地域,一般,*,*,大阪,オオサカ,オーサカ" && 
				surfaces[3] == "まで" && features[3] == "助詞,副助詞,*,*,*,*,まで,マデ,マデ";
		}
	)
		
	]
);

FuriganaInjectorUnitTester.addUTM(utmodFIMecabParser);

