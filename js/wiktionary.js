/**
 * wiktionary.js
 * Wiktionary(en) 위키텍스트에서 영어 IPA를 추출하는 모듈.
 * Free Dictionary API에 발음기호가 없을 때 보조로 사용.
 *
 * 사용:
 *   Wiktionary.getIPA('puberty').then(ipa => console.log(ipa));
 *   // → "/ˈpju.bɚ.ti/"  (GA 우선)
 */
(function (global) {
  'use strict';

  var BASE =
    'https://en.wiktionary.org/w/api.php' +
    '?action=parse&prop=wikitext&format=json&formatversion=2&origin=*&page=';

  /**
   * 단어의 IPA를 가져온다. (GA → RP → 기타 영어 순으로 우선)
   * 실패하거나 IPA 없으면 빈 문자열 반환 (절대 throw 안 함).
   *
   * @param {string} word
   * @returns {Promise<string>}
   */
  function getIPA(word) {
    var w = String(word || '').trim();
    if (!w) return Promise.resolve('');

    var url = BASE + encodeURIComponent(w);

    return fetch(url)
      .then(function (res) {
        if (!res.ok) return '';
        return res.json();
      })
      .then(function (data) {
        if (!data || !data.parse || !data.parse.wikitext) return '';
        return extractIPA(data.parse.wikitext);
      })
      .catch(function () {
        return '';
      });
  }

  /**
   * wikitext에서 영어 IPA를 추출.
   *  매치 패턴: {{IPA|en|/.../|/.../|...|a=GA,CA}}
   * GA(미국) 우선, 그 다음 RP(영국), 그 외 마지막.
   */
  function extractIPA(wikitext) {
    if (!wikitext) return '';

    // 한 줄에 한 개씩 분석하기 위해 라인 단위로 자름
    var lines = wikitext.split('\n');

    var gaIPA = '';
    var rpIPA = '';
    var anyIPA = '';

    // {{IPA|en|...}} 추출 정규식 — 같은 줄에 여러 번 나올 수 있음
    var blockRe = /\{\{IPA\|en\|([^}]*)\}\}/g;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var m;
      blockRe.lastIndex = 0;
      while ((m = blockRe.exec(line)) !== null) {
        var inner = m[1]; // 예: "/ˈpju.bɚ.ti/|a=GA,CA"
        var parsed = parseIpaBlock(inner);
        if (!parsed.ipa) continue;

        if (parsed.accentTag === 'GA') {
          if (!gaIPA) gaIPA = parsed.ipa;
        } else if (parsed.accentTag === 'RP') {
          if (!rpIPA) rpIPA = parsed.ipa;
        } else {
          if (!anyIPA) anyIPA = parsed.ipa;
        }

        // GA를 찾았으면 더 이상 볼 필요 없음
        if (gaIPA) break;
      }
      if (gaIPA) break;
    }

    return gaIPA || rpIPA || anyIPA || '';
  }

  /**
   * "/foo/|/bar/|a=GA,CA" 같은 본문을 파싱해서
   *   { ipa: "/foo/", accentTag: "GA" } 형태로 반환.
   */
  function parseIpaBlock(inner) {
    var parts = inner.split('|');
    var ipa = '';
    var accents = [];

    for (var i = 0; i < parts.length; i++) {
      var p = parts[i].trim();
      if (!p) continue;

      // a=GA,CA 같은 액센트 태그
      var aMatch = p.match(/^a\s*=\s*(.+)$/);
      if (aMatch) {
        accents = aMatch[1].split(',').map(function (s) { return s.trim().toUpperCase(); });
        continue;
      }

      // 그 외 key=value (qual=, n=, ref= 등)는 무시
      if (/^[a-z][a-z0-9]*\s*=/.test(p)) continue;

      // 첫 번째로 등장하는 IPA 본문 (보통 / / 로 둘러싸여 있음)
      if (!ipa) ipa = p;
    }

    var accentTag = '';
    if (accents.indexOf('GA') !== -1) accentTag = 'GA';
    else if (accents.indexOf('US') !== -1) accentTag = 'GA';
    else if (accents.indexOf('RP') !== -1) accentTag = 'RP';
    else if (accents.indexOf('UK') !== -1) accentTag = 'RP';

    return { ipa: ipa, accentTag: accentTag };
  }

  global.Wiktionary = {
    getIPA: getIPA,
  };
})(window);