#ifndef __SimpleMecab_h__
#define __SimpleMecab_h__

#include "ISimpleMecab.h"

#include "mecab.h"
#include "nsEmbedString.h"
#include "prlink.h"	//TODO: remove if static linking is applied?

//The extern declarations should be provided by mecab.h but are not unless the preprocessor symbol SWIG is defined.
extern mecab_t*      mecab_new2(const char *arg);
extern const char*   mecab_version();
extern const char*   mecab_strerror(mecab_t *mecab);
extern void          mecab_destroy(mecab_t *mecab);
extern const mecab_node_t* mecab_sparse_tonode(mecab_t *mecab, const char*);
extern const mecab_dictionary_info_t* mecab_dictionary_info(mecab_t *mecab);

using namespace std;

#define SIMPLMECAB_CID { 0xd66cb28d, 0x54bb, 0x4a81, { 0xb1, 0xd8, 0xc9, 0x3d, 0xdd, 0x59, 0x86, 0xeb} }
#define SIMPLEMECAB_CONTRACTID "@yayakoshi.net/simplemecab;1"

class SimpleMecab : public iSimpleMecab
{
public:
	NS_DECL_ISUPPORTS
	NS_DECL_ISIMPLEMECAB

	SimpleMecab();

private:
	~SimpleMecab();

	//Functions that contain unsafe function pointers. The IDL-defined interface methods first check that the
	//  the MeCab librarily has been successfully loaded before calling these to do the 'real' work.
	nsresult _GetVersion(nsAString & aVersion);
	nsresult _GetError(nsAString & aError);
	nsresult _GetDictionaryInfo(nsAString & aDictionaryInfo);
	nsresult _CreateTagger(const nsAString & arguments, PRBool *_retval);
	nsresult _Parse(const nsAString & text, PRBool *_retval);
	nsresult _Next(nsAString & surface, nsAString & feature, PRUint32 *length, PRBool *_retval);

	nsCString lastParsedText;	//debug
	nsCStringEncoding dictCharEncoding;

protected:
	mecab_t* tagger;
	const mecab_node_t *currNode;

//	mecab_t* (*mecab_new)(int argc, char **argv);
//	mecab_t* (*mecab_new2)(const char *arg);
//	const char* (*mecab_version)(void);
//	const char* (*mecab_strerror)(mecab_t* m);
//	void (*mecab_destroy)(mecab_t *m);
//	const mecab_node_t* (*mecab_sparse_tonode)(mecab_t *mecab, const char *str);
//	const mecab_dictionary_info_t* (*mecab_dictionary_info)(mecab_t *m);
};

#endif /* __SimpleMecab_h__ */
