#include "SimpleMecab.h"
#include "string.h"
#include "nsCOMPtr.h"

NS_IMPL_ISUPPORTS1(SimpleMecab, iSimpleMecab)

SimpleMecab::SimpleMecab()
{
	tagger = nsnull;
	currNode = nsnull;
	dictCharEncoding = NS_CSTRING_ENCODING_UTF8;
}

SimpleMecab::~SimpleMecab()
{
	if (tagger)
		mecab_destroy(tagger);
}

/* readonly attribute AString version; */
NS_IMETHODIMP SimpleMecab::GetVersion(nsAString & aVersion)
{
	nsCString tempCStr;
	tempCStr.Assign(mecab_version());
	NS_CStringToUTF16(tempCStr, NS_CSTRING_ENCODING_UTF8, aVersion);	//should only be ascii
    return NS_OK;
}


/* readonly attribute AString error; */
NS_IMETHODIMP SimpleMecab::GetError(nsAString & aError)
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
	if (!tagger)
		return NS_ERROR_FAILURE;

	const mecab_dictionary_info_t *dictInfo = mecab_dictionary_info(tagger);
	if (!dictInfo) {
		return NS_ERROR_FAILURE;
	} else {
		char charBuffer[1024];
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


/* boolean createTagger (in AString arguments); */
NS_IMETHODIMP SimpleMecab::CreateTagger(const nsAString & arguments, PRBool *_retval NS_OUTPARAM)
{
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
	if(!tagger)
		return NS_ERROR_NULL_POINTER;

    NS_UTF16ToCString (text, dictCharEncoding, lastParsedText);
	//Alternate converter: (Javascript syntax shown)
	//converter = nsIScriptableUnicodeConverter
	//converter.charset = "SJIS"
	//lastParsedText = converter.convertFromUnicode(text)
	currNode = mecab_sparse_tonode(tagger, lastParsedText.get());
    *_retval = PR_TRUE;
    return NS_OK;
}


/* boolean getNext (out AString surface, out AString feature, out unsigned long length); */
NS_IMETHODIMP SimpleMecab::Next(nsAString & surface NS_OUTPARAM, nsAString & feature NS_OUTPARAM, PRUint32 *length NS_OUTPARAM, PRBool *_retval NS_OUTPARAM)
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
