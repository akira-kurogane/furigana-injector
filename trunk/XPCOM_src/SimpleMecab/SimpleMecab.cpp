#include "SimpleMecab.h"
#include "string.h"
#include "nsCOMPtr.h"

NS_IMPL_ISUPPORTS1(SimpleMecab, iSimpleMecab)

SimpleMecab::SimpleMecab()
{
	tagger = nsnull;
	currNode = nsnull;
	libPtr = nsnull;
	dictCharEncoding = NS_CSTRING_ENCODING_UTF8;
}

SimpleMecab::~SimpleMecab()
{
	if (tagger)
		mecab_destroy(tagger);
	if (libPtr)
		PR_UnloadLibrary(libPtr);
}

/* readonly attribute AString version; */
NS_IMETHODIMP SimpleMecab::GetVersion(nsAString & aVersion)
{
	if (!this->libInitialized()) {
		return NS_ERROR_FAILURE;
	}
	return _GetVersion(aVersion);
}

nsresult SimpleMecab::_GetVersion(nsAString & aVersion)
{
	nsCString tempCStr;
	tempCStr.Assign(mecab_version());
	NS_CStringToUTF16(tempCStr, NS_CSTRING_ENCODING_UTF8, aVersion);	//should only be ascii
    return NS_OK;
}

/* readonly attribute AString error; */
NS_IMETHODIMP SimpleMecab::GetError(nsAString & aError)
{
	if (!this->libInitialized()) {
		return NS_ERROR_FAILURE;
	}
	return _GetError(aError);
}

/* readonly attribute AString error; */
nsresult SimpleMecab::_GetError(nsAString & aError)
{
	nsCString tempCStr;
	if(!tagger) {
		tempCStr.Assign(mecab_strerror(NULL));
	} else {
		tempCStr.Assign(mecab_strerror(tagger));
	}
	NS_CStringToUTF16(tempCStr, dictCharEncoding, aError);
    return NS_OK;
}

/* readonly attribute AString dictionaryInfo; */
NS_IMETHODIMP SimpleMecab::GetDictionaryInfo(nsAString & aDictionaryInfo)
{
	if (!this->libInitialized()) {
		return NS_ERROR_FAILURE;
	}
	return _GetDictionaryInfo(aDictionaryInfo);
}

nsresult SimpleMecab::_GetDictionaryInfo(nsAString & aDictionaryInfo)
{
	if (!tagger)
		return NS_ERROR_FAILURE;

	const mecab_dictionary_info_t *dictInfo = mecab_dictionary_info(tagger);
	if (!dictInfo) {
		return NS_ERROR_FAILURE;
	} else {
		char charBuffer[256];
		nsCString tempCStr;
		for (; dictInfo; dictInfo = dictInfo->next) {
			sprintf(charBuffer, "filename=%s;charset=%s;version=%d;size=%d;type=%d;lsize=%d;rsize=%d",
				dictInfo->filename, dictInfo->charset, dictInfo->version, dictInfo->size, dictInfo->type,
				dictInfo->lsize, dictInfo->rsize);
			if (tempCStr.Length() > 0)
				tempCStr.Append(nsCString("\n"));
			tempCStr.Append(charBuffer);
		}
		NS_CStringToUTF16(tempCStr, dictCharEncoding, aDictionaryInfo);	//TODO: should this be NS_CSTRING_ENCODING_NATIVE_FILESYSTEM instead?
		return NS_OK;
	}
}

bool SimpleMecab::libInitialized()
{
	return libPtr &&
		mecab_new && mecab_new2 && mecab_version && mecab_strerror && mecab_destroy &&
		 mecab_sparse_tonode && mecab_dictionary_info;
}

/* boolean loadLib (in AString arguments); */
NS_IMETHODIMP SimpleMecab::LoadLib(const nsAString & libPath, PRBool *_retval NS_OUTPARAM)
{
	nsCString csLibPath;
    NS_UTF16ToCString(libPath, NS_CSTRING_ENCODING_NATIVE_FILESYSTEM, csLibPath);

	// mecab dll isn't loaded
	if(!libPtr) {
		libPtr = PR_LoadLibrary(csLibPath.get());	//try loading lib file at specified path

		if(!libPtr)	//Loading local DLL file failed. Try loading lib from PATH.
			PR_LoadLibrary("libmecab.dll");	//TODO handle case for unix, i.e. load libmecab.so. I think PR_GetLibraryName() is designed for this.
	}
	if(!libPtr)
		return NS_ERROR_NULL_POINTER;

	//Initializing function pointers.
	//Devnote: using a try-catch block seemed to be totally ineffective in catching exceptions from
	//  the function pointer assignments below.
	mecab_new = (mecab_t* (*)(int argc, char **argv)) PR_FindSymbol(libPtr, "mecab_new");
	mecab_new2 = (mecab_t* (*)(const char *arg)) PR_FindSymbol(libPtr, "mecab_new2");
	//mecab_new2	TODO: Use in GetVersion
	mecab_version = (const char* (*)(void))PR_FindSymbol(libPtr, "mecab_version");	//Should the args be "(void)"?, ""?, "()"?
	//mecab_new2	TODO: Use in GetError
	mecab_strerror = (const char* (*)(mecab_t* m))PR_FindSymbol(libPtr, "mecab_strerror");
	mecab_destroy = (void (*)(mecab_t *m))PR_FindSymbol(libPtr, "mecab_destroy");
	mecab_sparse_tonode = (const mecab_node_t* (*)(mecab_t *mecab, const char *str))PR_FindSymbol(libPtr, "mecab_sparse_tonode");
	mecab_dictionary_info = (const mecab_dictionary_info_t* (*)(mecab_t *m))PR_FindSymbol(libPtr, "mecab_dictionary_info");

	if (this->libInitialized()) {
		*_retval = PR_TRUE;
		return NS_OK;
	} else {
		*_retval = PR_FALSE;
		return NS_ERROR_FAILURE;
	}
}

/* boolean createTagger (in AString arguments); */
NS_IMETHODIMP SimpleMecab::CreateTagger(const nsAString & arguments, PRBool *_retval NS_OUTPARAM)
{
	nsresult loadLibResult = this->LoadLib(arguments, _retval);
	if (!this->libInitialized()) {
		*_retval = PR_FALSE;
		return NS_ERROR_FAILURE;
	}
	return _CreateTagger(arguments, _retval);
}

nsresult SimpleMecab::_CreateTagger(const nsAString & arguments, PRBool *_retval)
{
	nsresult loadLibResult = this->LoadLib(arguments, _retval);
	if (!this->libInitialized()) {
		*_retval = PR_FALSE;
		return NS_ERROR_FAILURE;
	}

	if (tagger)
		mecab_destroy(tagger);
	currNode = nsnull;

	nsCString cstrArgs;
    NS_UTF16ToCString(arguments, NS_CSTRING_ENCODING_NATIVE_FILESYSTEM, cstrArgs);

	tagger = mecab_new2(cstrArgs.get());

	//Invalid arguments, or no dictionary was found in default locations
	if(!tagger) {
		*_retval = PR_FALSE;
		return NS_ERROR_FAILURE;
	}

	const mecab_dictionary_info_t *dictInfo = mecab_dictionary_info(tagger);
	nsCString charsetName(dictInfo->charset);
	if (charsetName.Equals(nsCString("SHIFT-JIS"))) {
		printf("Detected the dic has is SHIFT-JIS charenc version\n");
		dictCharEncoding = NS_CSTRING_ENCODING_NATIVE_FILESYSTEM;
	} else {	//Assume UTF-8
		dictCharEncoding = NS_CSTRING_ENCODING_UTF8;
	}

	*_retval = PR_TRUE;
    return NS_OK;
}

/* boolean parseToNode (in AString text); */
NS_IMETHODIMP SimpleMecab::Parse(const nsAString & text, PRBool *_retval NS_OUTPARAM)
{
	if (!this->libInitialized()) {
		*_retval = PR_FALSE;
		return NS_ERROR_FAILURE;
	}
	return _Parse(text, _retval);
}

nsresult SimpleMecab::_Parse(const nsAString & text, PRBool *_retval)
{
	if(!tagger)
		return NS_ERROR_NULL_POINTER;

    NS_UTF16ToCString (text, dictCharEncoding, lastParsedText);
	currNode = mecab_sparse_tonode(tagger, lastParsedText.get());
    *_retval = PR_TRUE;
    return NS_OK;
}

/* boolean getNext (out AString surface, out AString feature, out unsigned long length); */
NS_IMETHODIMP SimpleMecab::Next(nsAString & surface NS_OUTPARAM, nsAString & feature NS_OUTPARAM, PRUint32 *length NS_OUTPARAM, PRBool *_retval NS_OUTPARAM)
{
	if (!this->libInitialized()) {
		*_retval = PR_FALSE;
		return NS_ERROR_FAILURE;
	}
	return _Next(surface, feature, length, _retval);
}

nsresult SimpleMecab::_Next(nsAString & surface, nsAString & feature, PRUint32 *length, PRBool *_retval)
{
	if(currNode) {

		NS_CStringToUTF16(nsCString(currNode->surface, currNode->length), dictCharEncoding, surface);
		NS_CStringToUTF16(nsCString(currNode->feature), dictCharEncoding, feature);

		currNode = currNode->next;

		*_retval = PR_TRUE;
	} else {
		*_retval = PR_FALSE;
	}
	return NS_OK;
}
