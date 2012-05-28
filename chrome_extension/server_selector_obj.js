var serverSelector = {
	candidateQueue: null,
	failedCandidates: new Array(),
	currServerUrl: null,
	confirmServerCallback: null,
	reportNoServerCallback: null,
	serverHeaderToMatch: null,
	serverSelected: false,
	startTestLoop: function(urlsToTest, callback, failureCallback, serverHeaderToMatch) {
		this.serverSelected = false;
		this.candidateQueue = urlsToTest;
		this.failedCandidates = new Array();
		this.confirmServerCallback = callback;
		this.reportNoServerCallback = failureCallback;
		this.serverHeaderToMatch = serverHeaderToMatch;
		for (var x = 0; x < this.candidateQueue.length; x++)
			this.sendTestRequest(this.candidateQueue[x]);
	},
	sendTestRequest: function(url) {
		var xhr = new XMLHttpRequest();
		xhr.testUrl = url;
		xhr.onreadystatechange = this.xhrStateChangeHandler,
		xhr.open("HEAD", xhr.testUrl, true);
		xhr.send();
	},
	xhrStateChangeHandler: function() {
		if(this.readyState == 4) {
			if (this.status == 200 && (!serverSelector.serverHeaderToMatch ||
				(this.getResponseHeader("Server") && this.getResponseHeader("Server").match(serverSelector.serverHeaderToMatch)))) {
				if (!serverSelector.serverSelected) {
					serverSelector.serverSelected = true;
					serverSelector.confirmServerCallback(this.testUrl);
				}
			} else {
				serverSelector.failedCandidates.push(this.testUrl);
				if (serverSelector.failedCandidates.length == serverSelector.candidateQueue.length)
					serverSelector.reportNoServerCallback();
			}
		}
	}
}
