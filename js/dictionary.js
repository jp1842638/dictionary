/**
 * dictionary.js
 * Free Dictionary API 호출 + 응답 정규화.
 *  https://api.dictionaryapi.dev/api/v2/entries/en/<word>
 */
(function (global) {
  'use strict';

  var BASE_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en/';

  /**
   * 단어를 검색해서 정규화된 객체 배열로 반환.
   * 단어를 못 찾으면 throw.
   *
   * @param {string} word
   * @returns {Promise<Array<NormalizedEntry>>}
   *
   * NormalizedEntry = {
   *   word: string,
   *   phonetic: string,        // 예: "/ˌsɛrənˈdɪpɪti/"
   *   meanings: Array<{
   *     partOfSpeech: string,
   *     definitions: Array<{ definition: string, example: string }>,
   *     synonyms: string[],
   *     antonyms: string[],
   *   }>
   * }
   */
  function lookup(word) {
    var w = String(word || '').trim();
    if (!w) {
      return Promise.reject(new Error('Please enter a word.'));
    }

    var url = BASE_URL + encodeURIComponent(w.toLowerCase());

    return fetch(url)
      .then(function (res) {
        if (res.status === 404) {
          var notFound = new Error('No definitions found for "' + w + '".');
          notFound.code = 'NOT_FOUND';
          throw notFound;
        }
        if (!res.ok) {
          throw new Error('Network error (' + res.status + ').');
        }
        return res.json();
      })
      .then(function (data) {
        if (!Array.isArray(data) || data.length === 0) {
          var err = new Error('No definitions found for "' + w + '".');
          err.code = 'NOT_FOUND';
          throw err;
        }
        return data.map(normalizeEntry);
      })
      .then(function (entries) {
        // 첫 entry에 발음기호가 없으면 Wiktionary에서 보충 (GA 우선).
        // 실패해도 결과 자체에는 영향 없음.
        if (entries[0] && !entries[0].phonetic && global.Wiktionary) {
          return global.Wiktionary.getIPA(w)
            .then(function (ipa) {
              if (ipa) {
                // 모든 entry의 빈 phonetic을 동일 IPA로 채움
                entries.forEach(function (e) {
                  if (!e.phonetic) e.phonetic = ipa;
                });
              }
              return entries;
            })
            .catch(function () {
              return entries;
            });
        }
        return entries;
      });
  }

  function normalizeEntry(entry) {
    var phonetic = entry.phonetic || '';

    if (!phonetic && Array.isArray(entry.phonetics)) {
      // 발음 기호 찾기
      for (var i = 0; i < entry.phonetics.length; i++) {
        var p = entry.phonetics[i];
        if (p && p.text) {
          phonetic = p.text;
          break;
        }
      }
    }

    var meanings = Array.isArray(entry.meanings)
      ? entry.meanings.map(function (m) {
          return {
            partOfSpeech: m.partOfSpeech || '',
            definitions: Array.isArray(m.definitions)
              ? m.definitions.map(function (d) {
                  return {
                    definition: d.definition || '',
                    example: d.example || '',
                  };
                })
              : [],
            synonyms: Array.isArray(m.synonyms) ? m.synonyms.slice(0, 8) : [],
            antonyms: Array.isArray(m.antonyms) ? m.antonyms.slice(0, 8) : [],
          };
        })
      : [];

    return {
      word: entry.word || '',
      phonetic: phonetic,
      meanings: meanings,
    };
  }

  global.Dictionary = {
    lookup: lookup,
  };
})(window);