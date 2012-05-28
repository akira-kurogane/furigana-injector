function ServerSelector(urlsToTest, successCallback, failureCallback, serverHeaderToMatch, callbackContext) {
	this.currServerUrl = null;
	this.serverSelected = false;
	this.candidateQueue = urlsToTest;
	this.failedCandidates = new Array();
	this.confirmServerCallback = successCallback;
	this.reportNoServerCallback = failureCallback;
	this.serverHeaderToMatch = serverHeaderToMatch;
	this.callbackContext = callbackContext;
	this.startTestLoop();
}

ServerSelector.prototype.startTestLoop = function() {
	if (this.candidateQueue.length == 0) {
		this.reportNoServerCallback(this.callbackContext)
		return;
	}
	for (var x = 0; x < this.candidateQueue.length; x++)
		this.sendTestRequest(this.candidateQueue[x]);
}

ServerSelector.prototype.sendTestRequest = function(url) {
	var xhr = new XMLHttpRequest();
	xhr.serverSelector = this;	//keep a reference that the onreadystatechange handler can use
	xhr.testUrl = url;
	xhr.onreadystatechange = this.xhrStateChangeHandler,
	xhr.open("HEAD", xhr.testUrl, true);
	xhr.send();
}

ServerSelector.prototype.xhrStateChangeHandler = function() {
	var svrSelObj = this.serverSelector;
	if(this.readyState == 4) {
		if (this.status == 200 && (!svrSelObj.serverHeaderToMatch ||
			(this.getResponseHeader("Server") && this.getResponseHeader("Server").match(svrSelObj.serverHeaderToMatch)))) {
			if (!svrSelObj.serverSelected) {
				svrSelObj.serverSelected = true;
				svrSelObj.confirmServerCallback(this.testUrl, svrSelObj.callbackContext);
			}
		} else {
			svrSelObj.failedCandidates.push(this.testUrl);
			if (svrSelObj.failedCandidates.length == svrSelObj.candidateQueue.length)
				svrSelObj.reportNoServerCallback(svrSelObj.callbackContext);
		}
	}
}