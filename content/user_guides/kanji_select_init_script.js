var lastSliderVal = 500;
function setVisibleRTLevel(fouVal) {
	var bunronTDElem = document.getElementById("bunron_examples");
	var rtElems = bunronTDElem.getElementsByTagName("rt");
	for (var x = 0; x < rtElems.length; x++) {
		rtElems[x].style.color = rtElems[x].getAttribute("fouMax") < fouVal ? "#ffffff" : "#000000";
	}
}