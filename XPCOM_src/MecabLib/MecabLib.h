#ifndef __MecabLib_h__
#define __MecabLib_h__

#include "IMecabLib.h"

#include <mecab.h>
#include "nsEmbedString.h"
#include "prlink.h"

using namespace std;

#define MECABLIB_CID { 0xb6aad7bc, 0x3c76, 0x11dd, { 0x97, 0x4f, 0xc1, 0xf7, 0x55, 0xd8, 0x95, 0x93} }
#define MECABLIB_CONTRACTID "@yayakoshi.net/mecablib;1"

class MecabLib : public iMecabLib
{
public:
  NS_DECL_ISUPPORTS
  NS_DECL_IMECABLIB

  MecabLib();

private:
  ~MecabLib();

protected:
  //MeCab::Tagger *tagger;
  //const MeCab::Node *node;
  mecab_t* tagger;
  const mecab_node_t *node;
  PRLibrary *lib;
  mecab_t* (*mecab_new)(int argc, char **argv);
  mecab_t* (*mecab_new2)(const char *arg);
  const mecab_node_t* (*mecab_sparse_tonode)(mecab_t *mecab, const char*);
  void (*mecab_destroy)(mecab_t *mecab);
  const mecab_dictionary_info_t* (*mecab_dictionary_info)(mecab_t *mecab);
};

#endif /* __MecabLib_h__ */
