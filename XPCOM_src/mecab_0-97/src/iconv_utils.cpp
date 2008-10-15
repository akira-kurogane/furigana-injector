// MeCab -- Yet Another Part-of-Speech and Morphological Analyzer
//
//  $Id: iconv_utils.cpp 150 2007-11-25 06:58:58Z taku-ku $;
//
//  Copyright(C) 2001-2006 Taku Kudo <taku@chasen.org>
//  Copyright(C) 2004-2006 Nippon Telegraph and Telephone Corporation
#include <iostream>
#include <fstream>
#include <cstring>
#include <string>
#include "common.h"
#include "utils.h"

#ifdef HAVE_CONFIG_H
#include "config.h"
#endif

#include "iconv_utils.h"
#include "char_property.h"

#if defined(_WIN32) && !defined(__CYGWIN__)
#include "windows.h"
#include "mutex.h"

namespace {
  typedef HRESULT (APIENTRY *LPCONVERTINETSTRING)(LPDWORD, DWORD,
                                                  DWORD, LPCSTR,
                                                  LPINT, LPBYTE, LPINT);
  typedef HRESULT (APIENTRY *LPISCONVERTINETSTRINGAVALABLE)(DWORD, DWORD);
  typedef VOID (*LPPUTDATA)(HANDLE, LPBYTE, DWORD);
  typedef BOOL (*LPCONVERTFROMHANDLE)(HANDLE, HANDLE, DWORD, DWORD);

  static LPCONVERTINETSTRING ConvertINetString = 0;
  static LPISCONVERTINETSTRINGAVALABLE IsConvertINetStringAvailable = 0;
  static HMODULE hDLL = 0;

  using namespace MeCab;

  void init_mlang_dll() {
    if (!hDLL) {
      CHECK_DIE(NULL != (hDLL = LoadLibrary("mlang.dll")))
        << "cannot load DLL mlang.dll";
    }

    if (!ConvertINetString) {
      ConvertINetString = (LPCONVERTINETSTRING)
        GetProcAddress(hDLL, "ConvertINetString");
      CHECK_DIE(ConvertINetString)
        << "GetProcAddress failed in mlang.dll, ConvertINetString";
    }

    if (!IsConvertINetStringAvailable) {
      IsConvertINetStringAvailable =
        (LPISCONVERTINETSTRINGAVALABLE)
        GetProcAddress(hDLL, "IsConvertINetStringAvailable");
      CHECK_DIE(IsConvertINetStringAvailable)
        "GetProcAddress failed in mlang.dll, IsConvertINetStringAvailable";
    }
  }

  DWORD decode_charset_win32(const char *str) {
    int charset = decode_charset(str);
    switch (charset) {
    case UTF8:
      return 65001;
    case EUC_JP:
      return 20932;
    case CP932:
      return 932;
    default:
      std::cerr << "charset " << str
                << " is not defined, use 'autodetect'";
      return 50932;  // auto detect
    }
    return 0;
  }
}
#endif

namespace {
  const char * decode_charset_iconv(const char *str) {
    int charset = MeCab::decode_charset(str);
    switch (charset) {
    case MeCab::UTF8:
      return "UTF-8";
    case MeCab::EUC_JP:
      return "EUC-JP";
    case  MeCab::CP932:
      return "SHIFT-JIS";
    default:
      std::cerr << "charset " << str
                << " is not defined, use " MECAB_DEFAULT_CHARSET;
      return MECAB_DEFAULT_CHARSET;
    }
    return MECAB_DEFAULT_CHARSET;
  }
}

namespace MeCab {

  bool Iconv::open(const char* from, const char* to) {
    ic_ = 0;
    const char *from2 = decode_charset_iconv(from);
    const char *to2 = decode_charset_iconv(to);
    if (std::strcmp(from2, to2) == 0)  return true;

#if defined HAVE_ICONV
    ic_ = iconv_open(to2, from2);
    if (ic_ == (iconv_t)(-1)) {
      ic_ = 0;
      return false;
    }
#else
#if defined(_WIN32) && !defined(__CYGWIN__)
    init_mlang_dll();
    from_cp_ = decode_charset_win32(from);
    to_cp_ = decode_charset_win32(to);
    ic_ = 1;  // dummy
    if (S_OK != IsConvertINetStringAvailable(from_cp_, to_cp_)) {
      ic_ = 0;
      return false;
    }
#else
    std::cerr << "iconv_open is not supported" << std::endl;
#endif
#endif

    return true;
  }

  bool Iconv::convert(std::string *str) {
    if (ic_ == 0) return true;
    size_t ilen = 0;
    size_t olen = 0;
    ilen = str->size();
    olen = ilen * 4;
    std::string tmp;
    tmp.reserve(olen);
    char *ibuf = const_cast<char *>(str->data());
    char *obuf_org = const_cast<char *>(tmp.data());
    char *obuf = obuf_org;
    std::fill(obuf, obuf + olen, 0);
#if defined HAVE_ICONV
    size_t olen_org = olen;
    iconv(ic_, 0, &ilen, 0, &olen);  // reset iconv state
    while (ilen != 0) {
      if (iconv(ic_, (ICONV_CONST char **)&ibuf, &ilen, &obuf, &olen)
          == (size_t) -1) {
        return false;
      }
    }
    str->assign(obuf_org, olen_org - olen);
#else
#if defined(_WIN32) && !defined(__CYGWIN__)
    DWORD cxt;
    while (ilen) {
      int n1 = ilen;
      int n2 = olen;
      HRESULT r = ConvertINetString(&cxt,
                                    from_cp_,
                                    to_cp_,
                                    (LPCSTR)ibuf, (LPINT)&n1,
                                    (LPBYTE)obuf, (LPINT)&n2);
      if (r != S_OK) return false;
      if (n2 == 0) break;
      ibuf += n1;
      ilen -= n1;
      obuf += n2;
      olen -= n2;
    }
    str->assign(obuf_org, olen);
#endif
#endif
    return true;
  }

  Iconv::Iconv(): ic_(0) {}

  Iconv::~Iconv() {
#if defined HAVE_ICONV
    if (ic_ != 0) iconv_close(ic_);
#endif
  }
}
