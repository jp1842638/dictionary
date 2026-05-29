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
    $modalBackdrop.hidden = false;

    // 닫기 버튼 포커스 (접근성)
    var closeBtn = (which === 'access' ? $modalAccess : $modalAbout)
      .querySelector('.modal-close');
    if (closeBtn) {
      try { closeBtn.focus(); } catch (e) {}
    }
  }

  function closeModal() {
    $modalBackdrop.hidden = true;
    $modalAccess.hidden = true;
    $modalAbout.hidden = true;
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