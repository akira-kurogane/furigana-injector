//ユニコード文字列

var FIThreadManager = 
{
	backThreadArray : new Array(),
	threadManager : Components.classes["@mozilla.org/thread-manager;1"]
		.getService(Components.interfaces.nsIThreadManager),
	Count : 0,
	arr : new Array(), // only 8th thread access it so thread safe.
	_Push : function (val)
	{
		try
		{
			//this.arr.push(val);
			this.executeBackground(0, function(e){
				e.obj.arr.push(e.evt); // test code
			}, {obj : this, evt : val}, false); // async
		}
		catch(e)
		{
			alert(e);
			dump("-----------"+e+"\n");
		}
	},
	_Pop : function()
	{
		var ret = null;
		this.executeBackground(0, function(tObj){
			if(tObj.arr.length)
				ret=tObj.arr.shift();
		}, this, true); // sync
		return ret;
	},
	executeBackground : function(num, aFunc, param, sync)
	{
		var threadManager = Components.classes["@mozilla.org/thread-manager;1"]
			.getService(Components.interfaces.nsIThreadManager);
		if(threadManager)
		{
			var background = this.backThreadArray[num];
			if(!background)
			{
				this.backThreadArray[num] = background = threadManager.newThread(0);
			}
			var backgroundThread = function(func, p) {
				this.func = func;
				this.param = p;
			};
			backgroundThread.prototype = {
			  run: function() {
				try {
					this.func(this.param);
				} catch(err) {
					dump(err);
					Components.utils.reportError(err);
				}
			  },
			  QueryInterface: function(iid) {
				if (iid.equals(Components.interfaces.nsIRunnable) ||
					iid.equals(Components.interfaces.nsISupports)) {
						return this;
				}
				dump("----------------------------------->>>>>>>>>>>>>>>>>>>>>>>>>>>>\n");
				throw Components.results.NS_ERROR_NO_INTERFACE;
			  }
			};
			if(sync == true)
				background.dispatch(new backgroundThread(aFunc, param),
					background.DISPATCH_SYNC);
			else
				background.dispatch(new backgroundThread(aFunc, param),
					background.DISPATCH_NORMAL);
		}
		else
		{
			aFunc(param);
		}
	},
	tNum : 0,
	PushEvent : function( event )
	{
		++this.Count;
		this.executeBackground(1, function(e){
			var txtBlock = e.evt;	//rename variable 
			FuriganaInjector.parseTextBlockForWordVsYomi(txtBlock, null);
			// txtBlock.prepRubyElemsForInsert();
	//dump(txtBlock.replacementNodesBuffer.length ? " " + txtBlock.replacementNodesBuffer.length + "\n" : " none\n");
			//if (txtBlock.prepRubyElemsForInsert())	//there was new sent of ruby elements and text nodes produced to replace the original text node. {
				e.obj._Push(txtBlock);
		}, {obj : this, evt : event}, false); // async
		//}, {obj : this, evt : event}, true); // sync
	},
	PopEvent : function()
	{
		return this._Pop();
	},
	ClearEvent : function()
	{
		var tObj = this;
		this.executeBackground(0, function(v){
			tObj.arr = new Array();
		}, null, true); // sync
		this.Count = 0;
		return ret;
	},
	PushingByBackgroundThread : function(textBlocks)
	{
		var tObj = this;	//junk??
		for (var x = 0; x < textBlocks.length; x++) {
			this.PushEvent(textBlocks[x]);
		}
		dump("done pushing " + textBlocks.length + " text blocks onto the back array. this.Count = " + this.Count + "\n");
	},
	PopByMainThread : function()
	{
		var Count = 0;
		var attachTxtBlocks = [];
dump(" ----- this.Count = " + this.Count + " --------- \n");
		do
		{
			var ret=this.PopEvent();
dump(ret && ret.textNodes ? " textBlock found\n" : " Not a textBlock!\n");
			if(ret!=null)
			{
 dump("Pop at this.Count = " + Count + "\n");	//debug
				++Count;
				//if (ret.textNodes) dump("");	//Causes crash
				try {
					var txtBlock = ret;	//rename variable
					txtBlock.prepRubyElemsForInsert();
					attachTxtBlocks.push(txtBlock);
				} catch (err) {
					dump(err.toString());
				}
			}
else { dump("a popped ret value at this.Count = " + this.Count + " was null\n"); }	//debug
			if(FIThreadManager.threadManager.mainThread.hasPendingEvents())
				FIThreadManager.threadManager.mainThread.processNextEvent(false);
		}
		while(Count < this.Count);
		var btime = new Date();
		this.Count = 0;
		try{
		if(attachTxtBlocks.length)
		{
			var doc = attachTxtBlocks[0].ownerDocument;
			var bodyInnerHtml = new String(doc.body.innerHTML);
			var replaceArray = [];
			for(var i=0;i<attachTxtBlocks.length;++i)
			{
				dump(i+'s\n');
try{
				for (var x = 0; x < attachTxtBlocks[i].textNodes.length; x++) {
				try{
					if (attachTxtBlocks[i].replacementNodesBuffer[x] && 
						attachTxtBlocks[i].replacementNodesBuffer[x].childNodes.length &&
						attachTxtBlocks[i].textNodes[x] &&
						attachTxtBlocks[i].textNodes[x].nodeValue) {
						replaceArray.push( 
						{
							before : attachTxtBlocks[i].textNodes[x].nodeValue,
							after : attachTxtBlocks[i].replacementNodesBuffer[x].innerHTML
						}
						);
					}
				}catch(e){dump(e+'\n');}
				}
}catch(e){dump('N : '+e+'\n');}
			attachTxtBlocks[i].replacementNodesBuffer[x] = null;	//cleanup
			//attatchTxtBlocks[i].attachReplacementNodes();
			}
			var repInnerHTML = "";
			var begin = 0;
			var find = 0;
			for(var i=0;i<replaceArray.length;++i)
			{
				dump(i +'s\n');
				var searchString = function(text, string, begin, charAt)
				{
					var ret = text.indexOf(string[charAt], begin);
					if(ret == -1)
						return -1;
					else
					{
						++charAt;
						if(charAt == string.length)
						{
							return ret;
						}
						else
						{
							return searchString(text, string, ret, charAt);
						}
					}
				}
				find = searchString(bodyInnerHtml, ">"+replaceArray[i].before+"<", begin, 0);
				dump(find + '\n');
				if(find !=-1)
				{
					repInnerHTML += bodyInnerHtml.substring(begin, find - replaceArray[i].before.length-1);
					repInnerHTML += ">"+replaceArray[i].after+"<";
					begin = find+1;
				}
				//if(bodyInnerHtml.search(
				//dump('1 : ' +replaceArray[i].before + '\n2 : ' + replaceArray[i].after + '\n')
				//bodyInnerHtml = bodyInnerHtml.replace(replaceArray[i].before, replaceArray[i].after);
			}
			if(begin < bodyInnerHtml.length)
			{
				repInnerHTML += bodyInnerHtml.substring(begin);
			}
			replaceArray = null;
			doc.body.innerHTML = repInnerHTML;
		}
		this.backThreadArray[1].shutdown();
		this.backThreadArray[0].shutdown();
		this.backThreadArray[1]=null;
		this.backThreadArray[0]=null;
		this.backThreadArray=new Array();
		}catch(e){dump(e+'\n');}
		dump((new Date() - btime) + "ms \n");
		dump("done\n");
	}
};