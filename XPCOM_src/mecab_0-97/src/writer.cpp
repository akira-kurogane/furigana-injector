//  MeCab -- Yet Another Part-of-Speech and Morphological Analyzer
//
//  $Id: writer.cpp 126 2007-06-07 03:04:29Z taku-ku $;
//
//  Copyright(C) 2001-2006 Taku Kudo <taku@chasen.org>
//  Copyright(C) 2004-2006 Nippon Telegraph and Telephone Corporation
#include <cstdio>
#include <cstring>
#include <fstream>
#include <iostream>
#include "common.h"
#include "utils.h"
#include "string_buffer.h"
#include "writer.h"
#include "param.h"

namespace MeCab {

  void Writer::close() {
    _write = &Writer::writeLattice;
  }

  bool Writer::open(const Param &param) {
    std::string ostyle = param.get<std::string>("output-format-type");
    _write = &Writer::writeLattice;

    if (ostyle == "wakati") {
      _write = &Writer::writeWakati;
    } else if (ostyle == "none") {
      _write = &Writer::writeNone;
    } else if (ostyle == "dump") {
      _write = &Writer::writeDump;
    } else if (ostyle == "em") {
      _write = &Writer::writeEM;
    } else {
      // default values
      std::string nf = "%m\\t%H\\n";
      std::string uf = "%m\\t%H\\n";
      std::string bf = "";
      std::string ef = "EOS\\n";

      std::string nfk = "node-format";
      std::string bfk = "bos-format";
      std::string efk = "eos-format";
      std::string ufk = "unk-format";
      if (!ostyle.empty()) {
        nfk += "-";
        nfk += ostyle;
        bfk += "-";
        bfk += ostyle;
        efk += "-";
        efk += ostyle;
        ufk += "-";
        ufk += ostyle;
        std::string tmp = param.get<std::string>(nfk.c_str());
        CHECK_FALSE(!tmp.empty())
          << "unknown format type [" << ostyle << "]";
      }

      std::string nf2 = param.get<std::string>(nfk.c_str());
      std::string bf2 = param.get<std::string>(bfk.c_str());
      std::string ef2 = param.get<std::string>(efk.c_str());
      std::string uf2 = param.get<std::string>(ufk.c_str());

      if (nf != nf2 || bf != bf2 || ef != ef2 || uf != uf2) {
        _write = &Writer::writeUser;
        if (nf != nf2) nf = nf2;
        if (bf != bf2) bf = bf2;
        if (ef != ef2) ef = ef2;
        if (uf != uf2)
          uf = uf2;
        else if (nf != nf2)
          uf = nf2;
        else
          uf = nf;
        node_format_.reset_string(nf.c_str());
        bos_format_.reset_string(bf.c_str());
        eos_format_.reset_string(ef.c_str());
        unk_format_.reset_string(uf.c_str());
      }
    }

    return true;
  }

  bool Writer::write(StringBuffer *os, const char* str, const Node *bosNode) {
    return (this->*_write)(os, str, bosNode);
  }

  bool Writer::writeLattice(StringBuffer *os, const char* str,
                            const Node *bosNode) {
    for (const Node *node = bosNode->next; node->next; node = node->next) {
      os->write(node->surface, node->length);
      *os << '\t' << node->feature;  // << '\t';
      *os << '\n';
    }
    *os << "EOS\n";
    return true;
  }

  bool Writer::writeWakati(StringBuffer *os, const char*,
                           const Node *bosNode) {
    for (const Node *node = bosNode->next; node->next; node = node->next) {
      os->write(node->surface, node->length);
      *os << ' ';
    }
    *os << '\n';
    return true;
  }

  bool Writer::writeNone(StringBuffer *, const char*, const Node *) {
    return true;  // do nothing
  }

  bool Writer::writeUser(StringBuffer *os, const char* str,
                         const Node *bosNode) {
    if (!writeNode(os, bos_format_.get(), str, bosNode)) return false;
    const Node *node = 0;
    const char *fmt = 0;
    for (node = bosNode->next; node->next; node = node->next) {
      fmt = (node->stat == MECAB_UNK_NODE ? unk_format_.get() :
             node_format_.get());
      if (!writeNode(os, fmt, str, node)) return false;
    }
    if (!writeNode(os, eos_format_.get(), str, node)) return false;
    return true;
  }

  bool Writer::writeEM(StringBuffer *os, const char* str,
                       const Node *bosNode) {
    static const float min_prob = 0.0001;
    for (const Node *node = bosNode; node; node = node->next) {
      if (node->prob >= min_prob) {
        *os << "U\t";
        if (node->stat == MECAB_BOS_NODE)
          *os << "BOS";
        else if (node->stat == MECAB_EOS_NODE)
          *os << "EOS";
        else
          os->write(node->surface, node->length);
        *os << '\t' << node->feature << '\t' << node->prob << '\n';
      }
      for (const Path *path = node->lpath; path; path = path->lnext) {
        if (path->prob >= min_prob) {
          *os << "B\t" << path->lnode->feature << '\t'
              << node->feature << '\t' << path->prob << '\n';
        }
      }
    }
    *os << "EOS\n";
    return true;
  }

  bool Writer::writeDump(StringBuffer *os, const char* str,
                         const Node *bosNode) {
    for (const Node *node = bosNode; node; node = node->next) {
      *os << node->id << ' ';
      if (node->stat == MECAB_BOS_NODE)
        *os << "BOS";
      else if (node->stat == MECAB_EOS_NODE)
        *os << "EOS";
      else
        os->write(node->surface, node->length);

      *os << ' ' << node->feature
          << ' ' << static_cast<int>(node->surface - str)
          << ' ' << static_cast<int>(node->surface - str + node->length)
          << ' ' << node->rcAttr
          << ' ' << node->lcAttr
          << ' ' << node->posid
          << ' ' << static_cast<int>(node->char_type)
          << ' ' << static_cast<int>(node->stat)
          << ' ' << static_cast<int>(node->isbest)
          << ' ' << node->alpha
          << ' ' << node->beta
          << ' ' << node->prob
          << ' ' << node->cost;

      for (const Path *path = node->lpath; path; path = path->lnext) {
        *os << ' ' << path->lnode->id << ':' << path->cost << ':' << path->prob;
      }
      *os << '\n';
    }
    return true;
  }

  bool Writer::writeNode(StringBuffer *os, const char *sentence,
                         const Node *node) {
    switch (node->stat) {
    case MECAB_BOS_NODE:
      return writeNode(os, bos_format_.get(),  sentence, node);
    case MECAB_EOS_NODE:
      return writeNode(os, eos_format_.get(),  sentence, node);
    case MECAB_UNK_NODE:
      return writeNode(os, unk_format_.get(),  sentence, node);
    case MECAB_NOR_NODE:
      return writeNode(os, node_format_.get(), sentence, node);
    }
    return true;
  }

  bool Writer::writeNode(StringBuffer *os, const char *p,
                         const char *sentence, const Node *node) {
    char buf[BUF_SIZE];
    char *ptr[64];
    size_t psize = 0;

    for (; *p; p++) {
      switch (*p) {
      default: *os << *p; break;

      case '\\': *os << getEscapedChar(*++p); break;

      case '%': {  // macros
        switch (*++p) {
        default: CHECK_FALSE(false) << "unkonwn meta char " << *p;
          // input sentence
        case 'S': os->write(sentence, std::strlen(sentence)); break;
          // sentence length
        case 'L': *os << std::strlen(sentence); break;
          // morph
        case 'm': os->write(node->surface, node->length); break;
        case 'M': os->write(reinterpret_cast<const char *>
                            (node->surface - node->rlength + node->length),
                            node->rlength);
          break;
        case 'h': *os << node->posid; break;  // Part-Of-Speech ID
        case '%': *os << '%'; break;         // %
        case 'c': *os << static_cast<int>(node->wcost); break;  // word cost
        case 'H': *os << node->feature; break;
        case 't': *os << static_cast<unsigned int>(node->char_type); break;
        case 's': *os << static_cast<unsigned int>(node->stat); break;
        case 'P': *os << node->prob; break;
        case 'p': {
          switch (*++p) {
          default: CHECK_FALSE(false) << "[iseSCwcnblLh] is required after %p";
          case 'i': *os << node->id; break;  // node id
          case 'S': os->write(reinterpret_cast<const char*>
                              (node->surface - node->rlength + node->length),
                              node->rlength - node->length);
            break;  // space
            // start position
          case 's': *os << static_cast<int>(node->surface - sentence); break;
            // end position
          case 'e': *os << static_cast<int>
                      (node->surface - sentence + node->length);
            break;
            // connection cost
          case 'C': *os << node->cost -
                      node->prev->cost - node->wcost;
            break;
          case 'w': *os << node->wcost; break;  // word cost
          case 'c': *os << node->cost; break;  // best cost
          case 'n': *os << (node->cost - node->prev->cost); break;  // node cost
            // * if best path, otherwise ' '
          case 'b': *os << (node->isbest ? '*' : ' '); break;
          case 'P': *os << node->prob; break;
          case 'A': *os << node->alpha; break;
          case 'B': *os << node->beta; break;
          case 'l': *os << node->length; break;  // length of morph
            // length of morph including the spaces
          case 'L': *os << node->rlength;    break;
          case 'h': {  // Hidden Layer ID
            switch (*++p) {
            default: CHECK_FALSE(false) << "lr is required after %ph";
            case 'l': *os << node->lcAttr; break;   // current
            case 'r': *os << node->rcAttr; break;   // prev
            }
          } break;

          case 'p': {
            char mode = *++p;
            char sep = *++p;
            if (sep == '\\') sep = getEscapedChar(*++p);
            CHECK_FALSE(node->lpath) << "no path information, use -l option";
            for (Path *path = node->lpath; path; path = path->lnext) {
              if (path != node->lpath) *os << sep;
              switch (mode) {
              case 'i': *os << path->lnode->id; break;
              case 'c': *os << path->cost; break;
              case 'P': *os << path->prob; break;
              default: CHECK_FALSE(false) << "[icP] is required after %pp";
              }
            }
          } break;

          }
        } break;

        case 'F':
        case 'f': {
          CHECK_FALSE(node->feature[0] != '\0')
            << "no feature information available";

          if (!psize) {
            std::strncpy(buf, node->feature, sizeof(buf));
            psize = tokenizeCSV(buf, ptr, sizeof(ptr));
          }

          // separator
          char separator = '\t';  // default separator
          if (*p == 'F') {  // change separator
            if (*++p == '\\')
              separator = getEscapedChar(*++p);
            else
              separator = *p;
          }

          CHECK_FALSE(*++p =='[') << "cannot find '['";
          size_t n = 0;
          bool sep = false;
          bool isfil = false;
          p++;

          for (;; ++p) {
            switch (*p) {
            case '0': case '1': case '2': case '3': case '4':
            case '5': case '6': case '7': case '8': case '9':
              n = 10 * n +(*p - '0');
              break;
            case ',': case ']':
              CHECK_FALSE(n < psize) << "given index is out of range";
              isfil = (ptr[n][0] != '*');
              if (isfil) {
                if (sep) *os << separator;
                *os << ptr[n];
              }
              if (*p == ']') goto last;
              sep = isfil;
              n = 0;
              break;
            default:
              CHECK_FALSE(false) << "cannot find ']'";
            }
          }
        } last: break;
        }  // end switch
      } break;  // end case '%'
      }  // end switch
    }

    return true;
  }
}
