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

if (!tempFirstRunPrefs.prefHasUserValue("firstrun") || tempFirstRunPrefs.getBoolPref("firstrun") == true ||	//N.B. don't add a default preference called "firstrun"
	!tempFirstRunPrefs.prefHasUserValue("last_version") /*|| tempFirstRunPrefs.getCharPref("last_version") < detected_version*/) {
	window.addEventListener("load", InstallationWelcomeFX.addTabWithLoadListener, false);
}
tempFirstRunPrefs = undefined;
/****
function compareVersions(a,b) {
 var x = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                   .getService(Components.interfaces.nsIVersionComparator)
                   .compare(a,b);
 if(x == 0)
   return a + "==" + b;
 else if(x > 0)
   return a + ">" + b;
 return a + "<" + b;
}
dump(compareVersions("1.0pre", "1.0"));
 *******/

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
