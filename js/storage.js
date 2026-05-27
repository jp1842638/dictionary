/**
 * storage.js
 * LocalStorage 헬퍼 — 최근 검색어, 테마(다크/라이트) 저장/조회.
 */
(function (global) {
  'use strict';

  var KEYS = {
    RECENT: 'ed.recent',
    THEME: 'ed.theme',
  };

  var MAX_RECENT = 10;

  function safeGet(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function safeSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      // 저장 실패해도 앱은 계속 동작
    }
  }

  /* ===== Recent searches ===== */
  function getRecent() {
    var arr = safeGet(KEYS.RECENT, []);
    return Array.isArray(arr) ? arr : [];
  }

  function addRecent(word) {
    if (!word) return [];
    var w = String(word).trim().toLowerCase();
    if (!w) return getRecent();

    var list = getRecent().filter(function (item) {
      return item !== w;
    });
    list.unshift(w);
    if (list.length > MAX_RECENT) list.length = MAX_RECENT;
    safeSet(KEYS.RECENT, list);
    return list;
  }

  function removeRecent(word) {
    var w = String(word).trim().toLowerCase();
    var list = getRecent().filter(function (item) {
      return item !== w;
    });
    safeSet(KEYS.RECENT, list);
    return list;
  }

  function clearRecent() {
    safeSet(KEYS.RECENT, []);
    return [];
  }

  /* ===== Theme ===== */
  function getTheme() {
    var t = safeGet(KEYS.THEME, null);
    if (t === 'light' || t === 'dark') return t;
    // 기본: 시스템 설정 따라가기
    if (global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  function setTheme(theme) {
    if (theme !== 'light' && theme !== 'dark') return;
    safeSet(KEYS.THEME, theme);
  }

  global.Storage_ED = {
    getRecent: getRecent,
    addRecent: addRecent,
    removeRecent: removeRecent,
    clearRecent: clearRecent,
    getTheme: getTheme,
    setTheme: setTheme,
  };
})(window);