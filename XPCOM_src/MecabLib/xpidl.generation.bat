#The path must be altered so the libIDL and glib?? dlls can be found.
set PATH=c:\mozilla-build\moztools-180compat\bin;%PATH%
mkdir xpidl_output
gecko-sdk\bin\xpidl.exe -I gecko-sdk\idl -o xpidl_output\IMecabLib.xpidl -m header MecabLib.idl
echo Use the generated MecabLib.xpidl.h to replace IMecabLib.h. N.B. There is a section for between "#if 0 ... #end if" directives which can be used to make a template for MecabLib.h and MecabLib.cpp. This should be deleted. > xpidl_output\readme.txt
gecko-sdk\bin\xpidl.exe -I gecko-sdk\idl -o xpidl_output\MecabLib.xpidl -m typelib MecabLib.idl
copy xpidl_output\MecabLib.xpidl.xpt "..\components\MecabLib.xpt"