#include "YomikataDictionary.h"

NS_IMPL_ISUPPORTS1(YomikataDictionary, iYomikataDictionary)


YomikataDictionary::YomikataDictionary() {
	//nothing
}

YomikataDictionary::~YomikataDictionary() {
	//nothing
}

/******************************************************************************
 *	Simply cast the nsAString to a nsString and then a std::wstring, then 
 *	  retrieve the mapped value. Returns a blank if none.
 ******************************************************************************/
NS_IMETHODIMP YomikataDictionary::FindExact(const nsAString& search_word, nsAString& _retval) {
	NS_PRECONDITION(_retval != nsnull, "null ptr");
	wstring wstr_search_word(nsString(search_word).get());	//Devnote: I don't honestly know how this cast worked.
	_retval.Assign(nsString((this->_entries_map[wstr_search_word]).c_str()));
    return NS_OK;
}

/******************************************************************************
 *	Iterate through the string from it's full length
 *	Todo: skip matching single chars? Returns too many incorrect readings. 
 *	  At least if a compound word of name kanji can be made
 ******************************************************************************/
NS_IMETHODIMP YomikataDictionary::FindLongestMatch(const nsAString & search_word, PRInt16 *match_length, nsAString & _retval) {
	nsString tempResult;
	nsresult rv;
	nsString tempSearchWord;
	for (int x = search_word.Length(); x > 0; --x) {
		tempSearchWord = Substring(search_word, 0, x);
		rv = this->FindExact(tempSearchWord, _retval);
		if (_retval.Length() > 0) {
			*match_length = x;
			break;
		}
	}
    return NS_OK;
}

/******************************************************************************
 *	Using a std c++ filestream the contents of the specified data file are 
 *	  loaded into a std c++ map container. The filestream is a wide-char 
 *	  receiving type, and is imbued()'d with a non-standard codecvt object 
 *	  so it can parse the UTF-8 of the file.
 *	The format of the file should be, in UTF-8, the kanji word at the beginning 
 *	  of each line, followed by a tab, followed by the yomikata (in hiragana). 
 *	  The fstream seems to require windows style line breaks.
 *	A XPCOM nsILocalFile is object is passed in as a parameter, but it is only
 *	  used to get the native path value.
 ******************************************************************************/
NS_IMETHODIMP YomikataDictionary::LoadFromFile(nsILocalFile *dict_file_ref, PRBool *_retval) {
	(*_retval) = PR_FALSE;
	wifstream dict_data_file;
	locale dummy("");
	locale utf8loc(dummy, new boost::program_options::detail::utf8_codecvt_facet()); 
	dict_data_file.imbue(utf8loc);
	nsCString tempPathString;
	dict_file_ref->GetNativePath(tempPathString);
	dict_data_file.open(tempPathString.get());
	if (!dict_data_file) {
		printf("Unable to open that file\n");	//to delete when development is finished.
		return NS_ERROR_FAILURE;
	}
	wstring line;
	wstring kanji_word;
	wstring yomikata;
	wstring::size_type delim_pos;
	while (getline(dict_data_file, line)) {
		delim_pos = line.find(L"\t", 0);
		if (delim_pos == wstring::npos) 
			continue;
		kanji_word.assign(line, 0, delim_pos);
		yomikata.assign(line, delim_pos + 1, line.length());
		if (yomikata.length() == 0) 
			continue;
		this->_entries_map[kanji_word] = yomikata;
	}
	printf("%d yomikata entries loaded from file\n", this->_entries_map.size());	//to delete when development is finished.
	(*_retval) = PR_TRUE;
	return NS_OK;
}