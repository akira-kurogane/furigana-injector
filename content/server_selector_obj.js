var FIServerSelector = {
	candidateQueue: null,
	currServerUrl: null,
	confirmServerCallback: null,
	reportNoServerCallback: null,
	startTestLoop: function(urlsToTest, callback, failureCallback) {
		this.candidateQueue = urlsToTest;
		this.confirmServerCallback = callback;
		this.reportNoServerCallback = failureCallback;
		this.currServerUrl = this.candidateQueue.shift();
		this.sendTestRequest();
	},
	sendTestRequest: function() {
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = this.xhrStateChangeHandler,
		xhr.open("HEAD", this.currServerUrl, true);
		xhr.send();
	},
	xhrStateChangeHandler: function() {
		if(this.readyState == 4) {
			if (this.status == 200 && this.getResponseHeader("Server") &&
				this.getResponseHeader("Server").match(/mod_furiganainjector/)) {
				FIServerSelector.confirmServerCallback(FIServerSelector.currServerUrl);
			} else {
				if (FIServerSelector.candidateQueue.length > 0) {
					FIServerSelector.currServerUrl = FIServerSelector.candidateQueue.shift();
					FIServerSelector.sendTestRequest();
				} else {
					FIServerSelector.reportNoServerCallback();
				}
			}
		}
	}
}