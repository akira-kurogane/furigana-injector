# Introduction #

Furiganainjector can be run locally without connecting to the external fi.yayakoshi.net servers. This page describes how it was built on MacOSX. Much thanks to Udonmai-san for detailing his work.


# Details #

1. Use brew(a package manager like apt-get on ubuntu) to install the MeCab

> brew install mecab  mecab-ipadic

after install, I modify one place in file ficommon.c

> line 24 >.mtagger = mecab\_new2("-r /dev/null -d /usr/local/Cellar/mecab/0.996/lib/mecab/dic/ipadic"); //specific dictionary directory

which is really important, right~

2. the most tricky one is the libs to import. Udonmai-san reports that he spent most of the day thinking about it before finally getting it.

He modified the Makefile so:

> <pre>CC=gcc<br>
SERVER_PROG=fiserver<br>
UNITTEST_PROG=unit_tests<br>
CFLAGS= -W -Wall -pthread -g<br>
INCS= -I../json-c-0.9 -I ../mongoose<br>
LIBS= -ldl -lmecab -ljson-c -L/usr/local/Cellar/json-c/0.11/lib -L /usr/local/Cellar/mecab/0.996/lib</pre>

> all:
> <pre>$(CC) $(CFLAGS) $(INCS) ficommon.c server.c ../mongoose/mongoose.c $(LIBS) $(ADD) -o $(SERVER_PROG)<br>
$(CC) $(CFLAGS) $(INCS) ../mongoose/mongoose.c ficommon.c unit_tests.c $(LIBS) $(ADD) -o $(UNITTEST_PROG) ./$(UNITTEST_PROG)</pre>

So in fact he didn't change the core content, but the json lib should be paid attention to. It should be -ljson-c on a Mac OSX.

He also tried to use brew to install the json-c lib and mongoose. But at last he found that the mongoose in brew is too new a version so that it goes wrong with your code, so he unistalled it. He left the brew installed json-c there but thinks it did nothing.

3. in the compilation of server.c, he find a problem and modified one line of the code:

> line 133: void `*`processed = "yes"

to

> line 133: void `*`processed;
> line 134: char yes[.md](.md) = "yes";
> line 135: processed = yes;

it could be linked or compiled correctly on Mac or we say though the gcc / clang on Mac.

4. last but not least modified the port,

> line 165: "listening\_ports", "8081",

to avoid using the common port 80. This also obliges us to modify the plugin (the javascript code in the plugin the chrome browser uses) which means the plugin as source instead of from the chrome store. Once you download it from this site (https://code.google.com/p/furigana-injector/source/browse/#svn%2Ftrunk%2Fchrome_extension) use Tools -> Extensions, "Load unpacked extension ...". Please refer to Google's chrome extension development documentation if this is unclear.

> background.js line 28: var furiganaServiceURLsList = ["http://localhost:8081/furiganainjector" ](.md);