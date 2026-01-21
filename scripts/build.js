#!/usr/bin/env node

/**
 * AI Feature Tracker - Static Site Generator
 *
 * Compiles markdown data files into a single HTML dashboard.
 * Run with: node scripts/build.js
 */

const fs = require('fs');
const path = require('path');

// Paths
const DATA_DIR = path.join(__dirname, '..', 'data', 'platforms');
const OUTPUT_FILE = path.join(__dirname, '..', 'docs', 'index.html');

/**
 * Parse YAML-like frontmatter from markdown
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { frontmatter: {}, body: content };

  const frontmatter = {};
  match[1].split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length) {
      frontmatter[key.trim()] = valueParts.join(':').trim();
    }
  });

  return {
    frontmatter,
    body: content.slice(match[0].length).trim()
  };
}

/**
 * Parse a markdown table into array of objects
 */
function parseTable(tableText) {
  const lines = tableText.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split('|').map(h => h.trim()).filter(Boolean);
  const rows = [];

  for (let i = 2; i < lines.length; i++) {
    const cells = lines[i].split('|').map(c => c.trim()).filter(Boolean);
    const row = {};
    headers.forEach((h, idx) => {
      row[h.toLowerCase().replace(/\s+/g, '_')] = cells[idx] || '';
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Format ISO date for display (strip time portion)
 * Input: "2024-12-06T12:00Z" -> Output: "2024-12-06"
 */
function formatDateForDisplay(isoDate) {
  if (!isoDate) return '';
  return isoDate.split('T')[0];
}

/**
 * Parse a feature section from markdown
 */
function parseFeature(section) {
  const trimmed = section.trim();
  const lines = trimmed.split('\n');
  const nameMatch = lines[0].match(/^## (.+)/);
  if (!nameMatch) return null;

  const feature = {
    name: nameMatch[1],
    category: '',
    status: '',
    gating: '',
    url: '',
    launched: '',
    verified: '',
    checked: '',
    availability: [],
    platforms: [],
    regional: '',
    talking_point: '',
    sources: [],
    changelog: []
  };

  // Parse property table
  const propTableMatch = trimmed.match(/\| Property \| Value \|[\s\S]*?\n\n/);
  if (propTableMatch) {
    const props = parseTable(propTableMatch[0]);
    props.forEach(p => {
      if (p.property === 'Category') feature.category = p.value;
      if (p.property === 'Status') feature.status = p.value;
      if (p.property === 'Gating') feature.gating = p.value;
      if (p.property === 'URL') feature.url = p.value;
      if (p.property === 'Launched') feature.launched = p.value;
      if (p.property === 'Verified') feature.verified = p.value;
      if (p.property === 'Checked') feature.checked = p.value;
    });
  }

  // Parse availability table
  const availMatch = trimmed.match(/### Availability\n\n([\s\S]*?)(?=\n###|\n---|\n## |$)/);
  if (availMatch) {
    feature.availability = parseTable(availMatch[1]);
  }

  // Parse platforms table
  const platformMatch = trimmed.match(/### Platforms\n\n([\s\S]*?)(?=\n###|\n---|\n## |$)/);
  if (platformMatch) {
    feature.platforms = parseTable(platformMatch[1]);
  }

  // Parse regional
  const regionalMatch = trimmed.match(/### Regional\n\n([^\n#]+)/);
  if (regionalMatch) {
    feature.regional = regionalMatch[1].trim();
  }

  // Parse talking point
  const talkingMatch = trimmed.match(/### Talking Point\n\n> "([^"]+)"/);
  if (talkingMatch) {
    feature.talking_point = talkingMatch[1];
  }

  // Parse sources
  const sourcesMatch = trimmed.match(/### Sources\n\n([\s\S]*?)(?=\n###|\n---|\n## |$)/);
  if (sourcesMatch) {
    const sourceLines = sourcesMatch[1].match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
    feature.sources = sourceLines.map(s => {
      const m = s.match(/\[([^\]]+)\]\(([^)]+)\)/);
      return m ? { title: m[1], url: m[2] } : null;
    }).filter(Boolean);
  }

  // Parse changelog
  const changelogMatch = trimmed.match(/### Changelog\n\n([\s\S]*?)(?=\n---|\n## |$)/);
  if (changelogMatch) {
    feature.changelog = parseTable(changelogMatch[1]);
  }

  return feature;
}

/**
 * Parse a platform markdown file
 */
function parsePlatform(filepath) {
  const content = fs.readFileSync(filepath, 'utf-8');
  const { frontmatter, body } = parseFrontmatter(content);

  // Parse pricing table
  const pricingMatch = body.match(/## Pricing\n\n([\s\S]*?)(?=\n---)/);
  const pricing = pricingMatch ? parseTable(pricingMatch[1]) : [];

  // Parse features (split by ---)
  const featureSections = body.split(/\n---\n/).slice(1); // Skip pricing section
  const features = featureSections
    .map(parseFeature)
    .filter(Boolean);

  return {
    ...frontmatter,
    pricing,
    features
  };
}

/**
 * Generate availability badge HTML (GA, Beta, Preview, Deprecated)
 */
function availabilityBadge(status) {
  const badges = {
    ga: { class: 'avail-ga', text: 'GA' },
    beta: { class: 'avail-beta', text: 'Beta' },
    preview: { class: 'avail-preview', text: 'Preview' },
    deprecated: { class: 'avail-deprecated', text: 'Deprecated' }
  };
  const b = badges[status] || { class: 'avail-ga', text: status };
  return `<span class="badge ${b.class}">${b.text}</span>`;
}

/**
 * Generate gating badge HTML (Free, Paid, Invite, Org-only)
 */
function gatingBadge(gating) {
  if (!gating) return '';
  const badges = {
    free: { class: 'gate-free', text: 'Free' },
    paid: { class: 'gate-paid', text: 'Paid' },
    invite: { class: 'gate-invite', text: 'Invite' },
    'org-only': { class: 'gate-org', text: 'Org-only' }
  };
  const b = badges[gating] || { class: 'gate-paid', text: gating };
  return `<span class="badge ${b.class}">${b.text}</span>`;
}

/**
 * Generate availability badge with ARIA labels
 */
function availBadge(avail) {
  if (avail.includes('✅')) return '<span class="avail yes" aria-label="Available" role="img">✓</span>';
  if (avail.includes('❌')) return '<span class="avail no" aria-label="Not available" role="img">✗</span>';
  if (avail.includes('🔜')) return '<span class="avail soon" aria-label="Coming soon">Soon</span>';
  if (avail.includes('⚠️')) return '<span class="avail partial" aria-label="Partially available" role="img">~</span>';
  return '<span class="avail unknown" aria-label="Unknown">?</span>';
}

/**
 * Generate the HTML dashboard
 */
function generateHTML(platforms) {
  const now = new Date().toISOString().split('T')[0];

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Feature Tracker - Feature Availability by Plan</title>
    <meta name="description" content="Community-maintained tracker of AI feature availability across ChatGPT, Claude, Perplexity, Gemini, and Copilot plans.">

    <!-- Favicon -->
    <link rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="assets/favicon-16.png">
    <link rel="apple-touch-icon" sizes="180x180" href="assets/apple-touch-icon.png">

    <!-- Open Graph / Social -->
    <meta property="og:type" content="website">
    <meta property="og:title" content="AI Feature Tracker">
    <meta property="og:description" content="Community-maintained tracker of AI feature availability across ChatGPT, Claude, Perplexity, Gemini, and Copilot plans.">
    <meta property="og:image" content="assets/og-image.png">
    <meta property="og:url" content="https://snapsynapse.github.io/ai-feature-tracker/">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="AI Feature Tracker">
    <meta name="twitter:description" content="Community-maintained tracker of AI feature availability across ChatGPT, Claude, Perplexity, Gemini, and Copilot plans.">
    <meta name="twitter:image" content="assets/og-image.png">

    <link rel="stylesheet" href="assets/styles.css">
    <script>
        // Initialize theme BEFORE body renders to prevent flash
        (function() {
            var params = new URLSearchParams(window.location.search);
            var urlTheme = params.get('theme');
            var storedTheme = localStorage.getItem('theme');
            if (urlTheme === 'light' || storedTheme === 'light') {
                document.documentElement.classList.add('light-mode');
                localStorage.setItem('theme', 'light');
            }
        })();
    </script>
</head>
<body>
    <a href="#main-content" class="skip-link">Skip to main content</a>
    <div class="container" id="main-content">
        <header>
            <h1><img src="assets/favicon-32.png" alt="" class="header-logo" width="28" height="28" aria-hidden="true"> AI Feature Tracker</h1>
            <div class="header-meta">
                <span class="last-updated">Last built: ${now}</span>
                <a href="about.html" class="about-link" onclick="passTheme(this)">What is this for?</a>
                <a href="https://github.com/snapsynapse/ai-feature-tracker" class="github-link">Contribute on GitHub</a>
                <button class="theme-toggle" onclick="toggleTheme()" title="Toggle light/dark mode">🌓 Theme</button>
            </div>
        </header>


        <div class="filters">
            <div class="provider-toggles">
                <label>Providers:</label>
                ${(() => {
                  // Sort vendors by estimated active users (descending), with "Various" last
                  const vendorOrder = ['OpenAI', 'Microsoft', 'Google', 'Anthropic', 'Perplexity AI', 'xAI'];
                  const vendors = [...new Set(platforms.map(p => p.vendor))];
                  vendors.sort((a, b) => {
                    const aIdx = vendorOrder.indexOf(a);
                    const bIdx = vendorOrder.indexOf(b);
                    // If not in order list, put at end (before "Various" types)
                    const aPos = aIdx === -1 ? (a.startsWith('Various') ? 999 : 100) : aIdx;
                    const bPos = bIdx === -1 ? (b.startsWith('Various') ? 999 : 100) : bIdx;
                    return aPos - bPos;
                  });
                  return vendors.map(vendor => {
                    const vendorSlug = vendor.toLowerCase().replace(/[^a-z0-9]/g, '-');
                    return `<span class="provider-toggle active" role="button" tabindex="0" aria-pressed="true" data-vendor="${vendorSlug}" onclick="toggleProvider('${vendorSlug}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleProvider('${vendorSlug}')}">${vendor}</span>`;
                  }).join('\n                ');
                })()}
            </div>
            <div class="filter-group">
                <label>Category:</label>
                <select id="categoryFilter" onchange="filterFeatures()">
                    <option value="">All</option>
                    <option value="agents">Agents</option>
                    <option value="browser">Browser</option>
                    <option value="coding">Coding</option>
                    <option value="cloud-files">Files (cloud)</option>
                    <option value="local-files">Files (local)</option>
                    <option value="image-gen">Image Gen</option>
                    <option value="video-gen">Video Gen</option>
                    <option value="research">Research</option>
                    <option value="search">Search</option>
                    <option value="vision">Vision</option>
                    <option value="voice">Voice</option>
                    <option value="other">Other</option>
                </select>
            </div>
            <div class="filter-group">
                <label>Pricing tier:</label>
                <select id="tierFilter" onchange="filterFeatures()">
                    <option value="">All</option>
                    ${(() => {
                      // Helper to normalize price strings to consistent format
                      const normalizePrice = (price, planName) => {
                        const p = price.trim().toLowerCase();
                        // Free tier
                        if (p === '$0' || p === 'free') return '$0/mo';
                        // Custom/Enterprise pricing
                        if (p.includes('custom') || p.includes('contact')) return 'Enterprise';
                        // Per-user pricing = Team tier
                        if (p.includes('/user/mo')) return 'Team';
                        // Team plans (identify by plan name since pricing varies)
                        if (planName && planName.toLowerCase().includes('team')) return 'Team';
                        // Already has /mo suffix
                        if (price.includes('/mo')) return price.trim();
                        // Just a dollar amount - add /mo
                        if (price.match(/^\$\d+$/)) return price + '/mo';
                        return price.trim();
                      };

                      // Helper to create URL-safe tier value
                      const tierToSlug = (price) => {
                        if (price === '$0/mo') return '0';
                        if (price === 'Team') return 'team';
                        if (price === 'Enterprise') return 'enterprise';
                        const match = price.match(/\$(\d+)/);
                        return match ? match[1] : price.toLowerCase().replace(/[^a-z0-9]/g, '');
                      };

                      // Build price lookup: plan name → normalized price
                      const planPrices = new Map();
                      platforms.forEach(p => {
                        p.pricing.forEach(tier => {
                          planPrices.set(tier.plan, normalizePrice(tier.price, tier.plan));
                        });
                      });

                      // Collect unique prices from features that are available
                      const allPrices = new Set();
                      platforms.forEach(p => {
                        p.features.forEach(f => {
                          f.availability.forEach(a => {
                            if ((a.available.includes('✅') || a.available.includes('⚠️')) && planPrices.has(a.plan)) {
                              allPrices.add(planPrices.get(a.plan));
                            }
                          });
                        });
                      });

                      // Sort prices: $0 first, then by numeric value, Team/Enterprise last
                      const priceOrder = (p) => {
                        if (p === '$0/mo') return 0;
                        if (p === 'Team') return 9998;
                        if (p === 'Enterprise') return 9999;
                        // Extract first numeric value for sorting
                        const match = p.match(/\$(\d+)/);
                        return match ? parseInt(match[1]) : 5000;
                      };

                      const prices = [...allPrices].sort((a, b) => priceOrder(a) - priceOrder(b));

                      return prices.map(price => `<option value="${tierToSlug(price)}">${price}</option>`).join('\n                    ');
                    })()}
                </select>
            </div>
            <span class="feature-count" id="featureCount" aria-live="polite" aria-atomic="true">Showing <strong>${platforms.reduce((sum, p) => sum + p.features.length, 0)}</strong> of <strong>${platforms.reduce((sum, p) => sum + p.features.length, 0)}</strong></span>
            <a href="definitions.html" class="definitions-link" onclick="passTheme(this)">ℹ️ What's this mean?</a>
        </div>

        ${(() => {
          // Sort platforms by vendor order (same as header toggles)
          const vendorOrder = ['OpenAI', 'Microsoft', 'Google', 'Anthropic', 'Perplexity AI', 'xAI'];
          const sortedPlatforms = [...platforms].sort((a, b) => {
            const aIdx = vendorOrder.indexOf(a.vendor);
            const bIdx = vendorOrder.indexOf(b.vendor);
            const aPos = aIdx === -1 ? (a.vendor.startsWith('Various') ? 999 : 100) : aIdx;
            const bPos = bIdx === -1 ? (b.vendor.startsWith('Various') ? 999 : 100) : bIdx;
            return aPos - bPos;
          });
          return sortedPlatforms.map(p => {
          const vendorSlug = p.vendor.toLowerCase().replace(/[^a-z0-9]/g, '-');
          // Build price lookup for this platform (using same normalization as filter)
          const planPriceMap = new Map();
          const normalizePrice = (price, planName) => {
            const pr = price.trim().toLowerCase();
            if (pr === '$0' || pr === 'free') return '$0/mo';
            if (pr.includes('custom') || pr.includes('contact')) return 'Enterprise';
            if (pr.includes('/user/mo')) return 'Team';
            if (planName && planName.toLowerCase().includes('team')) return 'Team';
            if (price.includes('/mo')) return price.trim();
            if (price.match(/^\$\d+$/)) return price + '/mo';
            return price.trim();
          };
          // Helper to create URL-safe tier value (same as in filter dropdown)
          const tierToSlug = (price) => {
            if (price === '$0/mo') return '0';
            if (price === 'Team') return 'team';
            if (price === 'Enterprise') return 'enterprise';
            const match = price.match(/\$(\d+)/);
            return match ? match[1] : price.toLowerCase().replace(/[^a-z0-9]/g, '');
          };
          p.pricing.forEach(tier => {
            planPriceMap.set(tier.plan, tierToSlug(normalizePrice(tier.price, tier.plan)));
          });
          return `
        <section class="platform-section" data-platform="${p.name.toLowerCase()}" data-vendor="${vendorSlug}">
            <div class="platform-header">
                <h2>${p.logo ? `<img src="${p.logo}" alt="${p.vendor}" class="platform-logo">` : ''}${p.name}<a href="${p.status_page}" target="_blank" class="platform-status-link">● Status</a></h2>
                <div class="platform-meta">
                    <a href="${p.pricing_page}" target="_blank">Pricing</a>
                    <span>·</span>
                    <span>Verified: ${p.last_verified}</span>
                </div>
            </div>
            <div class="pricing-bar">
                ${p.pricing.map(tier => `<span class="price-tag"><strong>${tier.plan}</strong>: ${tier.price}</span>`).join('\n                ')}
            </div>
            <div class="features-grid">
                ${p.features.map(f => {
                  const availablePrices = [...new Set(f.availability
                    .filter(a => a.available.includes('✅') || a.available.includes('⚠️'))
                    .map(a => planPriceMap.get(a.plan))
                    .filter(Boolean))].join('_');
                  const featureId = `${p.name.toLowerCase()}-${f.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
                  return `
                <div class="feature-card" id="${featureId}" data-category="${f.category}" data-prices="${availablePrices}">
                    <div class="feature-header">
                        <h3>${f.url ? `<a href="${f.url}" target="_blank" class="feature-link">${f.name}</a>` : f.name}</h3>
                        <span class="badges"><button class="permalink-btn" onclick="copyPermalink('${featureId}')" title="Copy link to this feature" aria-label="Copy permalink">🔗</button>${availabilityBadge(f.status)}${gatingBadge(f.gating)}</span>
                    </div>
                    <div class="avail-grid">
                        ${f.availability.map(a => `
                        <div class="avail-item">
                            <span class="plan">${a.plan}</span>
                            <span class="status">${availBadge(a.available)}</span>
                        </div>`).join('')}
                    </div>
                    <div class="platforms-row">
                        ${(() => {
                          // Standard platform order: Windows, macOS, Linux, iOS, Android, web, terminal, API
                          const platformOrder = ['Windows', 'macOS', 'Linux', 'iOS', 'Android', 'web', 'terminal', 'API'];
                          const platformMap = new Map(f.platforms.map(pl => [pl.platform.toLowerCase(), pl]));

                          return platformOrder.map(plat => {
                            const pl = platformMap.get(plat.toLowerCase());
                            if (!pl) return '';
                            let cls = 'no';
                            if (pl.available.includes('✅')) cls = 'yes';
                            else if (pl.available.includes('🔜')) cls = 'soon';
                            else if (pl.available.includes('⚠️')) cls = 'partial';
                            return `<span class="plat-icon ${cls}" title="${plat}">${plat}</span>`;
                          }).filter(Boolean).join('');
                        })()}
                    </div>
                    ${f.talking_point ? `<div class="talking-point" role="button" tabindex="0" aria-label="Click to copy talking point" onclick="copyTalkingPoint(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();copyTalkingPoint(this)}">${f.talking_point.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')}</div>` : ''}
                    <div class="dates-row">
                        ${f.launched ? `<span class="date-item launched clickable" onclick="showChangelog('${p.name.toLowerCase()}-${f.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}')"><span class="date-label">Launched</span><span class="date-value">${formatDateForDisplay(f.launched)}</span></span>` : ''}
                        ${f.verified ? `<span class="date-item verified"><span class="date-label">Verified</span><span class="date-value">${formatDateForDisplay(f.verified)}</span></span>` : ''}
                    </div>
                </div>`;
                }).join('')}
            </div>
        </section>`;
          }).join('\n');
        })()}

        <footer>
            <p>
                Community-maintained. Found an error? Got an idea?
                <a href="https://github.com/snapsynapse/ai-feature-tracker/issues">Open an issue</a> or
                <a href="https://github.com/snapsynapse/ai-feature-tracker/pulls">submit a PR</a>.
                <a href="https://www.w3.org/WAI/WCAG2AA-Conformance" title="Explanation of WCAG 2 Level AA conformance" style="margin-left: 8px; vertical-align: middle;"><img height="32" width="88" src="https://www.w3.org/WAI/WCAG21/wcag2.1AA-blue-v" alt="Level AA conformance, W3C WAI Web Content Accessibility Guidelines 2.1"></a>
            </p>
            <p style="margin-top: 8px;">
                Made by <a href="https://snapsynapse.com/">Snap Synapse</a> via <a href="https://docs.anthropic.com/en/docs/claude-code/overview">Claude Code</a> | 🤓+🤖 | You're welcome.
            </p>
        </footer>
    </div>

    <!-- Changelog Modal -->
    <div class="modal-overlay" id="changelogModal" role="dialog" aria-modal="true" aria-labelledby="changelogTitle" onclick="if(event.target===this)closeChangelog()">
        <div class="modal">
            <button class="modal-close" onclick="closeChangelog()" aria-label="Close dialog">&times;</button>
            <h3 id="changelogTitle">Changelog</h3>
            <table class="changelog-table">
                <thead>
                    <tr><th scope="col">Date (UTC)</th><th scope="col">Change</th></tr>
                </thead>
                <tbody id="changelogBody"></tbody>
            </table>
        </div>
    </div>

    <!-- Changelog Data -->
    <script>
        const CHANGELOGS = {
            ${platforms.flatMap(p => p.features.map(f => {
              const id = `${p.name.toLowerCase()}-${f.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
              const changes = (f.changelog || []).map(c => `{ date: "${c.date || ''}", change: "${(c.change || '').replace(/"/g, '\\"')}" }`).join(',\n                ');
              return `"${id}": {
                name: "${f.name}",
                platform: "${p.name}",
                launched: "${f.launched || ''}",
                verified: "${f.verified || ''}",
                checked: "${f.checked || ''}",
                changes: [${changes}]
            }`;
            })).join(',\n            ')}
        };
    </script>

    <script>
        const TOTAL_FEATURES = ${platforms.reduce((sum, p) => sum + p.features.length, 0)};

        function copyTalkingPoint(el) {
            const text = el.innerText;
            navigator.clipboard.writeText(text);
            el.classList.add('copied');
            setTimeout(() => el.classList.remove('copied'), 1000);
        }

        function copyPermalink(featureId) {
            const url = new URL(window.location);
            url.hash = featureId;
            // Preserve only the hash, clear filters for a clean link
            url.search = '';
            navigator.clipboard.writeText(url.toString());

            // Visual feedback
            const btn = document.querySelector('#' + CSS.escape(featureId) + ' .permalink-btn');
            if (btn) {
                const original = btn.textContent;
                btn.textContent = '✓';
                btn.classList.add('copied');
                setTimeout(() => {
                    btn.textContent = original;
                    btn.classList.remove('copied');
                }, 1000);
            }
        }

        function scrollToFeature() {
            const hash = window.location.hash.slice(1);
            if (!hash) return;

            const card = document.getElementById(hash);
            if (card) {
                // Make sure the platform section is visible
                const section = card.closest('.platform-section');
                if (section) {
                    const vendor = section.dataset.vendor;
                    if (!activeProviders.has(vendor)) {
                        activeProviders.add(vendor);
                        const toggle = document.querySelector('.provider-toggle[data-vendor="' + vendor + '"]');
                        if (toggle) {
                            toggle.classList.add('active');
                            toggle.setAttribute('aria-pressed', 'true');
                        }
                        filterProviders();
                    }
                }

                // Clear any category/tier filters that might hide the card
                document.getElementById('categoryFilter').value = '';
                document.getElementById('tierFilter').value = '';
                filterFeatures(true);

                // Scroll and highlight
                setTimeout(() => {
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    card.classList.add('permalink-highlight');
                    setTimeout(() => card.classList.remove('permalink-highlight'), 2000);
                }, 100);
            }
        }

        function toggleTheme() {
            document.body.classList.toggle('light-mode');
            document.documentElement.classList.toggle('light-mode');
            const isLight = document.body.classList.contains('light-mode');
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
        }

        function passTheme(link) {
            const isLight = document.body.classList.contains('light-mode') || document.documentElement.classList.contains('light-mode');
            if (isLight) {
                link.href = link.href.split('?')[0] + '?theme=light';
            }
        }

        function updateFeatureCount() {
            const visibleCards = [...document.querySelectorAll('.feature-card')].filter(card =>
                card.style.display !== 'none' &&
                card.closest('.platform-section').style.display !== 'none'
            );

            document.getElementById('featureCount').innerHTML =
                'Showing <strong>' + visibleCards.length + '</strong> of <strong>' + TOTAL_FEATURES + '</strong>';
        }

        function filterFeatures(skipURLUpdate) {
            const categorySelect = document.getElementById('categoryFilter');
            const tierSelect = document.getElementById('tierFilter');
            const category = categorySelect.value;
            const price = tierSelect.value;

            // Highlight active filters
            categorySelect.classList.toggle('active', category !== '');
            tierSelect.classList.toggle('active', price !== '');

            document.querySelectorAll('.feature-card').forEach(card => {
                let show = true;
                if (category && card.dataset.category !== category) show = false;
                if (price) {
                    const prices = card.dataset.prices ? card.dataset.prices.split('_') : [];
                    if (!prices.includes(price)) show = false;
                }
                card.style.display = show ? '' : 'none';
            });

            updateFeatureCount();
            if (!skipURLUpdate) updateURL();
        }

        let lastFocusedElement = null;

        function showChangelog(id) {
            const data = CHANGELOGS[id];
            if (!data) return;

            // Store the element that had focus before opening
            lastFocusedElement = document.activeElement;

            document.getElementById('changelogTitle').textContent = data.platform + ' — ' + data.name + ' Changelog';
            document.getElementById('changelogBody').innerHTML = data.changes.map(c =>
                '<tr><td>' + c.date + '</td><td>' + c.change + '</td></tr>'
            ).join('');
            document.getElementById('changelogModal').classList.add('active');

            // Focus the close button for keyboard users
            setTimeout(() => {
                document.querySelector('.modal-close').focus();
            }, 50);
        }

        function closeChangelog() {
            document.getElementById('changelogModal').classList.remove('active');
            // Restore focus to the element that opened the modal
            if (lastFocusedElement) {
                lastFocusedElement.focus();
                lastFocusedElement = null;
            }
        }

        // Close modal on Escape key and trap focus
        document.addEventListener('keydown', e => {
            const modal = document.getElementById('changelogModal');
            if (!modal.classList.contains('active')) return;

            if (e.key === 'Escape') {
                closeChangelog();
                return;
            }

            // Focus trap: Tab key cycles within modal
            if (e.key === 'Tab') {
                const focusableElements = modal.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])');
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (e.shiftKey && document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                } else if (!e.shiftKey && document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        });

        // Provider toggle functionality
        let activeProviders = new Set();

        function initFromURL() {
            const params = new URLSearchParams(window.location.search);
            const pParam = params.get('p');
            const toggles = document.querySelectorAll('.provider-toggle');

            if (pParam) {
                // Parse underscore-separated providers from URL
                const urlProviders = pParam.split('_').map(p => p.trim().toLowerCase());
                activeProviders = new Set(urlProviders);

                // Update toggle states
                toggles.forEach(toggle => {
                    const vendor = toggle.dataset.vendor;
                    if (activeProviders.has(vendor)) {
                        toggle.classList.add('active');
                        toggle.setAttribute('aria-pressed', 'true');
                    } else {
                        toggle.classList.remove('active');
                        toggle.setAttribute('aria-pressed', 'false');
                    }
                });
            } else {
                // All active by default
                toggles.forEach(toggle => {
                    activeProviders.add(toggle.dataset.vendor);
                    toggle.classList.add('active');
                    toggle.setAttribute('aria-pressed', 'true');
                });
            }

            // Restore category filter from URL
            const catParam = params.get('cat');
            if (catParam) {
                document.getElementById('categoryFilter').value = catParam;
            }

            // Restore tier filter from URL
            const tierParam = params.get('tier');
            if (tierParam) {
                document.getElementById('tierFilter').value = tierParam;
            }

            filterProviders();
            filterFeatures(true);  // Skip URL update during init
        }

        function toggleProvider(vendorSlug) {
            const toggle = document.querySelector('.provider-toggle[data-vendor="' + vendorSlug + '"]');

            if (activeProviders.has(vendorSlug)) {
                // Don't allow deselecting the last one
                if (activeProviders.size === 1) return;
                activeProviders.delete(vendorSlug);
                toggle.classList.remove('active');
                toggle.setAttribute('aria-pressed', 'false');
            } else {
                activeProviders.add(vendorSlug);
                toggle.classList.add('active');
                toggle.setAttribute('aria-pressed', 'true');
            }

            updateURL();
            filterProviders();
        }

        function filterProviders() {
            document.querySelectorAll('.platform-section').forEach(section => {
                const vendor = section.dataset.vendor;
                section.style.display = activeProviders.has(vendor) ? '' : 'none';
            });
            updateFeatureCount();
        }

        function updateURL() {
            const url = new URL(window.location);

            // Provider toggles
            const allToggles = document.querySelectorAll('.provider-toggle');
            const allVendors = [...allToggles].map(t => t.dataset.vendor);
            if (activeProviders.size === allVendors.length) {
                url.searchParams.delete('p');
            } else {
                url.searchParams.set('p', [...activeProviders].join('_'));
            }

            // Category filter
            const category = document.getElementById('categoryFilter').value;
            if (category) {
                url.searchParams.set('cat', category);
            } else {
                url.searchParams.delete('cat');
            }

            // Tier/price filter
            const tier = document.getElementById('tierFilter').value;
            if (tier) {
                url.searchParams.set('tier', tier);
            } else {
                url.searchParams.delete('tier');
            }

            window.history.replaceState({}, '', url);
        }

        // Initialize on page load
        document.addEventListener('DOMContentLoaded', () => {
            initFromURL();
            scrollToFeature();
        });

        // Handle hash changes (e.g., back/forward navigation)
        window.addEventListener('hashchange', scrollToFeature);

        // Keyboard navigation for feature cards
        let currentCardIndex = -1;

        function getVisibleCards() {
            return [...document.querySelectorAll('.feature-card')].filter(card =>
                card.style.display !== 'none' &&
                card.closest('.platform-section').style.display !== 'none'
            );
        }

        function focusCard(index) {
            const cards = getVisibleCards();
            if (cards.length === 0) return;

            // Remove focus from previous card
            if (currentCardIndex >= 0 && currentCardIndex < cards.length) {
                cards[currentCardIndex].classList.remove('keyboard-focus');
            }

            // Clamp index to valid range
            currentCardIndex = Math.max(0, Math.min(index, cards.length - 1));

            // Focus new card
            const card = cards[currentCardIndex];
            card.classList.add('keyboard-focus');
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        document.addEventListener('keydown', e => {
            // Don't interfere with form inputs
            if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;

            const cards = getVisibleCards();
            if (cards.length === 0) return;

            switch(e.key) {
                case 'ArrowDown':
                case 'j':
                    e.preventDefault();
                    focusCard(currentCardIndex + 1);
                    break;
                case 'ArrowUp':
                case 'k':
                    e.preventDefault();
                    focusCard(currentCardIndex - 1);
                    break;
                case 'Enter':
                    if (currentCardIndex >= 0 && currentCardIndex < cards.length) {
                        const card = cards[currentCardIndex];
                        const talkingPoint = card.querySelector('.talking-point');
                        if (talkingPoint) {
                            copyTalkingPoint(talkingPoint);
                        }
                    }
                    break;
                case 'Home':
                    e.preventDefault();
                    focusCard(0);
                    break;
                case 'End':
                    e.preventDefault();
                    focusCard(cards.length - 1);
                    break;
            }
        });
    </script>
</body>
</html>`;
}

/**
 * Convert markdown to simple HTML
 */
function markdownToHTML(md) {
  return md
    // Code blocks (must come before inline code)
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold and italic
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    // Tables (basic support)
    .replace(/\|(.+)\|\n\|[-| ]+\|\n((\|.+\|\n?)+)/g, (match, header, body) => {
      const headers = header.split('|').filter(Boolean).map(h => `<th>${h.trim()}</th>`).join('');
      const rows = body.trim().split('\n').map(row => {
        const cells = row.split('|').filter(Boolean).map(c => `<td>${c.trim()}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
    })
    // Paragraphs (wrap remaining text blocks)
    .replace(/^(?!<[a-z]|$)(.+)$/gm, '<p>$1</p>')
    // Clean up empty paragraphs
    .replace(/<p><\/p>/g, '')
    // Fix nested lists
    .replace(/<\/ul>\s*<ul>/g, '');
}

/**
 * Generate the about page from README
 */
function generateAboutHTML() {
  const readmePath = path.join(__dirname, '..', 'README.md');
  let readme = fs.readFileSync(readmePath, 'utf-8');

  // Remove "Local Development" section (not relevant for about page)
  readme = readme.replace(/## Local Development[\s\S]*?(?=## |$)/, '');

  const content = markdownToHTML(readme);

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>About - AI Feature Tracker</title>
    <meta name="description" content="About the AI Feature Tracker - a community-maintained resource for AI feature availability.">

    <!-- Favicon -->
    <link rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="assets/favicon-16.png">
    <link rel="apple-touch-icon" sizes="180x180" href="assets/apple-touch-icon.png">

    <!-- Open Graph / Social -->
    <meta property="og:type" content="website">
    <meta property="og:title" content="About - AI Feature Tracker">
    <meta property="og:description" content="About the AI Feature Tracker - a community-maintained resource for AI feature availability.">
    <meta property="og:image" content="assets/og-image.png">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="About - AI Feature Tracker">
    <meta name="twitter:description" content="About the AI Feature Tracker - a community-maintained resource for AI feature availability.">
    <meta name="twitter:image" content="assets/og-image.png">

    <link rel="stylesheet" href="assets/styles.css">
    <script>
        (function() {
            var params = new URLSearchParams(window.location.search);
            var urlTheme = params.get('theme');
            var storedTheme = localStorage.getItem('theme');
            if (urlTheme === 'light' || storedTheme === 'light') {
                document.documentElement.classList.add('light-mode');
                localStorage.setItem('theme', 'light');
            }
        })();
    </script>
    <style>
        .about-content {
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
        }
        .about-content h1 { font-size: 2rem; margin-bottom: 0.5rem; }
        .about-content h2 { font-size: 1.5rem; margin-top: 2rem; margin-bottom: 1rem; border-bottom: 1px solid var(--card-border); padding-bottom: 0.5rem; }
        .about-content h3 { font-size: 1.2rem; margin-top: 1.5rem; margin-bottom: 0.75rem; }
        .about-content p { margin-bottom: 1rem; line-height: 1.6; }
        .about-content ul { margin-bottom: 1rem; padding-left: 1.5rem; }
        .about-content li { margin-bottom: 0.5rem; line-height: 1.5; }
        .about-content a { color: var(--accent); }
        .about-content code { background: var(--card-bg); padding: 0.2em 0.4em; border-radius: 3px; font-size: 0.9em; }
        .about-content pre { background: var(--card-bg); padding: 1rem; border-radius: 8px; overflow-x: auto; margin-bottom: 1rem; }
        .about-content pre code { background: none; padding: 0; }
        .about-content blockquote { border-left: 3px solid var(--accent); padding-left: 1rem; margin: 1rem 0; font-style: italic; }
        .about-content table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
        .about-content th, .about-content td { padding: 0.5rem; text-align: left; border-bottom: 1px solid var(--card-border); }
        .about-content hr { border: none; border-top: 1px solid var(--card-border); margin: 2rem 0; }
    </style>
</head>
<body>
    <a href="#main-content" class="skip-link">Skip to main content</a>
    <header>
        <h1><a href="index.html" onclick="passTheme(this)" style="color: inherit; text-decoration: none;"><img src="assets/favicon-32.png" alt="" class="header-logo" width="28" height="28" aria-hidden="true"> AI Feature Tracker</a></h1>
        <div class="header-meta">
            <a href="index.html" class="about-link" onclick="passTheme(this)">← Back to Dashboard</a>
            <a href="https://github.com/snapsynapse/ai-feature-tracker" class="github-link">Contribute on GitHub</a>
            <button class="theme-toggle" onclick="toggleTheme()" title="Toggle light/dark mode">🌓 Theme</button>
        </div>
    </header>
    <div class="container" id="main-content">
        <div class="about-content">
            ${content}
        </div>

        <footer>
            <p>
                Community-maintained. Found an error? Got an idea?
                <a href="https://github.com/snapsynapse/ai-feature-tracker/issues">Open an issue</a> or
                <a href="https://github.com/snapsynapse/ai-feature-tracker/pulls">submit a PR</a>.
                <a href="https://www.w3.org/WAI/WCAG2AA-Conformance" title="Explanation of WCAG 2 Level AA conformance" style="margin-left: 8px; vertical-align: middle;"><img height="32" width="88" src="https://www.w3.org/WAI/WCAG21/wcag2.1AA-blue-v" alt="Level AA conformance, W3C WAI Web Content Accessibility Guidelines 2.1"></a>
            </p>
            <p style="margin-top: 8px;">
                Made by <a href="https://snapsynapse.com/">Snap Synapse</a> via <a href="https://docs.anthropic.com/en/docs/claude-code/overview">Claude Code</a> | 🤓+🤖 | You're welcome.
            </p>
        </footer>
    </div>
    <script>
        function toggleTheme() {
            document.body.classList.toggle('light-mode');
            document.documentElement.classList.toggle('light-mode');
            const isLight = document.body.classList.contains('light-mode');
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
        }

        function passTheme(link) {
            const isLight = document.body.classList.contains('light-mode');
            if (isLight) {
                link.href = link.href.split('?')[0] + '?theme=light';
            }
        }
    </script>
</body>
</html>`;
}

// Main execution
function main() {
  console.log('🔨 Building AI Feature Tracker...\n');

  // Read all platform files
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.md') && !f.startsWith('_'));
  console.log(`Found ${files.length} platform files: ${files.join(', ')}`);

  const platforms = files.map(f => {
    const filepath = path.join(DATA_DIR, f);
    console.log(`  Parsing ${f}...`);
    return parsePlatform(filepath);
  });

  // Count features
  const totalFeatures = platforms.reduce((sum, p) => sum + p.features.length, 0);
  console.log(`\nParsed ${totalFeatures} features across ${platforms.length} platforms.`);

  // Generate HTML
  const html = generateHTML(platforms);

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write output
  fs.writeFileSync(OUTPUT_FILE, html);
  console.log(`\n✅ Dashboard written to ${OUTPUT_FILE}`);
  console.log(`   File size: ${(html.length / 1024).toFixed(1)} KB`);

  // Generate about page from README
  const aboutHTML = generateAboutHTML();
  const aboutFile = path.join(outputDir, 'about.html');
  fs.writeFileSync(aboutFile, aboutHTML);
  console.log(`✅ About page written to ${aboutFile}`);
  console.log(`   File size: ${(aboutHTML.length / 1024).toFixed(1)} KB`);
}

main();
