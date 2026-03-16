/**
 * Export — CSV and JSON download for implementations page (filtered) and compare page.
 * Uses data.json as the source of truth, matching against visible DOM cards.
 */
(function () {
  'use strict';

  var today = new Date().toISOString().split('T')[0];
  var dataIndex = null;

  function loadData(cb) {
    if (dataIndex) return cb();
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'assets/data.json');
    xhr.onload = function () {
      if (xhr.status === 200) {
        try { dataIndex = JSON.parse(xhr.responseText); } catch (e) { dataIndex = null; }
      }
      cb();
    };
    xhr.onerror = function () { cb(); };
    xhr.send();
  }

  function download(content, filename, mime) {
    var blob = new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function isComparePage() {
    return !!document.getElementById('comparisonResult');
  }

  // --- Implementations page export ---

  function getVisibleFeatures(cb) {
    loadData(function () {
      if (!dataIndex) return cb([]);

      // Build lookup by anchor ID
      var implById = {};
      dataIndex.implementations.forEach(function (impl) {
        var key = impl.product + '-' + impl.id.replace(impl.product + '-', '');
        implById[impl.anchor || key] = impl;
        // Also index by full id
        implById[impl.id] = impl;
      });

      // Get visible card IDs
      var cards = document.querySelectorAll('.feature-card');
      var features = [];
      for (var i = 0; i < cards.length; i++) {
        var card = cards[i];
        if (card.style.display === 'none' || card.closest('.platform-section[style*="display: none"]')) continue;
        var cardId = card.id;
        var impl = implById[cardId];
        if (impl) {
          features.push({
            name: impl.name,
            product: impl.productName || impl.product,
            category: impl.category || '',
            gating: impl.gating || '',
            status: impl.status || '',
            launched: impl.launched || '',
            verified: impl.verified || '',
            capabilities: (impl.capabilityNames || []).join('; ')
          });
        } else {
          // Fallback: scrape from DOM for cards not in data.json (open models, runtimes)
          var nameEl = card.querySelector('.feature-link') || card.querySelector('.feature-name') || card.querySelector('h3');
          var section = card.closest('.platform-section');
          var product = section ? section.getAttribute('data-platform') || '' : '';
          var gatingBadge = card.querySelector('.gate-free, .gate-paid, .gate-limited');
          var statusBadge = card.querySelector('.avail-ga, .avail-beta, .avail-preview, .avail-alpha');
          var launchedEl = card.querySelector('.launched .date-value');
          var verifiedEl = card.querySelector('.verified .date-value');
          features.push({
            name: nameEl ? nameEl.textContent.trim() : cardId,
            product: product.trim(),
            category: card.getAttribute('data-category') || '',
            gating: gatingBadge ? gatingBadge.textContent.trim().toLowerCase() : '',
            status: statusBadge ? statusBadge.textContent.trim().toLowerCase() : '',
            launched: launchedEl ? launchedEl.textContent.trim() : '',
            verified: verifiedEl ? verifiedEl.textContent.trim() : '',
            capabilities: ''
          });
        }
      }
      cb(features);
    });
  }

  function featuresToCSV(features) {
    var headers = ['Name', 'Product', 'Category', 'Access', 'Status', 'Launched', 'Verified', 'Capabilities'];
    var rows = [headers.join(',')];
    features.forEach(function (f) {
      rows.push([f.name, f.product, f.category, f.gating, f.status, f.launched, f.verified, f.capabilities]
        .map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; })
        .join(','));
    });
    return rows.join('\n');
  }

  // --- Compare page export ---

  function getCompareData() {
    if (typeof window._compareData === 'function') return window._compareData();
    return null;
  }

  function compareToRows(data) {
    var rows = [];
    data.capabilities.forEach(function (cap) {
      var row = { capability: cap.name, group: cap.group || '' };
      data.selectedProducts.forEach(function (pid) {
        var impl = data.implMap[pid][cap.id];
        row[data.prodNames[pid] || pid] = impl ? impl.name + ' (' + (impl.gating || '') + ')' : '';
      });
      rows.push(row);
    });
    return rows;
  }

  function compareToCSV(data) {
    var rows = compareToRows(data);
    if (!rows.length) return '';
    var headers = Object.keys(rows[0]);
    var lines = [headers.map(function (h) { return '"' + h.replace(/"/g, '""') + '"'; }).join(',')];
    rows.forEach(function (row) {
      lines.push(headers.map(function (h) { return '"' + String(row[h] || '').replace(/"/g, '""') + '"'; }).join(','));
    });
    return lines.join('\n');
  }

  // --- Public API ---

  window.exportCSV = function () {
    if (isComparePage()) {
      var data = getCompareData();
      if (!data) return;
      download(compareToCSV(data), 'airef-compare-' + today + '.csv', 'text/csv');
    } else {
      getVisibleFeatures(function (features) {
        if (!features.length) return;
        download(featuresToCSV(features), 'airef-features-' + today + '.csv', 'text/csv');
      });
    }
  };

  window.exportJSON = function () {
    if (isComparePage()) {
      var data = getCompareData();
      if (!data) return;
      var output = { exported: new Date().toISOString(), products: data.selectedProducts.map(function (pid) { return data.prodNames[pid] || pid; }), rows: compareToRows(data) };
      download(JSON.stringify(output, null, 2), 'airef-compare-' + today + '.json', 'application/json');
    } else {
      getVisibleFeatures(function (features) {
        if (!features.length) return;
        var output = { exported: new Date().toISOString(), features: features };
        download(JSON.stringify(output, null, 2), 'airef-features-' + today + '.json', 'application/json');
      });
    }
  };

  // Add export buttons to implementations page if not already present
  if (!isComparePage()) {
    var filterBar = document.querySelector('.filters');
    if (filterBar && !document.getElementById('implExportBtns')) {
      var div = document.createElement('div');
      div.id = 'implExportBtns';
      div.className = 'export-actions';
      div.innerHTML = '<button onclick="exportCSV()" class="export-btn" id="exportCsvBtn">Export CSV</button> <button onclick="exportJSON()" class="export-btn" id="exportJsonBtn">Export JSON</button> <span class="export-hint" id="exportHint"></span>';
      // Update export hint with visible count
      function updateExportHint() {
        var allCards = document.querySelectorAll('.feature-card');
        var total = allCards.length;
        var visible = 0;
        for (var i = 0; i < allCards.length; i++) {
          var c = allCards[i];
          if (c.style.display === 'none' || c.closest('.platform-section[style*="display: none"]')) continue;
          visible++;
        }
        var hint = document.getElementById('exportHint');
        if (hint) {
          hint.textContent = visible < total ? 'Filtered: ' + visible + ' of ' + total : 'All ' + total + ' features';
        }
      }
      filterBar.parentNode.insertBefore(div, filterBar.nextSibling);
      updateExportHint();
      // Re-run when filters change (watch both cards and sections)
      var observer = new MutationObserver(updateExportHint);
      document.querySelectorAll('.feature-card').forEach(function (card) {
        observer.observe(card, { attributes: true, attributeFilter: ['style'] });
      });
      document.querySelectorAll('.platform-section').forEach(function (section) {
        observer.observe(section, { attributes: true, attributeFilter: ['style'] });
      });
    }
  }
})();
