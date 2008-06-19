#include "nsIGenericFactory.h"

#include "MecabLib.h"

NS_GENERIC_FACTORY_CONSTRUCTOR(MecabLib);


static NS_METHOD nsMecabLibRegistrationProc(nsIComponentManager *aCompMgr,
	nsIFile *aPath, const char *registryLocation, const char *componentType, const nsModuleComponentInfo *info) {

	/*nsresult rv;

	nsCOMPtr<nsIServiceManager> servmgr = do_QueryInterface((nsISupports*)aCompMgr, &rv);

	if (NS_FAILED(rv))
		return rv;

	nsCOMPtr<nsICategoryManager> catmgr;
	servmgr->GetServiceByContractID(NS_CATEGORYMANAGER_CONTRACTID, NS_GET_IID(nsICategoryManager), getter_AddRefs(catmgr));
	if (NS_FAILED(rv))
		return rv;

	char* previous = nsnull;
	rv = catmgr->AddCategoryEntry("xpcom-startup", "MecabLib", MECABLIB_CONTRACTID, PR_TRUE, PR_TRUE, &previous);
	if (previous)
		nsMemory::Free(previous);
	return rv;*/
	return NS_OK;
}

static NS_METHOD nsMecabLibUnregistrationProc(nsIComponentManager *aCompMgr, nsIFile *aPath,
	const char *registryLocation, const nsModuleComponentInfo *info) {

	/*nsresult rv;
	nsCOMPtr<nsIServiceManager> servmgr = do_QueryInterface((nsISupports*)aCompMgr, &rv);

	if (NS_FAILED(rv))
		return rv;

	nsCOMPtr<nsICategoryManager> catmgr;
	servmgr->GetServiceByContractID(NS_CATEGORYMANAGER_CONTRACTID,NS_GET_IID(nsICategoryManager), getter_AddRefs(catmgr));

	if (NS_FAILED(rv))
		return rv;

	rv = catmgr->DeleteCategoryEntry("xpcom-startup", "MecabLib", PR_TRUE);
	return rv;*/
	return NS_OK;
}

static const nsModuleComponentInfo components[] = {
  { "MeCab library wrapper",
    MECABLIB_CID,
    MECABLIB_CONTRACTID,
    MecabLibConstructor
  }
};

NS_IMPL_NSGETMODULE(MecabLib, components)

