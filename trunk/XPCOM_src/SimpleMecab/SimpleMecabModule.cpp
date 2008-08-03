#include "nsIGenericFactory.h"

#include "SimpleMecab.h"

NS_GENERIC_FACTORY_CONSTRUCTOR(SimpleMecab)


static NS_METHOD nsSimpleMecabRegistrationProc(nsIComponentManager *aCompMgr,
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
	rv = catmgr->AddCategoryEntry("xpcom-startup", "SimpleMecab", SIMPLEMECAB_CONTRACTID, PR_TRUE, PR_TRUE, &previous);
	if (previous)
		nsMemory::Free(previous);
	return rv;*/
	return NS_OK;
}

static NS_METHOD nsSimpleMecabUnregistrationProc(nsIComponentManager *aCompMgr, nsIFile *aPath,
	const char *registryLocation, const nsModuleComponentInfo *info) {

	/*nsresult rv;
	nsCOMPtr<nsIServiceManager> servmgr = do_QueryInterface((nsISupports*)aCompMgr, &rv);

	if (NS_FAILED(rv))
		return rv;

	nsCOMPtr<nsICategoryManager> catmgr;
	servmgr->GetServiceByContractID(NS_CATEGORYMANAGER_CONTRACTID,NS_GET_IID(nsICategoryManager), getter_AddRefs(catmgr));

	if (NS_FAILED(rv))
		return rv;

	rv = catmgr->DeleteCategoryEntry("xpcom-startup", "SimpleMecab", PR_TRUE);
	return rv;*/
	return NS_OK;
}

static const nsModuleComponentInfo components[] = {
  { "Simple MeCab library wrapper",
    SIMPLMECAB_CID,
    SIMPLEMECAB_CONTRACTID,
    SimpleMecabConstructor
  }
};

NS_IMPL_NSGETMODULE(SimpleMecab, components)

