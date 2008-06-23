#include "nsIGenericFactory.h"
/*#include "nsCOMPtr.h"
#include "nsIServiceManager.h"
#include "nsICategoryManager.h"
#include "nsMemory.h"*/

#include "YomikataDictionary.h"

NS_GENERIC_FACTORY_CONSTRUCTOR(YomikataDictionary);


static NS_METHOD nsYomikataDictionaryRegistrationProc(nsIComponentManager *aCompMgr,
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
	rv = catmgr->AddCategoryEntry("xpcom-startup", "YomikataDictionary", YOMIKATADICTIONARY_CONTRACTID, PR_TRUE, PR_TRUE, &previous);
	if (previous)
		nsMemory::Free(previous);
	return rv;*/
	return NS_OK;
}

static NS_METHOD nsYomikataDictionaryUnregistrationProc(nsIComponentManager *aCompMgr, nsIFile *aPath,
	const char *registryLocation, const nsModuleComponentInfo *info) {

	/*nsresult rv;
	nsCOMPtr<nsIServiceManager> servmgr = do_QueryInterface((nsISupports*)aCompMgr, &rv);

	if (NS_FAILED(rv))
		return rv;

	nsCOMPtr<nsICategoryManager> catmgr;
	servmgr->GetServiceByContractID(NS_CATEGORYMANAGER_CONTRACTID,NS_GET_IID(nsICategoryManager), getter_AddRefs(catmgr));

	if (NS_FAILED(rv))
		return rv;

	rv = catmgr->DeleteCategoryEntry("xpcom-startup", "YomikataDictionary", PR_TRUE);
	return rv;*/
	return NS_OK;
}

static const nsModuleComponentInfo components[] = {
  { "Yomikata dictionary",
    YOMIKATADICTIONARY_CID,
    YOMIKATADICTIONARY_CONTRACTID,
    YomikataDictionaryConstructor
  }
};

NS_IMPL_NSGETMODULE(YomikataDictionary, components)

