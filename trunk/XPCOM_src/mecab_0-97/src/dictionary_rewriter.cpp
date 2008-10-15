//  MeCab -- Yet Another Part-of-Speech and Morphological Analyzer
//
//  $Id: dictionary_rewriter.cpp 142 2007-09-06 15:14:08Z taku-ku $;
//
//  Copyright(C) 2001-2006 Taku Kudo <taku@chasen.org>
//  Copyright(C) 2004-2006 Nippon Telegraph and Telephone Corporation
#include <cstring>
#include <string>
#include <vector>
#include <map>
#include <fstream>

#include "utils.h"
#include "common.h"
#include "dictionary_rewriter.h"
#include "iconv_utils.h"

namespace {

  using namespace MeCab;

  void append_rewrite_rule(RewriteRules *r, char* str) {
    char *col[3];
    const size_t n = tokenize2(str, " \t", col, 3);
    CHECK_DIE(n >= 2) << "format error: " << str;
    r->resize(r->size() + 1);
    std::string tmp;
    if (n >= 3) {
      tmp = col[1];
      tmp += ' ';
      tmp += col[2];
      col[1] = const_cast<char *>(tmp.c_str());
    }
    r->back().set_pattern(col[0], col[1]);
  }

  bool match_rewrite_pattern(const char *pat,
                             const char *str) {
    if (pat[0] == '*' || std::strcmp(pat, str) == 0)
      return true;

    size_t len = std::strlen(pat);
    if (len >= 3 && pat[0] == '(' && pat[len-1] == ')') {
      char buf[BUF_SIZE];
      char *col[BUF_SIZE];
      CHECK_DIE(len < sizeof(buf) - 3) << "too long parameter";
      std::strncpy(buf, pat + 1, BUF_SIZE);
      buf[len-2] = '\0';
      const size_t n = tokenize(buf, "|", col, sizeof(col));
      CHECK_DIE(n < sizeof(col)) << "too long OR nodes";
      for (size_t i = 0; i < n; ++i) {
        if (std::strcmp(str, col[i]) == 0) return true;
      }
    }
    return false;
  }
}

namespace MeCab {

  bool RewritePattern::set_pattern(const char *src,
                                   const char *dst) {
    char buf[BUF_SIZE];
    spat_.clear();
    dpat_.clear();

    std::strncpy(buf, src, sizeof(buf));
    tokenizeCSV(buf, back_inserter(spat_), 512);

    std::strncpy(buf, dst, sizeof(buf));
    tokenizeCSV(buf, back_inserter(dpat_), 512);

    return (spat_.size() && dpat_.size());
  }

#if 0
  bool RewritePattern::set_pattern(const char *src1,
                                   const char *src2,
                                   const char *dst) {
    char buf[BUF_SIZE];
    spat_.clear();
    spat2_.clear();
    dpat_.clear();

    std::strncpy(buf, src1, sizeof(buf));
    tokenizeCSV(buf, back_inserter(spat_), 512);

    std::strncpy(buf, src2, sizeof(buf));
    tokenizeCSV(buf, back_inserter(spat2_), 512);

    std::strncpy(buf, dst, sizeof(buf));
    tokenizeCSV(buf, back_inserter(dpat_), 512);

    return (spat_.size() && spat2_.size() && dpat_.size());
  }
#endif

  bool RewritePattern::rewrite(size_t size,
                               const char **input,
                               std::string *output) const {
    if (spat_.size() > size) return false;
    for (size_t i = 0; i < spat_.size(); ++i) {
      if (!match_rewrite_pattern(spat_[i].c_str(), input[i]))
        return false;
    }

    output->clear();
    for (size_t i = 0; i < dpat_.size(); ++i) {
      std::string elm;
      const char *begin = dpat_[i].c_str();
      const char *end = begin + dpat_[i].size();
      for (const char *p = begin; p < end; ++p) {
        if (*p == '$') {
          ++p;
          size_t n = 0;
          for (; p < end; ++p) {
            switch (*p) {
            case '0': case '1': case '2': case '3': case '4':
            case '5': case '6': case '7': case '8': case '9':
              n = 10 * n + (*p - '0');
              break;
            default:
              goto NEXT;
            }
          }
        NEXT:
          CHECK_DIE(n > 0 && (n - 1) < size)
            << " out of range: [" << dpat_[i] << "] " << n;
          elm += input[n - 1];
          if (p < end) elm += *p;
        } else {
          elm += *p;
        }
      }
      CHECK_DIE(escape_csv_element(&elm));
      *output += elm;
      if (i + 1 != dpat_.size()) *output += ",";
    }

    return true;
  }

#if 0
  bool RewritePattern::rewrite(size_t size1, const char **input1,
                               size_t size2, const char **input2,
                               std::string *output) const {
    if (spat_.size() > size1) return false;
    if (spat2_.size() > size2) return false;

    for (size_t i = 0; i < spat_.size(); ++i) {
      if (!match_rewrite_pattern(spat_[i].c_str(), input1[i]))
        return false;
    }

    for (size_t i = 0; i < spat2_.size(); ++i) {
      if (!match_rewrite_pattern(spat2_[i].c_str(), input2[i]))
        return false;
    }

    output->clear();
    for (size_t i = 0; i < dpat_.size(); ++i) {
      const size_t len = dpat_[i].size();
      std::string elm;
      if (len >= 2 && dpat_[i][0] == '$') {
        size_t n = std::atoi(dpat_[i].c_str() + 1);
        CHECK_DIE((n - 1) < size1 && (n - 1) < size2)
          << " out of range: " << dpat_[i] << std::endl;
        elm =  input1[n - 1];
        elm += input2[n - 1];
      } else {
        elm = dpat_[i];
      }
      CHECK_DIE(escape_csv_element(&elm));
      *output += elm;
      if (i != dpat_.size() - 1) *output += ",";
    }

    return true;
  }
#endif

  bool RewriteRules::rewrite(size_t size,
                             const char **input,
                             std::string *output) const {
    for (size_t i = 0; i < this->size(); ++i) {
      if ((*this)[i].rewrite(size, input, output))
        return true;
    }
    return false;
  }


#if 0
  bool RewriteRules::rewrite(size_t size1, const char **input1,
                             size_t size2, const char **input2,
                             std::string *output) const {
    for (size_t i = 0; i < this->size(); ++i) {
      if ((*this)[i].rewrite(size1, input1,
                             size2, input2,
                             output)) return true;
    }
    return false;
  }
#endif

  void DictionaryRewriter::clear() { cache_.clear(); }

  bool DictionaryRewriter::open(const char *filename,
                                Iconv *iconv) {
    std::ifstream ifs(filename);
    CHECK_DIE(ifs) << "no such file or directory: " << filename;
    int append_to = 0;
    std::string line;
    while (std::getline(ifs, line)) {
      if (iconv) iconv->convert(&line);
      if (line.empty() || line[0] == '#') continue;
      if (line == "[unigram rewrite]") {
        append_to = 1;
      } else if (line == "[left rewrite]") {
        append_to = 2;
      } else if (line == "[right rewrite]") {
        append_to = 3;
      } else {
        CHECK_DIE(append_to != 0) << "no sections found";
        char *str = const_cast<char *>(line.c_str());
        switch (append_to) {
        case 1: append_rewrite_rule(&unigram_rewrite_, str); break;
        case 2: append_rewrite_rule(&left_rewrite_,    str); break;
        case 3: append_rewrite_rule(&right_rewrite_,   str); break;
        }
      }
    }
    return true;
  }

  // without cache
  bool DictionaryRewriter::rewrite(const std::string &feature,
                                   std::string *ufeature,
                                   std::string *lfeature,
                                   std::string *rfeature) const {
    char buf[BUF_SIZE];
    char *col[BUF_SIZE];
    CHECK_DIE(feature.size() < sizeof(buf) - 1) << "too long feature";
    std::strncpy(buf, feature.c_str(), sizeof(buf) - 1);
    size_t n = tokenizeCSV(buf, col, sizeof(col));
    CHECK_DIE(n < sizeof(col)) << "too long CSV entities";
    return (unigram_rewrite_.rewrite(n, const_cast<const char **>(col),
                                     ufeature) &&
            left_rewrite_.rewrite(n, const_cast<const char **>(col),
                                  lfeature) &&
            right_rewrite_.rewrite(n, const_cast<const char **>(col),
                                   rfeature));
  }

  // with cache
  bool DictionaryRewriter::rewrite2(const std::string &feature,
                                    std::string *ufeature,
                                    std::string *lfeature,
                                    std::string *rfeature) {
    std::map<std::string, FeatureSet>::const_iterator it = cache_.find(feature);
    if (it == cache_.end()) {
      if (!rewrite(feature, ufeature, lfeature, rfeature)) return false;
      FeatureSet f;
      f.ufeature = *ufeature;
      f.lfeature = *lfeature;
      f.rfeature = *rfeature;
      cache_.insert(std::make_pair<std::string, FeatureSet>(feature, f));
    } else {
      *ufeature = it->second.ufeature;
      *lfeature = it->second.lfeature;
      *rfeature = it->second.rfeature;
    }

    return true;
  }

  bool POSIDGenerator::open(const char *filename,
                            Iconv *iconv) {
    std::ifstream ifs(filename);
    if (!ifs) {
      std::cerr << filename
                << " is not found. minimum setting is used" << std::endl;
      rewrite_.resize(1);
      rewrite_.back().set_pattern("*", "1");
      return true;
    }

    std::string line;
    char *col[2];
    while (std::getline(ifs, line)) {
      if (iconv) iconv->convert(&line);
      const size_t n = tokenize2(const_cast<char *>(line.c_str()),
                           " \t", col, 2);
      CHECK_DIE(n == 2) << "format error: " << line;
      for (char *p = col[1]; *p; ++p) {
        CHECK_DIE(*p >= '0' && *p <= '9') << "not a number: " << col[1];
      }
      rewrite_.resize(rewrite_.size() + 1);
      rewrite_.back().set_pattern(col[0], col[1]);
    }
    return true;
  }

  int POSIDGenerator::id(const char *feature) const {
    char buf[BUF_SIZE];
    char *col[BUF_SIZE];
    CHECK_DIE(std::strlen(feature) < sizeof(buf) - 1) << "too long feature";
    std::strncpy(buf, feature, sizeof(buf) - 1);
    const size_t n = tokenizeCSV(buf, col, sizeof(col));
    CHECK_DIE(n < sizeof(col)) << "too long CSV entities";
    std::string tmp;
    if (!rewrite_.rewrite(n, const_cast<const char **>(col), &tmp))
      return -1;
    return std::atoi(tmp.c_str());
  }

#if 0
  bool BinomialNodeRewriter::open(const char *filename) {
    std::ifstream ifs(filename);
    CHECK_DIE(ifs) << "no such file or directory: " << filename;
    char line[BUF_SIZE];
    while (ifs.getline(line, sizeof(line))) {
      char *col[4];
      const size_t n = tokenize2(line, " \t", col, 3);
      CHECK_DIE(n == 3) << "format error: " << line;
      rewrite_.resize(rewrite_.size() + 1);
      rewrite_.back().set_pattern(col[0], col[1], col[2]);
    }
    return true;
  }

  bool BinomialNodeRewriter::rewrite(Node *bos) {
    Node *prev = 0;
    char buf1[BUF_SIZE];
    char buf2[BUF_SIZE];
    char *col1[BUF_SIZE];
    char *col2[BUF_SIZE];
    std::string output;

    for (Node *node = bos->next; node->next; node = node->next) {
      if (prev && node->stat != MECAB_EOS_NODE) {
        CHECK_DIE(std::strlen(prev->feature) < sizeof(buf1) - 1)
          << "too long feature";
        std::copy(prev->feature, prev->feature + strlen(prev->feature),
                  buf1);
        memcpy(buf1, prev->feature, strlen(prev->feature));
        buf1[strlen(prev->feature)] = '\0';
        std::strncpy(buf1, prev->feature, sizeof(buf1) - 1);
        size_t n1 = tokenizeCSV(buf1, col1, sizeof(col1));
        CHECK_DIE(n1 < sizeof(col1)) << "too long CSV entities";

        CHECK_DIE(std::strlen(node->feature) < sizeof(buf2) - 1)
          << "too long feature";
        std::strncpy(buf2, node->feature, sizeof(buf2) - 1);
        size_t n2 = tokenizeCSV(buf2, col2, sizeof(col2));
        CHECK_DIE(n2 < sizeof(col2)) << "too long CSV entities";

        if (rewrite_.rewrite(n1, const_cast<const char **>(col1),
                             n2, const_cast<const char **>(col2), &output)) {
          prev->next = node->next;  // remove current node
          node->next->prev = prev;
          prev->length += node->length;
          prev->rlength += node->rlength;
          char *p = char_freelist_.alloc(output.size() + 1);
          std::strncpy(p, output.c_str(), output.size());
          prev->feature = p;
          continue;
        }
      }
      prev = node;
    }
    return true;
  }
#endif
}
