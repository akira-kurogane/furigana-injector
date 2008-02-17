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
		
	]
);

FuriganaInjectorUnitTester.addUTM(utmodFuriganaInjector);


	/*FuriganaInjector*/
	//Check this.initialized == true, after load.
	//Q. how can event-called funcs like onLoad(), onPageLoad(), onUnload(), onLocationChange(), onWindowProgressStateStop(), 
	//Q. how can graphical, out of content.body  actions like openOptionsWindow(), showContextMenu() be checked?
	//Q. how can GUI command funcs like onMenuItemCommand(e), onStatusBarPanelClick() be checked?
	//FuriganaInjector.setStatusIcon(processing_state)
	//FuriganaInjector.initStatusbarPopup()
	//FuriganaInjector.processWholeDocument()
	//FuriganaInjector.processWholeDocumentCallback(processingResult)
	//FuriganaInjector.lookupAndInjectFurigana(text_parent_element)
	//FuriganaInjector.findNonRubyTextNodes(elem)
	//FuriganaInjector.parseTextNodesForDictionaryMatches(txt_block)
	
	//Check event listeners for [load|unload] / "function(e) { FuriganaInjector.[onLoad/onUnload](e);" / false are registered on the window after loading
	
	/*FuriganaInjectorUrlBarListener*/
	//FuriganaInjectorUrlBarListener.QueryInterface(aIID)
	//FuriganaInjectorUrlBarListener.onLocationChange(aProgress, aRequest, aURI)
	//FuriganaInjectorUrlBarListener.onStateChange(aProgress, aRequest, aFlag, aStatus)
	//check only empty functions for onProgressChange(), onStatusChange(), onSecurityChange(), onLinkIconAvailable().
	
	/*FuriganaInjectorPrefsObserver*/
	//check that this._branch stays set all the way through.
	//FuriganaInjectorPrefsObserver.register(prefsBranch)
	//FuriganaInjectorPrefsObserver.unregister()
	//FuriganaInjectorPrefsObserver.observe(aSubject, aTopic, aData)
