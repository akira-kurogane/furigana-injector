//ユニコード文字列

var FIMecabParser = {

	initialized: false, 
	mecabrcFile: null,
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
		this.mecabComponent = this.mecabComponent.QueryInterface(Components.interfaces.iSimpleMecab);
		this.consoleService.logStringMessage("Mecab library loaded (version = " + this.mecabComponent.version + ")");

		var EXT_ID = "furiganainjector@yayakoshi.net";
		var em = Components.classes["@mozilla.org/extensions/manager;1"].getService(Components.interfaces.nsIExtensionManager);

		var extDir = em.getInstallLocation(EXT_ID).getItemFile(EXT_ID, "");
		this.mecabrcFile = extDir;
		this.mecabrcFile.append("mecab");	//add ./mecab/etc/mecabrc to the path.
		this.mecabrcFile.append("etc");
		this.mecabrcFile.append("mecabrc");
		//Devnote: I would prefer to set all arguments in the createTagger() method but Mecab requires that a rcfile can be found
		//  and opened, even if it's empty. Rather than have two locations where options can be set, I am choosing to use the 
		//  rcfile in /mecab/etc/ subdirectory. The dictionary location is set there as "dicdir =  $(rcpath)\..\dic\ipadic"

		try {
			this.mecabComponent.createTagger("-r \"" + this.mecabrcFile.path + "\"");
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