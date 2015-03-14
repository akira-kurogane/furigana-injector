**_N.B. This page is not required anymore_**

Since version 0.9.2 the mecab library and dictionary files have been embedded.

_([Windows instructions](MecabInstallationWindows.md),  [Mac instructions](MecabInstallationMacOSX.md))_

### Installing from package ###

> Linux users should try to find a "mecab" and "mecab-ipadic" (might be "mecab-ipadic-utf8") rpm package for their distribution before trying to build from source, naturally. E.g. Fedora users can "yum install mecab mecab-ipadic". Those who build from source must use the utf-8 options when configuring.

### Building from source ###

> The source can be obtained from the [official MeCab downloads page](http://mecab.sourceforge.net/src). **Two** packages are required, the "mecab" and "mecab-ipadic". These are `*`.tar.gz archives that contain the typical configure and make scripts. Per the advice on the MeCab homepage:

#### Main package ####
```
 % tar zxfv mecab-X.X.tar.gz
 % cd mecab-X.X
 % ./configure --with-charset=utf
 % make
 % make check
 % su
 # make install
```

#### Dictionary package ####
```
% tar zxfv mecab-ipadic-2.7.0-XXXX.tar.gz
% mecab-ipadic-2.7.0-XXXX
% ./configure --with-charset=utf8
% make
% su
# make install
```

### Choice of dictionary encoding ###

> Although sjis and eucjp config options (or prepared packages) for the dictionary files may exist, for Furigana Injector you **must use the UTF-8 dictionary**.

### This advice is new- comments required ###

> Linux users, **your help is required** to confirm the installation instructions above are complete for your distribution. Please attach comments below if you have an different example (e.g. you know a more suitable package that is available

> If you can install MeCab okay but the Furigana Injector extension gives an error on starting firefox (e.g. 'XPCOM module could no be loaded'), please email "akira" at "yayakoshi" dot net rather than just leaving a comment.