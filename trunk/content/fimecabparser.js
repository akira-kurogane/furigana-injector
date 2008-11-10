//ユニコード文字列

var FIMecabParser = {

	initialized: false, 
	mecabComponent: null,
	mecabLoadInfo: null,
	consoleService: null,
	
	init: function() {
	
		if (this.initialized)
			return;
	
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
		if (!this.initialized) {
			this.init();
		}
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

	/******************************************************************************
	 *	XPCOM
	 ******************************************************************************/
	loadMecabLib: function() {
		this.mecabComponent = Components.classes["@yayakoshi.net/simplemecab;1"].getService();
//dump("getService()\n");
		this.mecabComponent = this.mecabComponent.QueryInterface(Components.interfaces.iSimpleMecab);
//dump("QueryInterface\n");
		this.consoleService.logStringMessage("Mecab library loaded (version = " + this.mecabComponent.version + ")");

		var EXT_ID = "furiganainjector@yayakoshi.net";
		var em = Components.classes["@mozilla.org/extensions/manager;1"].getService(Components.interfaces.nsIExtensionManager);

		var extDir = em.getInstallLocation(EXT_ID).getItemFile(EXT_ID, "");
		extDir.append("mecab");	//add "/mecab/etc/mecabrc" to the extension directory path
		extDir.append("etc");
		extDir.append("mecabrc");
		var rcfilePath = extDir.path;
		//Devnote: I would prefer to set all arguments in the createTagger() method but Mecab requires that a rcfile can be found
		//  and opened, even if it's empty. Rather than have two locations where options can be set, I am choosing to use the 
		//  rcfile in /mecab/etc/ subdirectory. The dictionary location is set there as "dicdir =  $(rcpath)\..\dic\ipadic"

		try {
			this.mecabComponent.createTagger("-r \"" + rcfilePath + "\"");
		} catch(err) {
			Components.utils.reportError(err.toString());
			if (this.mecabComponent.error.match(/no such file or directory/)) {
				this.mecabLoadInfo = "Couldn't find the Mecab dictionary.";
			} else {
				this.mecabLoadInfo = this.mecabComponent.error ? this.mecabComponent.error : "(MeCab library has no error detail)";
			}
			return false;
		}
		this.consoleService.logStringMessage("Mecab dictionary info = " + this.mecabComponent.dictionaryInfo);
		return true;
	}
	
}