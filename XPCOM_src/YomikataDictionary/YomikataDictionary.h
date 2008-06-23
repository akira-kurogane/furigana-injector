#ifndef __YomikataDictionary_h__
#define __YomikataDictionary_h__

#include "IYomikataDictionary.h"

#include "xpcom-config.h"
#include "nsIGenericFactory.h"
#include "nsISupportsUtils.h"
#include "nsEmbedString.h"
#include <string>
#include <fstream>
#include <boost/program_options/detail/utf8_codecvt_facet.hpp>
#include <map>
#include "nsILocalFile.h"

using namespace std;

#define YOMIKATADICTIONARY_CID { 0x90b399b0, 0x1597, 0x4fa1, { 0x93, 0xd2, 0xff, 0xce, 0x96, 0x41, 0xc4, 0xd2} }
#define YOMIKATADICTIONARY_CONTRACTID "@yayakoshi.net/yomikatadictionary;1"

class YomikataDictionary : public iYomikataDictionary {
public:
  NS_DECL_ISUPPORTS
  NS_DECL_IYOMIKATADICTIONARY

  YomikataDictionary();

private:
  ~YomikataDictionary();

protected:
	map<wstring, wstring> _entries_map;
};

#endif /* __YomikataDictionary_h__ */