/*
 * DO NOT EDIT.  THIS FILE IS GENERATED FROM d:/mozilla/src/extensions/furiganainjector/public/SimpleMecab.idl
 */

#ifndef __gen_SimpleMecab_h__
#define __gen_SimpleMecab_h__


#ifndef __gen_nsISupports_h__
#include "nsISupports.h"
#endif

/* For IDL files that don't want to include root IDL files. */
#ifndef NS_NO_VTABLE
#define NS_NO_VTABLE
#endif

/* starting interface:    iSimpleMecab */
#define ISIMPLEMECAB_IID_STR "341fd800-4690-11dd-ae16-0800200c9a66"

#define ISIMPLEMECAB_IID \
  {0x341fd800, 0x4690, 0x11dd, \
    { 0xae, 0x16, 0x08, 0x00, 0x20, 0x0c, 0x9a, 0x66 }}

class NS_NO_VTABLE NS_SCRIPTABLE iSimpleMecab : public nsISupports {
 public: 

  NS_DECLARE_STATIC_IID_ACCESSOR(ISIMPLEMECAB_IID)

  /* readonly attribute AString version; */
  NS_SCRIPTABLE NS_IMETHOD GetVersion(nsAString & aVersion) = 0;

  /* readonly attribute AString error; */
  NS_SCRIPTABLE NS_IMETHOD GetError(nsAString & aError) = 0;

  /* readonly attribute AString dictionaryInfo; */
  NS_SCRIPTABLE NS_IMETHOD GetDictionaryInfo(nsAString & aDictionaryInfo) = 0;

  /* boolean loadLib (in AString libPath); */
  NS_SCRIPTABLE NS_IMETHOD LoadLib(const nsAString & libPath, PRBool *_retval NS_OUTPARAM) = 0;

  /* boolean createTagger (in AString arguments); */
  NS_SCRIPTABLE NS_IMETHOD CreateTagger(const nsAString & arguments, PRBool *_retval NS_OUTPARAM) = 0;

  /* boolean parse (in AString text); */
  NS_SCRIPTABLE NS_IMETHOD Parse(const nsAString & text, PRBool *_retval NS_OUTPARAM) = 0;

  /* boolean next (out AString surface, out AString feature, out unsigned long length); */
  NS_SCRIPTABLE NS_IMETHOD Next(nsAString & surface NS_OUTPARAM, nsAString & feature NS_OUTPARAM, PRUint32 *length NS_OUTPARAM, PRBool *_retval NS_OUTPARAM) = 0;

};

  NS_DEFINE_STATIC_IID_ACCESSOR(iSimpleMecab, ISIMPLEMECAB_IID)

/* Use this macro when declaring classes that implement this interface. */
#define NS_DECL_ISIMPLEMECAB \
  NS_SCRIPTABLE NS_IMETHOD GetVersion(nsAString & aVersion); \
  NS_SCRIPTABLE NS_IMETHOD GetError(nsAString & aError); \
  NS_SCRIPTABLE NS_IMETHOD GetDictionaryInfo(nsAString & aDictionaryInfo); \
  NS_SCRIPTABLE NS_IMETHOD LoadLib(const nsAString & libPath, PRBool *_retval NS_OUTPARAM); \
  NS_SCRIPTABLE NS_IMETHOD CreateTagger(const nsAString & arguments, PRBool *_retval NS_OUTPARAM); \
  NS_SCRIPTABLE NS_IMETHOD Parse(const nsAString & text, PRBool *_retval NS_OUTPARAM); \
  NS_SCRIPTABLE NS_IMETHOD Next(nsAString & surface NS_OUTPARAM, nsAString & feature NS_OUTPARAM, PRUint32 *length NS_OUTPARAM, PRBool *_retval NS_OUTPARAM); 

/* Use this macro to declare functions that forward the behavior of this interface to another object. */
#define NS_FORWARD_ISIMPLEMECAB(_to) \
  NS_SCRIPTABLE NS_IMETHOD GetVersion(nsAString & aVersion) { return _to GetVersion(aVersion); } \
  NS_SCRIPTABLE NS_IMETHOD GetError(nsAString & aError) { return _to GetError(aError); } \
  NS_SCRIPTABLE NS_IMETHOD GetDictionaryInfo(nsAString & aDictionaryInfo) { return _to GetDictionaryInfo(aDictionaryInfo); } \
  NS_SCRIPTABLE NS_IMETHOD LoadLib(const nsAString & libPath, PRBool *_retval NS_OUTPARAM) { return _to LoadLib(libPath, _retval); } \
  NS_SCRIPTABLE NS_IMETHOD CreateTagger(const nsAString & arguments, PRBool *_retval NS_OUTPARAM) { return _to CreateTagger(arguments, _retval); } \
  NS_SCRIPTABLE NS_IMETHOD Parse(const nsAString & text, PRBool *_retval NS_OUTPARAM) { return _to Parse(text, _retval); } \
  NS_SCRIPTABLE NS_IMETHOD Next(nsAString & surface NS_OUTPARAM, nsAString & feature NS_OUTPARAM, PRUint32 *length NS_OUTPARAM, PRBool *_retval NS_OUTPARAM) { return _to Next(surface, feature, length, _retval); } 

/* Use this macro to declare functions that forward the behavior of this interface to another object in a safe way. */
#define NS_FORWARD_SAFE_ISIMPLEMECAB(_to) \
  NS_SCRIPTABLE NS_IMETHOD GetVersion(nsAString & aVersion) { return !_to ? NS_ERROR_NULL_POINTER : _to->GetVersion(aVersion); } \
  NS_SCRIPTABLE NS_IMETHOD GetError(nsAString & aError) { return !_to ? NS_ERROR_NULL_POINTER : _to->GetError(aError); } \
  NS_SCRIPTABLE NS_IMETHOD GetDictionaryInfo(nsAString & aDictionaryInfo) { return !_to ? NS_ERROR_NULL_POINTER : _to->GetDictionaryInfo(aDictionaryInfo); } \
  NS_SCRIPTABLE NS_IMETHOD LoadLib(const nsAString & libPath, PRBool *_retval NS_OUTPARAM) { return !_to ? NS_ERROR_NULL_POINTER : _to->LoadLib(libPath, _retval); } \
  NS_SCRIPTABLE NS_IMETHOD CreateTagger(const nsAString & arguments, PRBool *_retval NS_OUTPARAM) { return !_to ? NS_ERROR_NULL_POINTER : _to->CreateTagger(arguments, _retval); } \
  NS_SCRIPTABLE NS_IMETHOD Parse(const nsAString & text, PRBool *_retval NS_OUTPARAM) { return !_to ? NS_ERROR_NULL_POINTER : _to->Parse(text, _retval); } \
  NS_SCRIPTABLE NS_IMETHOD Next(nsAString & surface NS_OUTPARAM, nsAString & feature NS_OUTPARAM, PRUint32 *length NS_OUTPARAM, PRBool *_retval NS_OUTPARAM) { return !_to ? NS_ERROR_NULL_POINTER : _to->Next(surface, feature, length, _retval); } 

#if 0
/* Use the code below as a template for the implementation class for this interface. */

/* Header file */
class _MYCLASS_ : public iSimpleMecab
{
public:
  NS_DECL_ISUPPORTS
  NS_DECL_ISIMPLEMECAB

  _MYCLASS_();

private:
  ~_MYCLASS_();

protected:
  /* additional members */
};

/* Implementation file */
NS_IMPL_ISUPPORTS1(_MYCLASS_, iSimpleMecab)

_MYCLASS_::_MYCLASS_()
{
  /* member initializers and constructor code */
}

_MYCLASS_::~_MYCLASS_()
{
  /* destructor code */
}

/* readonly attribute AString version; */
NS_IMETHODIMP _MYCLASS_::GetVersion(nsAString & aVersion)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* readonly attribute AString error; */
NS_IMETHODIMP _MYCLASS_::GetError(nsAString & aError)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* readonly attribute AString dictionaryInfo; */
NS_IMETHODIMP _MYCLASS_::GetDictionaryInfo(nsAString & aDictionaryInfo)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* boolean loadLib (in AString libPath); */
NS_IMETHODIMP _MYCLASS_::LoadLib(const nsAString & libPath, PRBool *_retval NS_OUTPARAM)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* boolean createTagger (in AString arguments); */
NS_IMETHODIMP _MYCLASS_::CreateTagger(const nsAString & arguments, PRBool *_retval NS_OUTPARAM)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* boolean parse (in AString text); */
NS_IMETHODIMP _MYCLASS_::Parse(const nsAString & text, PRBool *_retval NS_OUTPARAM)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* boolean next (out AString surface, out AString feature, out unsigned long length); */
NS_IMETHODIMP _MYCLASS_::Next(nsAString & surface NS_OUTPARAM, nsAString & feature NS_OUTPARAM, PRUint32 *length NS_OUTPARAM, PRBool *_retval NS_OUTPARAM)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* End of implementation class template. */
#endif


#endif /* __gen_SimpleMecab_h__ */
