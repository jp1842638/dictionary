/**
 * app.js
 * UI 제어 — 검색 폼, 결과 렌더링, 최근 검색어, 테마 토글.
 */
(function () {
  'use strict';

  var $form = document.getElementById('searchForm');
  var $input = document.getElementById('searchInput');
  var $recent = document.getElementById('recent');
  var $status = document.getElementById('status');
  var $result = document.getElementById('result');
  var $themeToggle = document.getElementById('themeToggle');
  var $settingsBtn = document.getElementById('settingsBtn');
  var $modalBackdrop = document.getElementById('modalBackdrop');
  var $modalAccess = document.getElementById('modalAccess');
  var $modalAbout = document.getElementById('modalAbout');
  var $modalWarning = document.getElementById('modalWarning');

  // Tabs / pages
  var $tabBtns = document.querySelectorAll('.tab-btn');
  var $pageDictionary = document.getElementById('page-dictionary');
  var $pageTranslator = document.getElementById('page-translator');

  // Translator UI
  var $translatorSource = document.getElementById('translatorSource');
  var $translatorTarget = document.getElementById('translatorTarget');
  var $translatorCount = document.getElementById('translatorCount');
  var $translatorStatus = document.getElementById('translatorStatus');
  var $translateBtn = document.getElementById('translateBtn');
  var $swapLangBtn = document.getElementById('swapLangBtn');
  var $copyResultBtn = document.getElementById('copyResultBtn');
  var $srcLangSelect = document.getElementById('srcLangSelect');
  var $tgtLangSelect = document.getElementById('tgtLangSelect');

  var $warningCancel = document.getElementById('warningCancel');
  var $warningOk = document.getElementById('warningOk');

  // 마지막 번역에서 감지된 소스 언어 (auto 모드에서 swap 시 활용)
  var lastDetectedSrcLang = '';

  // 세션 동안 경고를 본 적 있는지
  var warningSeenThisSession = false;
  // 경고에서 OK 누른 후 진입할 페이지 임시 보관
  var pendingTab = null;

  /* ===== Theme ===== */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    $themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
  function initTheme() {
    var theme = Storage_ED.getTheme();
    applyTheme(theme);
  }
  $themeToggle.addEventListener('click', function () {
    var current = document.documentElement.getAttribute('data-theme') || 'light';
    var next = current === 'dark' ? 'light' : 'dark';
    Storage_ED.setTheme(next);
    applyTheme(next);
  });

  /* ===== Status helpers ===== */
  function showLoading(word) {
    $status.className = 'status';
    $status.innerHTML =
      '<span class="spinner" aria-hidden="true"></span>Searching for "' +
      escapeHtml(word) +
      '"...';
  }
  function showError(message) {
    $status.className = 'status error';
    $status.textContent = message;
  }
  function clearStatus() {
    $status.className = 'status';
    $status.textContent = '';
  }

  /* ===== Recent ===== */
  function renderRecent() {
    var list = Storage_ED.getRecent();
    $recent.innerHTML = '';
    if (list.length === 0) return;

    list.forEach(function (word) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'recent-chip';
      btn.innerHTML = escapeHtml(word) + '<span class="x" aria-hidden="true">✕</span>';
      btn.title = 'Search "' + word + '" (click ✕ to remove)';

      btn.addEventListener('click', function (e) {
        // ✕ 영역 클릭 시 삭제, 그 외엔 검색
        var rect = btn.getBoundingClientRect();
        var clickedRight = e.clientX > rect.right - 24;
        if (clickedRight) {
          Storage_ED.removeRecent(word);
          renderRecent();
        } else {
          $input.value = word;
          search(word);
        }
      });

      $recent.appendChild(btn);
    });
  }

  /* ===== Render result ===== */
  function renderResult(entries) {
    $result.innerHTML = '';
    entries.forEach(function (entry) {
      $result.appendChild(buildCard(entry));
    });
  }

  function buildCard(entry) {
    var card = document.createElement('article');
    card.className = 'word-card';

    // Head: word + phonetic + audio
    var head = document.createElement('div');
    head.className = 'word-head';

    var wordEl = document.createElement('h2');
    wordEl.className = 'word-text';
    wordEl.textContent = entry.word;
    head.appendChild(wordEl);

    if (entry.phonetic) {
      var ph = document.createElement('span');
      ph.className = 'word-phonetic';
      ph.textContent = entry.phonetic;
      head.appendChild(ph);
    }

    card.appendChild(head);

    // Meanings
    entry.meanings.forEach(function (m) {
      var block = document.createElement('div');
      block.className = 'meaning-block';

      if (m.partOfSpeech) {
        var pos = document.createElement('div');
        pos.className = 'pos';
        pos.textContent = m.partOfSpeech;
        block.appendChild(pos);
      }

      if (m.definitions && m.definitions.length) {
        var ul = document.createElement('ol');
        ul.className = 'def-list';

        m.definitions.slice(0, 5).forEach(function (d) {
          var li = document.createElement('li');
          li.className = 'def-item';

          var dt = document.createElement('span');
          dt.className = 'def-text';
          dt.textContent = d.definition;
          li.appendChild(dt);

          if (d.example) {
            var ex = document.createElement('span');
            ex.className = 'def-example';
            ex.textContent = '“' + d.example + '”';
            li.appendChild(ex);
          }
          ul.appendChild(li);
        });
        block.appendChild(ul);
      }

      if (m.synonyms && m.synonyms.length) {
        block.appendChild(buildRelated('Synonyms', m.synonyms));
      }
      if (m.antonyms && m.antonyms.length) {
        block.appendChild(buildRelated('Antonyms', m.antonyms));
      }

      card.appendChild(block);
    });

    return card;
  }

  function buildRelated(label, words) {
    var wrap = document.createElement('div');
    wrap.className = 'related';

    var lab = document.createElement('span');
    lab.className = 'related-label';
    lab.textContent = label + ':';
    wrap.appendChild(lab);

    words.forEach(function (w) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'related-word';
      b.textContent = w;
      b.title = 'Search "' + w + '"';
      b.addEventListener('click', function () {
        $input.value = w;
        search(w);
      });
      wrap.appendChild(b);
    });

    return wrap;
  }

  /* ===== Search flow ===== */
  function search(rawWord) {
    var word = String(rawWord || '').trim();
    if (!word) return;

    showLoading(word);
    $result.innerHTML = '';

    Dictionary.lookup(word)
      .then(function (entries) {
        clearStatus();
        renderResult(entries);
        Storage_ED.addRecent(word);
        renderRecent();
        // 결과 영역으로 부드럽게 스크롤
        $result.scrollIntoView({ behavior: 'smooth', block: 'start' });
      })
      .catch(function (err) {
        if (err && err.code === 'NOT_FOUND') {
          // 1.5% 확률의 이스터에그 메시지
          if (Math.random() < 0.015) {
            showError('Huh? What the frick is "' + word + '"? Search properly, dude!');
          } else {
            showError('🤔 ' + err.message + ' Check the spelling and try again.');
          }
        } else {
          showError('⚠️ ' + (err && err.message ? err.message : 'Something went wrong.'));
        }
      });
  }

  /* ===== Settings / About modal (easter egg) ===== */
  function openModal(which) {
    $modalAccess.hidden = which !== 'access';
    $modalAbout.hidden = which !== 'about';
    $modalWarning.hidden = which !== 'warning';
    $modalBackdrop.hidden = false;

    // 닫기 버튼 포커스 (접근성)
    var modalEl = which === 'access' ? $modalAccess
                : which === 'about'  ? $modalAbout
                : $modalWarning;
    var closeBtn = modalEl.querySelector('.modal-close');
    if (closeBtn) {
      try { closeBtn.focus(); } catch (e) {}
    }
  }

  function closeModal() {
    $modalBackdrop.hidden = true;
    $modalAccess.hidden = true;
    $modalAbout.hidden = true;
    $modalWarning.hidden = true;
    pendingTab = null;
  }

  $settingsBtn.addEventListener('click', function () {
    // 1.5% 확률로만 진짜 About 표시, 나머지는 Access denied
    if (Math.random() < 0.015) {
      openModal('about');
    } else {
      openModal('access');
    }
  });

  // 백드롭(어두운 영역) 클릭 시 닫기 (모달 본체 클릭은 무시)
  $modalBackdrop.addEventListener('click', function (e) {
    if (e.target === $modalBackdrop) closeModal();
  });

  // ✕ 버튼들
  document.querySelectorAll('.modal-close').forEach(function (btn) {
    btn.addEventListener('click', closeModal);
  });

  // ESC 키로 닫기
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$modalBackdrop.hidden) closeModal();
  });

  /* ===== Tabs (Dictionary / Translator) ===== */
  function activateTab(name) {
    $tabBtns.forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-tab') === name);
    });
    $pageDictionary.hidden = name !== 'dictionary';
    $pageTranslator.hidden = name !== 'translator';

    if (name === 'translator') {
      // 처음 진입 시 입력에 포커스
      try { $translatorSource.focus(); } catch (e) {}
    } else {
      try { $input.focus(); } catch (e) {}
    }
  }

  $tabBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var name = btn.getAttribute('data-tab');
      if (name === 'translator' && !warningSeenThisSession) {
        // 경고 모달 띄움. OK 누르면 그때 활성화.
        pendingTab = 'translator';
        openModal('warning');
      } else {
        activateTab(name);
      }
    });
  });

  // 경고 모달 - OK
  $warningOk.addEventListener('click', function () {
    warningSeenThisSession = true;
    var nextTab = pendingTab || 'translator';
    closeModal();
    activateTab(nextTab);
  });

  // 경고 모달 - Cancel
  $warningCancel.addEventListener('click', function () {
    closeModal();
    // 사전 탭 유지
    activateTab('dictionary');
  });

  /* ===== Translator ===== */
  function updateCharCount() {
    var len = ($translatorSource.value || '').length;
    var max = $translatorSource.maxLength || 500;
    $translatorCount.textContent = len + ' / ' + max;
  }

  function setTranslatorStatus(msg, isError) {
    $translatorStatus.className = 'status' + (isError ? ' error' : '');
    if (typeof msg === 'string') {
      $translatorStatus.textContent = msg;
    } else {
      // 노드 (스피너 포함) 허용
      $translatorStatus.innerHTML = '';
      $translatorStatus.appendChild(msg);
    }
  }
  function clearTranslatorStatus() {
    $translatorStatus.className = 'status';
    $translatorStatus.textContent = '';
  }

  function showTranslatorLoading() {
    $translatorStatus.className = 'status';
    $translatorStatus.innerHTML =
      '<span class="spinner" aria-hidden="true"></span>Translating...';
  }

  function doTranslate() {
    var text = $translatorSource.value;
    if (!text || !text.trim()) {
      setTranslatorStatus('Please enter some text.', true);
      return;
    }
    var srcLang = $srcLangSelect.value;
    var tgtLang = $tgtLangSelect.value;

    if (srcLang !== 'auto' && srcLang === tgtLang) {
      setTranslatorStatus('Source and target languages are the same.', true);
      return;
    }

    showTranslatorLoading();
    $translateBtn.disabled = true;
    $translatorTarget.value = '';

    Translator.translate(text, srcLang, tgtLang)
      .then(function (result) {
        $translatorTarget.value = result.text;

        // 자동 감지 모드일 때 감지된 언어 표시
        if (srcLang === 'auto' && result.detectedLang) {
          // 'en-GB' 같은 longer 코드에서 앞 두 글자만 사용해서 select에 매칭
          var detectedShort = String(result.detectedLang).split('-')[0].toLowerCase();
          lastDetectedSrcLang = detectedShort;
          var langName = nameOfLang(detectedShort) || detectedShort.toUpperCase();
          setTranslatorStatus('Detected: ' + langName, false);
        } else {
          lastDetectedSrcLang = srcLang === 'auto' ? '' : srcLang;
          clearTranslatorStatus();
        }
      })
      .catch(function (err) {
        setTranslatorStatus('⚠️ ' + (err && err.message ? err.message : 'Translation failed.'), true);
      })
      .then(function () {
        $translateBtn.disabled = false;
      });
  }

  /** select option들을 훑어서 코드의 표시 이름을 반환 */
  function nameOfLang(code) {
    var opts = $srcLangSelect.options;
    for (var i = 0; i < opts.length; i++) {
      if (opts[i].value.toLowerCase() === code.toLowerCase()) {
        return opts[i].textContent;
      }
    }
    return '';
  }

  $translateBtn.addEventListener('click', doTranslate);

  // Enter (단, Shift+Enter는 줄바꿈)
  $translatorSource.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      doTranslate();
    }
  });

  // 글자 수
  $translatorSource.addEventListener('input', updateCharCount);

  // 언어 swap
  $swapLangBtn.addEventListener('click', function () {
    var src = $srcLangSelect.value;
    var tgt = $tgtLangSelect.value;

    // 소스가 auto면, 감지된 언어로 시도. 없으면 그냥 영어로 fallback.
    var newSrc = (src === 'auto')
      ? (lastDetectedSrcLang || 'en')
      : tgt;
    var newTgt = src === 'auto' ? tgt : src;

    // newSrc가 select에 없는 코드면 'en'으로 fallback
    if (!hasLangOption($srcLangSelect, newSrc)) newSrc = 'en';
    if (!hasLangOption($tgtLangSelect, newTgt)) newTgt = 'en';

    $srcLangSelect.value = newSrc;
    $tgtLangSelect.value = newTgt;

    var tmpText = $translatorSource.value;
    $translatorSource.value = $translatorTarget.value;
    $translatorTarget.value = tmpText;

    updateCharCount();
    clearTranslatorStatus();
  });

  function hasLangOption(selectEl, value) {
    for (var i = 0; i < selectEl.options.length; i++) {
      if (selectEl.options[i].value === value) return true;
    }
    return false;
  }

  // 복사
  $copyResultBtn.addEventListener('click', function () {
    var text = $translatorTarget.value || '';
    if (!text) return;
    var done = function () {
      var prev = $copyResultBtn.textContent;
      $copyResultBtn.textContent = '✓ Copied';
      setTimeout(function () { $copyResultBtn.textContent = prev; }, 1200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () {
        // fallback
        legacyCopy(text);
        done();
      });
    } else {
      legacyCopy(text);
      done();
    }
  });

  function legacyCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    } catch (e) {}
  }

  // 초기화
  updateCharCount();

  /* ===== Events ===== */
  $form.addEventListener('submit', function (e) {
    e.preventDefault();
    search($input.value);
  });

  // 추천 단어 버튼들
  document.querySelectorAll('.suggest').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var w = btn.getAttribute('data-word') || btn.textContent;
      $input.value = w;
      search(w);
    });
  });

  /* ===== Utils ===== */
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ===== Init ===== */
  initTheme();
  renderRecent();
  $input.focus();
})();