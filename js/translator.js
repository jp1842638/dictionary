/**
 * translator.js
 * MyMemory Translation API 호출 모듈.
 *  https://api.mymemory.translated.net/get?q=<text>&langpair=en|ko
 *
 * 무료, 키 불필요.
 */
(function (global) {
  'use strict';

  var BASE = 'https://api.mymemory.translated.net/get';

  /**
   * 텍스트를 from → to 언어로 번역.
   *
   * @param {string} text  번역할 텍스트
   * @param {string} from  소스 언어 코드 (예: 'en' 또는 'auto')
   * @param {string} to    대상 언어 코드 (예: 'ko')
   * @returns {Promise<{text: string, detectedLang: string}>}
   */
  function translate(text, from, to) {
    var t = String(text || '').trim();
    if (!t) return Promise.reject(new Error('Please enter some text.'));

    // MyMemory는 'auto' 자체를 지원하지 않지만, 빈 문자열이나 'autodetect'를
    // 보내면 보통 자동 감지가 작동함. 여기서는 'autodetect'를 보냄.
    var fromCode = from === 'auto' ? 'autodetect' : from;

    var url =
      BASE +
      '?q=' + encodeURIComponent(t) +
      '&langpair=' + encodeURIComponent(fromCode + '|' + to);

    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('Network error (' + res.status + ').');
        return res.json();
      })
      .then(function (data) {
        if (!data) throw new Error('Empty response.');

        // status 200이면 정상, 그 외엔 메시지를 그대로 노출
        var status = data.responseStatus;
        if (status && Number(status) !== 200) {
          var msg = data.responseDetails || ('API error (' + status + ').');
          throw new Error(String(msg));
        }

        var translated =
          (data.responseData && data.responseData.translatedText) || '';
        if (!translated) throw new Error('No translation returned.');

        // 감지된 언어 (있을 때만)
        var detected =
          (data.responseData && data.responseData.detectedLanguage) ||
          (data.matches && data.matches[0] && data.matches[0]['source-language']) ||
          '';

        return { text: translated, detectedLang: detected };
      });
  }

  global.Translator = {
    translate: translate,
  };
})(window);