#include "MecabLib.h"
#include "string.h"

/* Implementation file */
NS_IMPL_ISUPPORTS1(MecabLib, iMecabLib)

MecabLib::MecabLib()
{
	tagger = nsnull;
	node = nsnull;
	lib = nsnull;
  /* member initializers and constructor code */
}

MecabLib::~MecabLib()
{
	if (tagger) mecab_destroy(tagger);
	if (lib) PR_UnloadLibrary(lib);

  /* destructor code */
}

/* boolean createTagger (in AString arguments); */
NS_IMETHODIMP MecabLib::CreateTagger(const nsAString & arguments, PRBool *_retval)
{
	if (tagger) mecab_destroy(tagger);
	node = nsnull;

	nsCString cArgs;
    NS_UTF16ToCString(arguments, NS_CSTRING_ENCODING_UTF8, cArgs);
	char *copy = _strdup(cArgs.get());
	char *mecab_dll_path = strtok(copy, ";");
	char *mecab_rc_path = strtok(NULL, ";");
	if(!mecab_rc_path) mecab_rc_path = "";

	// mecab dll isn't loaded
	if(!lib) {
		//try loading local DLL
		lib = PR_LoadLibrary(mecab_dll_path);
		//Loading local DLL file failed. Try loading DLL from path.
		if(!lib) PR_LoadLibrary("libmecab.dll");
	}

	if(lib) {
		mecab_new = (mecab_t* (*)(int argc, char **argv)) PR_FindSymbol(lib, "mecab_new");
		mecab_new2 = (mecab_t* (*)(const char *arg)) PR_FindSymbol(lib, "mecab_new2");
		mecab_sparse_tonode = (const mecab_node_t* (*)(mecab_t *mecab, const char*))PR_FindSymbol(lib, "mecab_sparse_tonode");
		mecab_destroy = (void (*)(mecab_t *mecab))PR_FindSymbol(lib, "mecab_destroy");
		mecab_dictionary_info = (const mecab_dictionary_info_t* (*)(mecab_t *mecab))PR_FindSymbol(lib, "mecab_dictionary_info");

		//try looking for local dictionary
#ifdef _DEBUG
			printf("%s\n", "Trying to load local dictionary");
#endif
		char *args[3] = {"mecab.exe", "-r", mecab_rc_path};
		tagger = mecab_new(3, args);

		//failed creating tagger because local dictionary is missing
		//try loading system dictionary
		if(!tagger) {
#ifdef _DEBUG
			printf("%s\n", "Trying to load system dictionary");
#endif
			tagger = mecab_new2("");
		}

		//failed creating tagger
		if(!tagger) {
#ifdef _DEBUG
			printf("Failed creating tagger. No dictionary found.\n");
#endif
			*_retval = PR_FALSE;
			return NS_ERROR_FAILURE;
		}
	} else {
		//failed loading libmecab.dll
		*_retval = PR_FALSE;
		return NS_ERROR_FAILURE;
	}

#ifdef _DEBUG
	//print info about mecab dictionary
	const mecab_dictionary_info_t *d = mecab_dictionary_info(tagger);
	for (; d; d = d->next) {
		printf("filename: %s\n", d->filename);
		printf("charset: %s\n", d->charset);
		printf("size: %d\n", d->size);
		printf("type: %d\n", d->type);
		printf("lsize: %d\n", d->lsize);
		printf("rsize: %d\n", d->rsize);
		printf("version: %d\n", d->version);
	}
#endif

	*_retval = PR_TRUE;
    return NS_OK;
}

/* boolean parseToNode (in AString text); */
NS_IMETHODIMP MecabLib::ParseToNode(const nsAString & text, PRBool *_retval)
{
	if(!tagger) return NS_ERROR_NULL_POINTER;

	nsCString cText;
    NS_UTF16ToCString (text, NS_CSTRING_ENCODING_UTF8, cText);
	//char *copy = (char *)malloc(sizeof(char) * (strlen(cText.get() + 1)));
	//strcpy(copy, cText.get());
	char *copy = _strdup(cText.get());
    //node = tagger->parseToNode(copy);
	node = mecab_sparse_tonode(tagger, copy);
    *_retval = PR_TRUE;
    return NS_OK;
}

/* boolean getNext (out AString surface, out AString feature, out unsigned long length); */
NS_IMETHODIMP MecabLib::GetNext(nsAString & surface, nsAString & feature, PRUint32 *length, PRBool *_retval)
{
	// nsString is the same as nsEmbedString
	// nsCString is the same as nsEmbedCString

	if(!node) return NS_ERROR_NULL_POINTER;

	char *subSurface = (char *)malloc(sizeof(char) * (node->length + 1));
	//strncpy_s(subSurface, node->rlength + 1, node->surface, node->rlength);
	strncpy(subSurface, node->surface, node->length);
	subSurface[node->length] = '\0';
	NS_CStringToUTF16(nsCString(subSurface), NS_CSTRING_ENCODING_UTF8, surface);
	NS_CStringToUTF16(nsCString(node->feature), NS_CSTRING_ENCODING_UTF8, feature);
	free(subSurface);
	*length = node->length;
	node = node->next;
	// node is not NULL
	if(node) {
		*_retval = PR_TRUE;
	} else {
		*_retval = PR_FALSE;
	}
	return NS_OK;
}
