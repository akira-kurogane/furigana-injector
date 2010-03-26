//ユニコード文字列

var InstallationWelcomeFX = {

	firstRunURI: "chrome://furiganainjector/locale/user_guides/installation_welcome.html",
	
	animationTimeouts: [],
	privacyWarningDisplayed: false,	/*Only used for the < 2.0 to 2.0+ upgrade*/
	
	addTabWithLoadListener: function() {
		document.getElementById("appcontent").addEventListener("DOMContentLoaded", InstallationWelcomeFX.onInstallationWelcomeLoad, true);
		//N.B. setting this next step to run after a 0.1 sec timeout seems to avoid the problem of Firefox closing the tab after a restart
		setTimeout( function() { getBrowser().selectedTab = getBrowser().addTab(InstallationWelcomeFX.firstRunURI); }, 100);
	},

	onInstallationWelcomeLoad: function() {
		if (content.document.URL !=  InstallationWelcomeFX.firstRunURI)
			return;
			
		var tempFirstRunPrefs = Components.classes["@mozilla.org/preferences-service;1"].
			getService(Components.interfaces.nsIPrefService).getBranch("extensions.furiganainjector.");
		tempFirstRunPrefs.setBoolPref("firstrun", false);
		document.getElementById("appcontent").removeEventListener("DOMContentLoaded", InstallationWelcomeFX.onInstallationWelcomeLoad, true);
		
		
		//Special check for the v2.0 upgrade - upgrading users will be forced to view the new privacy warning.
		var highlightPrivacyWarning = !this.privacyWarningDisplayed && FuriganaInjector.versionUpdatingFrom && 
			fiCompareVersions(FuriganaInjector.versionUpdatingFrom, "2.0") < 0;
		this.privacyWarningDisplayed = highlightPrivacyWarning;	//Avoid displaying this message twice
		
		if (highlightPrivacyWarning) {
			try {
				content.document.getElementById("starting_steps_header").style.display = "none";
				content.document.getElementById("XHTML_Ruby_Support_div").style.display = "none";
				content.document.getElementById("RubyService_KanjiSelector").style.display = "none";
				content.document.getElementById("No_RubyService_KanjiSelector").style.display = "none";
				var privacyWarningDivCopy = content.document.getElementById("privacy_warning").cloneNode(true);
				var shadeDiv = content.document.getElementById("full_page_shade");
				var modalMsgDiv = content.document.getElementById("modal_message_area");
				var msgHeadline = content.document.createElement("H1");
				msgHeadline.innerHTML = content.document.title + " <em>v2.0</em>";
				modalMsgDiv.insertBefore(privacyWarningDivCopy, modalMsgDiv.firstChild);
				modalMsgDiv.insertBefore(msgHeadline, modalMsgDiv.firstChild);
				shadeDiv.style.display = "block";
				modalMsgDiv.style.display = "block";
			} catch (err) {}
		} else {
		
			//N.B. accepting the HTML Ruby extension as well as the XHTML Ruby support extension, 
			//  even though the page content only mentions the latter.
			if (window.RubyService || window.HtmlRuby || window.HTMLRuby) {	//A global variable instantiated by the XHTML Ruby support extension/HTML Ruby extension
				var XHTML_Ruby_Support_div = content.document.getElementById("XHTML_Ruby_Support_div");
				XHTML_Ruby_Support_div.style.display = "none";
			} else {
				try {
					var RubyService_KanjiSelector_div = content.document.getElementById("RubyService_KanjiSelector");
					var No_RubyService_KanjiSelector_div = content.document.getElementById("No_RubyService_KanjiSelector");
					RubyService_KanjiSelector_div.style.display = "none";
					No_RubyService_KanjiSelector_div.style.display = "block";
				} catch (err) {
					dump("Dev error- RubyService_KanjiSelector or No_RubyService_KanjiSelector could not be discoved in the installation_welcome " +
						"page, or their styles could not be set");
				}
			}
		
			var sbPanel = document.getElementById("furiganainjector-statusbarpanel");
			var attentionArrowImg = content.document.getElementById("sb_icon_indicator_img");
			var attentionArrowTipInset = 10;	//hardcoded for simplicity.
			var sbIconRightIndent = sbPanel.parentNode.boxObject.width - sbPanel.boxObject.x - (sbPanel.boxObject.width / 2) - attentionArrowTipInset;
			if (attentionArrowImg) {
					attentionArrowImg.setAttribute("style", "visibility: visible; position: fixed; bottom: 5px; right: " + sbIconRightIndent + "px;");
					for (var x =0; x < 5000; x += 100) {
						InstallationWelcomeFX.animationTimeouts.push(setTimeout(
							function(tickTime) {
								var newOpacity = 0.6 + (0.4 * Math.sin((tickTime/200) * (Math.PI/2)));
								try {
									content.document.getElementById("sb_icon_indicator_img").style.opacity = newOpacity;
								} catch (err) {
									InstallationWelcomeFX.clearAnimationTimeouts();
								}
							},
							3000 + x, x));
					}
			}
			
			content.document.addEventListener("HideAttentionArrow", 
				function(evt) { 
					InstallationWelcomeFX.clearAnimationTimeouts();
					evt.target.parentNode.removeChild(evt.target); 
				}, false, true);
				
		} //End 'if not highlightPrivacyWarning'
	},
	
	clearAnimationTimeouts: function() {
		for (var x = 0; x < this.animationTimeouts.length; x++) {
			clearTimeout(this.animationTimeouts[x]);
		}
		this.animationTimeouts = [];
	}
	
}