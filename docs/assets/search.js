/**
 * Site-wide search — lazy-loads search-index.json on first interaction,
 * then provides debounced substring matching with keyboard navigation.
 */
(function () {
  'use strict';

  var input = document.getElementById('siteSearchInput');
  var resultsList = document.getElementById('searchResults');
  var combobox = input ? input.closest('[role="combobox"]') : null;
  if (!input || !resultsList) return;

  var index = null; // loaded on first use
  var debounceTimer = null;
  var activeIndex = -1;

  // Lazy-load index
  function ensureIndex(cb) {
    if (index) return cb();
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'assets/data.json');
    xhr.onload = function () {
      if (xhr.status === 200) {
        try {
          index = JSON.parse(xhr.responseText);
          // Pre-build searchable text for each implementation
          var prodMap = {};
          (index.products || []).forEach(function (p) { prodMap[p.id] = p; });
          var capSearchMap = {};
          (index.capabilities || []).forEach(function (c) {
            capSearchMap[c.id] = (c.searchTerms || []).join(' ');
          });
          index.implementations.forEach(function (impl) {
            var prod = prodMap[impl.product] || {};
            var capTerms = (impl.capabilities || []).map(function (cid) { return capSearchMap[cid] || ''; }).join(' ');
            impl._search = [
              impl.name,
              impl.productName || prod.name || '',
              prod.providerName || impl.provider || '',
              (impl.capabilityNames || []).join(' '),
              capTerms,
              impl.talkingPoint || ''
            ].join(' ').toLowerCase();
          });
        } catch (e) {
          index = { implementations: [] };
        }
      }
      cb();
    };
    xhr.onerror = function () { cb(); };
    xhr.send();
  }

  function search(query) {
    if (!index || !query) return [];
    var tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return [];

    var matches = [];
    for (var i = 0; i < index.implementations.length; i++) {
      var impl = index.implementations[i];
      var text = impl._search;
      var allMatch = true;
      for (var t = 0; t < tokens.length; t++) {
        if (text.indexOf(tokens[t]) === -1) { allMatch = false; break; }
      }
      if (allMatch) {
        matches.push(impl);
        if (matches.length >= 8) break;
      }
    }
    return matches;
  }

  function renderResults(matches) {
    activeIndex = -1;
    if (!matches.length) {
      resultsList.innerHTML = '<li class="search-no-results" role="option">No results found</li>';
      showResults(true);
      return;
    }
    var html = '';
    for (var i = 0; i < matches.length; i++) {
      var m = matches[i];
      var href = m.page + '.html#' + m.anchor;
      html += '<li role="option" id="sr-' + i + '" class="search-result-item" data-href="' + href + '">';
      html += '<span class="search-result-name">' + escapeHtml(m.name) + '</span>';
      html += '<span class="search-result-product">' + escapeHtml(m.productName) + '</span>';
      html += '</li>';
    }
    resultsList.innerHTML = html;
    showResults(true);
  }

  function showResults(show) {
    resultsList.hidden = !show;
    if (combobox) combobox.setAttribute('aria-expanded', show ? 'true' : 'false');
  }

  function navigate(href) {
    var q = input.value.trim();
    if (q) href += (href.indexOf('?') === -1 ? '?' : '&') + 'q=' + encodeURIComponent(q);
    var isLight = document.documentElement.classList.contains('light-mode');
    if (isLight) href += (href.indexOf('?') === -1 ? '?' : '&') + 'theme=light';
    window.location.href = href;
  }

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(s));
    return d.innerHTML;
  }

  // Event handlers
  input.addEventListener('focus', function () {
    ensureIndex(function () {
      if (input.value.trim()) {
        renderResults(search(input.value.trim()));
      }
    });
  });

  input.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    var q = input.value.trim();
    if (!q) { showResults(false); return; }
    debounceTimer = setTimeout(function () {
      ensureIndex(function () {
        renderResults(search(q));
      });
    }, 150);
  });

  input.addEventListener('keydown', function (e) {
    var items = resultsList.querySelectorAll('.search-result-item');
    if (!items.length || resultsList.hidden) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, items.length - 1);
      updateActive(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      updateActive(items);
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      var href = items[activeIndex].getAttribute('data-href');
      if (href) navigate(href);
    } else if (e.key === 'Escape') {
      showResults(false);
      input.blur();
    }
  });

  function updateActive(items) {
    for (var i = 0; i < items.length; i++) {
      items[i].classList.toggle('active', i === activeIndex);
      if (i === activeIndex) {
        input.setAttribute('aria-activedescendant', 'sr-' + i);
      }
    }
  }

  resultsList.addEventListener('click', function (e) {
    var item = e.target.closest('.search-result-item');
    if (item) {
      var href = item.getAttribute('data-href');
      if (href) navigate(href);
    }
  });

  // Close on outside click
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.site-search')) {
      showResults(false);
    }
  });

  // Restore search query from URL (?q=...) so users can refine after clicking a result
  var params = new URLSearchParams(window.location.search);
  var initQuery = params.get('q');
  if (initQuery) {
    input.value = initQuery;
  }
})();
