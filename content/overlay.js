//ユニコード文字列

/******************************************************************************
 *	Attach listener for browser's load and unload events (N.B. Does not mean page load/move).
 *	Devnote: FuriganaInjector.onLoad() is effectively it's init() function.
 ******************************************************************************/
 
window.addEventListener("load", function(e) { FuriganaInjector.onLoad(e); }, false);
window.addEventListener("unload", function(e) { FuriganaInjector.onUnload(e); }, false); 


/******************************************************************************
 *	Conditionally attach listener for browser's load event if the preferences indicate that this is 
 *	  the first time the extension has been used.
 ******************************************************************************/
var tempFirstRunPrefs = Components.classes["@mozilla.org/preferences-service;1"].
	getService(Components.interfaces.nsIPrefService).getBranch("extensions.furiganainjector.");
if (!tempFirstRunPrefs.prefHasUserValue("firstrun") || tempFirstRunPrefs.getBoolPref("firstrun") == true) {	//N.B. don't add a default preference called "firstrun"
	window.addEventListener("load", InstallationWelcomeFX.addTabWithLoadListener, false);
}

/******************************************************************************
 *	For the upgrade from 0.8.x to 0.9.x, make sure the new "last_version" preference exists.
 ******************************************************************************/
if (!tempFirstRunPrefs.prefHasUserValue("last_version")) {
	tempFirstRunPrefs.setCharPref("last_version", "");	//The FuriganaInjector object will set the exact value.
}
tempFirstRunPrefs = undefined;

/******************************************************************************
 *	Attach listener for "SetKanjiByMaxFOUValRequest" events if the page loaded is the 'Simple 
 *	  Kanji Selection' page.
 ******************************************************************************/
var setKanjiLevelURI = "chrome://furiganainjector/locale/user_guides/simple_kanji_level_selector.html";

//Devnote: element "appcontent" is defined by Firefox. Use "messagepane" for Thunderbird
document.getElementById("appcontent").addEventListener("DOMContentLoaded", 
	function() {
		if (content.document.URL == setKanjiLevelURI) {
			content.document.addEventListener("SetKanjiByMaxFOUValRequest", 
				function(evt) { FuriganaInjector.onSetKanjiByMaxFOUValRequest(evt); }, false, true);
			//N.B. By testing it seems the "SetKanjiByMaxFOUValRequest" event listener is destroyed when 
			//  the document is closed, so there is no need for a matching removeEventListener();
		}
	}, 
	false);

/*
/******************************************************************************
 *	fiCompareVersions()- a mozilla-specific version number comparing function.
 ****************************************************************************** /
function fiCompareVersions(a,b) {
	var x = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
		.getService(Components.interfaces.nsIVersionComparator)
		.compare(a,b);

	return x;
}
//dump("1.0pre vs 1.0 = " + fiCompareVersions("1.0pre", "1.0"));
*/