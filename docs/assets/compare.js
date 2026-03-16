/**
 * Product comparison — loads search-index.json and builds a capability × product
 * comparison table for up to 3 selected products.
 */
(function () {
  'use strict';

  var container = document.getElementById('comparisonResult');
  var exportPanel = document.getElementById('compareExport');
  if (!container) return; // not on compare page

  var index = null;
  var selectedProducts = [];

  // Read URL state
  function readURL() {
    var params = new URLSearchParams(window.location.search);
    var ids = (params.get('products') || '').split(',').filter(Boolean);
    ids.forEach(function (id) {
      var cb = document.querySelector('.product-checkbox input[value="' + id + '"]');
      if (cb) cb.checked = true;
    });
    return ids;
  }

  function updateURL() {
    var params = new URLSearchParams(window.location.search);
    if (selectedProducts.length) {
      params.set('products', selectedProducts.join(','));
    } else {
      params.delete('products');
    }
    var qs = params.toString();
    var url = window.location.pathname + (qs ? '?' + qs : '');
    history.replaceState(null, '', url);
  }

  function loadIndex(cb) {
    if (index) return cb();
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'assets/data.json');
    xhr.onload = function () {
      if (xhr.status === 200) {
        try { index = JSON.parse(xhr.responseText); } catch (e) { index = { capabilities: [], implementations: [], products: [] }; }
      }
      cb();
    };
    xhr.onerror = function () { cb(); };
    xhr.send();
  }

  function getSelectedProducts() {
    var checkboxes = document.querySelectorAll('.product-checkbox input:checked');
    var ids = [];
    for (var i = 0; i < checkboxes.length; i++) ids.push(checkboxes[i].value);
    return ids;
  }

  // Enforce max 3 selection
  function enforceMax() {
    var all = document.querySelectorAll('.product-checkbox input');
    var checked = document.querySelectorAll('.product-checkbox input:checked');
    for (var i = 0; i < all.length; i++) {
      all[i].disabled = (checked.length >= 3 && !all[i].checked);
    }
  }

  window.updateComparison = function () {
    enforceMax();
    selectedProducts = getSelectedProducts();
    updateURL();

    if (selectedProducts.length < 2) {
      container.innerHTML = '<p class="compare-hint">Select at least 2 products to compare.</p>';
      if (exportPanel) exportPanel.hidden = true;
      return;
    }

    loadIndex(function () {
      renderComparison();
    });
  };

  function renderComparison() {
    if (!index) return;

    // Build lookup: product → capability → implementation
    var implMap = {}; // { productId: { capId: impl } }
    selectedProducts.forEach(function (pid) { implMap[pid] = {}; });

    index.implementations.forEach(function (impl) {
      if (selectedProducts.indexOf(impl.product) === -1) return;
      (impl.capabilities || []).forEach(function (capId) {
        if (!implMap[impl.product][capId]) {
          implMap[impl.product][capId] = impl;
        }
      });
    });

    // Filter capabilities to those relevant for at least one selected product
    var relevantCaps = index.capabilities.filter(function (cap) {
      for (var i = 0; i < selectedProducts.length; i++) {
        if (implMap[selectedProducts[i]][cap.id]) return true;
      }
      return false;
    });

    // Group capabilities by group
    var groups = {};
    var groupOrder = [];
    relevantCaps.forEach(function (cap) {
      var g = cap.group || 'other';
      if (!groups[g]) { groups[g] = []; groupOrder.push(g); }
      groups[g].push(cap);
    });

    // Product name lookup
    var prodNames = {};
    index.products.forEach(function (p) { prodNames[p.id] = p.name; });

    // Build table
    var html = '<table class="compare-table"><thead><tr><th>Capability</th>';
    selectedProducts.forEach(function (pid) {
      html += '<th>' + escapeHtml(prodNames[pid] || pid) + '</th>';
    });
    html += '</tr></thead><tbody>';

    groupOrder.forEach(function (group) {
      html += '<tr class="compare-group-row"><td colspan="' + (selectedProducts.length + 1) + '">' + escapeHtml(formatGroup(group)) + '</td></tr>';
      groups[group].forEach(function (cap) {
        html += '<tr><td class="compare-cap-name">' + escapeHtml(cap.name) + '</td>';
        selectedProducts.forEach(function (pid) {
          var impl = implMap[pid][cap.id];
          if (impl) {
            var badge = gatingBadge(impl.gating);
            html += '<td class="compare-cell compare-yes">' + escapeHtml(impl.name) + ' ' + badge + '</td>';
          } else {
            html += '<td class="compare-cell compare-no">&mdash;</td>';
          }
        });
        html += '</tr>';
      });
    });

    html += '</tbody></table>';

    // Summary — show capability coverage with context
    var total = index.capabilities.length;
    var summaryParts = selectedProducts.map(function (pid) {
      var count = 0;
      index.capabilities.forEach(function (cap) { if (implMap[pid][cap.id]) count++; });
      return '<strong>' + escapeHtml(prodNames[pid] || pid) + '</strong>: ' + count + '/' + total;
    });
    html = '<p class="compare-summary">' + summaryParts.join(' &bull; ') + ' <span class="compare-summary-note">(capabilities with at least one feature mapped)</span></p>' + html;

    container.innerHTML = html;
    if (exportPanel) exportPanel.hidden = false;
  }

  function gatingBadge(gating) {
    if (!gating) return '';
    var cls = 'badge-gating';
    if (gating === 'free') cls += ' badge-free';
    else if (gating === 'paid') cls += ' badge-paid';
    return '<span class="' + cls + '">' + escapeHtml(gating) + '</span>';
  }

  function formatGroup(g) {
    return g.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(s || ''));
    return d.innerHTML;
  }

  // Expose data for export.js
  window._compareData = function () {
    if (!index || selectedProducts.length < 2) return null;
    var prodNames = {};
    index.products.forEach(function (p) { prodNames[p.id] = p.name; });
    var implMap = {};
    selectedProducts.forEach(function (pid) { implMap[pid] = {}; });
    index.implementations.forEach(function (impl) {
      if (selectedProducts.indexOf(impl.product) === -1) return;
      (impl.capabilities || []).forEach(function (capId) {
        if (!implMap[impl.product][capId]) implMap[impl.product][capId] = impl;
      });
    });
    return { capabilities: index.capabilities, selectedProducts: selectedProducts, prodNames: prodNames, implMap: implMap };
  };

  // Init from URL (overrides HTML defaults) or fall back to pre-checked HTML state
  var initial = readURL();
  if (!initial.length) initial = getSelectedProducts();
  if (initial.length >= 2) {
    selectedProducts = initial;
    loadIndex(function () {
      enforceMax();
      renderComparison();
    });
  }
})();
