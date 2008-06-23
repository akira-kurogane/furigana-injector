/*
 * DO NOT EDIT.  THIS FILE IS GENERATED FROM YomikataDictionary.idl
 */

#ifndef __gen_YomikataDictionary_h__
#define __gen_YomikataDictionary_h__

#include "xpcom-config.h"

#ifndef __gen_nsISupports_h__
#include "nsISupports.h"
#endif

#ifndef __gen_nsILocalFile_h__
#include "nsILocalFile.h"
#endif

/* For IDL files that don't want to include root IDL files. */
#ifndef NS_NO_VTABLE
#define NS_NO_VTABLE
#endif

/* starting interface:    iYomikataDictionary */
#define IYOMIKATADICTIONARY_IID_STR "1f545cdb-e3b7-401d-a229-02588ec1aac1"

#define IYOMIKATADICTIONARY_IID \
  {0x1f545cdb, 0xe3b7, 0x401d, \
    { 0xa2, 0x29, 0x02, 0x58, 0x8e, 0xc1, 0xaa, 0xc1 }}

class NS_NO_VTABLE iYomikataDictionary : public nsISupports {
 public: 

  NS_DEFINE_STATIC_IID_ACCESSOR(IYOMIKATADICTIONARY_IID)

  /* boolean loadFromFile (in nsILocalFile dict_file_path); */
  NS_IMETHOD LoadFromFile(nsILocalFile *dict_file_ref, PRBool *_retval) = 0;

  /* AString findExact (in AString search_word); */
  NS_IMETHOD FindExact(const nsAString & search_word, nsAString & _retval) = 0;

  /* AString findLongestMatch (in AString search_word, out short match_length); */
  NS_IMETHOD FindLongestMatch(const nsAString & search_word, PRInt16 *match_length, nsAString & _retval) = 0;

};

/* Use this macro when declaring classes that implement this interface. */
#define NS_DECL_IYOMIKATADICTIONARY \
  NS_IMETHOD LoadFromFile(nsILocalFile *dict_file_path, PRBool *_retval); \
  NS_IMETHOD FindExact(const nsAString & search_word, nsAString & _retval); \
  NS_IMETHOD FindLongestMatch(const nsAString & search_word, PRInt16 *match_length, nsAString & _retval); 

/* Use this macro to declare functions that forward the behavior of this interface to another object. */
#define NS_FORWARD_IYOMIKATADICTIONARY(_to) \
  NS_IMETHOD LoadFromFile(nsILocalFile *dict_file_path, PRBool *_retval) { return _to LoadFromFile(dict_file_path, _retval); } \
  NS_IMETHOD FindExact(const nsAString & search_word, nsAString & _retval) { return _to FindExact(search_word, _retval); } \
  NS_IMETHOD FindLongestMatch(const nsAString & search_word, PRInt16 *match_length, nsAString & _retval) { return _to FindLongestMatch(search_word, match_length, _retval); } 

/* Use this macro to declare functions that forward the behavior of this interface to another object in a safe way. */
#define NS_FORWARD_SAFE_IYOMIKATADICTIONARY(_to) \
  NS_IMETHOD LoadFromFile(nsILocalFile *dict_file_path, PRBool *_retval) { return !_to ? NS_ERROR_NULL_POINTER : _to->LoadFromFile(dict_file_path, _retval); } \
  NS_IMETHOD FindExact(const nsAString & search_word, nsAString & _retval) { return !_to ? NS_ERROR_NULL_POINTER : _to->FindExact(search_word, _retval); } \
  NS_IMETHOD FindLongestMatch(const nsAString & search_word, PRInt16 *match_length, nsAString & _retval) { return !_to ? NS_ERROR_NULL_POINTER : _to->FindLongestMatch(search_word, match_length, _retval); } 

#endif /* __gen_YomikataDictionary_h__ */