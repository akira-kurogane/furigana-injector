//ユニコード文字列

var FIMecabParser = {

	initialized: false, 
	mecabComponent: null,
	mecabLoadInfo: null,
	consoleService: null,
	
	init: function() {
	
		this.consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);

		var mecabLoadResult = false;
		try {
			mecabLoadResult = this.loadMecabLib();
		} catch (err) { 
			Components.utils.reportError(err);
		}
		if (!mecabLoadResult) {
			alert("The 'SimpleMecab' XPCOM component could not be loaded." + 
				(this.mecabLoadInfo ? "\n" + this.mecabLoadInfo : ""));
			this.initialized = false;
			return;
		}
		
		this.initialized = true;
		/*********** SimpleMecab dev testing ************************* /
		var surface = new String();
		var feature = new String();
		var length = new Number();
		var readings = [];
		this.mecabComponent.parse("東京から大阪の城まで");
		var retVal;
		do {
			retVal = this.mecabComponent.next(surface, feature, length);
			if (retVal)
				//dump("\t" + surface.value + ":\t" + feature.value + ", " + length +"\n");
				this.consoleService.logStringMessage("\t" + surface.value + ":\t" + feature.value + ", " + length);
			if(surface.value.length === 0) continue; //skip "BOS/EOS"
		} while(retVal);
		dump("Finished the parse()\n");
		/ ************* End of MecabLib dev test section ************/
	},
	
	parse: function(orig_string) {
		try {
			return this.mecabComponent.parse(orig_string);
		} catch (err) {
			Components.utils.reportError(err);
		}
	},
	
	next: function(surface, feature, length) {
		if(!(surface instanceof String) || !(feature instanceof String) || !(length instanceof Number)) {
			alert("Error- the FIMecabParser.next() function must be passed String and Number objects, not primitive values");
			return false;
		}
		try {
			return this.mecabComponent.next(surface, feature, length);
		} catch (err) {
			Components.utils.reportError(err);
		}
	},

    dummyParse: function() {
		try {
			this.mecabComponent.parse("ダミー文字列");
		} catch (err) {
			Components.utils.reportError(err);
		}
	},		

	/******************************************************************************
	 *	XPCOM
	 ******************************************************************************/
	loadMecabLib: function() {
		this.mecabComponent = Components.classes["@yayakoshi.net/simplemecab;1"].getService();
//dump("getService()\n");
		this.mecabComponent = this.mecabComponent.QueryInterface(Components.interfaces.iSimpleMecab);
//dump("QueryInterface\n");

		// the extension's id from install.rdf
		var MY_ID = "furiganainjector@yayakoshi.net";
		var em = Components.classes["@mozilla.org/extensions/manager;1"].getService(Components.interfaces.nsIExtensionManager);

		var myPath = em.getInstallLocation(MY_ID).getItemFile(MY_ID, "components/libmecab").path;
		var dicPath = "junk";
//dump("this.mecabComponent.loadLib(" + myPath + ")");

		this.mecabComponent.loadLib(myPath);
//dump("this.mecabComponent.loadLib(\"" + myPath + "\")\n");
		this.consoleService.logStringMessage("Mecab library loaded at path = " + myPath + " (version = " + this.mecabComponent.version + ")");

		try {
			this.mecabComponent.createTagger("");	//this will require a "-d /path/to/dic_dir".
		} catch(err) {
			Components.utils.reportError(err);
			if (this.mecabComponent.error.match(/no such file or directory/)) {
				this.mecabLoadInfo = "Couldn't find the dictionary.\nPlease install MeCab dictionary (either UTF-8 or Shift-JIS) from http://mecab.sf.net/src";
			} else {
				this.mecabLoadInfo = this.mecabComponent.error ? this.mecabComponent.error : "(MeCab library has no error detail)";
			}
			return false;
		}
		this.consoleService.logStringMessage("Mecab dictionary info = " + this.mecabComponent.dictionaryInfo);
		return true;
	}
	
}