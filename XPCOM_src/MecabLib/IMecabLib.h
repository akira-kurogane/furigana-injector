/*
 * DO NOT EDIT.  THIS FILE IS GENERATED FROM MecabLib.idl
 */

#ifndef __gen_MecabLib_h__
#define __gen_MecabLib_h__

#include "xpcom-config.h"
#include "nsISupports.h"

/* For IDL files that don't want to include root IDL files. */
#ifndef NS_NO_VTABLE
#define NS_NO_VTABLE
#endif


/* starting interface:    iMecabLib */
#define IMECABLIB_IID_STR "7b35a120-3c72-11dd-a51e-c7b255d89593"

#define IMECABLIB_IID \
  {0x7b35a120, 0x3c72, 0x11dd, \
    { 0xa5, 0x1e, 0xc7, 0xb2, 0x55, 0xd8, 0x95, 0x93 }}

class NS_NO_VTABLE iMecabLib : public nsISupports {
 public:

  NS_DEFINE_STATIC_IID_ACCESSOR(IMECABLIB_IID)

  /* boolean createTagger (in AString arguments); */
  NS_IMETHOD CreateTagger(const nsAString & arguments, PRBool *_retval) = 0;

  /* boolean parseToNode (in AString text); */
  NS_IMETHOD ParseToNode(const nsAString & text, PRBool *_retval) = 0;

  /* boolean getNext (out AString surface, out AString feature, out unsigned long length); */
  NS_IMETHOD GetNext(nsAString & surface, nsAString & feature, PRUint32 *length, PRBool *_retval) = 0;

};

/* Use this macro when declaring classes that implement this interface. */
#define NS_DECL_IMECABLIB \
  NS_IMETHOD CreateTagger(const nsAString & arguments, PRBool *_retval); \
  NS_IMETHOD ParseToNode(const nsAString & text, PRBool *_retval); \
  NS_IMETHOD GetNext(nsAString & surface, nsAString & feature, PRUint32 *length, PRBool *_retval);

/* Use this macro to declare functions that forward the behavior of this interface to another object. */
#define NS_FORWARD_IMECABLIB(_to) \
  NS_IMETHOD CreateTagger(const nsAString & arguments, PRBool *_retval) { return _to CreateTagger(arguments, _retval); } \
  NS_IMETHOD ParseToNode(const nsAString & text, PRBool *_retval) { return _to ParseToNode(text, _retval); } \
  NS_IMETHOD GetNext(nsAString & surface, nsAString & feature, PRUint32 *length, PRBool *_retval) { return _to GetNext(surface, feature, length, _retval); }

/* Use this macro to declare functions that forward the behavior of this interface to another object in a safe way. */
#define NS_FORWARD_SAFE_IMECABLIB(_to) \
  NS_IMETHOD CreateTagger(const nsAString & arguments, PRBool *_retval) { return !_to ? NS_ERROR_NULL_POINTER : _to->CreateTagger(arguments, _retval); } \
  NS_IMETHOD ParseToNode(const nsAString & text, PRBool *_retval) { return !_to ? NS_ERROR_NULL_POINTER : _to->ParseToNode(text, _retval); } \
  NS_IMETHOD GetNext(nsAString & surface, nsAString & feature, PRUint32 *length, PRBool *_retval) { return !_to ? NS_ERROR_NULL_POINTER : _to->GetNext(surface, feature, length, _retval); }

#endif /* __gen_MecabLib_h__ */