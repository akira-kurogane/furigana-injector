//ユニコード文字列

var FuriganaInjectorOverlayInit = function() {

/******************************************************************************
 *	Attach listener for browser's load and unload events (N.B. Does not mean page load/move).
 *	Devnote: FuriganaInjector.onLoad() is effectively it's init() function.
 ******************************************************************************/
 
window.addEventListener("load", function(e) { FuriganaInjector.onLoad(e); }, false);
window.addEventListener("unload", function(e) { FuriganaInjector.onUnload(e); }, false); 


/******************************************************************************
 *	Conditionally attach listener for browser's load event if the preferences indicate that this is 
 *	  the first time the extension has been used.
 *	v2.0: Also display when a user is upgrading to v2.0.
 ******************************************************************************/
var tempFirstRunPrefs = Components.classes["@mozilla.org/preferences-service;1"].
	getService(Components.interfaces.nsIPrefService).getBranch("extensions.furiganainjector.");
var tempLastVersion = tempFirstRunPrefs.prefHasUserValue("last_version") ? tempFirstRunPrefs.getCharPref("last_version") : null;
//N.B. don't add a default preference called "firstrun"
//N.B. a parallel conditional block in install_welcome.js's onInstallationWelcomeLoad() function 
//  will detect the version change from < 2.0 to 2.0+.
if (!tempFirstRunPrefs.prefHasUserValue("firstrun") || tempFirstRunPrefs.getBoolPref("firstrun") == true || 
	(tempLastVersion && FuriganaInjectorUtilities.compareVersions(tempLastVersion, "2.0") < 0)) {	
	window.addEventListener("load", FIInstallationWelcomeFX.addTabWithLoadListener, false);
}
tempFirstRunPrefs = undefined;
tempLastVersion = undefined;

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

};	//end of FuriganaInjectorOverlayInit declaration;
FuriganaInjectorOverlayInit();
