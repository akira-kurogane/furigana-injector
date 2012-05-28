/**
 *	Attach events to all <rt> elements
 */

$('rt').bind('mouseenter', showRubyDopplegangerAndRequestGloss);

function showRubyDopplegangerAndRequestGloss() {
	var rt = $(this);
	var r = $(this.parentNode); //The <ruby> element
	var rd = r.clone();
	var tempObj = getDataFromRubyElem(rd[0]);
	var word = tempObj.base_text;
	var yomi = tempObj.yomi;
	var r = $(this.parentNode); //The <ruby> element
	var rd = r.clone();
	var dictForm = rd.attr("fi_df");	//If a 'furigana injector dictionary form' attribute is found use it instead.
	if (dictForm) {
		try {
			if (updateRubyDopplegangerWithDictForm(rd[0], dictForm)) {
				word = dictForm;	// == getDataFromRubyElem(rd[0]).base_text;
				yomi = getDataFromRubyElem(rd[0]).yomi;
			}
		} catch (err) {}
	}

	var oldRd = $("#fi_ruby_doppleganger");
	if (oldRd.length > 0)
		oldRd.remove();
	var oldG = $("#fi_gloss_div");
	if (oldG.length > 0)
		oldG.remove();

	rd.attr("id", "fi_ruby_doppleganger");
	rd.attr("temp_id", Math.random());	//used by the callback to make sure it's not attaching the gloss data 
		// from a slow-replying ajax request to a ruby the mouse was over earlier.
	//Devnote: I expected that the fi_ruby_doppleganger <ruby> elem's top should be set to be equal to the 
	//  original ruby's top, but the value seems to be top of the line box instead. Using rt's top to get 
	//  the intended value.
	//N.B. the left position of the gloss div is set to the orig ruby left + _rd_.width(), because 
	//  updateRubyDopplegangerWithDictForm() might change the okurigana in that ruby.
	rd.addClass("ruby_doppleganger").css(
		{top: rt.position().top, left: r.position().left, display: "none"}
	);
	r.after(rd);
	var g = $("<div id='fi_gloss_div'><img src='" + chrome.extension.getURL("img/gloss_div_throbber.gif") + "'/></div>");
	g.addClass("hover_gloss").css(
		{top: rt.position().top, left: r.position().left + rd.width() - 1, display: "none", minHeight: rd.height() - 2}
	);
	g.find("img").css({paddingTop: rt.height() < 11 ? 0 : rt.height() - 11 /*height of the gloss_div_throbber.gif */});
	rd.after(g);
	
	rd.fadeIn("slow");
	g.fadeIn("slow");
	
	//Start async request for glosses. ("extBgPort" initialised in parser.js.)
	extBgPort.postMessage({message: "search_wwwjdic", word: word, yomi: yomi, temp_id: rd.attr("temp_id")});
}

function reflectWWWJDICGloss(data) {
	if ($("#fi_ruby_doppleganger[temp_id=" + data.temp_id + "]").length > 0) {
		$("#fi_gloss_div").html(data.gloss ? data.formattedGloss : "<ul><li><em>Sorry, no result</em></li></ul>");
		$("#fi_ruby_doppleganger").delay(3000).fadeOut(null, function() { $(this).remove(); });
		$("#fi_gloss_div").delay(3000).fadeOut(null, function() { $(this).html(""); $(this).remove(); });
	}
else { console.log("background returned a gloss for #fi_ruby_doppleganger[temp_id=" + data.temp_id + "] but it didn't exist/was already hidden."); }
}

function getDataFromRubyElem(rdElem) {//N.b. rdElem should be the core javascript DOM element, not a jquery object.
	var base_text = "";
	var yomi = "";
	var tempRubyBase = "", tempRubyText = "";
	var tempNode = rdElem.firstChild;
	while (tempNode) {
		if (tempNode.nodeType == 3)
			tempRubyBase = tempNode.nodeValue;
		else if (tempNode.nodeType == 1 && tempNode.tagName == "RB")
			tempRubyBase = $(tempNode).text();
		base_text += tempRubyBase;
		tempNode = tempNode.nextSibling;
		if (tempNode && tempNode.nodeType == 1 && tempNode.tagName == "RP")
			tempNode = tempNode.nextSibling;
		if (tempNode) {
			if (tempNode.nodeType == 1 && tempNode.tagName == "RT") {
				tempRubyText = $(tempNode).text();
				yomi += tempRubyText ? tempRubyText : tempRubyBase;	//use the base instead if rt is blank- it should be hiragana
			}
else { console.log("rb-rt pair debugging: " + tempNode.nodeType + ", " + (tempNode.nodeType == 1 ? tempNode.tagName : "(not an elem)")); }
			tempNode = tempNode.nextSibling;
		}
		if (tempNode && tempNode.nodeType == 1 && tempNode.tagName == "RP")
			tempNode = tempNode.nextSibling;
	}
	return {base_text: base_text, yomi: yomi};
}

function updateRubyDopplegangerWithDictForm(rdElem, dictForm) {	//N.b. rdElem should be the core javascript DOM element, not a jquery object.
	//If the only difference between the dictionary form and the base text of the ruby is the 
	//  okurigana (e.g. fi_df = "教える" when the ruby is <ruby>教<rt>おし</rt>え<rt></rt></ruby>) 
	//  then replace just the okurigana in the ruby doppleganger.
	//Other patterns will be ignored and the ruby left unchanged.
	//true is returned if the ruby is altered.
	tempNode = rdElem.firstChild;
	var baseTextParts = [];
	while (tempNode) {
		if (tempNode.nodeType == 3 && tempNode.nodeValue.replace(/\s/g, ""))
			baseTextParts.push(tempNode.nodeValue);
		tempNode = tempNode.nextSibling;
	}
	var oldOkurigana = baseTextParts.pop();
	var preOkuriganaBaseText = baseTextParts.join("");
	if (baseTextParts.length > 0 && dictForm.match(new RegExp("^" + preOkuriganaBaseText + "[あ-ん]+$"))) {
		tempNode = rdElem.lastChild;
		while (tempNode && tempNode.nodeType != 3)
			tempNode = tempNode.previousSibling;
		if (tempNode && tempNode.nodeValue == oldOkurigana) {
			tempNode.nodeValue = dictForm.replace(new RegExp("^" + preOkuriganaBaseText), "");	//i.e. the okurigana of the dict form
			return true;
		}
	}
	return false;
}
