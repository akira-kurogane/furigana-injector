#The path must be altered so the libIDL and glib?? dlls can be found.
set PATH=c:\mozilla-build\moztools-180compat\bin;%PATH%
mkdir xpidl_output
..\gecko-sdk\bin\xpidl.exe -I ..\gecko-sdk\idl -o xpidl_output\IYomikataDictionary.xpidl -m header YomikataDictionary.idl
echo Split the generated YomikataDictionary.xpidl.h into IYomikataDictionary.h, YomikataDictionary.h and YomikataDictionary.cpp > xpidl_output\readme.txt
..\gecko-sdk\bin\xpidl.exe -I ..\gecko-sdk\idl -o xpidl_output\YomikataDictionary.xpidl -m typelib YomikataDictionary.idl
copy xpidl_output\YomikataDictionary.xpidl.xpt "D:\dev\ruby_furigana\furiganainjector\components\YomikataDictionary.xpt"
