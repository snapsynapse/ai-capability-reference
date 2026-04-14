#!/usr/bin/env node

/**
 * AI Tool Watch - Static Site Generator
 *
 * Compiles markdown data files into a feature-oriented dashboard and
 * capability-oriented index.
 * Run with: node scripts/build.js
 */

const fs = require('fs');
const path = require('path');

// Paths
const ROOT_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(__dirname, '..', 'data', 'platforms');
const CAPABILITIES_DIR = path.join(__dirname, '..', 'data', 'capabilities');
const PROVIDERS_DIR = path.join(__dirname, '..', 'data', 'providers');
const PRODUCTS_DIR = path.join(__dirname, '..', 'data', 'products');
const MODEL_ACCESS_DIR = path.join(__dirname, '..', 'data', 'model-access');
const IMPLEMENTATIONS_FILE = path.join(__dirname, '..', 'data', 'implementations', 'index.yml');
const EVIDENCE_FILE = path.join(__dirname, '..', 'data', 'evidence', 'index.json');
const DISCOVERY_FILE = path.join(__dirname, '..', 'data', 'discovery.yml');
const FRAMING_CACHE_FILE = path.join(__dirname, '..', 'data', 'framing-cache.json');
const IMPLEMENTATIONS_OUTPUT_FILE = path.join(__dirname, '..', 'docs', 'implementations.html');
const HOMEPAGE_OUTPUT_FILE = path.join(__dirname, '..', 'docs', 'index.html');
const CONSTRAINTS_OUTPUT_FILE = path.join(__dirname, '..', 'docs', 'constraints.html');
const CAPABILITIES_REDIRECT_FILE = path.join(__dirname, '..', 'docs', 'capabilities.html');
const NOT_FOUND_OUTPUT_FILE = path.join(__dirname, '..', 'docs', '404.html');
const COMPARE_OUTPUT_FILE = path.join(__dirname, '..', 'docs', 'compare.html');
const TIMELINE_OUTPUT_FILE = path.join(__dirname, '..', 'docs', 'timeline.html');
const DATA_EXPORT_FILE = path.join(__dirname, '..', 'docs', 'assets', 'data.json');
const REPO_URL = 'https://github.com/snapsynapse/ai-tool-watch';
const REPO_ISSUES_URL = `${REPO_URL}/issues`;
const REPO_PULLS_URL = `${REPO_URL}/pulls`;
const SITE_URL = 'https://aitool.watch/';
const DASHBOARD_TITLE = 'AI Tool Watch';
const FEATURE_VIEW_TITLE = 'Feature View by Plan';

function slugify(value) {
    return String(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function featureCardId(platformName, featureName) {
    return `${slugify(platformName)}-${slugify(featureName)}`;
}

function escapeHTML(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function extractSection(body, heading) {
    const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = body.match(new RegExp(`## ${escapedHeading}\\n\\n([\\s\\S]*?)(?=\\n## |$)`));
    return match ? match[1].trim() : '';
}

function parseBulletList(sectionText) {
    return sectionText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('- '))
        .map(line => line.slice(2).trim());
}

function humanizeId(value) {
    return String(value || '')
        .split('-')
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function isPublicPlatform(platform) {
    return !['hidden', 'archive'].includes(platform?.build_visibility);
}

function providerDisplayName(providerRecord, fallbackId) {
    return providerRecord?.name || humanizeId(fallbackId);
}

function latestDate(values) {
    return [...values].filter(Boolean).sort().slice(-1)[0] || '';
}

/**
 * Parse YAML-like frontmatter from markdown content.
 * Extracts key-value pairs between --- delimiters.
 * @param {string} content - Raw markdown content with optional frontmatter
 * @returns {{frontmatter: Object<string, string>, body: string}} Parsed frontmatter object and remaining body
 */
function parseFrontmatter(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return { frontmatter: {}, body: content };

    const frontmatter = {};
    const lines = match[1].split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
        if (!keyMatch) continue;

        const key = keyMatch[1].trim();
        const rawValue = keyMatch[2];

        if (rawValue) {
            frontmatter[key] = rawValue.trim();
            continue;
        }

        const items = [];
        let j = i + 1;
        while (j < lines.length) {
            const itemMatch = lines[j].match(/^\s*-\s+(.*)$/);
            if (itemMatch) {
                items.push(itemMatch[1].trim());
                j++;
                continue;
            }
            if (lines[j].trim() === '') {
                j++;
                continue;
            }
            break;
        }

        frontmatter[key] = items.length ? items : '';
        i = j - 1;
    }

    return {
        frontmatter,
        body: content.slice(match[0].length).trim()
    };
}

function listBuildPlatformFiles() {
    if (!fs.existsSync(DATA_DIR)) return [];

    return fs.readdirSync(DATA_DIR)
        .filter(file => file.endsWith('.md') && !file.startsWith('_'))
        .filter(file => {
            const filepath = path.join(DATA_DIR, file);
            const content = fs.readFileSync(filepath, 'utf-8');
            const { frontmatter } = parseFrontmatter(content);
            return frontmatter.build_visibility !== 'archive';
        })
        .sort();
}

/**
 * Parse a markdown table into an array of row objects.
 * Headers become lowercase keys with spaces replaced by underscores.
 * @param {string} tableText - Markdown table text (includes header row and separator)
 * @returns {Array<Object<string, string>>} Array of objects, one per data row
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
 * Format ISO 8601 date for display by stripping the time portion.
 * @param {string} isoDate - ISO date string (e.g., "2024-12-06T12:00Z")
 * @returns {string} Date portion only (e.g., "2024-12-06"), or empty string if falsy
 */
function formatDateForDisplay(isoDate) {
    if (!isoDate) return '';
    return isoDate.split('T')[0];
}

function renderDateBadges({ launched = '', verified = '', checked = '', featureId = '' } = {}) {
    const launchedBadge = launched
        ? (featureId
            ? `<span class="date-item launched clickable" title="Launched" onclick="showChangelog('${featureId}')"><span class="date-emoji">🚀</span><span class="date-value">${formatDateForDisplay(launched)}</span></span>`
            : `<span class="date-item launched" title="Launched"><span class="date-emoji">🚀</span><span class="date-value">${formatDateForDisplay(launched)}</span></span>`)
        : '';
    const verifiedBadge = verified
        ? `<span class="date-item verified" title="Verified"><span class="date-emoji">✓</span><span class="date-value">${formatDateForDisplay(verified)}</span></span>`
        : '';
    const checkedBadge = checked
        ? `<span class="date-item checked" title="Checked"><span class="date-emoji">👁</span><span class="date-value">${formatDateForDisplay(checked)}</span></span>`
        : '';

    return `${launchedBadge}${verifiedBadge}${checkedBadge}`;
}

/**
 * Parse a feature section from markdown into a structured object.
 * Extracts property table, availability, platforms, talking point, notes, sources, and changelog.
 * @param {string} section - Markdown section starting with "## Feature Name"
 * @returns {Object|null} Feature object with all parsed fields, or null if invalid
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
        notes: '',
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

    // Parse notes (single line or multiline, plaintext for tooltip)
    const notesMatch = trimmed.match(/### Notes\n\n([\s\S]*?)(?=\n###|\n---|\n## |$)/);
    if (notesMatch) {
        // Convert markdown to plain text for tooltip, collapse to single line
        feature.notes = notesMatch[1].trim()
            .replace(/\*\*([^*]+)\*\*/g, '$1')  // Remove bold
            .replace(/\*([^*]+)\*/g, '$1')      // Remove italic
            .replace(/^- /gm, '• ')             // Convert bullets
            .replace(/\n+/g, ' ')               // Collapse newlines
            .trim();
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
 * Parse a platform markdown file into a structured object.
 * Combines frontmatter metadata, pricing table, and all feature sections.
 * @param {string} filepath - Absolute path to the platform markdown file
 * @returns {Object} Platform object with name, vendor, pricing array, and features array
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

function parseCapability(filepath) {
    const content = fs.readFileSync(filepath, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);

    return {
        ...frontmatter,
        summary: extractSection(body, 'Summary'),
        what_counts: parseBulletList(extractSection(body, 'What Counts')),
        what_does_not_count: parseBulletList(extractSection(body, 'What Does Not Count')),
        related_terms: parseBulletList(extractSection(body, 'Related Terms')),
        common_constraints: parseBulletList(extractSection(body, 'Common Constraints'))
    };
}

function parseProvider(filepath) {
    const content = fs.readFileSync(filepath, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);

    return {
        ...frontmatter,
        products: parseBulletList(extractSection(body, 'Products'))
    };
}

function parseProduct(filepath) {
    const content = fs.readFileSync(filepath, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);

    return {
        ...frontmatter,
        summary: extractSection(body, 'Summary')
    };
}

function parseModelAccess(filepath) {
    const content = fs.readFileSync(filepath, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);

    return {
        ...frontmatter,
        summary: extractSection(body, 'Summary'),
        deployment_modes: parseBulletList(extractSection(body, 'Deployment Modes')),
        common_runtimes: parseBulletList(extractSection(body, 'Common Runtimes')),
        constraints: parseBulletList(extractSection(body, 'Constraints')),
        related_capabilities: parseBulletList(extractSection(body, 'Related Capabilities'))
    };
}

function parseImplementationIndex(filepath) {
    if (!fs.existsSync(filepath)) return [];

    const lines = fs.readFileSync(filepath, 'utf-8').split('\n');
    const entries = [];
    let current = null;
    let currentArrayKey = null;
    let currentBlockKey = null;

    const pushCurrent = () => {
        if (current) entries.push(current);
    };

    for (const rawLine of lines) {
        const line = rawLine.replace(/\r$/, '');

        if (currentBlockKey) {
            if (line.startsWith('    ')) {
                current[currentBlockKey] += `${current[currentBlockKey] ? '\n' : ''}${line.slice(4)}`;
                continue;
            }
            if (line === '') {
                current[currentBlockKey] += '\n';
                continue;
            }
            currentBlockKey = null;
        }

        if (line.startsWith('- id: ')) {
            pushCurrent();
            current = { id: line.slice(6).trim() };
            currentArrayKey = null;
            continue;
        }

        if (!current) continue;

        const blockMatch = line.match(/^  ([a-z_]+): \|$/);
        if (blockMatch) {
            currentBlockKey = blockMatch[1];
            current[currentBlockKey] = '';
            currentArrayKey = null;
            continue;
        }

        const emptyArrayMatch = line.match(/^  ([a-z_]+): \[\]$/);
        if (emptyArrayMatch) {
            current[emptyArrayMatch[1]] = [];
            currentArrayKey = null;
            continue;
        }

        const arrayMatch = line.match(/^  ([a-z_]+):$/);
        if (arrayMatch) {
            current[arrayMatch[1]] = [];
            currentArrayKey = arrayMatch[1];
            continue;
        }

        if (currentArrayKey && line.startsWith('    - ')) {
            current[currentArrayKey].push(line.slice(6).trim());
            continue;
        }

        const scalarMatch = line.match(/^  ([a-z_]+):\s*(.*)$/);
        if (scalarMatch) {
            current[scalarMatch[1]] = scalarMatch[2].trim();
            currentArrayKey = null;
            continue;
        }

        currentArrayKey = null;
    }

    pushCurrent();

    return entries.map(entry => ({
        ...entry,
        notes: entry.notes ? entry.notes.trim() : ''
    }));
}

function loadEvidenceIndex(filepath) {
    if (!fs.existsSync(filepath)) return [];
    return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

/**
 * Parse discovery.yml — a simple YAML file with nested lists and scalars.
 * Returns { sitemap_strategy, discovery_set, type_defaults, coverage_pages }
 */
function parseDiscoveryYml(filepath) {
    if (!fs.existsSync(filepath)) {
        return { sitemap_strategy: 'all', discovery_set: [], type_defaults: {}, coverage_pages: [] };
    }
    const lines = fs.readFileSync(filepath, 'utf-8').split('\n');
    const result = { sitemap_strategy: 'all', discovery_set: [], type_defaults: {}, coverage_pages: [] };

    let section = null;          // top-level key currently being parsed
    let currentItem = null;      // current object in a list section
    let typeDefaultsSection = false;

    for (const rawLine of lines) {
        const line = rawLine.replace(/\r$/, '');
        // Skip comments and blank lines
        if (line.trim() === '' || line.trim().startsWith('#')) continue;

        // Top-level key detection (no leading spaces)
        const topKeyMatch = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
        if (topKeyMatch && !line.startsWith(' ')) {
            const key = topKeyMatch[1];
            // Strip inline comments (e.g. "curated  # curated | tiered | all")
            const val = topKeyMatch[2].trim().replace(/\s+#.*$/, '').trim();
            if (key === 'sitemap_strategy') {
                result.sitemap_strategy = val;
            } else if (key === 'discovery_set') {
                section = 'discovery_set';
                currentItem = null;
                typeDefaultsSection = false;
            } else if (key === 'type_defaults') {
                // Flush any pending item from previous section
                if (currentItem) {
                    if (section === 'discovery_set') result.discovery_set.push(currentItem);
                    else if (section === 'coverage_pages') result.coverage_pages.push(currentItem);
                    currentItem = null;
                }
                section = 'type_defaults';
                typeDefaultsSection = true;
            } else if (key === 'coverage_pages') {
                // Flush any pending item from previous section
                if (currentItem) {
                    if (section === 'discovery_set') result.discovery_set.push(currentItem);
                    else if (section === 'coverage_pages') result.coverage_pages.push(currentItem);
                    currentItem = null;
                }
                section = 'coverage_pages';
                typeDefaultsSection = false;
            }
            continue;
        }

        // List item start: "  - path: /foo" or "  - id: free-tools"
        const listItemMatch = line.match(/^  - ([a-zA-Z_]+):\s*(.*)$/);
        if (listItemMatch) {
            if (currentItem) {
                if (section === 'discovery_set') result.discovery_set.push(currentItem);
                else if (section === 'coverage_pages') result.coverage_pages.push(currentItem);
            }
            currentItem = { [listItemMatch[1]]: listItemMatch[2].trim().replace(/^"(.*)"$/, '$1') };
            continue;
        }

        // Continuation of list item: "    tier: 1" or "    reason: ..."
        if (currentItem && line.match(/^    [a-zA-Z_]+:/)) {
            const contMatch = line.match(/^    ([a-zA-Z_]+):\s*(.*)$/);
            if (contMatch) {
                let val = contMatch[2].trim().replace(/^"(.*)"$/, '$1');
                // Handle inline object like { gating: free }
                if (val.startsWith('{')) {
                    const objMatch = val.match(/^\{([^}]+)\}$/);
                    if (objMatch) {
                        const obj = {};
                        for (const pair of objMatch[1].split(',')) {
                            const [k, v] = pair.split(':').map(s => s.trim());
                            obj[k] = v;
                        }
                        currentItem[contMatch[1]] = obj;
                    } else {
                        currentItem[contMatch[1]] = val;
                    }
                } else {
                    // parse number
                    const num = Number(val);
                    currentItem[contMatch[1]] = isNaN(num) ? val : num;
                }
            }
            continue;
        }

        // type_defaults entries: "  compare: { tier: 2 }"
        if (typeDefaultsSection && line.match(/^  [a-zA-Z_-]+:/)) {
            const tdMatch = line.match(/^  ([a-zA-Z_-]+):\s*\{([^}]+)\}$/);
            if (tdMatch) {
                const obj = {};
                for (const pair of tdMatch[2].split(',')) {
                    const [k, v] = pair.split(':').map(s => s.trim());
                    obj[k] = isNaN(Number(v)) ? v : Number(v);
                }
                result.type_defaults[tdMatch[1]] = obj;
            }
            continue;
        }
    }

    // Push last item
    if (currentItem) {
        if (section === 'discovery_set') result.discovery_set.push(currentItem);
        else if (section === 'coverage_pages') result.coverage_pages.push(currentItem);
    }

    return result;
}

function evidenceKey(entityType, entityId) {
    return `${entityType}:${entityId}`;
}

/**
 * Load framing cache from data/framing-cache.json.
 * Returns a Map of { pagePath -> framingText }.
 * If the file doesn't exist, returns an empty Map.
 */
function loadFramingCache(filepath) {
    if (!fs.existsSync(filepath)) return new Map();
    try {
        const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
        return new Map(Object.entries(data));
    } catch (e) {
        return new Map();
    }
}

/**
 * Generate template-based framing for a page.
 * Falls back to templates when LLM framing is not in the cache.
 *
 * @param {string} pageType - 'capability' | 'comparison' | 'changes' | 'coverage'
 * @param {Object} context - page-specific context
 * @returns {string} 2-3 sentence framing text
 */
function generateTemplateFraming(pageType, context) {
    const now = new Date();
    const monthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    switch (pageType) {
        case 'capability': {
            const { capName, count, changeNote } = context;
            const change = changeNote || 'support has changed in recent months';
            return `This page tracks AI tools that currently support ${capName.toLowerCase()}. Unlike marketing claims, inclusion here requires verified functionality. As of ${monthYear}, ${count} product${count !== 1 ? 's support' : ' supports'} this, and ${change}.`;
        }
        case 'comparison': {
            const { nameA, nameB, sharedCount, uniqueA, uniqueB } = context;
            const uniqueAList = (uniqueA || []).slice(0, 3).join(', ') || 'nothing unique';
            const uniqueBList = (uniqueB || []).slice(0, 3).join(', ') || 'nothing unique';
            return `Side-by-side comparison of ${nameA} and ${nameB} capabilities based on verified data. They share ${sharedCount} capabilities. ${nameA} uniquely offers: ${uniqueAList}. ${nameB} uniquely offers: ${uniqueBList}.`;
        }
        case 'changes': {
            const { scope, count30d, latestChange } = context;
            const latest = latestChange ? ` Most recent: ${latestChange}.` : '';
            return `This page tracks verified changes to ${scope}. ${count30d} change${count30d !== 1 ? 's' : ''} recorded in the last 30 days.${latest}`;
        }
        case 'coverage': {
            const { coverageContext, productCount } = context;
            return `What can you actually do ${coverageContext}? This page shows verified capability coverage across ${productCount} AI product${productCount !== 1 ? 's' : ''}, based on tested functionality, not marketing pages.`;
        }
        default:
            return '';
    }
}

/**
 * Get framing text for a page: from cache if available, otherwise from template.
 *
 * @param {Map} framingCache - loaded framing cache
 * @param {string} pagePath - canonical page path (e.g. "capability/generate-images/")
 * @param {string} pageType - page type for template fallback
 * @param {Object} context - context for template
 * @returns {string} HTML paragraph with page-framing class, or empty string
 */
function renderPageFraming(framingCache, pagePath, pageType, context) {
    const cached = framingCache.get(pagePath);
    const text = cached || generateTemplateFraming(pageType, context);
    if (!text) return '';
    return `<p class="page-framing">${escapeHTML(text)}</p>\n`;
}

/**
 * Generate HTML badge for feature availability status.
 * @param {string} status - Status value: "ga", "beta", "preview", or "deprecated"
 * @returns {string} HTML span element with appropriate class and text
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
 * Generate HTML badge for feature access gating.
 * @param {string} gating - Gating value: "free", "paid", "invite", or "org-only"
 * @returns {string} HTML span element with appropriate class and text, or empty string if falsy
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
 * Generate plan availability indicator with ARIA labels for accessibility.
 * @param {string} avail - Availability string containing emoji: "✅", "❌", "🔜", or "⚠️"
 * @returns {string} HTML span element with visual indicator and ARIA label
 */
function availBadge(avail) {
    if (avail.includes('✅')) return '<span class="avail yes" aria-label="Available" role="img">✓</span>';
    if (avail.includes('❌')) return '<span class="avail no" aria-label="Not available" role="img">✗</span>';
    if (avail.includes('🔜')) return '<span class="avail soon" aria-label="Coming soon">Soon</span>';
    if (avail.includes('⚠️')) return '<span class="avail partial" aria-label="Partially available" role="img">~</span>';
    return '<span class="avail unknown" aria-label="Unknown">?</span>';
}

/**
 * Normalize price strings to consistent format for filtering
 * @param {string} price - Raw price string (e.g., "$20", "$20/mo", "Custom")
 * @param {string} planName - Plan name for context (e.g., "Team")
 * @returns {string} Normalized price (e.g., "$20/mo", "Team", "Enterprise")
 */
function normalizePrice(price, planName) {
    const p = price.trim().toLowerCase();
    if (p === '$0' || p === 'free' || p === '$0/mo') return 'Free';
    if (p.includes('custom') || p.includes('contact')) return 'Enterprise';
    if (p.includes('/user/mo')) return 'Team';
    if (planName && planName.toLowerCase().includes('team')) return 'Team';
    // Extract numeric value and round to nearest dollar (coalesces $7.99 → $8, $19.99 → $20)
    const numMatch = price.match(/\$([\d.]+)/);
    if (numMatch) {
        const rounded = Math.round(parseFloat(numMatch[1]));
        if (rounded === 0) return 'Free';
        return `$${rounded}/mo`;
    }
    return price.trim();
}

/**
 * Convert price to URL-safe slug for data attributes
 * @param {string} price - Normalized price string
 * @returns {string} URL-safe slug (e.g., "20", "team", "enterprise")
 */
function tierToSlug(price) {
    if (price === 'Free') return '0';
    if (price === 'Team') return 'team';
    if (price === 'Enterprise') return 'enterprise';
    const match = price.match(/\$(\d+)/);
    return match ? match[1] : price.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function loadOntologyData(platforms) {
    const capabilityFiles = fs.existsSync(CAPABILITIES_DIR)
        ? fs.readdirSync(CAPABILITIES_DIR).filter(f => f.endsWith('.md')).sort()
        : [];
    const providerFiles = fs.existsSync(PROVIDERS_DIR)
        ? fs.readdirSync(PROVIDERS_DIR).filter(f => f.endsWith('.md')).sort()
        : [];
    const productFiles = fs.existsSync(PRODUCTS_DIR)
        ? fs.readdirSync(PRODUCTS_DIR).filter(f => f.endsWith('.md')).sort()
        : [];
    const modelAccessFiles = fs.existsSync(MODEL_ACCESS_DIR)
        ? fs.readdirSync(MODEL_ACCESS_DIR).filter(f => f.endsWith('.md') && f !== 'README.md').sort()
        : [];

    const capabilities = capabilityFiles.map(f => parseCapability(path.join(CAPABILITIES_DIR, f)));
    const providers = providerFiles.map(f => parseProvider(path.join(PROVIDERS_DIR, f)));
    const products = productFiles.map(f => parseProduct(path.join(PRODUCTS_DIR, f)));
    const modelAccess = modelAccessFiles.map(f => parseModelAccess(path.join(MODEL_ACCESS_DIR, f)));
    const implementations = parseImplementationIndex(IMPLEMENTATIONS_FILE);
    const evidenceRecords = loadEvidenceIndex(EVIDENCE_FILE);

    const providerMap = new Map(providers.map(provider => [provider.id, provider]));
    const productMap = new Map(products.map(product => [product.id, product]));
    const featureLookup = new Map();
    const evidenceMap = new Map(evidenceRecords.map(record => [evidenceKey(record.entity_type, record.entity_id), record]));

    platforms.forEach(platform => {
        platform.features.forEach(feature => {
            featureLookup.set(`${platform.source_file}::${feature.name}`, {
                platform,
                feature,
                featureId: featureCardId(platform.name, feature.name)
            });
        });
    });

    const enrichedImplementations = implementations.map(implementation => {
        const lookupKey = `${implementation.source_file}::${implementation.source_heading}`;
        const source = featureLookup.get(lookupKey);
        return {
            ...implementation,
            capabilities: implementation.capabilities || [],
            provider_record: providerMap.get(implementation.provider) || null,
            product_record: productMap.get(implementation.product) || null,
            source,
            evidence: evidenceMap.get(evidenceKey('implementation', implementation.id)) || null
        };
    });

    const enrichedModelAccess = modelAccess.map(record => {
        const lookupKey = `${record.record_source}::${record.source_heading}`;
        const source = featureLookup.get(lookupKey);
        return {
            ...record,
            provider_record: providerMap.get(record.provider) || null,
            source,
            evidence: evidenceMap.get(evidenceKey('model_access', record.id)) || null
        };
    });

    const enrichedProducts = products.map(product => {
        const lookupKey = product.record_source && product.source_heading
            ? `${product.record_source}::${product.source_heading}`
            : null;
        return {
            ...product,
            provider_record: providerMap.get(product.provider) || null,
            source: lookupKey ? featureLookup.get(lookupKey) || null : null,
            evidence: evidenceMap.get(evidenceKey('product', product.id)) || null
        };
    });

    const groupOrder = [
        'understand',
        'respond',
        'create',
        'work-with-my-stuff',
        'act-for-me',
        'connect',
        'access-context'
    ];

    const capabilitiesWithImplementations = capabilities
        .map(capability => {
            const matches = enrichedImplementations.filter(item => item.capabilities.includes(capability.id));
            const relatedModelAccess = enrichedModelAccess.filter(item => item.related_capabilities.includes(capability.id));
            const productsForCapability = [...new Set(matches.map(item => item.product))];
            return {
                ...capability,
                implementations: matches,
                model_access: relatedModelAccess,
                implementation_count: matches.length,
                product_count: productsForCapability.length,
                model_access_count: relatedModelAccess.length
            };
        })
        .sort((a, b) => {
            const groupDelta = groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group);
            if (groupDelta !== 0) return groupDelta;
            return a.name.localeCompare(b.name);
        });

    return {
        capabilities: capabilitiesWithImplementations,
        providers,
        products: enrichedProducts,
        implementations: enrichedImplementations,
        model_access: enrichedModelAccess,
        runtime_products: enrichedProducts.filter(product => product.product_kind === 'runtime'),
        evidence: evidenceRecords
    };
}

function buildPlanPriceMap(platform) {
    const map = new Map();
    (platform.pricing || []).forEach(tier => {
        map.set(tier.plan, tierToSlug(normalizePrice(tier.price, tier.plan)));
    });
    return map;
}

function availablePriceSlugs(feature, planPriceMap) {
    return [...new Set((feature.availability || [])
        .filter(a => a.available.includes('✅') || a.available.includes('⚠️'))
        .map(a => planPriceMap.get(a.plan))
        .filter(Boolean))].join('_');
}

function availableSurfaceSlugs(feature) {
    return (feature.platforms || [])
        .filter(pl => pl.available.includes('✅') || pl.available.includes('⚠️'))
        .map(pl => pl.platform.toLowerCase())
        .join('_');
}

function renderFeaturePlatformsRow(feature) {
    const platformOrder = ['Windows', 'macOS', 'Linux', 'iOS', 'Android', 'Chrome', 'web', 'terminal', 'API'];
    const platformMap = new Map((feature.platforms || []).map(pl => [pl.platform.toLowerCase(), pl]));

    return platformOrder.map(plat => {
        const pl = platformMap.get(plat.toLowerCase());
        let cls = 'no';
        if (pl) {
            if (pl.available.includes('✅')) cls = 'yes';
            else if (pl.available.includes('🔜')) cls = 'soon';
            else if (pl.available.includes('⚠️')) cls = 'partial';
        }
        return `<span class="plat-icon ${cls}" title="${plat}">${plat}</span>`;
    }).join('');
}

function renderSurfaceRow(surfaces) {
    const surfaceOrder = ['web', 'desktop', 'mobile', 'terminal', 'api', 'browser', 'excel', 'word'];
    const surfaceSet = new Set((surfaces || []).map(s => s.toLowerCase()));
    return surfaceOrder.map(surface => {
        const cls = surfaceSet.has(surface) ? 'yes' : 'no';
        return `<span class="plat-icon ${cls}" title="${humanizeId(surface)}">${humanizeId(surface)}</span>`;
    }).join('');
}

function renderFeatureCard(feature, platform, planPriceMap, options = {}) {
    const featureId = options.id || featureCardId(platform.name, feature.name);
    const dataCategory = options.dataCategory ?? feature.category ?? '';
    const availablePrices = options.availablePrices ?? availablePriceSlugs(feature, planPriceMap);
    const availableSurfaces = options.availableSurfaces ?? availableSurfaceSlugs(feature);
    const title = options.title || feature.name;
    const url = options.url || feature.url;
    const talkingPoint = options.talkingPoint || feature.talking_point;
    const supplemental = options.supplemental || '';
    const notes = options.notes || feature.notes;
    const badges = options.badges || `${availabilityBadge(feature.status)}${gatingBadge(feature.gating)}`;

    return `
                <div class="feature-card" id="${featureId}" data-category="${escapeHTML(dataCategory)}" data-prices="${escapeHTML(availablePrices)}" data-surfaces="${escapeHTML(availableSurfaces)}">
                    <div class="card-main">
                        <div class="feature-header">
                            <h3>${url ? `<a href="${url}" target="_blank" class="feature-link">${escapeHTML(title)}</a>` : escapeHTML(title)}</h3>
                            <span class="badges"><button class="permalink-btn" onclick="copyPermalink('${featureId}')" title="Copy link to this feature" aria-label="Copy permalink">🔗</button>${badges}</span>
                        </div>
                        <div class="avail-grid">
                            ${(feature.availability || []).map(a => {
        const hasTooltip = a.limits || a.notes;
        const tooltipText = [a.limits, a.notes].filter(Boolean).join(' • ').replace(/"/g, '&quot;');
        return `
                            <div class="avail-item">
                                <span class="plan${hasTooltip ? ' has-tooltip' : ''}"${hasTooltip ? ' tabindex="0"' : ''}>${escapeHTML(a.plan)}${hasTooltip ? `<span class="plan-tooltip">${tooltipText}</span>` : ''}</span>
                                <span class="status">${availBadge(a.available)}</span>
                            </div>`;
    }).join('')}
                        </div>
                        ${talkingPoint ? `<div class="talking-point" role="button" tabindex="0" aria-label="Click to copy talking point" onclick="copyTalkingPoint(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();copyTalkingPoint(this)}">${talkingPoint.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')}${notes ? `<span class="notes-tooltip" tabindex="0" aria-label="Additional notes" onclick="event.stopPropagation()"><span class="notes-icon">ℹ️</span><span class="notes-content">${escapeHTML(notes)}</span></span><span class="notes-text" hidden>${escapeHTML(notes)}</span>` : ''}</div>` : ''}
                        ${supplemental}
                    </div>
                    <div class="surface-column">
                        ${options.platformsRow || renderFeaturePlatformsRow(feature)}
                        <div class="surface-dates">
                            ${renderDateBadges({
        launched: feature.launched,
        verified: feature.verified,
        checked: feature.checked,
        featureId
    })}
                        </div>
                    </div>
                </div>`;
}

function renderRuntimeProductCard(product) {
    const sourceFeature = product.source?.feature;
    if (!sourceFeature) return '';
    const evidence = product.evidence || null;

    const feature = {
        ...sourceFeature,
        name: product.name,
        url: product.pricing_page || product.url || sourceFeature.url,
        talking_point: product.summary,
        notes: sourceFeature.notes || '',
        launched: evidence?.launched || sourceFeature.launched,
        verified: evidence?.verified || product.last_verified || sourceFeature.verified,
        checked: evidence?.checked || sourceFeature.checked
    };
    const defaultSurfaces = Array.isArray(product.default_surfaces) ? product.default_surfaces : [];
    const platformsRow = renderSurfaceRow(defaultSurfaces);
    const availableSurfaces = defaultSurfaces.map(surface => slugify(surface)).join('_');

    const supplemental = defaultSurfaces.length
        ? `<div class="capability-tags">${defaultSurfaces.map(surface => `<span class="provider-toggle active">${escapeHTML(humanizeId(surface))}</span>`).join('')}</div>`
        : '';

    return renderFeatureCard(feature, { name: 'runtime-products' }, new Map([['Self-hosted', '0']]), {
        id: `runtime-${product.id}`,
        title: product.name,
        dataCategory: '',
        availablePrices: '0',
        availableSurfaces,
        badges: `${availabilityBadge('ga')}<span class="badge gate-free">Runtime</span>`,
        platformsRow,
        supplemental
    });
}

function renderModelAccessCard(record) {
    const sourceFeature = record.source?.feature;
    const sourcePlatform = record.source?.platform;
    if (!sourceFeature || !sourcePlatform) return '';
    const evidence = record.evidence || null;

    const planPriceMap = buildPlanPriceMap(sourcePlatform);
    const runtimeTags = (record.common_runtimes || []).map(runtime => `<span class="provider-toggle active">${escapeHTML(runtime)}</span>`).join('');
    const notesParts = [];
    if (record.constraints?.length) notesParts.push(record.constraints[0]);
    if (sourceFeature.notes) notesParts.push(sourceFeature.notes);

    return renderFeatureCard({
        ...sourceFeature,
        launched: evidence?.launched || sourceFeature.launched,
        verified: evidence?.verified || sourceFeature.verified,
        checked: evidence?.checked || sourceFeature.checked
    }, sourcePlatform, planPriceMap, {
        title: record.name,
        supplemental: runtimeTags ? `<div class="capability-tags">${runtimeTags}</div>` : '',
        notes: notesParts.join(' ').trim()
    });
}

function buildOntologyProviderGroups(ontologyData) {
    const groups = new Map();

    const ensureGroup = (providerId, providerRecord) => {
        if (!groups.has(providerId)) {
            groups.set(providerId, {
                provider_id: providerId,
                provider_record: providerRecord || null,
                runtime_products: [],
                model_access: []
            });
        }
        return groups.get(providerId);
    };

    (ontologyData.runtime_products || []).forEach(product => {
        const group = ensureGroup(product.provider, product.provider_record);
        group.runtime_products.push(product);
    });

    (ontologyData.model_access || []).forEach(record => {
        const group = ensureGroup(record.provider, record.provider_record);
        group.model_access.push(record);
    });

    return [...groups.values()];
}

function renderOntologyProviderSections(ontologyData) {
    const groups = buildOntologyProviderGroups(ontologyData).sort((a, b) => {
        const aName = providerDisplayName(a.provider_record, a.provider_id);
        const bName = providerDisplayName(b.provider_record, b.provider_id);
        return aName.localeCompare(bName);
    });
    if (!groups.length) return '';

    return groups.map(group => {
        const providerName = providerDisplayName(group.provider_record, group.provider_id);
        const vendorSlug = slugify(providerName);
        const runtimeCards = group.runtime_products.map(renderRuntimeProductCard).filter(Boolean).join('');
        const modelAccessCards = group.model_access.map(renderModelAccessCard).filter(Boolean).join('');
        if (!runtimeCards && !modelAccessCards) return '';
        const verified = latestDate([
            ...group.runtime_products.map(product => product.evidence?.verified || product.last_verified || ''),
            ...group.model_access.map(record => record.evidence?.verified || record.last_verified || '')
        ]);
        const metaBits = [];
        if (group.model_access.length) {
            metaBits.push(`${group.model_access.length} model access record${group.model_access.length === 1 ? '' : 's'}`);
        }
        if (group.runtime_products.length) {
            metaBits.push(`${group.runtime_products.length} runtime product${group.runtime_products.length === 1 ? '' : 's'}`);
        }
        if (verified) {
            metaBits.push(`Verified: ${verified}`);
        }
        const priceBar = group.runtime_products.length && !group.model_access.length
            ? `<span class="price-tag"><strong>Runtime products</strong>: local tools and serving environments</span>`
            : `<span class="price-tag"><strong>Self-hosted</strong>: $0 plus your hardware</span>`;
        const sectionTitle = group.runtime_products.length && !group.model_access.length
            ? `${providerName} Runtime`
            : providerName;

        return `
        <section class="platform-section" data-platform="${vendorSlug}-ontology" data-vendor="${vendorSlug}">
            <div class="platform-header">
                <h2>${group.provider_record?.logo ? `<img src="${escapeHTML(group.provider_record.logo)}" alt="${escapeHTML(providerName)}" class="platform-logo">` : ''}${escapeHTML(sectionTitle)}</h2>
                <div class="platform-meta">
                    <span>${metaBits.join(' · ')}</span>
                </div>
            </div>
            <div class="pricing-bar">
                ${priceBar}
            </div>
            <div class="features-grid">
${runtimeCards}${runtimeCards && modelAccessCards ? '\n' : ''}${modelAccessCards}
            </div>
        </section>`;
    }).join('\n');
}

/**
 * Render shared site navigation bar for all pages.
 * @param {string} activePage - Current page identifier: 'home', 'implementations', 'constraints', 'about'
 * @returns {string} HTML header element
 */
function renderSiteNav(activePage, prefix) {
    prefix = prefix || '';
    const navItems = [
        { id: 'home', label: 'Capabilities', href: `${prefix}index.html` },
        { id: 'implementations', label: 'Features', href: `${prefix}implementations.html` },
        { id: 'compare', label: 'Compare', href: `${prefix}compare.html` },
        { id: 'changes', label: 'Changes', href: `${prefix}changes/` },
        { id: 'constraints', label: 'Limits', href: `${prefix}constraints.html` },
        { id: 'timeline', label: 'Timeline', href: `${prefix}timeline.html` },
        { id: 'about', label: 'About', href: `${prefix}about.html` }
    ];

    return `<header class="site-header">
        <h1><a href="${prefix}index.html" onclick="passTheme(this)" style="color: inherit; text-decoration: none;"><img src="${prefix}assets/favicon-32.png" alt="" class="header-logo" width="28" height="28" aria-hidden="true"> AI Tool Watch</a></h1>
        <button class="hamburger-btn" onclick="toggleMobileMenu()" aria-label="Toggle menu" aria-expanded="false" aria-controls="siteNav">
            <span class="hamburger-icon"></span>
        </button>
        <nav class="site-nav" id="siteNav" aria-label="Main navigation">
            ${navItems.map(item =>
                `<a href="${item.href}" class="site-nav-link${item.id === activePage ? ' active' : ''}" onclick="passTheme(this)">${item.label}</a>`
            ).join('\n            ')}
        </nav>
        <div class="header-actions">
            <div class="site-search" role="combobox" aria-expanded="false" aria-haspopup="listbox" aria-owns="searchResults">
                <input type="search" id="siteSearchInput" class="search-input" placeholder="Search features..." aria-label="Search features" aria-autocomplete="list" aria-controls="searchResults" autocomplete="off">
                <ul id="searchResults" class="search-results" role="listbox" hidden></ul>
            </div>
            <button class="theme-toggle" onclick="toggleTheme()" title="Toggle light/dark mode">🌓</button>
        </div>
    </header>`;
}

function renderSharedFooter() {
    return `<footer>
            <p>
                Maintained by <a href="https://github.com/snapsynapse">SnapSynapse</a>, with public issues and pull requests welcome.
                <a href="${REPO_ISSUES_URL}">Open an issue</a> or
                <a href="${REPO_PULLS_URL}">submit a PR</a>.
            </p>
            <p style="margin-top: 8px;">
                &copy; 2026 <a href="https://paice.work/">PAICE.work PBC</a> | via <a href="https://docs.anthropic.com/en/docs/claude-code/overview">Claude Code</a> | 🤓+🤖 | No trackers here, you're welcome.
            </p>
            <p style="margin-top: 12px; display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 8px;">
                <a href="${REPO_URL}" class="footer-social" title="Star on GitHub">⭐ Star</a>
                <a href="https://paice.substack.com/" class="footer-social" title="Subscribe on Substack"><img src="https://substack.com/favicon.ico" alt="" width="14" height="14" style="vertical-align: middle; margin-right: 4px;">Substack</a>
                <a href="https://www.linkedin.com/in/samrogers/" class="footer-social" title="Connect on LinkedIn"><img src="https://www.linkedin.com/favicon.ico" alt="" width="14" height="14" style="vertical-align: middle; margin-right: 4px;">LinkedIn</a>
                <a href="https://everyailaw.com/" class="footer-social" title="Every AI Law">Every AI Law</a>
                <a href="https://www.w3.org/WAI/WCAG2AA-Conformance" title="Explanation of WCAG 2 Level AA conformance"><img height="32" width="88" src="https://www.w3.org/WAI/WCAG21/wcag2.1AA-blue-v" alt="Level AA conformance, W3C WAI Web Content Accessibility Guidelines 2.1"></a>
            </p>
        </footer>`;
}

function renderThemeScript() {
    return `<script>
        function toggleTheme() {
            document.documentElement.classList.toggle('light-mode');
            const isLight = document.documentElement.classList.contains('light-mode');
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
        }

        function toggleMobileMenu() {
            const btn = document.querySelector('.hamburger-btn');
            const menu = document.getElementById('siteNav');
            const isOpen = menu.classList.toggle('open');
            btn.classList.toggle('active', isOpen);
            btn.setAttribute('aria-expanded', isOpen);
        }

        document.addEventListener('click', function(e) {
            const menu = document.getElementById('siteNav');
            const btn = document.querySelector('.hamburger-btn');
            if (menu && btn && menu.classList.contains('open')) {
                if (!menu.contains(e.target) && !btn.contains(e.target)) {
                    menu.classList.remove('open');
                    btn.classList.remove('active');
                    btn.setAttribute('aria-expanded', 'false');
                }
            }
        });

        function passTheme(link) {
            const isLight = document.documentElement.classList.contains('light-mode');
            if (isLight) {
                const url = new URL(link.href, window.location.href);
                url.searchParams.set('theme', 'light');
                link.href = url.pathname.split('/').pop() + url.search + url.hash;
            }
        }

        // Back to top button
        (function() {
            var btn = document.createElement('button');
            btn.className = 'back-to-top';
            btn.setAttribute('aria-label', 'Back to top');
            btn.textContent = '\\u2191';
            document.body.appendChild(btn);
            window.addEventListener('scroll', function() {
                btn.classList.toggle('visible', window.scrollY > 400);
            });
            btn.addEventListener('click', function() {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        })();
    </script>`;
}

function renderThemeInit() {
    return `<script>
        (function() {
            var params = new URLSearchParams(window.location.search);
            var urlTheme = params.get('theme');
            var storedTheme = localStorage.getItem('theme');
            if (urlTheme === 'light' || storedTheme === 'light') {
                document.documentElement.classList.add('light-mode');
                localStorage.setItem('theme', 'light');
            }
        })();
    </script>`;
}

/**
 * Generate the complete HTML dashboard from parsed platform data.
 * Produces a single-page app with filters, feature cards, and embedded JavaScript.
 * @param {Array<Object>} platforms - Array of parsed platform objects from parsePlatform()
 * @returns {string} Complete HTML document as a string
 */
function generateHTML(platforms, ontologyData) {
    const now = new Date().toISOString().split('T')[0];
    const hostedPlatforms = platforms.filter(isPublicPlatform);
    const ontologyProviderGroups = buildOntologyProviderGroups(ontologyData);
    const ontologySourceFiles = new Set([
        ...ontologyData.runtime_products.map(product => product.record_source).filter(Boolean),
        ...ontologyData.model_access.map(record => record.record_source).filter(Boolean)
    ]);
    const changelogPlatforms = platforms.filter(platform => (
        isPublicPlatform(platform) || ontologySourceFiles.has(platform.source_file)
    ));
    const customOntologyCardCount = (ontologyData?.runtime_products?.length || 0) + (ontologyData?.model_access?.length || 0);
    const totalCards = hostedPlatforms.reduce((sum, p) => sum + p.features.length, 0) + customOntologyCardCount;
    const activeOntologyGroups = ontologyProviderGroups.filter(group =>
        group.runtime_products.some(p => p.source?.feature) ||
        group.model_access.some(r => r.source?.feature)
    );
    const vendors = [...new Set([
        ...hostedPlatforms.map(platform => platform.vendor),
        ...activeOntologyGroups.map(group => providerDisplayName(group.provider_record, group.provider_id))
    ])];

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${DASHBOARD_TITLE} - ${FEATURE_VIEW_TITLE}</title>
    <meta name="description" content="Detailed plan-by-plan availability for AI features across ChatGPT, Claude, Gemini, Copilot, and more.">
    <meta name="theme-color" content="#1a1a2e">
    <link rel="canonical" href="${SITE_URL}implementations.html">

    <link rel="icon" type="image/png" sizes="56x56" href="assets/favicon-56.png">
    <link rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="assets/favicon-16.png">
    <link rel="apple-touch-icon" sizes="180x180" href="assets/apple-touch-icon.png">
    <link rel="alternate" type="application/rss+xml" title="${DASHBOARD_TITLE}" href="${SITE_URL}index.xml">

    <meta property="og:type" content="website">
    <meta property="og:title" content="${DASHBOARD_TITLE} - ${FEATURE_VIEW_TITLE}">
    <meta property="og:description" content="Detailed plan-by-plan availability for AI features across ChatGPT, Claude, Gemini, Copilot, and more.">
    <meta property="og:image" content="${SITE_URL}imgs/og.png">
    <meta property="og:url" content="${SITE_URL}implementations.html">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${DASHBOARD_TITLE} - ${FEATURE_VIEW_TITLE}">
    <meta name="twitter:description" content="Detailed plan-by-plan availability for AI features across ChatGPT, Claude, Gemini, Copilot, and more.">
    <meta name="twitter:image" content="${SITE_URL}imgs/og.png">

    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": "https://paice.work/#organization",
          "name": "PAICE.work",
          "url": "https://paice.work/"
        },
        {
          "@type": "WebPage",
          "@id": "${SITE_URL}implementations.html#webpage",
          "url": "${SITE_URL}implementations.html",
          "name": "${DASHBOARD_TITLE} - ${FEATURE_VIEW_TITLE}",
          "description": "Detailed plan-by-plan availability for AI features across ChatGPT, Claude, Gemini, Copilot, and more.",
          "isPartOf": { "@id": "${SITE_URL}#website" },
          "publisher": { "@id": "https://paice.work/#organization" },
          "about": {
            "@type": "Thing",
            "name": "AI feature availability by subscription plan"
          }
        }
      ]
    }
    </script>

    <link rel="stylesheet" href="assets/styles.css">
    ${renderThemeInit()}
</head>
<body>
    <a href="#main-content" class="skip-link">Skip to main content</a>
    ${renderSiteNav('implementations')}
    <div class="container" id="main-content">
        <div class="page-intro">
            <span class="feature-count" id="featureCount" aria-live="polite" aria-atomic="true">Showing <strong>${totalCards}</strong> of <strong>${totalCards}</strong></span>
            <span class="last-updated">Last built: ${now}</span>
        </div>


        <div class="filters">
            <div class="filter-dropdowns">
                <div class="filter-group">
                    <label>Provider:</label>
                    <select id="providerFilter" onchange="filterProviders()">
                        <option value="">All</option>
                        ${(() => {
            const vendorOrder = ['OpenAI', 'Microsoft', 'Google', 'Anthropic', 'Perplexity AI', 'xAI', 'Meta', 'Mistral', 'DeepSeek', 'Alibaba', 'Ollama', 'LM Studio', 'Oobabooga'];
            vendors.sort((a, b) => {
                const aIdx = vendorOrder.indexOf(a);
                const bIdx = vendorOrder.indexOf(b);
                if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
                const aPos = aIdx === -1 ? 100 : aIdx;
                const bPos = bIdx === -1 ? 100 : bIdx;
                return aPos - bPos || a.localeCompare(b);
            });
            return vendors.map(vendor => {
                const vendorSlug = slugify(vendor);
                return `<option value="${vendorSlug}">${vendor}</option>`;
            }).join('\n                        ');
        })()}
                    </select>
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
                    <label>Price:</label>
                    <select id="tierFilter" onchange="filterFeatures()">
                        <option value="">All</option>
                        ${(() => {
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
                if (p === 'Free') return 0;
                if (p === 'Team') return 9998;
                if (p === 'Enterprise') return 9999;
                // Extract first numeric value for sorting
                const match = p.match(/\$(\d+)/);
                return match ? parseInt(match[1]) : 5000;
            };

            const prices = [...allPrices].sort((a, b) => priceOrder(a) - priceOrder(b));

            return prices.map(price => `<option value="${tierToSlug(price)}">${price}</option>`).join('\n                        ');
        })()}
                    </select>
                </div>
                <div class="filter-group">
                    <label>Surface:</label>
                    <select id="surfaceFilter" onchange="filterFeatures()">
                        <option value="">All</option>
                        <option value="windows">Windows</option>
                        <option value="macos">macOS</option>
                        <option value="linux">Linux</option>
                        <option value="ios">iOS</option>
                        <option value="android">Android</option>
                        <option value="chrome">Chrome</option>
                        <option value="web">Web</option>
                        <option value="terminal">Terminal</option>
                        <option value="api">API</option>
                    </select>
                </div>
                <a href="definitions.html" class="definitions-link" onclick="passTheme(this)">ℹ️ What's this mean?</a>
            </div>
        </div>

        ${(() => {
            // Sort platforms by vendor order (same as header toggles)
            const vendorOrder = ['OpenAI', 'Microsoft', 'Google', 'Anthropic', 'Perplexity AI', 'xAI'];
            const sortedPlatforms = [...hostedPlatforms].sort((a, b) => {
                const aIdx = vendorOrder.indexOf(a.vendor);
                const bIdx = vendorOrder.indexOf(b.vendor);
                const aPos = aIdx === -1 ? 100 : aIdx;
                const bPos = bIdx === -1 ? 100 : bIdx;
                return aPos - bPos;
            });
            return sortedPlatforms.map(p => {
                const vendorSlug = slugify(p.vendor);
                // Build price lookup for this platform
                const planPriceMap = buildPlanPriceMap(p);
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
                ${p.features.map(f => renderFeatureCard(f, p, planPriceMap)).join('')}
            </div>
        </section>`;
            }).join('\n') + renderOntologyProviderSections(ontologyData);
        })()}

        ${renderSharedFooter()}
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
            ${changelogPlatforms.flatMap(p => p.features.map(f => {
            const id = featureCardId(p.name, f.name);
            const changes = (f.changelog || []).map(c => `{ date: "${c.date || ''}", change: "${(c.change || '').replace(/"/g, '\\"')}" }`).join(',\n                ');
            return `"${id}": {
                name: "${f.name}",
                platform: "${p.name}",
                launched: "${f.launched || ''}",
                verified: "${f.verified || ''}",
                checked: "${f.checked || ''}",
                changes: [${changes}]
            }`;
        })).concat((ontologyData?.runtime_products || []).map(product => {
            const sourceFeature = product.source?.feature;
            const evidence = product.evidence || null;
            if (!sourceFeature && !evidence) return null;
            const changes = ((evidence?.changelog || sourceFeature?.changelog) || []).map(c => `{ date: "${c.date || ''}", change: "${(c.change || '').replace(/"/g, '\\"')}" }`).join(',\n                ');
            const runtimeLabel = `${providerDisplayName(product.provider_record, product.provider)} Runtime`;
            return `"runtime-${product.id}": {
                name: "${product.name}",
                platform: "${runtimeLabel}",
                launched: "${evidence?.launched || sourceFeature?.launched || ''}",
                verified: "${evidence?.verified || product.last_verified || sourceFeature?.verified || ''}",
                checked: "${evidence?.checked || sourceFeature?.checked || ''}",
                changes: [${changes}]
            }`;
        }).filter(Boolean)).join(',\n            ')}
        };
    </script>

    <script>
        const TOTAL_FEATURES = ${totalCards};

        function copyTalkingPoint(el) {
            const notesEl = el.querySelector('.notes-text');
            let text = el.childNodes[0].textContent;
            // Walk text nodes and strong elements before the notes tooltip
            const parts = [];
            for (const node of el.childNodes) {
                if (node.classList && (node.classList.contains('notes-tooltip') || node.classList.contains('notes-text'))) break;
                parts.push(node.textContent);
            }
            text = parts.join('').trim();
            if (notesEl) text += ' | Note: ' + notesEl.textContent;
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
                    const providerSelect = document.getElementById('providerFilter');
                    if (providerSelect.value !== '' && providerSelect.value !== vendor) {
                        providerSelect.value = vendor;
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
            const surfaceSelect = document.getElementById('surfaceFilter');
            const category = categorySelect.value;
            const price = tierSelect.value;
            const surface = surfaceSelect.value;

            // Highlight active filters
            const providerSelect = document.getElementById('providerFilter');
            providerSelect.classList.toggle('active', providerSelect.value !== '');
            categorySelect.classList.toggle('active', category !== '');
            tierSelect.classList.toggle('active', price !== '');
            surfaceSelect.classList.toggle('active', surface !== '');

            document.querySelectorAll('.feature-card').forEach(card => {
                let show = true;
                if (category && card.dataset.category !== category) show = false;
                if (price) {
                    const prices = card.dataset.prices ? card.dataset.prices.split('_') : [];
                    if (!prices.includes(price)) show = false;
                }
                if (surface) {
                    const surfaces = card.dataset.surfaces ? card.dataset.surfaces.split('_') : [];
                    if (!surfaces.includes(surface)) show = false;
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

        // Provider filter functionality
        function initFromURL() {
            const params = new URLSearchParams(window.location.search);
            const pParam = params.get('p');

            if (pParam) {
                document.getElementById('providerFilter').value = pParam;
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

            // Restore surface filter from URL
            const surfaceParam = params.get('surface');
            if (surfaceParam) {
                document.getElementById('surfaceFilter').value = surfaceParam;
            }

            filterProviders(true);
            filterFeatures(true);  // Skip URL update during init
        }

        function filterProviders(skipURLUpdate) {
            const selected = document.getElementById('providerFilter').value;
            document.querySelectorAll('.platform-section').forEach(section => {
                const vendor = section.dataset.vendor;
                section.style.display = (!selected || vendor === selected) ? '' : 'none';
            });
            updateFeatureCount();
            if (!skipURLUpdate) updateURL();
        }

        function updateURL() {
            const url = new URL(window.location);

            // Provider filter
            const provider = document.getElementById('providerFilter').value;
            if (provider) {
                url.searchParams.set('p', provider);
            } else {
                url.searchParams.delete('p');
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

            // Surface filter
            const surface = document.getElementById('surfaceFilter').value;
            if (surface) {
                url.searchParams.set('surface', surface);
            } else {
                url.searchParams.delete('surface');
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

        // Keep tooltips within the viewport
        document.addEventListener('mouseenter', function(e) {
            const tip = e.target.closest('.notes-tooltip');
            if (!tip) return;
            const content = tip.querySelector('.notes-content');
            if (!content) return;
            content.style.right = '';
            content.style.left = '';
            content.style.bottom = '';
            content.style.top = '';
            const rect = content.getBoundingClientRect();
            if (rect.left < 8) {
                content.style.right = 'auto';
                content.style.left = '0';
            }
            if (rect.top < 8) {
                content.style.bottom = 'auto';
                content.style.top = 'calc(100% + 6px)';
            }
        }, true);
        document.addEventListener('mouseleave', function(e) {
            const tip = e.target.closest('.notes-tooltip');
            if (!tip) return;
            const content = tip.querySelector('.notes-content');
            if (!content) return;
            content.style.right = '';
            content.style.left = '';
            content.style.bottom = '';
            content.style.top = '';
        }, true);
    </script>
    <script src="assets/search.js"></script>
    <script src="assets/export.js"></script>
    ${renderThemeScript()}
</body>
</html>`;
}

function generateCapabilitiesHTML(ontologyData) {
    const now = new Date().toISOString().split('T')[0];
    const groupLabels = {
        understand: 'Understand',
        respond: 'Respond',
        create: 'Create',
        'work-with-my-stuff': 'Work With My Stuff',
        'act-for-me': 'Act for Me',
        connect: 'Connect',
        'access-context': 'Access Context'
    };
    const capabilityEmojis = {
        'hear-audio-and-speech': '👂',
        'see-images-and-screens': '👁️',
        'read-text-and-documents': '📄',
        'write-and-explain': '✍️',
        'speak-back-in-real-time': '🗣️',
        'make-and-edit-documents': '📝',
        'write-and-edit-code': '💻',
        'generate-images': '🖼️',
        'generate-video': '🎬',
        'use-files-i-provide': '📎',
        'organize-work-in-projects': '📂',
        'search-the-web': '🔍',
        'do-multi-step-research': '🔭',
        'take-actions-and-run-tools': '⚡',
        'build-reusable-ai-workflows': '🔧',
        'connect-to-external-systems': '🔌',
        'remember-context-over-time': '🧠',
        'use-it-on-my-surfaces': '📱'
    };
    const groupedCapabilities = ontologyData.capabilities.reduce((acc, capability) => {
        if (!acc[capability.group]) acc[capability.group] = [];
        acc[capability.group].push(capability);
        return acc;
    }, {});
    const groupOrder = Object.keys(groupLabels).filter(group => groupedCapabilities[group]?.length);

    // Compute constraint summaries for each capability
    function capabilityConstraintSummary(capability) {
        const impls = capability.implementations || [];

        // Count distinct products (not implementations) for the badge
        const productGating = new Map(); // product → has a free impl?
        impls.forEach(item => {
            const pid = item.product;
            const isFree = item.source?.feature?.gating === 'free';
            if (!productGating.has(pid) || isFree) productGating.set(pid, isFree);
        });
        const totalCount = productGating.size;
        const freeCount = [...productGating.values()].filter(Boolean).length;

        // Collect all surfaces across implementations
        const surfaceCounts = {};
        impls.forEach(item => {
            const platforms = item.source?.feature?.platforms || [];
            platforms.forEach(pl => {
                if (pl.available.includes('✅') || pl.available.includes('⚠️')) {
                    const name = pl.platform.toLowerCase();
                    surfaceCounts[name] = (surfaceCounts[name] || 0) + 1;
                }
            });
        });

        // Check for region-limited implementations
        const hasRegionLimits = impls.some(item => {
            const regional = item.source?.feature?.regional || '';
            return regional && !regional.toLowerCase().includes('available globally') && !regional.toLowerCase().includes('no known');
        });

        // Find oldest checked date across implementations
        const checkedDates = impls
            .map(item => item.evidence?.checked || item.source?.feature?.checked || '')
            .filter(Boolean)
            .sort();
        const oldestChecked = checkedDates[0] || '';

        // Build surface badges
        const surfaceBadges = [];
        const allSurfaces = ['web', 'windows', 'macos', 'linux', 'ios', 'android', 'terminal', 'api'];
        const missingSurfaces = allSurfaces.filter(s => !surfaceCounts[s]);

        if (totalCount > 0) {
            if (!surfaceCounts['terminal']) surfaceBadges.push('No terminal');
            if (!surfaceCounts['linux']) surfaceBadges.push('No Linux');
            if (!surfaceCounts['api'] && totalCount >= 3) surfaceBadges.push('No API');
            if (surfaceCounts['ios'] && surfaceCounts['android'] && !surfaceCounts['web'] && !surfaceCounts['windows'] && !surfaceCounts['macos']) {
                surfaceBadges.length = 0;
                surfaceBadges.push('Mobile only');
            }
        }

        return { freeCount, totalCount, surfaceBadges, hasRegionLimits, oldestChecked };
    }

    const totalImpls = ontologyData.implementations.filter(item => item.capabilities.length > 0).length;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Tool Watch</title>
    <meta name="description" content="A maintained reference for AI capability availability across plans, platforms, and access tiers. Compare ChatGPT, Claude, Gemini, Copilot, and more.">
    <meta name="theme-color" content="#1a1a2e">
    <link rel="canonical" href="${SITE_URL}">

    <link rel="icon" type="image/png" sizes="56x56" href="assets/favicon-56.png">
    <link rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="assets/favicon-16.png">
    <link rel="apple-touch-icon" sizes="180x180" href="assets/apple-touch-icon.png">
    <link rel="alternate" type="application/rss+xml" title="${DASHBOARD_TITLE}" href="${SITE_URL}index.xml">

    <meta property="og:type" content="website">
    <meta property="og:title" content="AI Tool Watch">
    <meta property="og:description" content="A maintained reference for AI capability availability across plans, platforms, and access tiers.">
    <meta property="og:image" content="${SITE_URL}imgs/og.png">
    <meta property="og:url" content="${SITE_URL}">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="AI Tool Watch">
    <meta name="twitter:description" content="A maintained reference for AI capability availability across plans, platforms, and access tiers.">
    <meta name="twitter:image" content="${SITE_URL}imgs/og.png">

    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": "https://paice.work/#organization",
          "name": "PAICE.work",
          "url": "https://paice.work/"
        },
        {
          "@type": "WebSite",
          "@id": "${SITE_URL}#website",
          "url": "${SITE_URL}",
          "name": "AI Tool Watch",
          "description": "A maintained reference for AI capability availability across plans, platforms, and access tiers.",
          "publisher": { "@id": "https://paice.work/#organization" }
        },
        {
          "@type": "WebPage",
          "@id": "${SITE_URL}#webpage",
          "url": "${SITE_URL}",
          "name": "AI Tool Watch",
          "description": "A maintained reference for AI capability availability across plans, platforms, and access tiers. Compare ChatGPT, Claude, Gemini, Copilot, and more.",
          "isPartOf": { "@id": "${SITE_URL}#website" },
          "about": {
            "@type": "Thing",
            "name": "AI product capabilities and plan availability"
          }
        }
      ]
    }
    </script>

    <link rel="stylesheet" href="assets/styles.css">
    ${renderThemeInit()}
</head>
<body>
    <a href="#main-content" class="skip-link">Skip to main content</a>
    ${renderSiteNav('home')}

    <div class="container capability-page" id="main-content">
        <div class="hero-onboarding">
            <h2 class="hero-tagline">What can this AI actually do?</h2>
            <p class="hero-subtitle">A plain-English reference for AI capabilities, plans, constraints, and implementations.</p>
            <ol class="hero-steps">
                <li>
                    <strong>Pick a capability</strong>
                    <span>Learn what AI can do today: understand, create, act for me, and more.</span>
                </li>
                <li>
                    <strong>Check your plan</strong>
                    <span>See which subscription tier unlocks it.</span>
                </li>
                <li>
                    <strong>Get the real answer</strong>
                    <span>Find the limits, caveats, and platform support you need. Ditch the hype that you don't.</span>
                </li>
            </ol>
        </div>

        <!-- Discovery hub: quick links to high-value pages -->
        <nav class="discovery-hub" aria-label="Quick access to key pages">
            <div class="discovery-hub-row">
                <a href="compare/chatgpt-vs-claude/" class="discovery-hub-link" onclick="passTheme(this)">
                    <span class="discovery-hub-icon">⚖️</span>
                    <span class="discovery-hub-label">ChatGPT vs Claude</span>
                </a>
                <a href="compare/chatgpt-vs-gemini/" class="discovery-hub-link" onclick="passTheme(this)">
                    <span class="discovery-hub-icon">⚖️</span>
                    <span class="discovery-hub-label">ChatGPT vs Gemini</span>
                </a>
                <a href="coverage/free-tools/" class="discovery-hub-link" onclick="passTheme(this)">
                    <span class="discovery-hub-icon">🆓</span>
                    <span class="discovery-hub-label">Free AI Tools</span>
                </a>
                <a href="coverage/coding-tools/" class="discovery-hub-link" onclick="passTheme(this)">
                    <span class="discovery-hub-icon">💻</span>
                    <span class="discovery-hub-label">AI Coding Tools</span>
                </a>
                <a href="changes/" class="discovery-hub-link" onclick="passTheme(this)">
                    <span class="discovery-hub-icon">📋</span>
                    <span class="discovery-hub-label">Recent Changes</span>
                </a>
                <a href="compare.html" class="discovery-hub-link" onclick="passTheme(this)">
                    <span class="discovery-hub-icon">🔀</span>
                    <span class="discovery-hub-label">Compare All</span>
                </a>
            </div>
        </nav>

        <div class="filter-bar">
            <nav class="capability-nav" aria-label="Capability groups">
                ${groupOrder.map(group => `<a href="#group-${group}" class="provider-toggle active">${groupLabels[group]}</a>`).join('')}
            </nav>
            <div class="capability-stats">
                <span class="feature-count">${ontologyData.capabilities.length} capabilities</span>
                <span class="feature-count">${totalImpls} implementations</span>
                <span class="feature-count">Last built: ${now}</span>
            </div>
        </div>

        ${groupOrder.map(group => `
        <section class="capability-group" id="group-${group}">
            <div class="platform-header">
                <h2>${groupLabels[group]}</h2>
                <div class="platform-meta">
                    <span>${groupedCapabilities[group].length} ${groupedCapabilities[group].length === 1 ? 'capability' : 'capabilities'}</span>
                </div>
            </div>
            <div class="capability-grid">
                ${groupedCapabilities[group].map(capability => {
                    const cs = capabilityConstraintSummary(capability);
                    return `
                <article class="capability-card">
                    <div class="feature-header">
                        <h3>${capabilityEmojis[capability.id] ? `<span class="capability-emoji" aria-hidden="true">${capabilityEmojis[capability.id]}</span> ` : ''}${escapeHTML(capability.name)}</h3>
                        <span class="badges">
                            <span class="badge gate-free">${escapeHTML(groupLabels[group])}</span>
                        </span>
                    </div>
                    <p class="capability-summary">${escapeHTML(capability.summary)}</p>
                    <div class="constraint-badges">
                        ${cs.totalCount > 0 ? `<span class="constraint-badge ${cs.freeCount > 0 ? 'cb-free' : 'cb-paid'}">${cs.freeCount} of ${cs.totalCount} free</span>` : ''}
                        ${cs.surfaceBadges.map(badge => `<span class="constraint-badge cb-surface">${escapeHTML(badge)}</span>`).join('')}
                        ${cs.hasRegionLimits ? '<span class="constraint-badge cb-region">Region-limited</span>' : ''}
                    </div>
                    <div class="capability-columns">
                        ${capability.what_counts.length ? `
                        <div class="capability-column">
                            <h4>What Counts</h4>
                            <ul class="capability-list">
                                ${capability.what_counts.map(item => `<li>${escapeHTML(item)}</li>`).join('')}
                            </ul>
                        </div>` : ''}
                        ${capability.what_does_not_count.length ? `
                        <div class="capability-column">
                            <h4>What Does Not Count</h4>
                            <ul class="capability-list">
                                ${capability.what_does_not_count.map(item => `<li>${escapeHTML(item)}</li>`).join('')}
                            </ul>
                        </div>` : ''}
                    </div>
                    ${capability.related_terms.length ? `
                    <div class="capability-tags">
                        ${capability.related_terms.map(term => `<span class="provider-toggle active">${escapeHTML(term)}</span>`).join('')}
                    </div>` : ''}
                    ${capability.implementation_count > 0 ? `
                    <div class="capability-implementation-header" role="button" tabindex="0" aria-expanded="false" title="Click to expand" onclick="toggleImpls(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleImpls(this);}">
                        <span><strong>${capability.implementation_count}</strong> implementation${capability.implementation_count === 1 ? '' : 's'} across <strong>${capability.product_count}</strong> product${capability.product_count === 1 ? '' : 's'}</span>
                        <span class="impl-toggle-group"><span class="expand-hint">expand</span><span class="impl-chevron" aria-hidden="true">▶</span></span>
                    </div>
                    <div class="capability-implementations" hidden>
                        ${capability.implementations.map(item => {
                            const source = item.source;
                            const sourceFeature = source?.feature;
                            const sourcePlatform = source?.platform;
                            const permalink = source ? `implementations.html#${source.featureId}` : 'implementations.html';
                            const snippet = sourceFeature?.talking_point
                                ? sourceFeature.talking_point.replace(/\*\*([^*]+)\*\*/g, '$1')
                                : item.notes;

                            return `
                        <article class="capability-impl" onclick="implCardClick(event, '${permalink}')" tabindex="0" onkeydown="if(event.key==='Enter'){implCardClick(event,'${permalink}');}">
                            <div class="capability-impl-header">
                                <span class="price-tag">${escapeHTML(item.product_record?.name || humanizeId(item.product))}</span>
                                <h4><a href="${permalink}" class="feature-link" onclick="passTheme(this)">${escapeHTML(item.source_heading)}</a></h4>
                            </div>
                            <p class="capability-impl-copy">${escapeHTML(snippet || 'Mapped from the current implementation record.')}</p>
                            <div class="dates-row">
                                ${sourceFeature?.status ? availabilityBadge(sourceFeature.status) : ''}
                                ${sourceFeature?.gating ? gatingBadge(sourceFeature.gating) : ''}
                                ${renderDateBadges({
                                launched: item.evidence?.launched || sourceFeature?.launched || '',
                                verified: item.evidence?.verified || sourceFeature?.verified || sourcePlatform?.last_verified || '',
                                checked: item.evidence?.checked || sourceFeature?.checked || ''
                            })}
                            </div>
                            ${item.notes ? `<p class="capability-note">${escapeHTML(item.notes)}</p>` : ''}
                        </article>`;
                        }).join('')}
                    </div>` : ''}
                    ${capability.model_access_count ? `
                    <div class="capability-implementation-header model-access-header" role="button" tabindex="0" aria-expanded="false" title="Click to expand" onclick="toggleImpls(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleImpls(this);}">
                        <span><strong>${capability.model_access_count}</strong> relevant model access record${capability.model_access_count === 1 ? '' : 's'}</span>
                        <span class="impl-toggle-group"><span class="expand-hint">expand</span><span class="impl-chevron" aria-hidden="true">▶</span></span>
                    </div>
                    <div class="capability-implementations" hidden>
                        ${capability.model_access.map(record => {
                            const permalink = record.source ? `implementations.html#${record.source.featureId}` : 'implementations.html';
                            const runtimes = record.common_runtimes || [];
                            return `
                        <article class="capability-impl capability-impl-model-access" onclick="implCardClick(event, '${permalink}')" tabindex="0" onkeydown="if(event.key==='Enter'){implCardClick(event,'${permalink}');}">
                            <div class="capability-impl-header">
                                <span class="price-tag">${escapeHTML(record.provider_record?.name || humanizeId(record.provider))}</span>
                                <h4><a href="${permalink}" class="feature-link" onclick="passTheme(this)">${escapeHTML(record.name)}</a></h4>
                            </div>
                            <p class="capability-impl-copy">${escapeHTML(record.summary)}</p>
                            <div class="dates-row">
                                ${renderDateBadges({
                                launched: record.evidence?.launched || record.source?.feature?.launched || '',
                                verified: record.evidence?.verified || record.source?.feature?.verified || record.last_verified || '',
                                checked: record.evidence?.checked || record.source?.feature?.checked || ''
                            })}
                            </div>
                            ${runtimes.length ? `<div class="capability-tags">${runtimes.map(runtime => `<span class="provider-toggle active">${escapeHTML(runtime)}</span>`).join('')}</div>` : ''}
                            ${record.constraints.length ? `<p class="capability-note">${escapeHTML(record.constraints[0])}</p>` : ''}
                        </article>`;
                        }).join('')}
                    </div>` : ''}
                </article>`;
                }).join('')}
            </div>
        </section>`).join('\n')}

        ${renderSharedFooter()}
    </div>
    <script>
        function toggleImpls(header) {
            const impls = header.nextElementSibling;
            const willExpand = impls.hidden;
            impls.hidden = !willExpand;
            header.setAttribute('aria-expanded', willExpand);
            header.querySelector('.impl-chevron').textContent = willExpand ? '▼' : '▶';
            const hint = header.querySelector('.expand-hint');
            if (hint) hint.textContent = willExpand ? 'collapse' : 'expand';
            header.title = willExpand ? 'Click to collapse' : 'Click to expand';
        }

        function implCardClick(event, permalink) {
            if (event.target.closest('a')) return;
            const isLight = document.documentElement.classList.contains('light-mode');
            const url = new URL(permalink, window.location.href);
            if (isLight) url.searchParams.set('theme', 'light');
            window.location.href = url.pathname.split('/').pop() + url.search + url.hash;
        }
    </script>
    <script src="assets/search.js"></script>
    ${renderThemeScript()}
</body>
</html>`;
}

/**
 * Convert markdown text to simple HTML.
 * Supports headers, bold, italic, links, code, blockquotes, lists, and tables.
 * @param {string} md - Markdown text to convert
 * @returns {string} HTML representation of the markdown
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
        // Images (must come before links so ![alt](src) isn't matched as a link)
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;height:auto;border-radius:8px;">')
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
 * Generate the about page HTML from README.md.
 * Strips the "Local Development" section and applies consistent styling.
 * @returns {string} Complete HTML document for the about page
 */
function generateAboutHTML() {
    const readmePath = path.join(__dirname, '..', 'README.md');
    let readme = fs.readFileSync(readmePath, 'utf-8');

    // Remove transition note block (internal repo navigation links)
    readme = readme.replace(/Transition note:[\s\S]*?\n\n(?=\*\*)/, '');

    // Remove sections not relevant to the public about page (Automated Verification through Deployment)
    // Single greedy match avoids false termination on ## headings inside code blocks
    readme = readme.replace(/\n## Automated Verification[\s\S]*(?=\n## License)/, '');

    // Rewrite image paths from repo-root-relative (docs/assets/...) to about-page-relative (assets/...)
    readme = readme.replace(/!\[([^\]]*)\]\(docs\/([^)]+)\)/g, '![$1]($2)');

    // Rewrite relative markdown links to absolute GitHub URLs (skip images — preceded by !)
    readme = readme.replace(/(?<!!)\[([^\]]+)\]\((?!https?:\/\/|\/|#|mailto:)([^)]+)\)/g,
        (_, text, href) => `[${text}](${REPO_URL}/blob/main/${href})`
    );

    let content = markdownToHTML(readme);

    // Replace the static og-image with a clickable, theme-swapped hero pair.
    // Opposite of the main page: light hero shows in dark mode, dark hero in light mode.
    content = content.replace(
        /<img\s[^>]*src="assets\/og-image\.jpg"[^>]*>/,
        `<a href="${REPO_URL}" class="site-banner-link about-banner-link" target="_blank" rel="noopener noreferrer">` +
            `<img src="assets/hero-lightmode.jpg" alt="AI Tool Watch" class="site-banner-img about-banner-dark" width="1280" height="640">` +
            `<img src="assets/hero-darkmode.jpg" alt="AI Tool Watch" class="site-banner-img about-banner-light" width="1280" height="640" loading="lazy">` +
        `</a>`
    );

    // Remove the <hr> immediately following the banner image
    content = content.replace(/(<\/a>)\s*<hr\s*\/?>/, '$1');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>About - ${DASHBOARD_TITLE}</title>
    <meta name="description" content="About the AI Tool Watch - a plain-English resource for AI capabilities, plans, constraints, and implementations.">
    <meta name="theme-color" content="#1a1a2e">
    <link rel="canonical" href="${SITE_URL}about.html">

    <link rel="icon" type="image/png" sizes="56x56" href="assets/favicon-56.png">
    <link rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="assets/favicon-16.png">
    <link rel="apple-touch-icon" sizes="180x180" href="assets/apple-touch-icon.png">
    <link rel="alternate" type="application/rss+xml" title="${DASHBOARD_TITLE}" href="${SITE_URL}index.xml">

    <meta property="og:type" content="website">
    <meta property="og:title" content="About - ${DASHBOARD_TITLE}">
    <meta property="og:description" content="About the AI Tool Watch - a plain-English resource for AI capabilities, plans, constraints, and implementations.">
    <meta property="og:image" content="${SITE_URL}imgs/og.png">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="About - ${DASHBOARD_TITLE}">
    <meta name="twitter:description" content="About the AI Tool Watch - a plain-English resource for AI capabilities, plans, constraints, and implementations.">
    <meta name="twitter:image" content="${SITE_URL}imgs/og.png">

    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": "https://paice.work/#organization",
          "name": "PAICE.work",
          "url": "https://paice.work/"
        },
        {
          "@type": "AboutPage",
          "@id": "${SITE_URL}about.html#webpage",
          "url": "${SITE_URL}about.html",
          "name": "About - ${DASHBOARD_TITLE}",
          "description": "About the AI Tool Watch - a plain-English resource for AI capabilities, plans, constraints, and implementations.",
          "isPartOf": { "@id": "${SITE_URL}#website" },
          "publisher": { "@id": "https://paice.work/#organization" },
          "about": { "@id": "https://paice.work/#organization" }
        }
      ]
    }
    </script>

    <link rel="stylesheet" href="assets/styles.css">
    ${renderThemeInit()}
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
    ${renderSiteNav('about')}
    <div class="container" id="main-content">
        <div class="about-content">
            ${content}
        </div>

        ${renderSharedFooter()}
    </div>
    <script src="assets/search.js"></script>
    ${renderThemeScript()}
</body>
</html>`;
}

/**
 * Generate the timeline page.
 * Collects all launch dates and changelog entries into a chronological view.
 */
function generateTimelineHTML(platforms, ontologyData) {
    const today = new Date().toISOString().split('T')[0];
    const hostedPlatforms = platforms.filter(isPublicPlatform);

    // Collect all timeline events from platform features
    const events = [];
    const seen = new Set(); // de-duplicate by date+platform+feature

    for (const platform of hostedPlatforms) {
        for (const feature of platform.features) {
            const featureId = featureCardId(platform.name, feature.name);
            const launchedDate = formatDateForDisplay(feature.launched);

            // Add launch event
            if (launchedDate) {
                const key = `${launchedDate}|${featureId}|launch`;
                if (!seen.has(key)) {
                    seen.add(key);
                    events.push({
                        date: launchedDate,
                        product: platform.name,
                        feature: feature.name,
                        event: `${feature.name} launched`,
                        category: feature.category || '',
                        featureId
                    });
                }
            }

            // Add changelog events (skip launch duplicates and [Verified] audit entries)
            for (const entry of (feature.changelog || [])) {
                const entryDate = formatDateForDisplay(entry.date);
                if (!entryDate) continue;
                const changeText = entry.change || '';
                // Skip [Verified] audit entries — these are verification notes, not feature changes
                if (/^\[Verified\]/i.test(changeText)) continue;
                const key = `${entryDate}|${featureId}|${changeText}`;
                if (seen.has(key)) continue;
                // Skip if this is just the launch entry
                if (entryDate === launchedDate && /launch/i.test(changeText)) continue;
                seen.add(key);
                events.push({
                    date: entryDate,
                    product: platform.name,
                    feature: feature.name,
                    event: entry.change || `${feature.name} updated`,
                    category: feature.category || '',
                    featureId
                });
            }
        }
    }

    events.sort((a, b) => b.date.localeCompare(a.date));

    // Group events by date + product so same-day entries from one company merge
    const grouped = [];
    for (const ev of events) {
        const last = grouped[grouped.length - 1];
        if (last && last.date === ev.date && last.product === ev.product) {
            last.items.push(ev);
        } else {
            grouped.push({ date: ev.date, product: ev.product, items: [ev] });
        }
    }

    // Group by year
    const byYear = {};
    for (const g of grouped) {
        const year = g.date.slice(0, 4);
        if (!byYear[year]) byYear[year] = [];
        byYear[year].push(g);
    }

    const timelineHtml = Object.keys(byYear).sort().reverse().map(year => {
        const yearEntries = byYear[year].map(g => {
            const isPast = g.date <= today;
            const cls = isPast ? 'past' : 'future';
            const itemsHtml = g.items.map(ev => {
                const categoryTag = ev.category
                    ? `<span class="timeline-category">${escapeHTML(ev.category)}</span>`
                    : '';
                return `<div class="timeline-item">
                        <a href="implementations.html#impl-${ev.featureId}" onclick="passTheme(this)" class="timeline-event-link">${escapeHTML(ev.event)}</a>
                        ${categoryTag}
                    </div>`;
            }).join('\n');
            return `<div class="timeline-entry ${cls}">
                <div class="timeline-date">${escapeHTML(g.date)}</div>
                <div class="timeline-content">
                    <span class="timeline-product">${escapeHTML(g.product)}</span>
                    ${itemsHtml}
                </div>
            </div>`;
        }).join('\n');

        return `<div class="timeline-year">${year}</div>\n${yearEntries}`;
    }).join('\n');

    const eventCount = events.length;
    const desc = 'Chronological view of AI feature launches and changes across all tracked products.';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Timeline - ${DASHBOARD_TITLE}</title>
    <meta name="description" content="${desc}">
    <meta name="theme-color" content="#1a1a2e">
    <link rel="canonical" href="${SITE_URL}timeline.html">

    <link rel="icon" type="image/png" sizes="56x56" href="assets/favicon-56.png">
    <link rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="assets/favicon-16.png">
    <link rel="apple-touch-icon" sizes="180x180" href="assets/apple-touch-icon.png">
    <link rel="alternate" type="application/rss+xml" title="${DASHBOARD_TITLE}" href="${SITE_URL}index.xml">

    <meta property="og:type" content="website">
    <meta property="og:title" content="Timeline - ${DASHBOARD_TITLE}">
    <meta property="og:description" content="${desc}">
    <meta property="og:image" content="${SITE_URL}imgs/og.png">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Timeline - ${DASHBOARD_TITLE}">
    <meta name="twitter:description" content="${desc}">
    <meta name="twitter:image" content="${SITE_URL}imgs/og.png">

    <link rel="stylesheet" href="assets/styles.css">
    ${renderThemeInit()}
</head>
<body>
    <a href="#main-content" class="skip-link">Skip to main content</a>
    ${renderSiteNav('timeline')}
    <div class="container" id="main-content">
        <div style="max-width: 800px; margin: 0 auto; padding: 2rem;">
            <h2 style="margin-top: 0.5rem;">Timeline</h2>
            <p style="color: var(--text-secondary); margin-bottom: 1rem;">
                ${eventCount} events across all tracked AI products.
            </p>

            <div class="timeline">
                ${timelineHtml}
            </div>
        </div>

        ${renderSharedFooter()}
    </div>
    <script src="assets/search.js"></script>
    ${renderThemeScript()}
</body>
</html>`;
}

/**
 * Generate the constraint-first view page.
 * Aggregates constraint data across all implementations into filterable sections.
 */
function generateConstraintsHTML(ontologyData, platforms) {
    const now = new Date().toISOString().split('T')[0];
    const hostedPlatforms = platforms.filter(isPublicPlatform);

    // Build flat list of all features with their constraint data
    const allFeatures = [];
    hostedPlatforms.forEach(platform => {
        const planPriceMap = buildPlanPriceMap(platform);
        platform.features.forEach(feature => {
            // Find capability mappings for this feature
            const featureId = featureCardId(platform.name, feature.name);
            const impl = ontologyData.implementations.find(item =>
                item.source_file === platform.source_file && item.source_heading === feature.name
            );
            const capabilityNames = (impl?.capabilities || []).map(capId => {
                const cap = ontologyData.capabilities.find(c => c.id === capId);
                return cap ? cap.name : humanizeId(capId);
            });

            // Determine minimum plan tier
            const availablePlans = (feature.availability || [])
                .filter(a => a.available.includes('✅'))
                .map(a => a.plan);

            // Determine available surfaces
            const availableSurfaces = (feature.platforms || [])
                .filter(pl => pl.available.includes('✅') || pl.available.includes('⚠️'))
                .map(pl => pl.platform);

            // Regional constraints
            const regional = feature.regional || '';
            const hasRegionLimit = regional && !regional.toLowerCase().includes('available globally') && !regional.toLowerCase().includes('no known');

            allFeatures.push({
                id: featureId,
                name: feature.name,
                platform: platform.name,
                vendorSlug: slugify(platform.vendor),
                gating: feature.gating || 'unknown',
                status: feature.status,
                availablePlans,
                availableSurfaces,
                hasRegionLimit,
                regional,
                capabilityNames,
                checked: feature.checked || '',
                verified: feature.verified || ''
            });
        });
    });

    // Group by gating
    const freeFeatures = allFeatures.filter(f => f.gating === 'free');
    const paidFeatures = allFeatures.filter(f => f.gating === 'paid');
    const inviteFeatures = allFeatures.filter(f => f.gating === 'invite' || f.gating === 'org-only');

    // Group by surface
    const surfaceOrder = ['web', 'Windows', 'macOS', 'Linux', 'iOS', 'Android', 'Chrome', 'terminal', 'API'];
    const bySurface = {};
    surfaceOrder.forEach(surface => {
        bySurface[surface] = allFeatures.filter(f =>
            f.availableSurfaces.some(s => s.toLowerCase() === surface.toLowerCase())
        );
    });

    // Region-limited features
    const regionLimited = allFeatures.filter(f => f.hasRegionLimit);

    function renderConstraintCard(f) {
        return `<article class="constraint-card" data-gating="${f.gating}" data-surfaces="${f.availableSurfaces.map(s => s.toLowerCase()).join('_')}" data-provider="${f.vendorSlug}" onclick="implCardClick(event, this)" tabindex="0" onkeydown="if(event.key==='Enter'){implCardClick(event, this);}">
                        <div class="constraint-card-header">
                            <span class="price-tag">${escapeHTML(f.platform)}</span>
                            <h4><a href="implementations.html?p=${f.vendorSlug}#${f.id}" onclick="passTheme(this)">${escapeHTML(f.name)}</a></h4>
                        </div>
                        <div class="constraint-card-meta">
                            ${f.status ? availabilityBadge(f.status) : ''}
                            ${gatingBadge(f.gating)}
                            ${f.capabilityNames.map(name => `<span class="constraint-cap-badge">${escapeHTML(name)}</span>`).join('')}
                        </div>
                        <div class="constraint-surfaces">
                            ${surfaceOrder.map(surface => {
                                const has = f.availableSurfaces.some(s => s.toLowerCase() === surface.toLowerCase());
                                return `<span class="plat-icon ${has ? 'yes' : 'no'}" title="${surface}">${surface}</span>`;
                            }).join('')}
                        </div>
                        ${f.hasRegionLimit ? `<p class="constraint-regional">${escapeHTML(f.regional)}</p>` : ''}
                    </article>`;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Tool Watch - Access & Limits</title>
    <meta name="description" content="Find AI features by access tier, platform support, and regional availability. Filter by free, paid, surface, and more.">
    <meta name="theme-color" content="#1a1a2e">
    <link rel="canonical" href="${SITE_URL}constraints.html">

    <link rel="icon" type="image/png" sizes="56x56" href="assets/favicon-56.png">
    <link rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="assets/favicon-16.png">
    <link rel="apple-touch-icon" sizes="180x180" href="assets/apple-touch-icon.png">
    <link rel="alternate" type="application/rss+xml" title="${DASHBOARD_TITLE}" href="${SITE_URL}index.xml">

    <meta property="og:type" content="website">
    <meta property="og:title" content="AI Tool Watch - Access & Limits">
    <meta property="og:description" content="Find AI features by access tier, platform support, and regional availability. Filter by free, paid, surface, and more.">
    <meta property="og:image" content="${SITE_URL}imgs/og.png">
    <meta property="og:url" content="${SITE_URL}constraints.html">

    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": "https://paice.work/#organization",
          "name": "PAICE.work",
          "url": "https://paice.work/"
        },
        {
          "@type": "WebPage",
          "@id": "${SITE_URL}constraints.html#webpage",
          "url": "${SITE_URL}constraints.html",
          "name": "AI Tool Watch - Access & Limits",
          "description": "Find AI features by access tier, platform support, and regional availability. Filter by free, paid, surface, and more.",
          "isPartOf": { "@id": "${SITE_URL}#website" },
          "publisher": { "@id": "https://paice.work/#organization" },
          "about": {
            "@type": "Thing",
            "name": "AI feature access tiers, platform support, and regional availability"
          }
        }
      ]
    }
    </script>

    <link rel="stylesheet" href="assets/styles.css">
    ${renderThemeInit()}
</head>
<body>
    <a href="#main-content" class="skip-link">Skip to main content</a>
    ${renderSiteNav('constraints')}

    <div class="container constraint-page" id="main-content">
        <section class="capability-hero">
            <h2>Access & Limits</h2>
            <p class="capability-hero-copy">Find what works for you. Filter AI features by cost, platform, and availability constraints.</p>
            <div class="capability-stats">
                <span class="feature-count">${freeFeatures.length} free features</span>
                <span class="feature-count">${paidFeatures.length} paid features</span>
                <span class="feature-count">${regionLimited.length} region-limited</span>
            </div>
        </section>

        <nav class="capability-nav" aria-label="Constraint sections">
            <a href="#constraint-gating" class="provider-toggle active">By Access Tier</a>
            <a href="#constraint-surface" class="provider-toggle active">By Surface</a>
            <a href="#constraint-region" class="provider-toggle active">Region Limits</a>
        </nav>

        <div class="constraint-filters">
            <div class="filter-dropdowns">
                <div class="filter-group">
                    <label>Access:</label>
                    <select id="gatingFilter" onchange="filterConstraints()">
                        <option value="">All</option>
                        <option value="free">Free</option>
                        <option value="paid">Paid</option>
                        <option value="invite">Invite / Org-only</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>Surface:</label>
                    <select id="surfaceFilterC" onchange="filterConstraints()">
                        <option value="">All</option>
                        ${surfaceOrder.map(s => `<option value="${s.toLowerCase()}">${s}</option>`).join('\n                        ')}
                    </select>
                </div>
            </div>
        </div>

        <section class="constraint-section" id="constraint-gating">
            <div class="platform-header">
                <h2>By Access Tier</h2>
            </div>

            <h3 class="constraint-group-label">Free (${freeFeatures.length})</h3>
            <div class="constraint-grid">
                ${freeFeatures.map(renderConstraintCard).join('\n                    ')}
            </div>

            <h3 class="constraint-group-label">Paid (${paidFeatures.length})</h3>
            <div class="constraint-grid">
                ${paidFeatures.map(renderConstraintCard).join('\n                    ')}
            </div>

            ${inviteFeatures.length ? `
            <h3 class="constraint-group-label">Invite / Org-only (${inviteFeatures.length})</h3>
            <div class="constraint-grid">
                ${inviteFeatures.map(renderConstraintCard).join('\n                    ')}
            </div>` : ''}
        </section>

        <section class="constraint-section" id="constraint-surface">
            <div class="platform-header">
                <h2>By Surface</h2>
            </div>
            ${surfaceOrder.map(surface => {
                const features = bySurface[surface] || [];
                if (!features.length) return '';
                return `
            <h3 class="constraint-group-label">${surface} (${features.length})</h3>
            <div class="constraint-grid">
                ${features.map(renderConstraintCard).join('\n                    ')}
            </div>`;
            }).join('')}
        </section>

        ${regionLimited.length ? `
        <section class="constraint-section" id="constraint-region">
            <div class="platform-header">
                <h2>Region Limits</h2>
            </div>
            <div class="constraint-grid">
                ${regionLimited.map(renderConstraintCard).join('\n                    ')}
            </div>
        </section>` : ''}

        ${renderSharedFooter()}
    </div>
    <script>
        function passTheme(link) {
            const isLight = document.documentElement.classList.contains('light-mode');
            if (isLight) {
                const url = new URL(link.href, window.location.href);
                url.searchParams.set('theme', 'light');
                link.href = url.pathname.split('/').pop() + url.search + url.hash;
            }
        }
        function implCardClick(event, card) {
            if (event.target.closest('a')) return;
            var featureId = card.querySelector('h4 a').getAttribute('href').split('#')[1];
            var provider = card.dataset.provider;
            var isLight = document.documentElement.classList.contains('light-mode');
            var url = new URL('implementations.html#' + featureId, window.location.href);
            if (provider) url.searchParams.set('p', provider);
            if (isLight) url.searchParams.set('theme', 'light');
            window.location.href = url.pathname.split('/').pop() + url.search + url.hash;
        }
        function filterConstraints() {
            var gating = document.getElementById('gatingFilter').value;
            var surface = document.getElementById('surfaceFilterC').value;
            document.querySelectorAll('.constraint-card').forEach(function(card) {
                var show = true;
                if (gating && card.dataset.gating !== gating) {
                    if (gating === 'invite' && card.dataset.gating !== 'invite' && card.dataset.gating !== 'org-only') show = false;
                    else if (gating !== 'invite') show = false;
                }
                if (surface) {
                    var surfaces = card.dataset.surfaces ? card.dataset.surfaces.split('_') : [];
                    if (!surfaces.includes(surface)) show = false;
                }
                card.style.display = show ? '' : 'none';
            });
            // Persist filters in URL
            var params = new URLSearchParams(window.location.search);
            if (gating) params.set('access', gating); else params.delete('access');
            if (surface) params.set('surface', surface); else params.delete('surface');
            var qs = params.toString();
            var newUrl = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
            history.replaceState(null, '', newUrl);
        }
        // Initialize filters from URL on page load
        document.addEventListener('DOMContentLoaded', function() {
            var params = new URLSearchParams(window.location.search);
            var access = params.get('access');
            var surface = params.get('surface');
            if (access) document.getElementById('gatingFilter').value = access;
            if (surface) document.getElementById('surfaceFilterC').value = surface;
            if (access || surface) filterConstraints();
        });
    </script>
    <script src="assets/search.js"></script>
    ${renderThemeScript()}
</body>
</html>`;
}

function generateCapabilitiesRedirect() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="robots" content="noindex">
    <meta http-equiv="refresh" content="0;url=${SITE_URL}">
    <link rel="canonical" href="${SITE_URL}">
    <title>Redirecting...</title>
</head>
<body>
    <p>This page has moved. <a href="${SITE_URL}">Continue to AI Tool Watch</a>.</p>
</body>
</html>`;
}

function generate404HTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex">
    <title>Page Not Found - ${DASHBOARD_TITLE}</title>
    <meta name="theme-color" content="#1a1a2e">

    <link rel="icon" type="image/png" sizes="56x56" href="assets/favicon-56.png">
    <link rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="assets/favicon-16.png">
    <link rel="apple-touch-icon" sizes="180x180" href="assets/apple-touch-icon.png">

    <link rel="stylesheet" href="assets/styles.css">
    ${renderThemeInit()}
    <style>
        .not-found-content {
            max-width: 600px;
            margin: 4rem auto;
            padding: 2rem;
            text-align: center;
        }
        .not-found-content h2 { font-size: 5rem; margin: 0; opacity: 0.15; line-height: 1; }
        .not-found-content h3 { font-size: 1.5rem; margin: 0.5rem 0 1rem; }
        .not-found-content p { margin-bottom: 1.5rem; color: var(--text-secondary, #888); }
        .not-found-links { display: flex; flex-wrap: wrap; gap: 0.75rem; justify-content: center; margin-top: 2rem; }
        .not-found-links a { padding: 0.5rem 1.25rem; border: 1px solid var(--card-border); border-radius: 6px; text-decoration: none; color: var(--accent); }
        .not-found-links a:hover { background: var(--card-bg); }
    </style>
</head>
<body>
    <a href="#main-content" class="skip-link">Skip to main content</a>
    ${renderSiteNav('')}
    <div class="container" id="main-content">
        <div class="not-found-content">
            <h2>404</h2>
            <h3>Page not found</h3>
            <p>The page you're looking for doesn't exist or has moved.</p>
            <div class="not-found-links">
                <a href="${SITE_URL}">Capabilities</a>
                <a href="${SITE_URL}implementations.html">Features</a>
                <a href="${SITE_URL}compare.html">Compare</a>
                <a href="${SITE_URL}constraints.html">Limits</a>
                <a href="${SITE_URL}timeline.html">Timeline</a>
            </div>
        </div>
        ${renderSharedFooter()}
    </div>
    <script src="assets/search.js"></script>
    ${renderThemeScript()}
</body>
</html>`;
}

/**
 * Build the canonical data export — the intermediate JSON artifact that feeds
 * client-side search, comparison, export, and (in Phase 5) the public JSON
 * contract, SEO bridge pages, and MCP read layer.
 *
 * This runs before HTML generation so that downstream build steps and runtime
 * consumers read from the same structured representation.
 */
function buildDataExport(ontologyData) {
    const providers = ontologyData.providers.map(p => ({
        id: p.id,
        name: p.name,
        products: ontologyData.products
            .filter(prod => prod.provider === p.id)
            .map(prod => prod.id)
    }));

    const products = ontologyData.products.map(p => ({
        id: p.id,
        name: p.name,
        provider: p.provider,
        providerName: p.provider_record ? p.provider_record.name : p.provider,
        productKind: p.product_kind || 'hosted'
    }));

    const capabilities = ontologyData.capabilities.map(c => ({
        id: c.id,
        name: c.name,
        group: c.group,
        summary: c.summary || '',
        searchTerms: c.search_terms || [],
        implementationCount: c.implementation_count || 0,
        productCount: c.product_count || 0
    }));

    const capabilityMap = new Map(ontologyData.capabilities.map(c => [c.id, c.name]));

    const implementations = ontologyData.implementations
        .filter(impl => impl.source)
        .map(impl => {
            const feature = impl.source.feature;
            const platform = impl.source.platform;
            const anchor = impl.source.featureId;
            const availablePlans = (feature.availability || [])
                .filter(row => row.available && row.available.includes('✅'))
                .map(row => row.plan);
            const surfaceList = (feature.platforms || [])
                .filter(row => row.available && row.available.includes('✅'))
                .map(row => slugify(row.platform));
            const capabilityNames = (impl.capabilities || [])
                .map(cid => capabilityMap.get(cid) || cid);
            const evidence = impl.evidence;

            return {
                id: impl.id,
                name: feature.name,
                product: impl.product,
                provider: impl.provider,
                productName: platform.name,
                capabilities: impl.capabilities || [],
                capabilityNames,
                category: feature.category || '',
                gating: feature.gating || '',
                status: feature.status || '',
                plans: availablePlans,
                surfaces: surfaceList,
                talkingPoint: feature.talking_point || '',
                launched: feature.launched || '',
                verified: feature.verified || '',
                evidenceVerified: evidence ? evidence.verified : null,
                sourceFile: impl.source_file || null,
                page: 'implementations',
                anchor
            };
        });

    const hostedProducts = products.filter(p => p.productKind !== 'runtime');

    return {
        meta: {
            built: new Date().toISOString(),
            version: 1,
            counts: {
                providers: providers.length,
                products: hostedProducts.length,
                capabilities: capabilities.length,
                implementations: implementations.length
            }
        },
        providers,
        products,
        capabilities,
        implementations
    };
}

// ========================================================================
// Phase 5B: API Export — canonical JSON artifacts for agents and tools
// ========================================================================

const API_OUTPUT_DIR = path.join(__dirname, '..', 'docs', 'api', 'v1');

function buildAPIExport(ontologyData, platforms) {
    const timestamp = new Date().toISOString();

    const capabilities = ontologyData.capabilities.map(c => ({
        id: c.id,
        name: c.name,
        group: c.group,
        status: c.status || 'active',
        summary: c.summary || '',
        search_terms: c.search_terms || [],
        what_counts: c.what_counts || [],
        what_does_not_count: c.what_does_not_count || [],
        related_terms: c.related_terms || [],
        common_constraints: c.common_constraints || [],
        implementations: (c.implementations || []).map(i => i.id),
        implementation_count: c.implementation_count || 0,
        products: [...new Set((c.implementations || []).map(i => i.product))],
        product_count: c.product_count || 0,
        model_access: (c.model_access || []).map(m => m.id),
        model_access_count: c.model_access_count || 0
    }));

    const products = ontologyData.products.map(p => {
        const implIds = ontologyData.implementations
            .filter(i => i.product === p.id && i.source)
            .map(i => i.id);
        return {
            id: p.id,
            name: p.name,
            provider: p.provider,
            product_kind: p.product_kind || 'hosted',
            pricing_page: p.pricing_page || null,
            default_surfaces: p.default_surfaces || [],
            last_verified: p.last_verified || null,
            summary: p.summary || '',
            implementations: implIds,
            implementation_count: implIds.length
        };
    });

    const implementations = ontologyData.implementations
        .filter(impl => impl.source)
        .map(impl => {
            const feature = impl.source.feature;
            const plans = (feature.availability || []).map(row => ({
                plan: row.plan,
                available: !!(row.available && row.available.includes('✅')),
                limits: row.limits || '',
                notes: row.notes || ''
            }));
            const surfaces = (feature.platforms || []).map(row => ({
                surface: slugify(row.platform),
                name: row.platform,
                available: !!(row.available && row.available.includes('✅')),
                notes: row.notes || ''
            }));
            const evidence = impl.evidence;
            return {
                id: impl.id,
                name: feature.name,
                product: impl.product,
                provider: impl.provider,
                source_file: impl.source_file || null,
                source_heading: impl.source_heading || feature.name,
                capabilities: impl.capabilities || [],
                category: feature.category || '',
                gating: feature.gating || '',
                status: feature.status || '',
                plans,
                surfaces,
                talking_point: feature.talking_point || '',
                launched: feature.launched || '',
                verified: feature.verified || '',
                evidence_id: evidence ? evidence.id : null,
                evidence_verified: evidence ? evidence.verified : null
            };
        });

    const providers = ontologyData.providers.map(p => ({
        id: p.id,
        name: p.name,
        logo: p.logo || null,
        website: p.website || null,
        status_page: p.status_page || null,
        products: (p.products || [])
    }));

    const modelAccess = ontologyData.model_access.map(r => {
        const evidence = r.evidence;
        return {
            id: r.id,
            name: r.name,
            provider: r.provider,
            status: r.status || 'active',
            last_verified: r.last_verified || null,
            summary: r.summary || '',
            deployment_modes: r.deployment_modes || [],
            common_runtimes: r.common_runtimes || [],
            constraints: r.constraints || [],
            related_capabilities: r.related_capabilities || [],
            source_file: r.record_source || null,
            source_heading: r.source_heading || null,
            evidence_id: evidence ? evidence.id : null,
            evidence_verified: evidence ? evidence.verified : null
        };
    });

    const evidence = (ontologyData.evidence || []).map(e => ({
        id: e.id,
        entity_type: e.entity_type,
        entity_id: e.entity_id,
        source_file: e.source_file || null,
        source_heading: e.source_heading || null,
        launched: e.launched || null,
        verified: e.verified || null,
        checked: e.checked || null,
        sources: e.sources || [],
        changelog: e.changelog || [],
        notes: e.notes || ''
    }));

    // Derived view: capability × product matrix
    const hostedProducts = products.filter(p => p.product_kind !== 'runtime');
    const implByProductCap = new Map();
    implementations.forEach(impl => {
        (impl.capabilities || []).forEach(capId => {
            const key = `${impl.product}::${capId}`;
            if (!implByProductCap.has(key)) implByProductCap.set(key, []);
            implByProductCap.get(key).push(impl);
        });
    });

    const gatingRank = { free: 0, limited: 1, paid: 2 };
    const matrixData = {};
    capabilities.forEach(cap => {
        const row = {};
        hostedProducts.forEach(prod => {
            const impls = implByProductCap.get(`${prod.id}::${cap.id}`) || [];
            const bestGating = impls.length
                ? impls.reduce((best, i) => gatingRank[i.gating] < gatingRank[best] ? i.gating : best, impls[0].gating)
                : null;
            row[prod.id] = {
                available: impls.length > 0,
                implementations: impls.map(i => i.id),
                best_gating: bestGating
            };
        });
        matrixData[cap.id] = row;
    });

    const capabilityMatrix = {
        meta: { generated: timestamp, version: '1.0' },
        capabilities: capabilities.map(c => c.id),
        products: hostedProducts.map(p => p.id),
        matrix: matrixData
    };

    // Derived view: pairwise product comparisons
    const productCapSets = new Map();
    hostedProducts.forEach(prod => {
        const capSet = new Set();
        implementations.forEach(impl => {
            if (impl.product === prod.id) {
                (impl.capabilities || []).forEach(c => capSet.add(c));
            }
        });
        productCapSets.set(prod.id, capSet);
    });

    const comparisons = [];
    for (let i = 0; i < hostedProducts.length; i++) {
        for (let j = i + 1; j < hostedProducts.length; j++) {
            const a = hostedProducts[i].id;
            const b = hostedProducts[j].id;
            const setA = productCapSets.get(a);
            const setB = productCapSets.get(b);
            const shared = [...setA].filter(c => setB.has(c));
            const onlyA = [...setA].filter(c => !setB.has(c));
            const onlyB = [...setB].filter(c => !setA.has(c));
            comparisons.push({
                products: [a, b],
                shared_capabilities: shared,
                only_a: onlyA,
                only_b: onlyB,
                shared_count: shared.length,
                only_a_count: onlyA.length,
                only_b_count: onlyB.length
            });
        }
    }

    const productComparisons = {
        meta: { generated: timestamp, version: '1.0' },
        comparisons
    };

    // Derived view: plan entitlements
    // Build a pricing lookup: product record_source → { planName: priceString }
    const platformPricingMap = new Map();
    (platforms || []).forEach(platform => {
        const priceMap = {};
        (platform.pricing || []).forEach(tier => {
            priceMap[tier.plan] = tier.price || null;
        });
        platformPricingMap.set(platform.source_file, priceMap);
    });

    const planEntitlements = { meta: { generated: timestamp, version: '1.0' }, products: {} };
    hostedProducts.forEach(prod => {
        // Find the original ontology product to get record_source
        const ontologyProduct = ontologyData.products.find(p => p.id === prod.id);
        const priceMap = ontologyProduct?.record_source ? (platformPricingMap.get(ontologyProduct.record_source) || {}) : {};

        const prodImpls = implementations.filter(i => i.product === prod.id);
        const planMap = {};
        prodImpls.forEach(impl => {
            (impl.plans || []).forEach(planRow => {
                if (!planRow.available) return;
                if (!planMap[planRow.plan]) planMap[planRow.plan] = { implementations: [], capabilities: new Set() };
                planMap[planRow.plan].implementations.push(impl.id);
                (impl.capabilities || []).forEach(c => planMap[planRow.plan].capabilities.add(c));
            });
        });
        const plans = {};
        Object.keys(planMap).forEach(plan => {
            plans[plan] = {
                price: priceMap[plan] || null,
                implementations: planMap[plan].implementations,
                capabilities: [...planMap[plan].capabilities],
                implementation_count: planMap[plan].implementations.length,
                capability_count: planMap[plan].capabilities.size
            };
        });
        planEntitlements.products[prod.id] = { plans };
    });

    // Index manifest
    const index = {
        meta: { generated: timestamp, version: '1.0' },
        description: 'AI Tool Watch — Machine-readable API',
        documentation: 'https://github.com/snapsynapse/ai-tool-watch',
        files: {
            capabilities: { path: 'capabilities.json', description: 'All capabilities with search terms, definitions, and cross-links', count: capabilities.length },
            products: { path: 'products.json', description: 'All products with provider links and implementation lists', count: products.length },
            implementations: { path: 'implementations.json', description: 'All implementations with capability mappings and evidence', count: implementations.length },
            providers: { path: 'providers.json', description: 'All providers with product lists', count: providers.length },
            'model-access': { path: 'model-access.json', description: 'Model access records with deployment and constraint details', count: modelAccess.length },
            evidence: { path: 'evidence.json', description: 'Evidence records with sources and changelog', count: evidence.length },
            'capability-matrix': { path: 'capability-matrix.json', description: 'Capability × product availability grid' },
            'product-comparisons': { path: 'product-comparisons.json', description: 'Pairwise product capability overlap' },
            'plan-entitlements': { path: 'plan-entitlements.json', description: 'What each plan tier unlocks per product' }
        }
    };

    return {
        'index.json': index,
        'capabilities.json': { meta: { generated: timestamp, version: '1.0', count: capabilities.length }, capabilities },
        'products.json': { meta: { generated: timestamp, version: '1.0', count: products.length }, products },
        'implementations.json': { meta: { generated: timestamp, version: '1.0', count: implementations.length }, implementations },
        'providers.json': { meta: { generated: timestamp, version: '1.0', count: providers.length }, providers },
        'model-access.json': { meta: { generated: timestamp, version: '1.0', count: modelAccess.length }, model_access: modelAccess },
        'evidence.json': { meta: { generated: timestamp, version: '1.0', count: evidence.length }, evidence },
        'capability-matrix.json': capabilityMatrix,
        'product-comparisons.json': productComparisons,
        'plan-entitlements.json': planEntitlements
    };
}

/**
 * Generate the comparison page shell HTML.
 */
function generateCompareHTML(ontologyData) {
    const products = ontologyData.products
        .filter(p => p.product_kind !== 'runtime')
        .map(p => ({ id: p.id, name: p.name }));

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Compare Products - ${DASHBOARD_TITLE}</title>
    <meta name="description" content="Side-by-side comparison of AI product capabilities across ChatGPT, Claude, Gemini, Copilot, Grok, and Perplexity.">
    <meta name="theme-color" content="#1a1a2e">
    <link rel="canonical" href="${SITE_URL}compare.html">

    <link rel="stylesheet" href="assets/styles.css">
    <link rel="icon" type="image/png" sizes="56x56" href="assets/favicon-56.png">
    <link rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="assets/favicon-16.png">

    <meta property="og:type" content="website">
    <meta property="og:title" content="Compare Products - ${DASHBOARD_TITLE}">
    <meta property="og:description" content="Side-by-side comparison of AI product capabilities across ChatGPT, Claude, Gemini, Copilot, Grok, and Perplexity.">
    <meta property="og:image" content="${SITE_URL}imgs/og.png">
    <meta property="og:url" content="${SITE_URL}compare.html">

    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": "https://paice.work/#organization",
          "name": "PAICE.work",
          "url": "https://paice.work/"
        },
        {
          "@type": "WebPage",
          "@id": "${SITE_URL}compare.html#webpage",
          "url": "${SITE_URL}compare.html",
          "name": "Compare Products - ${DASHBOARD_TITLE}",
          "description": "Side-by-side comparison of AI product capabilities across ChatGPT, Claude, Gemini, Copilot, Grok, and Perplexity.",
          "isPartOf": { "@id": "${SITE_URL}#website" },
          "publisher": { "@id": "https://paice.work/#organization" },
          "about": {
            "@type": "Thing",
            "name": "AI product capability comparison"
          }
        }
      ]
    }
    </script>

    ${renderThemeInit()}
</head>
<body>
    ${renderSiteNav('compare')}
    <div class="container" id="main-content">
        <section class="compare-controls">
            <h2>Compare Products</h2>
            <p>Select up to 3 subscription AI products to compare side-by-side.</p>
            <div class="product-selector" role="group" aria-label="Select products to compare">
                ${products.map(p => {
                    const preselected = ['chatgpt', 'claude'].includes(p.id);
                    return `<label class="product-checkbox"><input type="checkbox" value="${p.id}"${preselected ? ' checked' : ''} onchange="updateComparison()"> ${p.name}</label>`;
                }).join('\n                ')}
            </div>
        </section>
        <section id="comparisonResult" class="comparison-result" aria-live="polite"></section>
        <div class="export-actions" id="compareExport" hidden>
            <button onclick="exportCSV()" class="export-btn">Export CSV</button>
            <button onclick="exportJSON()" class="export-btn">Export JSON</button>
        </div>
    </div>
    ${renderSharedFooter()}
    <script src="assets/search.js"></script>
    <script src="assets/compare.js"></script>
    <script src="assets/export.js"></script>
    ${renderThemeScript()}
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Phase 5C: SEO Bridge Pages
// ---------------------------------------------------------------------------

const BRIDGE_OUTPUT_DIR = path.join(__dirname, '..', 'docs');

const GROUP_SLUG_MAP = {
    'understand': 'understanding-content',
    'respond': 'conversations',
    'create': 'creative-work',
    'work-with-my-stuff': 'working-with-files',
    'act-for-me': 'getting-things-done',
    'connect': 'integrations',
    'access-context': 'multi-device-access'
};

const GROUP_DISPLAY_MAP = {
    'understand': 'Understanding Content',
    'respond': 'Conversations',
    'create': 'Creative Work',
    'work-with-my-stuff': 'Working with Files',
    'act-for-me': 'Getting Things Done',
    'connect': 'Integrations',
    'access-context': 'Multi-Device Access'
};

const GROUP_DESCRIPTION_MAP = {
    'understand': 'AI products that can process and understand different types of input — audio, text, documents, images, and screens.',
    'respond': 'AI products that can communicate back through speech and written text.',
    'create': 'AI products that can generate images, video, documents, and code.',
    'work-with-my-stuff': 'AI products that can organize projects, remember context, and work with files you provide.',
    'act-for-me': 'AI products that can research topics, search the web, and take actions using tools.',
    'connect': 'AI products that can build reusable workflows and connect to external systems.',
    'access-context': 'AI products available across multiple surfaces — web, desktop, mobile, API, and terminal.'
};

/**
 * Shared HTML shell for all bridge pages.
 */
function renderBridgeShell({ title, canonicalPath, depth, content, structuredData, description, ogTitle }) {
    const prefix = depth > 0 ? '../'.repeat(depth) : '';
    const canonicalUrl = `${SITE_URL}${canonicalPath}`;
    const jsonLd = structuredData ? `\n    <script type="application/ld+json">${JSON.stringify(structuredData)}</script>` : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHTML(title)} - ${DASHBOARD_TITLE}</title>
    <meta name="theme-color" content="#1a1a2e">
    <link rel="canonical" href="${canonicalUrl}">
    <link rel="stylesheet" href="${prefix}assets/styles.css">
    <link rel="icon" type="image/png" sizes="56x56" href="${prefix}assets/favicon-56.png">
    <link rel="icon" type="image/png" sizes="32x32" href="${prefix}assets/favicon-32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="${prefix}assets/favicon-16.png">
    <link rel="apple-touch-icon" sizes="180x180" href="${prefix}assets/apple-touch-icon.png">
    <link rel="alternate" type="application/rss+xml" title="${DASHBOARD_TITLE}" href="${SITE_URL}index.xml">
    <meta name="description" content="${escapeHTML(description)}">
    <meta property="og:title" content="${escapeHTML(ogTitle || title)}">
    <meta property="og:description" content="${escapeHTML(description)}">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${escapeHTML(ogTitle || title)}">
    <meta name="twitter:description" content="${escapeHTML(description)}">${jsonLd}
    ${renderThemeInit()}
</head>
<body>
    ${renderSiteNav('none', prefix)}
    <div class="container" id="main-content">
        ${content}
    </div>
    ${renderSharedFooter()}
    <script src="${prefix}assets/search.js"></script>
    ${renderThemeScript()}
</body>
</html>`;
}

/**
 * Render a plan availability table for an implementation.
 */
function renderPlanTable(impl) {
    if (!impl.plans || impl.plans.length === 0) return '';
    const rows = impl.plans.map(p => {
        const icon = p.available ? '✓' : '✗';
        const cls = p.available ? 'plan-yes' : 'plan-no';
        return `<tr class="${cls}"><td>${escapeHTML(p.plan)}</td><td>${icon}</td><td>${escapeHTML(p.limits || '')}</td><td>${escapeHTML(p.notes || '')}</td></tr>`;
    }).join('\n');
    return `<table class="plan-table">
<thead><tr><th>Plan</th><th>Available</th><th>Limits</th><th>Notes</th></tr></thead>
<tbody>${rows}</tbody>
</table>`;
}

/**
 * Render an availability table from raw feature data (source.feature).
 */
function renderAvailabilityTable(feat) {
    const rows = (feat.availability || []);
    if (rows.length === 0) return '';
    const tableRows = rows.map(row => {
        const isAvailable = row.available && (row.available.includes('✅') || row.available.includes('⚠️'));
        const icon = isAvailable ? '✓' : '✗';
        const cls = isAvailable ? 'plan-yes' : 'plan-no';
        const note = row.available ? row.available.replace(/✅|❌|⚠️/g, '').trim() : '';
        return `<tr class="${cls}"><td>${escapeHTML(row.plan || '')}</td><td>${icon}</td><td>${escapeHTML(note)}</td></tr>`;
    }).join('\n');
    return `<table class="plan-table">
<thead><tr><th>Plan</th><th>Available</th><th>Notes</th></tr></thead>
<tbody>${tableRows}</tbody>
</table>`;
}

/**
 * Render surface badges for an implementation.
 */
function renderSurfaceBadges(surfaces) {
    if (!surfaces || surfaces.length === 0) return '';
    return surfaces.map(s => `<span class="surface-badge">${escapeHTML(s)}</span>`).join(' ');
}

/**
 * Generate a /can/{product}/{capability}/ page.
 */
function generateCanPage(productId, capId, ontologyData) {
    const product = ontologyData.products.find(p => p.id === productId);
    const cap = ontologyData.capabilities.find(c => c.id === capId);
    if (!product || !cap) return null;

    const productName = product.name;
    const capName = cap.name;

    // Find implementations for this product+capability
    const matrix = {};
    for (const impl of ontologyData.implementations) {
        if (impl.product === productId && impl.capabilities && impl.capabilities.includes(capId)) {
            if (!matrix[impl.id]) matrix[impl.id] = impl;
        }
    }
    const impls = Object.values(matrix);
    const available = impls.length > 0;
    const bestGating = available ? (['free', 'limited', 'paid'].find(g => impls.some(i => i.source?.feature?.gating === g)) || 'paid') : null;

    // Build answer text for FAQ
    let answerText;
    if (!available) {
        answerText = `No. ${productName} does not currently have a feature that implements ${capName.toLowerCase()}.`;
    } else {
        const implNames = impls.map(i => i.source?.feature?.name || i.name || humanizeId(i.id));
        const gatingNote = bestGating === 'free' ? 'available on the free plan' : bestGating === 'limited' ? 'available with limitations on some plans' : 'requires a paid plan';
        answerText = `Yes. ${productName} supports this through ${implNames.join(', ')}. This is ${gatingNote}.`;
    }

    // Build content sections
    let content = `<nav class="breadcrumb" aria-label="Breadcrumb"><a href="../../index.html">Home</a> › <a href="../../capability/${capId}/">Capability</a> › ${escapeHTML(productName)}</nav>\n`;
    content += `<h1>Can ${escapeHTML(productName)} ${escapeHTML(capName)}?</h1>\n`;

    if (!available) {
        content += `<p class="bridge-answer bridge-no">No — ${escapeHTML(productName)} does not currently implement ${escapeHTML(capName.toLowerCase())}.</p>\n`;
    } else {
        const gatingLabel = bestGating === 'free' ? 'Yes — available on the free plan' : bestGating === 'limited' ? 'Yes — with limitations' : 'Yes — requires a paid plan';
        content += `<p class="bridge-answer bridge-yes">${gatingLabel}</p>\n`;

        for (const impl of impls) {
            const feat = impl.source?.feature || {};
            content += `<section class="bridge-section">\n`;
            content += `<h2>${escapeHTML(feat.name || impl.name || humanizeId(impl.id))}</h2>\n`;
            if (feat.talking_point) content += `<p class="talking-point">${escapeHTML(feat.talking_point)}</p>\n`;
            content += renderAvailabilityTable(feat);
            const availSurfaces = (feat.platforms || [])
                .filter(s => s.available && (s.available.includes('✅') || s.available.includes('⚠️')))
                .map(s => s.platform);
            if (availSurfaces.length > 0) {
                content += `<p class="bridge-surfaces"><strong>Available on:</strong> ${renderSurfaceBadges(availSurfaces)}</p>\n`;
            }
            if (feat.verified) {
                content += `<p class="bridge-verified">Verified: ${formatDateForDisplay(feat.verified)}</p>\n`;
            }
            if (impl.evidence && impl.evidence.sources && impl.evidence.sources.length > 0) {
                const evidenceLinks = impl.evidence.sources.map(s =>
                    `<a href="${escapeHTML(s.url)}" rel="noopener">${escapeHTML(s.label || s.url)}</a>`
                );
                content += `<p class="bridge-evidence"><strong>Sources:</strong> ${evidenceLinks.join(', ')}</p>\n`;
            }
            content += `</section>\n`;
        }
    }

    content += `<p class="bridge-cta"><a href="../../index.html">← Browse all capabilities</a> · <a href="../../capability/${capId}/">See all products for ${escapeHTML(capName)}</a></p>\n`;

    // FAQ structured data
    const searchTerm = cap.search_terms?.[0] || capName.toLowerCase();
    const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [{
            '@type': 'Question',
            name: `Can ${productName} ${searchTerm}?`,
            acceptedAnswer: {
                '@type': 'Answer',
                text: answerText
            }
        }]
    };

    const description = available
        ? `Can ${productName} ${capName.toLowerCase()}? Yes. ${bestGating === 'free' ? 'Free plan.' : bestGating === 'limited' ? 'Limited availability.' : 'Paid plan required.'} Updated ${formatDateForDisplay(impls[0]?.source?.feature?.verified || '')}.`
        : `Can ${productName} ${capName.toLowerCase()}? Not currently available.`;

    return renderBridgeShell({
        title: `Can ${productName} ${capName}?`,
        canonicalPath: `can/${productId}/${capId}/`,
        depth: 3,
        content,
        structuredData,
        description
    });
}

/**
 * Generate a /compare/{a}-vs-{b}/ page.
 */
function generateCompareBridgePage(comparison, ontologyData, framingCache) {
    const [idA, idB] = comparison.products;
    const productA = ontologyData.products.find(p => p.id === idA);
    const productB = ontologyData.products.find(p => p.id === idB);
    if (!productA || !productB) return null;

    const nameA = productA.name;
    const nameB = productB.name;

    let content = `<nav class="breadcrumb" aria-label="Breadcrumb"><a href="../../compare.html">Compare</a> › ${escapeHTML(nameA)} vs ${escapeHTML(nameB)}</nav>\n`;
    content += `<h1>${escapeHTML(nameA)} vs ${escapeHTML(nameB)}</h1>\n`;
    content += `<p class="bridge-summary">${comparison.shared_count} shared capabilities, ${comparison.only_a_count} unique to ${escapeHTML(nameA)}, ${comparison.only_b_count} unique to ${escapeHTML(nameB)}.</p>\n`;

    // Framing after summary
    const uniqueANames = comparison.only_a.slice(0, 3).map(cid => { const c = ontologyData.capabilities.find(x => x.id === cid); return c ? c.name : humanizeId(cid); });
    const uniqueBNames = comparison.only_b.slice(0, 3).map(cid => { const c = ontologyData.capabilities.find(x => x.id === cid); return c ? c.name : humanizeId(cid); });
    content += renderPageFraming(framingCache || new Map(), `compare/${idA}-vs-${idB}/`, 'comparison', {
        nameA, nameB, sharedCount: comparison.shared_count, uniqueA: uniqueANames, uniqueB: uniqueBNames
    });

    // Shared capabilities
    if (comparison.shared_capabilities.length > 0) {
        content += `<section class="bridge-section">\n<h2>Shared Capabilities (${comparison.shared_count})</h2>\n`;
        content += `<table class="plan-table"><thead><tr><th>Capability</th><th>${escapeHTML(nameA)}</th><th>${escapeHTML(nameB)}</th></tr></thead><tbody>\n`;
        for (const capId of comparison.shared_capabilities) {
            const cap = ontologyData.capabilities.find(c => c.id === capId);
            const capName = cap ? cap.name : humanizeId(capId);
            // Find best gating for each product
            const gatingA = findBestGating(idA, capId, ontologyData);
            const gatingB = findBestGating(idB, capId, ontologyData);
            content += `<tr><td><a href="../../capability/${capId}/">${escapeHTML(capName)}</a></td><td class="gating-${gatingA}">${escapeHTML(gatingA)}</td><td class="gating-${gatingB}">${escapeHTML(gatingB)}</td></tr>\n`;
        }
        content += `</tbody></table>\n</section>\n`;
    }

    // Unique to A
    if (comparison.only_a.length > 0) {
        content += `<section class="bridge-section">\n<h2>Only in ${escapeHTML(nameA)} (${comparison.only_a_count})</h2>\n<ul>\n`;
        for (const capId of comparison.only_a) {
            const cap = ontologyData.capabilities.find(c => c.id === capId);
            content += `<li><a href="../../capability/${capId}/">${escapeHTML(cap ? cap.name : humanizeId(capId))}</a></li>\n`;
        }
        content += `</ul>\n</section>\n`;
    }

    // Unique to B
    if (comparison.only_b.length > 0) {
        content += `<section class="bridge-section">\n<h2>Only in ${escapeHTML(nameB)} (${comparison.only_b_count})</h2>\n<ul>\n`;
        for (const capId of comparison.only_b) {
            const cap = ontologyData.capabilities.find(c => c.id === capId);
            content += `<li><a href="../../capability/${capId}/">${escapeHTML(cap ? cap.name : humanizeId(capId))}</a></li>\n`;
        }
        content += `</ul>\n</section>\n`;
    }

    // Product details
    for (const prod of [productA, productB]) {
        content += `<section class="bridge-section">\n<h2>About ${escapeHTML(prod.name)}</h2>\n`;
        if (prod.summary) content += `<p>${escapeHTML(prod.summary)}</p>\n`;
        if (prod.pricing_page) content += `<p><a href="${escapeHTML(prod.pricing_page)}" rel="noopener">View pricing →</a></p>\n`;
        content += `</section>\n`;
    }

    // See Also section
    content += generateSeeAlso('comparison', { productIds: [idA, idB] }, ontologyData, '../../');

    content += `<p class="bridge-cta"><a href="../../compare.html">← Compare other products</a></p>\n`;

    const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: `${nameA} vs ${nameB} — AI Capability Comparison`,
        itemListElement: [
            { '@type': 'SoftwareApplication', name: nameA, applicationCategory: 'AI Assistant', url: productA.pricing_page || '', isSimilarTo: { '@type': 'SoftwareApplication', name: nameB } },
            { '@type': 'SoftwareApplication', name: nameB, applicationCategory: 'AI Assistant', url: productB.pricing_page || '', isSimilarTo: { '@type': 'SoftwareApplication', name: nameA } }
        ]
    };

    const description = `Compare ${nameA} and ${nameB}: ${comparison.shared_count} shared capabilities, ${comparison.only_a_count} unique to ${nameA}, ${comparison.only_b_count} unique to ${nameB}.`;

    return renderBridgeShell({
        title: `${nameA} vs ${nameB} — AI Capability Comparison`,
        canonicalPath: `compare/${idA}-vs-${idB}/`,
        depth: 2,
        content,
        structuredData,
        description
    });
}

/**
 * Generate a /capability/{slug}/ page.
 */
function generateCapabilityPage(cap, ontologyData, framingCache) {
    const capName = cap.name;

    let content = `<nav class="breadcrumb" aria-label="Breadcrumb"><a href="../../index.html">Home</a> › ${escapeHTML(capName)}</nav>\n`;
    content += `<h1>${escapeHTML(capName)}</h1>\n`;
    if (cap.summary) content += `<p class="bridge-summary">${escapeHTML(cap.summary)}</p>\n`;

    // Definition section
    if ((cap.what_counts && cap.what_counts.length > 0) || (cap.what_does_not_count && cap.what_does_not_count.length > 0)) {
        content += `<section class="bridge-section">\n<h2>Definition</h2>\n`;
        if (cap.what_counts && cap.what_counts.length > 0) {
            content += `<h3>What counts</h3>\n<ul>${cap.what_counts.map(w => `<li>${escapeHTML(w)}</li>`).join('')}</ul>\n`;
        }
        if (cap.what_does_not_count && cap.what_does_not_count.length > 0) {
            content += `<h3>What doesn't count</h3>\n<ul>${cap.what_does_not_count.map(w => `<li>${escapeHTML(w)}</li>`).join('')}</ul>\n`;
        }
        content += `</section>\n`;
    }

    // Implementations by product
    const implsByProduct = {};
    for (const impl of ontologyData.implementations) {
        if (impl.capabilities && impl.capabilities.includes(cap.id)) {
            const pid = impl.product;
            if (!implsByProduct[pid]) implsByProduct[pid] = [];
            implsByProduct[pid].push(impl);
        }
    }

    const hostedProducts = ontologyData.products.filter(p => p.product_kind !== 'runtime');
    content += `<section class="bridge-section">\n<h2>Product Availability (${Object.keys(implsByProduct).length} products)</h2>\n`;

    for (const prod of hostedProducts) {
        const prodImpls = implsByProduct[prod.id];
        if (!prodImpls || prodImpls.length === 0) continue;

        content += `<h3>${escapeHTML(prod.name)}</h3>\n`;
        for (const impl of prodImpls) {
            const feat = impl.source?.feature || {};
            content += `<div class="bridge-impl">\n`;
            content += `<h4>${escapeHTML(feat.name || impl.name || humanizeId(impl.id))}</h4>\n`;
            if (feat.talking_point) content += `<p class="talking-point">${escapeHTML(feat.talking_point)}</p>\n`;
            content += `<p><strong>Access:</strong> <span class="gating-${feat.gating || 'unknown'}">${escapeHTML(feat.gating || 'unknown')}</span></p>\n`;
            content += renderAvailabilityTable(feat);
            const capSurfaces = (feat.platforms || [])
                .filter(s => s.available && (s.available.includes('✅') || s.available.includes('⚠️')))
                .map(s => s.platform);
            if (capSurfaces.length > 0) {
                content += `<p class="bridge-surfaces"><strong>Surfaces:</strong> ${renderSurfaceBadges(capSurfaces)}</p>\n`;
            }
            if (feat.verified) {
                content += `<p class="bridge-verified">Verified: ${formatDateForDisplay(feat.verified)}</p>\n`;
            }
            content += `<p><a href="../../can/${prod.id}/${cap.id}/">Full details →</a></p>\n`;
            content += `</div>\n`;
        }
    }
    content += `</section>\n`;

    // Search terms
    if (cap.search_terms && cap.search_terms.length > 0) {
        content += `<section class="bridge-section">\n<h2>Also Known As</h2>\n`;
        content += `<p>${cap.search_terms.map(t => escapeHTML(t)).join(', ')}</p>\n</section>\n`;
    }

    // Constraints
    if (cap.common_constraints && cap.common_constraints.length > 0) {
        content += `<section class="bridge-section">\n<h2>Common Constraints</h2>\n`;
        content += `<ul>${cap.common_constraints.map(c => `<li>${escapeHTML(c)}</li>`).join('')}</ul>\n</section>\n`;
    }

    // See Also section
    content += generateSeeAlso('capability', { capId: cap.id }, ontologyData, '../../');

    content += `<p class="bridge-cta"><a href="../../index.html">← Browse all capabilities</a></p>\n`;

    // Structured data
    const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'DefinedTerm',
        name: capName,
        description: cap.summary || '',
        termCode: cap.id,
        inDefinedTermSet: {
            '@type': 'DefinedTermSet',
            name: 'AI Capabilities',
            url: `${SITE_URL}`
        }
    };

    const productCount = Object.keys(implsByProduct).length;
    const description = `${cap.summary || capName}. Available on ${productCount} products. Compare plans, surfaces, and availability.`;

    // Insert framing after h1 (splice into content before definition section)
    const framingContext = { capName, count: productCount, changeNote: null };
    const framingHtml = renderPageFraming(framingCache || new Map(), `capability/${cap.id}/`, 'capability', framingContext);
    // Insert after breadcrumb + h1 + summary block
    const insertAfterPattern = cap.summary
        ? `<p class="bridge-summary">${escapeHTML(cap.summary)}</p>\n`
        : `<h1>${escapeHTML(capName)}</h1>\n`;
    if (framingHtml) {
        const insertIdx = content.indexOf(insertAfterPattern);
        if (insertIdx !== -1) {
            content = content.slice(0, insertIdx + insertAfterPattern.length) + framingHtml + content.slice(insertIdx + insertAfterPattern.length);
        }
    }

    return renderBridgeShell({
        title: `${capName} — Which AI Products Support It?`,
        canonicalPath: `capability/${cap.id}/`,
        depth: 2,
        content,
        structuredData,
        description
    });
}

/**
 * Generate a /best-for/{slug}/ page.
 */
function generateBestForPage(groupId, groupCaps, ontologyData) {
    const slug = GROUP_SLUG_MAP[groupId] || slugify(groupId);
    const displayName = GROUP_DISPLAY_MAP[groupId] || humanizeId(groupId);
    const groupDesc = GROUP_DESCRIPTION_MAP[groupId] || '';

    const hostedProducts = ontologyData.products.filter(p => p.product_kind !== 'runtime');

    let content = `<nav class="breadcrumb" aria-label="Breadcrumb"><a href="../../index.html">Home</a> › Best for ${escapeHTML(displayName)}</nav>\n`;
    content += `<h1>Best AI for ${escapeHTML(displayName)}</h1>\n`;
    if (groupDesc) content += `<p class="bridge-summary">${escapeHTML(groupDesc)}</p>\n`;

    // Availability grid
    content += `<section class="bridge-section">\n<h2>Capability Coverage</h2>\n`;
    content += `<table class="plan-table"><thead><tr><th>Capability</th>`;
    for (const prod of hostedProducts) {
        content += `<th>${escapeHTML(prod.name)}</th>`;
    }
    content += `</tr></thead><tbody>\n`;

    for (const cap of groupCaps) {
        content += `<tr><td><a href="../../capability/${cap.id}/">${escapeHTML(cap.name)}</a></td>`;
        for (const prod of hostedProducts) {
            const gating = findBestGating(prod.id, cap.id, ontologyData);
            if (gating) {
                content += `<td class="gating-${gating}"><a href="../../can/${prod.id}/${cap.id}/">${escapeHTML(gating)}</a></td>`;
            } else {
                content += `<td class="gating-none">—</td>`;
            }
        }
        content += `</tr>\n`;
    }
    content += `</tbody></table>\n</section>\n`;

    // Per-capability summaries
    for (const cap of groupCaps) {
        content += `<section class="bridge-section">\n<h2>${escapeHTML(cap.name)}</h2>\n`;
        if (cap.summary) content += `<p>${escapeHTML(cap.summary)}</p>\n`;
        content += `<p><a href="../../capability/${cap.id}/">See full details →</a></p>\n</section>\n`;
    }

    content += `<p class="bridge-cta"><a href="../../index.html">← Browse all capabilities</a></p>\n`;

    const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: `Best AI for ${displayName}`,
        itemListElement: groupCaps.map((cap, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: cap.name,
            url: `${SITE_URL}capability/${cap.id}/`
        }))
    };

    const description = `Compare AI products for ${displayName.toLowerCase()}: ${groupCaps.map(c => c.name).join(', ')}. Side-by-side availability across ${hostedProducts.length} products.`;

    return renderBridgeShell({
        title: `Best AI for ${displayName}`,
        canonicalPath: `best-for/${slug}/`,
        depth: 2,
        content,
        structuredData,
        description
    });
}

/**
 * Generate a "See Also" section linking to related pages of different types.
 *
 * @param {string} currentType - 'capability' | 'comparison' | 'changes' | 'coverage'
 * @param {Object} context - { capId, productIds, productId }
 * @param {Object} ontologyData
 * @param {string} prefix - path prefix (e.g. '../../')
 * @returns {string} HTML section
 */
function generateSeeAlso(currentType, context, ontologyData, prefix) {
    const links = [];
    const hostedProducts = ontologyData.products.filter(p => p.product_kind !== 'runtime');

    if (currentType === 'capability' && context.capId) {
        const capId = context.capId;
        // 1. Link to compare pages involving products with this capability
        const productsWithCap = hostedProducts.filter(p =>
            ontologyData.implementations.some(i => i.product === p.id && i.capabilities && i.capabilities.includes(capId))
        );
        // Pick 2 compare pairs
        for (let i = 0; i < Math.min(2, productsWithCap.length - 1); i++) {
            const pA = productsWithCap[i];
            const pB = productsWithCap[i + 1];
            if (pA && pB) {
                const [idA, idB] = [pA.id, pB.id].sort();
                links.push({ href: `${prefix}compare/${idA}-vs-${idB}/`, text: `Compare ${pA.name} vs ${pB.name}` });
            }
        }
        // 2. Link to related coverage pages (first matching one)
        const coverageMap = {
            'write-and-edit-code': { id: 'coding-tools', label: 'AI Coding Tools Coverage' },
            'hear-audio-and-speech': { id: 'voice-tools', label: 'AI Voice Tools Coverage' },
            'speak-back-in-real-time': { id: 'voice-tools', label: 'AI Voice Tools Coverage' },
            'generate-images': { id: 'image-tools', label: 'AI Image Tools Coverage' },
            'see-images-and-screens': { id: 'image-tools', label: 'AI Image Tools Coverage' },
            'search-the-web': { id: 'research-tools', label: 'AI Research Tools Coverage' },
            'do-multi-step-research': { id: 'research-tools', label: 'AI Research Tools Coverage' },
            'take-actions-and-run-tools': { id: 'agent-tools', label: 'AI Agent Tools Coverage' },
            'build-reusable-ai-workflows': { id: 'agent-tools', label: 'AI Agent Tools Coverage' },
        };
        if (coverageMap[capId]) {
            links.push({ href: `${prefix}coverage/${coverageMap[capId].id}/`, text: coverageMap[capId].label });
        } else {
            links.push({ href: `${prefix}coverage/free-tools/`, text: 'Free AI Tools Coverage' });
        }
        // 3. Link to changes index
        links.push({ href: `${prefix}changes/`, text: 'Recent AI Tool Changes' });
    }

    if (currentType === 'comparison' && context.productIds) {
        const [idA, idB] = context.productIds;
        // 1. Link to other comparisons involving each product
        for (const prod of hostedProducts.slice(0, 2)) {
            if (prod.id !== idA && prod.id !== idB) {
                const [pA, pB] = [idA, prod.id].sort();
                links.push({ href: `${prefix}compare/${pA}-vs-${pB}/`, text: `Compare ${hostedProducts.find(p => p.id === idA)?.name || idA} vs ${prod.name}` });
                break;
            }
        }
        // 2. Links to changes pages for each product
        links.push({ href: `${prefix}changes/${idA}/`, text: `${hostedProducts.find(p => p.id === idA)?.name || idA} Recent Changes` });
        links.push({ href: `${prefix}changes/${idB}/`, text: `${hostedProducts.find(p => p.id === idB)?.name || idB} Recent Changes` });
        // 3. Link to a coverage page
        links.push({ href: `${prefix}coverage/free-tools/`, text: 'Free AI Tools Coverage' });
    }

    if (currentType === 'changes' && context.productId) {
        const productId = context.productId;
        const prod = hostedProducts.find(p => p.id === productId);
        // 1. Compare pages involving this product
        const otherProds = hostedProducts.filter(p => p.id !== productId).slice(0, 2);
        for (const other of otherProds) {
            const [pA, pB] = [productId, other.id].sort();
            links.push({ href: `${prefix}compare/${pA}-vs-${pB}/`, text: `${prod?.name || productId} vs ${other.name}` });
        }
        // 2. Coverage pages
        links.push({ href: `${prefix}coverage/free-tools/`, text: 'Free AI Tools Coverage' });
        links.push({ href: `${prefix}changes/`, text: 'All AI Tool Changes' });
    }

    if (links.length === 0) return '';

    let html = `<section class="bridge-section see-also-section">\n<h2>See Also</h2>\n<ul>\n`;
    for (const link of links.slice(0, 5)) {
        html += `<li><a href="${escapeHTML(link.href)}">${escapeHTML(link.text)}</a></li>\n`;
    }
    html += `</ul>\n</section>\n`;
    return html;
}

/**
 * Find the best (most accessible) gating level for a product+capability combo.
 */
function findBestGating(productId, capId, ontologyData) {
    const gatingOrder = ['free', 'limited', 'paid'];
    let best = null;
    for (const impl of ontologyData.implementations) {
        if (impl.product === productId && impl.capabilities && impl.capabilities.includes(capId)) {
            const g = impl.source?.feature?.gating;
            if (g && (!best || gatingOrder.indexOf(g) < gatingOrder.indexOf(best))) {
                best = g;
            }
        }
    }
    return best;
}

/**
 * Generate /coverage/{id}/ pages — capability coverage sliced by user intent.
 * Each coverage page shows a matrix of products x capabilities for a given filter.
 *
 * @param {Object} ontologyData
 * @param {Object} discoveryConfig - parsed discovery.yml with coverage_pages
 * @param {Map} framingCache
 */
function generateCoveragePages(ontologyData, discoveryConfig, framingCache) {
    const pages = {};
    const hostedProducts = ontologyData.products.filter(p => p.product_kind !== 'runtime');
    const fc = framingCache || new Map();

    // Coverage page definitions from discovery.yml
    const coverageDefs = discoveryConfig && discoveryConfig.coverage_pages ? discoveryConfig.coverage_pages : [];

    // Predefined capability sets for each coverage page (fallback if not in discovery.yml)
    const COVERAGE_CAP_SETS = {
        'free-tools': null, // uses gating filter
        'coding-tools': ['write-and-edit-code', 'build-reusable-ai-workflows', 'take-actions-and-run-tools'],
        'voice-tools': ['hear-audio-and-speech', 'speak-back-in-real-time'],
        'image-tools': ['generate-images', 'see-images-and-screens', 'generate-video'],
        'research-tools': ['search-the-web', 'do-multi-step-research'],
        'agent-tools': ['take-actions-and-run-tools', 'build-reusable-ai-workflows', 'connect-to-external-systems']
    };

    const COVERAGE_CONTEXT = {
        'free-tools': 'for free across AI tools',
        'coding-tools': 'with AI coding tools',
        'voice-tools': 'with AI voice and audio tools',
        'image-tools': 'with AI image tools',
        'research-tools': 'with AI research tools',
        'agent-tools': 'with AI agent tools'
    };

    // Ensure we have coverage defs for all expected pages
    const allCoverageIds = ['free-tools', 'coding-tools', 'voice-tools', 'image-tools', 'research-tools', 'agent-tools'];
    const effectiveDefs = allCoverageIds.map(id => {
        const fromYml = coverageDefs.find(d => d.id === id);
        if (fromYml) return fromYml;
        // Fallback defaults
        const titles = {
            'free-tools': 'Free AI Tools: What You Can Actually Do Without Paying',
            'coding-tools': 'AI Coding Tools Compared',
            'voice-tools': 'AI Voice and Audio Tools',
            'image-tools': 'AI Image Tools: Generation and Vision',
            'research-tools': 'AI Research Tools',
            'agent-tools': 'AI Agent Tools'
        };
        return { id, title: titles[id] };
    });

    for (const def of effectiveDefs) {
        const { id, title } = def;
        const pagePath = `coverage/${id}/`;

        // Determine which capabilities to show
        let targetCapIds = COVERAGE_CAP_SETS[id];
        let useGatingFilter = id === 'free-tools';

        // For filter-based pages, determine capabilities dynamically
        if (useGatingFilter) {
            // All capabilities that have at least one free implementation
            targetCapIds = ontologyData.capabilities
                .filter(cap => ontologyData.implementations.some(
                    impl => impl.capabilities && impl.capabilities.includes(cap.id) && impl.source?.feature?.gating === 'free'
                ))
                .map(c => c.id);
        }

        // Filter to caps that actually exist in our data
        const targetCaps = (targetCapIds || [])
            .map(cid => ontologyData.capabilities.find(c => c.id === cid))
            .filter(Boolean);

        if (targetCaps.length === 0) continue;

        // Build coverage matrix: for each cap x product, determine coverage level
        // cov-yes = free, cov-limited = limited/free-with-limits, cov-paid = paid only, cov-no = not available
        function getCoverageLevel(productId, capId) {
            const impls = ontologyData.implementations.filter(
                i => i.product === productId && i.capabilities && i.capabilities.includes(capId)
            );
            if (impls.length === 0) return 'no';
            const gatings = impls.map(i => i.source?.feature?.gating).filter(Boolean);
            if (gatings.includes('free')) return 'free';
            if (gatings.includes('limited')) return 'limited';
            if (gatings.includes('paid')) return 'paid';
            return 'unknown';
        }

        // For free-tools page, only show products+caps with at least one free option
        const relevantProducts = useGatingFilter
            ? hostedProducts.filter(p => targetCaps.some(cap => getCoverageLevel(p.id, cap.id) === 'free'))
            : hostedProducts;

        // Compute framing context
        const framingContext = {
            coverageContext: COVERAGE_CONTEXT[id] || 'with AI tools',
            productCount: relevantProducts.length
        };

        // Build matrix HTML
        function coverageCell(level) {
            switch (level) {
                case 'free': return { cls: 'cov-yes', text: '✓ Free' };
                case 'limited': return { cls: 'cov-limited', text: '~ Limited' };
                case 'paid': return { cls: 'cov-paid', text: '$ Paid' };
                case 'unknown': return { cls: 'cov-limited', text: '?' };
                default: return { cls: 'cov-no', text: '—' };
            }
        }

        let matrixHtml = '<div class="coverage-matrix">\n<table>\n<thead>\n<tr>\n';
        matrixHtml += '<th>Capability</th>\n';
        for (const prod of relevantProducts) {
            matrixHtml += `<th>${escapeHTML(prod.name)}</th>\n`;
        }
        matrixHtml += '</tr>\n</thead>\n<tbody>\n';

        // Find gaps: capabilities no product has for free
        const gaps = [];
        for (const cap of targetCaps) {
            matrixHtml += `<tr>\n<td><a href="../../capability/${escapeHTML(cap.id)}/">${escapeHTML(cap.name)}</a></td>\n`;
            let hasFree = false;
            for (const prod of relevantProducts) {
                const level = getCoverageLevel(prod.id, cap.id);
                if (level === 'free') hasFree = true;
                const cell = coverageCell(level);
                matrixHtml += `<td class="${cell.cls}">${cell.text}</td>\n`;
            }
            if (!hasFree && useGatingFilter) {
                gaps.push(cap.name);
            }
            matrixHtml += '</tr>\n';
        }
        matrixHtml += '</tbody>\n</table>\n</div>\n';

        // Build page content
        let content = `<nav class="breadcrumb" aria-label="Breadcrumb"><a href="../../index.html">Home</a> › Coverage › ${escapeHTML(title)}</nav>\n`;
        content += `<h1>${escapeHTML(title)}</h1>\n`;
        content += renderPageFraming(fc, pagePath, 'coverage', framingContext);

        // Legend
        content += `<p class="bridge-summary"><span style="color:#22c55e">✓ Free</span> = available on free plan · <span style="color:#f59e0b">~ Limited</span> = limited free access · <span style="color:#3b82f6">$ Paid</span> = paid plan required · — = not available</p>\n`;

        content += matrixHtml;

        // Gap callouts
        if (gaps.length > 0) {
            content += `<div class="coverage-gap-callout"><strong>Gap:</strong> No product currently offers ${gaps.slice(0, 3).map(g => escapeHTML(g)).join(', ')} for free.</div>\n`;
        }

        // Cross-links to related pages
        content += `<h2>Related Pages</h2>\n`;
        content += `<nav class="coverage-hub-links" aria-label="Coverage related pages">\n`;
        for (const cap of targetCaps.slice(0, 6)) {
            content += `<a href="../../capability/${escapeHTML(cap.id)}/" class="coverage-hub-link">${escapeHTML(cap.name)}</a>\n`;
        }
        // Link to compare pages for top products
        for (const prod of relevantProducts.slice(0, 2)) {
            const compareId = `compare/${prod.id}-vs-${relevantProducts[0]?.id === prod.id ? relevantProducts[1]?.id : relevantProducts[0]?.id}/`;
            if (compareId && !compareId.includes('undefined')) {
                content += `<a href="../../${escapeHTML(compareId)}" class="coverage-hub-link">Compare ${escapeHTML(prod.name)}</a>\n`;
            }
        }
        content += `</nav>\n`;
        content += `<p class="bridge-cta"><a href="../../index.html">← Browse all capabilities</a></p>\n`;

        // Structured data
        const structuredData = {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: title,
            description: `Coverage of ${targetCaps.map(c => c.name).join(', ')} across ${relevantProducts.length} AI products.`,
            numberOfItems: targetCaps.length,
            itemListElement: targetCaps.map((cap, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                name: cap.name,
                url: `${SITE_URL}capability/${cap.id}/`
            }))
        };

        const description = `${title}. Coverage of ${targetCaps.length} capabilities across ${relevantProducts.length} AI products, with verified data on free vs paid access.`;

        pages[`coverage/${id}/index.html`] = renderBridgeShell({
            title,
            canonicalPath: pagePath,
            depth: 2,
            content,
            structuredData,
            description
        });
    }

    return pages;
}

/**
 * Generate /changes/ index and per-product change history pages.
 * Data source: evidence/index.json changelog entries.
 *
 * Returns a map of { relativePath: html } like other bridge page generators.
 */
function generateChangesPages(ontologyData, framingCache) {
    const pages = {};
    const fc = framingCache || new Map();
    const evidenceRecords = ontologyData.evidence || [];
    const hostedProducts = ontologyData.products.filter(p => p.product_kind !== 'runtime');

    // Build a flat list of all changelog events enriched with product/impl context
    const allChanges = [];
    const implById = new Map(ontologyData.implementations.map(i => [i.id, i]));

    for (const rec of evidenceRecords) {
        if (!rec.changelog || rec.changelog.length === 0) continue;
        const productMatch = rec.source_file && rec.source_file.match(/platforms\/(\w+)\.md/);
        if (!productMatch) continue;
        const productId = productMatch[1];
        const product = hostedProducts.find(p => p.id === productId);
        if (!product) continue;

        // Find the corresponding implementation to get capabilities
        const implId = `implementation-${rec.entity_id}`;
        const impl = implById.get(rec.entity_id) || implById.get(implId) ||
            ontologyData.implementations.find(i => i.id === rec.entity_id || i.id === implId);
        const caps = impl ? (impl.capabilities || []) : [];

        for (const entry of rec.changelog) {
            if (!entry.date || !entry.change) continue;
            allChanges.push({
                date: entry.date.split('T')[0],
                dateRaw: entry.date,
                productId,
                productName: product.name,
                featureName: rec.source_heading || rec.entity_id,
                change: entry.change,
                capabilities: caps,
                entityId: rec.entity_id,
                implId: impl ? impl.id : null,
            });
        }
    }

    // Sort reverse chronological
    allChanges.sort((a, b) => b.dateRaw.localeCompare(a.dateRaw));

    // Helper: render a list of change entries as timeline HTML
    function renderChangesList(changes, depth) {
        if (changes.length === 0) return '<p class="no-changes">No changes recorded.</p>\n';
        const prefix = depth > 0 ? '../'.repeat(depth) : '';

        // Group by date
        const byDate = new Map();
        for (const c of changes) {
            if (!byDate.has(c.date)) byDate.set(c.date, []);
            byDate.get(c.date).push(c);
        }

        let html = '<div class="changes-timeline">\n';
        for (const [date, entries] of byDate) {
            html += `<div class="changes-date-group">\n`;
            html += `<h3 class="changes-date">${escapeHTML(date)}</h3>\n`;
            html += '<ul class="changes-entries">\n';
            for (const e of entries) {
                const productLink = `<a href="${prefix}changes/${escapeHTML(e.productId)}/">${escapeHTML(e.productName)}</a>`;
                const capLinks = e.capabilities.map(capId => {
                    const cap = ontologyData.capabilities.find(c => c.id === capId);
                    return cap ? `<a href="${prefix}capability/${escapeHTML(capId)}/">${escapeHTML(cap.name)}</a>` : '';
                }).filter(Boolean).join(', ');
                html += `<li class="change-entry">\n`;
                html += `  <span class="change-product-badge">${productLink}</span>\n`;
                html += `  <span class="change-feature">${escapeHTML(e.featureName)}</span>\n`;
                html += `  <span class="change-text">${escapeHTML(e.change)}</span>\n`;
                if (capLinks) html += `  <span class="change-caps">Affects: ${capLinks}</span>\n`;
                html += `</li>\n`;
            }
            html += '</ul>\n';
            html += '</div>\n';
        }
        html += '</div>\n';
        return html;
    }

    // Helper: compute lastmod from changes list
    function changesLastmod(changes) {
        const dates = changes.map(c => c.dateRaw).sort();
        return dates.slice(-1)[0] ? dates.slice(-1)[0].split('T')[0] : new Date().toISOString().split('T')[0];
    }

    // --- /changes/ index page ---
    const recentChanges = allChanges.slice(0, 100); // cap for index page
    const lastmodAll = changesLastmod(allChanges);
    const changesCount30d = allChanges.filter(c => {
        const d = new Date(c.dateRaw);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 30);
        return d >= cutoff;
    }).length;

    const latestChangeText = allChanges[0] ? allChanges[0].change.slice(0, 80) : null;
    let indexContent = `<nav class="breadcrumb" aria-label="Breadcrumb"><a href="../index.html">Home</a> › Recent Changes</nav>\n`;
    indexContent += `<h1>Recent AI Tool Changes</h1>\n`;
    indexContent += renderPageFraming(fc, 'changes/', 'changes', {
        scope: 'AI tools across ChatGPT, Claude, Gemini, Copilot, Grok, and Perplexity',
        count30d: changesCount30d,
        latestChange: latestChangeText
    });

    // Per-product quick links
    indexContent += `<nav class="changes-product-nav" aria-label="Changes by product">\n`;
    for (const prod of hostedProducts) {
        const count = allChanges.filter(c => c.productId === prod.id).length;
        if (count > 0) {
            indexContent += `<a href="../changes/${escapeHTML(prod.id)}/" class="changes-product-link">${escapeHTML(prod.name)} (${count})</a>\n`;
        }
    }
    indexContent += `</nav>\n`;

    indexContent += `<h2>All Recent Changes</h2>\n`;
    indexContent += renderChangesList(recentChanges, 1);
    indexContent += `<p class="bridge-cta"><a href="../index.html">← Browse capabilities</a></p>\n`;

    const indexStructuredData = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Recent AI Tool Changes',
        description: `Verified changes to AI tools. ${changesCount30d} changes in the last 30 days.`,
        numberOfItems: recentChanges.length,
        itemListElement: recentChanges.slice(0, 20).map((c, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: `${c.productName}: ${c.featureName} — ${c.change.slice(0, 100)}`,
            description: c.change,
        }))
    };

    pages[`changes/index.html`] = renderBridgeShell({
        title: 'Recent AI Tool Changes',
        canonicalPath: 'changes/',
        depth: 1,
        content: indexContent,
        structuredData: indexStructuredData,
        description: `Verified changelog for AI tools: ChatGPT, Claude, Gemini, Copilot, Grok, Perplexity. ${changesCount30d} changes in the last 30 days. Last updated ${lastmodAll}.`
    });

    // --- /changes/{product}/ pages ---
    for (const prod of hostedProducts) {
        const productChanges = allChanges.filter(c => c.productId === prod.id);
        if (productChanges.length === 0) continue;

        const lastmod = changesLastmod(productChanges);
        const count30d = productChanges.filter(c => {
            const d = new Date(c.dateRaw);
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - 30);
            return d >= cutoff;
        }).length;

        const latestProdChange = productChanges[0] ? productChanges[0].change.slice(0, 80) : null;
        let prodContent = `<nav class="breadcrumb" aria-label="Breadcrumb"><a href="../../index.html">Home</a> › <a href="../../changes/">Changes</a> › ${escapeHTML(prod.name)}</nav>\n`;
        prodContent += `<h1>${escapeHTML(prod.name)} Recent Changes</h1>\n`;
        prodContent += renderPageFraming(fc, `changes/${prod.id}/`, 'changes', {
            scope: prod.name,
            count30d,
            latestChange: latestProdChange
        });
        prodContent += renderChangesList(productChanges, 2);
        prodContent += generateSeeAlso('changes', { productId: prod.id }, ontologyData, '../../');
        prodContent += `<p class="bridge-cta"><a href="../../changes/">← All product changes</a> · <a href="../../index.html">Browse capabilities</a></p>\n`;

        const prodStructuredData = {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: `${prod.name} Recent Changes`,
            description: `Verified changelog for ${prod.name}. ${productChanges.length} changes recorded.`,
            numberOfItems: productChanges.length,
            itemListElement: productChanges.slice(0, 20).map((c, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                name: `${c.featureName} — ${c.change.slice(0, 100)}`,
                description: c.change,
            }))
        };

        pages[`changes/${prod.id}/index.html`] = renderBridgeShell({
            title: `${prod.name} Recent Changes`,
            canonicalPath: `changes/${prod.id}/`,
            depth: 2,
            content: prodContent,
            structuredData: prodStructuredData,
            description: `Verified changelog for ${prod.name}. ${productChanges.length} total changes, ${count30d} in the last 30 days. Last updated ${lastmod}.`
        });
    }

    return pages;
}

/**
 * Generate all bridge pages and return a map of { relativePath: html }.
 */
function generateBridgePages(ontologyData, framingCache, discoveryConfig) {
    const pages = {};
    const hostedProducts = ontologyData.products.filter(p => p.product_kind !== 'runtime');
    const fc = framingCache || new Map();

    // 1. /can/{product}/{capability}/ pages
    for (const prod of hostedProducts) {
        for (const cap of ontologyData.capabilities) {
            // Check if there's any implementation for this combo
            const hasImpl = ontologyData.implementations.some(
                i => i.product === prod.id && i.capabilities && i.capabilities.includes(cap.id)
            );
            if (hasImpl) {
                const html = generateCanPage(prod.id, cap.id, ontologyData);
                if (html) pages[`can/${prod.id}/${cap.id}/index.html`] = html;
            }
        }
    }

    // 2. /compare/{a}-vs-{b}/ pages
    for (let i = 0; i < hostedProducts.length; i++) {
        for (let j = i + 1; j < hostedProducts.length; j++) {
            const idA = hostedProducts[i].id;
            const idB = hostedProducts[j].id;
            // Build comparison data
            const capsA = new Set();
            const capsB = new Set();
            for (const impl of ontologyData.implementations) {
                if (impl.product === idA && impl.capabilities) impl.capabilities.forEach(c => capsA.add(c));
                if (impl.product === idB && impl.capabilities) impl.capabilities.forEach(c => capsB.add(c));
            }
            const shared = [...capsA].filter(c => capsB.has(c));
            const onlyA = [...capsA].filter(c => !capsB.has(c));
            const onlyB = [...capsB].filter(c => !capsA.has(c));
            const comparison = {
                products: [idA, idB],
                shared_capabilities: shared,
                only_a: onlyA,
                only_b: onlyB,
                shared_count: shared.length,
                only_a_count: onlyA.length,
                only_b_count: onlyB.length
            };
            const html = generateCompareBridgePage(comparison, ontologyData, fc);
            if (html) pages[`compare/${idA}-vs-${idB}/index.html`] = html;
        }
    }

    // 3. /capability/{slug}/ pages
    for (const cap of ontologyData.capabilities) {
        const html = generateCapabilityPage(cap, ontologyData, fc);
        if (html) pages[`capability/${cap.id}/index.html`] = html;
    }

    // 4. /best-for/{slug}/ pages
    const groups = {};
    for (const cap of ontologyData.capabilities) {
        const g = cap.group || 'other';
        if (!groups[g]) groups[g] = [];
        groups[g].push(cap);
    }
    for (const [groupId, groupCaps] of Object.entries(groups)) {
        if (GROUP_SLUG_MAP[groupId]) {
            const html = generateBestForPage(groupId, groupCaps, ontologyData);
            if (html) pages[`best-for/${GROUP_SLUG_MAP[groupId]}/index.html`] = html;
        }
    }

    // 5. /changes/ and /changes/{product}/ pages
    const changesPages = generateChangesPages(ontologyData, fc);
    Object.assign(pages, changesPages);

    // 6. /coverage/{id}/ pages
    const coveragePages = generateCoveragePages(ontologyData, discoveryConfig, fc);
    Object.assign(pages, coveragePages);

    return pages;
}

/**
 * Generate sitemap.xml including all bridge pages.
 */
/**
 * Generate robots.txt with references to sitemap, llms.txt, agents.json, and feed.
 */
function generateRobotsTxt() {
    return `# ${DASHBOARD_TITLE} - ${SITE_URL}
# The JSON API at /api/v1/ is intended for machine consumption.
# Please cache responses and avoid polling more than once per hour.

User-agent: *
Allow: /

# Crawl-delay is advisory; we ask that automated consumers
# space requests by at least 1 second.
Crawl-delay: 1

Sitemap: ${SITE_URL}sitemap.xml
# LLM-readable site summary
# ${SITE_URL}llms.txt
# Agent capability manifest
# ${SITE_URL}agents.json
# RSS feed of recent changes
# ${SITE_URL}index.xml
`;
}

/**
 * Generate llms.txt following the llms.txt spec (H1, blockquote, details, H2 link lists).
 * Dynamic counts from ontologyData keep it current with each build.
 */
function generateLlmsTxt(ontologyData) {
    const capCount = ontologyData.capabilities.length;
    const implCount = ontologyData.implementations.filter(i => i.source).length;
    const prodCount = ontologyData.products.filter(p => p.product_kind !== 'runtime').length;
    const providerCount = ontologyData.providers.length;
    const modelCount = (ontologyData.model_access || []).length;

    return `# ${DASHBOARD_TITLE}

> What can this AI actually do?

A plain-English reference for AI capabilities, plans, constraints, and implementations across major subscription AI products (ChatGPT, Claude, Gemini, Copilot, Grok, Perplexity) and open models.

Maintained by PAICE.work. Updated weekly via multi-model verification cascade.

## What this site covers

- ${capCount} capabilities (e.g., Search the Web, Generate Images, Write and Edit Code)
- ${implCount} implementations across ${prodCount} subscription AI products
- ${modelCount} open-model access records (Llama, Qwen, DeepSeek, Mistral, Codestral)
- Plan-level availability (which subscription tier unlocks what)
- Surface availability (web, desktop, mobile, terminal, API)
- Gating (free, paid, limited)
- Evidence with sources and changelog for every claim

## Machine-readable API

Stable JSON exports at: ${SITE_URL}api/v1/

Start with the index: ${SITE_URL}api/v1/index.json

### Available files

- [capabilities.json](${SITE_URL}api/v1/capabilities.json): All capabilities with search terms, definitions, and cross-links
- [products.json](${SITE_URL}api/v1/products.json): All products with provider links and implementation lists
- [implementations.json](${SITE_URL}api/v1/implementations.json): All implementations with capability mappings and evidence
- [providers.json](${SITE_URL}api/v1/providers.json): All providers with product lists
- [model-access.json](${SITE_URL}api/v1/model-access.json): Model access records with deployment and constraint details
- [evidence.json](${SITE_URL}api/v1/evidence.json): Evidence records with sources and changelog
- [capability-matrix.json](${SITE_URL}api/v1/capability-matrix.json): Capability x product availability grid
- [product-comparisons.json](${SITE_URL}api/v1/product-comparisons.json): Pairwise product capability overlap
- [plan-entitlements.json](${SITE_URL}api/v1/plan-entitlements.json): What each plan tier unlocks per product

### Data contract

- IDs are stable and safe to use as foreign keys
- Every record includes \`verified\` and \`checked\` dates for freshness
- File paths under /api/v1/ are stable within the version
- New fields may be added; existing fields will not be removed within v1

### Usage guidance

- Always include the \`verified\` date when citing data — the AI landscape changes weekly
- Respect gating and constraints — "available" does not mean "available to everyone"
- Don't strip caveats from talking points — they contain important context about restrictions
- Cache for up to 24 hours; don't poll more than once per hour
- Attribution appreciated: "Data from AI Tool Watch (${SITE_URL}) by PAICE.work"

## Agent access

- [agents.json](${SITE_URL}agents.json): Agent capability manifest describing API endpoints and MCP tools
- [MCP server](${REPO_URL}/blob/main/scripts/mcp-server.js): 15 read-only tools over stdio JSON-RPC
- [RSS feed](${SITE_URL}index.xml): Recent feature changes as RSS 2.0

## Site pages

- [Capabilities](${SITE_URL}): Capability-first homepage (what can AI do?)
- [Products](${SITE_URL}implementations.html): Product-first detailed availability
- [Compare](${SITE_URL}compare.html): Side-by-side product comparison
- [Limits](${SITE_URL}constraints.html): Access tiers, surfaces, and limits
- [Timeline](${SITE_URL}timeline.html): Chronological view of feature launches and changes
- [About](${SITE_URL}about.html): About the project
- [Pattern](${SITE_URL}pattern.html): Knowledge as Code: the development pattern behind this project

## Bridge pages (programmatic)

### Capability checks: /can/{product}/{capability}/
Answers "Can {product} {capability}?" with plan tables, constraints, and evidence.
Example: ${SITE_URL}can/chatgpt/search-the-web/

### Product comparisons: /compare/{product-a}-vs-{product-b}/
Side-by-side capability overlap between two products.
Example: ${SITE_URL}compare/chatgpt-vs-claude/

### Capability landings: /capability/{slug}/
All implementations of a capability across products.
Example: ${SITE_URL}capability/search-the-web/

### Use-case pages: /best-for/{use-case}/
Product coverage grid for a use-case category.
Example: ${SITE_URL}best-for/creative-work/

## Source

- [Repository](${REPO_URL}): GitHub
- License: MIT
- [Contact](${REPO_ISSUES_URL}): GitHub Issues
`;
}

/**
 * Generate agents.json — an agent capability manifest describing
 * the reference's queryable endpoints and MCP tools.
 */
function generateAgentsJson(ontologyData) {
    const timestamp = new Date().toISOString();
    const capCount = ontologyData.capabilities.length;
    const implCount = ontologyData.implementations.filter(i => i.source).length;
    const prodCount = ontologyData.products.filter(p => p.product_kind !== 'runtime').length;

    const manifest = {
        $schema: `${SITE_URL}schemas/agents-schema.json`,
        schema_version: '1.0',
        name: 'ai-tool-watch',
        display_name: DASHBOARD_TITLE,
        description: `A structured, version-controlled reference tracking ${capCount} AI capabilities across ${prodCount} products with ${implCount} implementations. Updated weekly via multi-model verification cascade.`,
        url: SITE_URL,
        repository: REPO_URL,
        license: 'MIT',
        maintainer: 'PAICE.work',
        generated: timestamp,
        capabilities: {
            read: true,
            write: false,
            search: true,
            compare: true,
            description: 'Read-only access to AI capability, product, and implementation data with search and comparison support.'
        },
        data_freshness: {
            update_frequency: 'weekly',
            verification_method: 'Multi-model cascade (Gemini, Perplexity, Grok, Claude)',
            freshness_fields: ['verified', 'checked', 'launched'],
            cache_ttl_hours: 24
        },
        api: {
            base_url: `${SITE_URL}api/v1/`,
            format: 'JSON',
            authentication: 'none',
            rate_limit: 'advisory: 1 request per second',
            stability: 'Paths and field names are stable within v1. New fields may be added.',
            endpoints: [
                { path: 'index.json', description: 'API manifest with all available file paths and counts' },
                { path: 'capabilities.json', description: 'All capabilities with search terms, definitions, and cross-links' },
                { path: 'products.json', description: 'All products with provider links and implementation lists' },
                { path: 'implementations.json', description: 'All implementations with plan/surface availability and evidence' },
                { path: 'providers.json', description: 'All providers with logos, websites, and product lists' },
                { path: 'model-access.json', description: 'Open-model records with deployment modes and constraints' },
                { path: 'evidence.json', description: 'Evidence records with sources, changelog, and verification dates' },
                { path: 'capability-matrix.json', description: 'Capability x product availability grid with best-gating per cell' },
                { path: 'product-comparisons.json', description: 'Pairwise product capability overlap for all hosted product pairs' },
                { path: 'plan-entitlements.json', description: 'Per-product breakdown of what each subscription plan unlocks' }
            ]
        },
        mcp: {
            transport: 'stdio',
            server_script: 'scripts/mcp-server.js',
            tools_count: 15,
            description: 'Read-only MCP server with 15 tools for querying capabilities, products, implementations, and evidence.',
            tools: [
                { name: 'list_capabilities', description: 'List all capabilities with IDs, names, and groups' },
                { name: 'get_capability', description: 'Full details for a capability by ID' },
                { name: 'list_products', description: 'List products, optionally filter by kind (hosted/runtime)' },
                { name: 'get_product', description: 'Full details for a product including plan names' },
                { name: 'compare_products', description: 'Pairwise capability overlap between two products' },
                { name: 'check_availability', description: 'Whether a product implements a capability, with gating and plan details' },
                { name: 'search', description: 'Keyword search across capabilities, products, implementations, and models' },
                { name: 'get_plan', description: 'Capabilities and implementations included in a specific product plan' },
                { name: 'list_providers', description: 'All providers with websites, status pages, and product lists' },
                { name: 'get_provider', description: 'Full details for a provider by ID' },
                { name: 'find_products_by_capabilities', description: 'Find products supporting ALL specified capabilities' },
                { name: 'get_evidence', description: 'Verification sources, changelog, and freshness dates for an implementation' },
                { name: 'list_model_access', description: 'All open/self-hostable models with deployment modes' },
                { name: 'get_model_access', description: 'Full details for an open model by ID' },
                { name: 'get_staleness_report', description: 'Evidence records whose verified date exceeds a threshold' }
            ]
        },
        discovery: {
            llms_txt: `${SITE_URL}llms.txt`,
            robots_txt: `${SITE_URL}robots.txt`,
            sitemap: `${SITE_URL}sitemap.xml`,
            rss_feed: `${SITE_URL}index.xml`,
            agents_json: `${SITE_URL}agents.json`
        }
    };

    return JSON.stringify(manifest, null, 2) + '\n';
}

/**
 * Generate RSS 2.0 feed (index.xml) from recent changelog entries.
 * Collects the same data as the timeline page, limited to the 50 most recent entries.
 */
function generateFeedXml(platforms) {
    const hostedPlatforms = platforms.filter(isPublicPlatform);
    const events = [];

    for (const platform of hostedPlatforms) {
        for (const feature of platform.features) {
            const featureId = featureCardId(platform.name, feature.name);
            const launchedDate = formatDateForDisplay(feature.launched);

            if (launchedDate) {
                events.push({
                    date: launchedDate,
                    product: platform.name,
                    feature: feature.name,
                    event: `${feature.name} launched`,
                    featureId
                });
            }

            for (const entry of (feature.changelog || [])) {
                const entryDate = formatDateForDisplay(entry.date);
                if (!entryDate) continue;
                if (entryDate === launchedDate && /launch/i.test(entry.change || '')) continue;
                events.push({
                    date: entryDate,
                    product: platform.name,
                    feature: feature.name,
                    event: entry.change || `${feature.name} updated`,
                    featureId
                });
            }
        }
    }

    events.sort((a, b) => b.date.localeCompare(a.date));
    const recent = events.slice(0, 50);
    const lastBuildDate = new Date().toUTCString();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
    <title>${escapeXml(DASHBOARD_TITLE)}</title>
    <link>${SITE_URL}</link>
    <description>Recent AI feature launches and changes across ChatGPT, Claude, Gemini, Copilot, Grok, and Perplexity.</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${SITE_URL}index.xml" rel="self" type="application/rss+xml"/>
`;

    for (const ev of recent) {
        const link = `${SITE_URL}implementations.html#impl-${ev.featureId}`;
        const pubDate = new Date(ev.date + 'T12:00:00Z').toUTCString();
        xml += `    <item>
        <title>${escapeXml(ev.product)} — ${escapeXml(ev.event)}</title>
        <link>${link}</link>
        <guid isPermaLink="true">${link}?d=${ev.date}</guid>
        <pubDate>${pubDate}</pubDate>
        <description>${escapeXml(ev.product)}: ${escapeXml(ev.event)}</description>
    </item>
`;
    }

    xml += `</channel>
</rss>
`;
    return xml;
}

function escapeXml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Generate a curated sitemap from discovery.yml tier-1 pages.
 * Only tier-1 pages from discovery_set are included. Bridge pages not in the
 * discovery_set are excluded — they're still served but not proactively pushed
 * to crawlers until the site gains authority.
 *
 * @param {string[]} bridgePagePaths - keys like "compare/chatgpt-vs-claude/index.html"
 * @param {Object} discoveryConfig - parsed discovery.yml
 * @param {Object[]} evidenceRecords - parsed evidence/index.json for lastmod
 */
function generateSitemap(bridgePagePaths, discoveryConfig, evidenceRecords) {
    const buildDate = new Date().toISOString().split('T')[0];
    const discovery = discoveryConfig || { sitemap_strategy: 'all', discovery_set: [] };

    // Build a product -> latest-changelog-date map for per-page lastmod
    const productLastmod = {};
    for (const rec of (evidenceRecords || [])) {
        const m = rec.source_file && rec.source_file.match(/platforms\/(\w+)\.md/);
        if (!m) continue;
        const prod = m[1];
        for (const entry of (rec.changelog || [])) {
            const d = entry.date ? entry.date.split('T')[0] : '';
            if (!productLastmod[prod] || d > productLastmod[prod]) productLastmod[prod] = d;
        }
    }
    const overallLatest = Object.values(productLastmod).sort().slice(-1)[0] || buildDate;

    // Build a set of bridge page URL paths for fast lookup
    const bridgeSet = new Set(bridgePagePaths.map(p => '/' + p.replace(/index\.html$/, '')));

    // Build sitemap entries from discovery_set (tier 1 only in curated mode)
    const included = [];
    const excluded = [];

    if (discovery.sitemap_strategy === 'curated') {
        const tier1 = (discovery.discovery_set || []).filter(e => e.tier === 1);
        const tier2 = (discovery.discovery_set || []).filter(e => e.tier === 2);
        for (const entry of tier1) {
            const urlPath = entry.path; // e.g. "/compare/chatgpt-vs-claude/"
            const relativePath = urlPath.replace(/^\//, '').replace(/\/$/, '/');
            // Determine lastmod: use product date if we can extract product from path
            let lastmod = overallLatest;
            const prodMatch = urlPath.match(/\/(changes|compare)\/([^/]+)/);
            if (prodMatch && productLastmod[prodMatch[2]]) {
                lastmod = productLastmod[prodMatch[2]];
            }
            included.push({ loc: `${SITE_URL}${relativePath}`, lastmod, priority: '0.9', changefreq: 'weekly' });
        }
        // Add tier 2 pages at lower priority
        for (const entry of tier2) {
            const urlPath = entry.path;
            const relativePath = urlPath.replace(/^\//, '').replace(/\/$/, '/');
            included.push({ loc: `${SITE_URL}${relativePath}`, lastmod: buildDate, priority: '0.7', changefreq: 'weekly' });
        }
        // Always include homepage at 1.0 if present
        const homepageEntry = included.find(e => e.loc === `${SITE_URL}` || e.loc === `${SITE_URL}/`);
        if (!homepageEntry) {
            included.unshift({ loc: `${SITE_URL}`, lastmod: overallLatest, priority: '1.0', changefreq: 'weekly' });
        } else {
            homepageEntry.priority = '1.0';
        }

        // Log excluded bridge pages
        for (const p of bridgePagePaths.sort()) {
            const urlPath = '/' + p.replace(/index\.html$/, '');
            const inDiscovery = (discovery.discovery_set || []).some(e => e.path === urlPath);
            if (!inDiscovery) excluded.push(urlPath);
        }
        if (excluded.length > 0) {
            console.log(`   Sitemap: excluded ${excluded.length} non-discovery-set pages (tier 3+)`);
        }
    } else {
        // Fallback: include everything (old behavior)
        included.push({ loc: `${SITE_URL}`, lastmod: overallLatest, priority: '1.0', changefreq: 'weekly' });
        const staticFallback = [
            { path: 'implementations.html', priority: '0.9' },
            { path: 'compare.html', priority: '0.8' },
            { path: 'constraints.html', priority: '0.8' },
            { path: 'timeline.html', priority: '0.7' },
            { path: 'about.html', priority: '0.5' },
        ];
        for (const p of staticFallback) {
            included.push({ loc: `${SITE_URL}${p.path}`, lastmod: buildDate, priority: p.priority, changefreq: 'weekly' });
        }
        for (const pagePath of bridgePagePaths.sort()) {
            const urlPath = pagePath.replace(/index\.html$/, '');
            let priority = '0.6';
            if (urlPath.startsWith('compare/')) priority = '0.7';
            else if (urlPath.startsWith('capability/')) priority = '0.7';
            else if (urlPath.startsWith('best-for/')) priority = '0.7';
            included.push({ loc: `${SITE_URL}${urlPath}`, lastmod: buildDate, priority, changefreq: 'weekly' });
        }
    }

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    for (const entry of included) {
        xml += `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>\n    <lastmod>${entry.lastmod}</lastmod>\n    <changefreq>${entry.changefreq}</changefreq>\n    <priority>${entry.priority}</priority>\n  </url>\n`;
    }
    xml += `</urlset>\n`;

    console.log(`   Sitemap strategy: ${discovery.sitemap_strategy} — ${included.length} URLs included`);
    return xml;
}

/**
 * Main build entry point.
 * Parses all platform files, generates HTML, and writes output files.
 */
function main() {
    console.log(`🔨 Building ${DASHBOARD_TITLE}...\n`);

    // Read active and hidden evidence platform files, but skip archived bundles.
    const files = listBuildPlatformFiles();
    console.log(`Found ${files.length} active platform files: ${files.join(', ')}`);

    const platforms = files.map(f => {
        const filepath = path.join(DATA_DIR, f);
        console.log(`  Parsing ${f}...`);
        const platform = parsePlatform(filepath);
        platform.source_file = path.relative(ROOT_DIR, filepath).replace(/\\/g, '/');
        return platform;
    });

    // Count features
    const totalFeatures = platforms.reduce((sum, p) => sum + p.features.length, 0);
    console.log(`\nParsed ${totalFeatures} features across ${platforms.length} platforms.`);

    // Load discovery configuration
    const discoveryConfig = parseDiscoveryYml(DISCOVERY_FILE);
    console.log(`\nDiscovery strategy: ${discoveryConfig.sitemap_strategy} — ${discoveryConfig.discovery_set.length} discovery pages, ${discoveryConfig.coverage_pages.length} coverage pages`);

    // Load framing cache (LLM-generated framing, pre-generated by generate-framing.js)
    const framingCache = loadFramingCache(FRAMING_CACHE_FILE);
    if (framingCache.size > 0) {
        console.log(`Loaded ${framingCache.size} framing entries from cache`);
    }

    // Load and enrich ontology data
    const ontologyData = loadOntologyData(platforms);

    // Ensure output directories exist
    const outputDir = path.dirname(IMPLEMENTATIONS_OUTPUT_FILE);
    const assetsDir = path.join(outputDir, 'assets');
    if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
    }

    // Phase 1: Build canonical data export (intermediate artifact)
    // This is the structured representation that feeds search, compare, export,
    // and will become the Phase 5 public JSON contract.
    const dataExport = buildDataExport(ontologyData);
    const dataExportJSON = JSON.stringify(dataExport);
    fs.writeFileSync(DATA_EXPORT_FILE, dataExportJSON);
    const counts = dataExport.meta.counts;
    console.log(`\n✅ Data export written to ${DATA_EXPORT_FILE}`);
    console.log(`   ${counts.providers} providers, ${counts.products} products, ${counts.capabilities} capabilities, ${counts.implementations} implementations (${(dataExportJSON.length / 1024).toFixed(1)} KB)`);

    // Phase 5B: Build API export files
    if (!fs.existsSync(API_OUTPUT_DIR)) {
        fs.mkdirSync(API_OUTPUT_DIR, { recursive: true });
    }
    const apiExport = buildAPIExport(ontologyData, platforms);
    let apiTotalSize = 0;
    for (const [filename, data] of Object.entries(apiExport)) {
        const content = JSON.stringify(data, null, 2);
        fs.writeFileSync(path.join(API_OUTPUT_DIR, filename), content);
        apiTotalSize += content.length;
    }
    console.log(`✅ API export written to ${API_OUTPUT_DIR}`);
    console.log(`   ${Object.keys(apiExport).length} files (${(apiTotalSize / 1024).toFixed(1)} KB total)`);

    // Phase 2: Generate HTML views from ontology data
    const implementationsHTML = generateHTML(platforms, ontologyData);
    const homepageHTML = generateCapabilitiesHTML(ontologyData);
    const constraintsHTML = generateConstraintsHTML(ontologyData, platforms);
    const compareHTML = generateCompareHTML(ontologyData);
    const timelineHTML = generateTimelineHTML(platforms, ontologyData);
    const redirectHTML = generateCapabilitiesRedirect();
    const aboutHTML = generateAboutHTML();

    // Phase 3: Write HTML output
    fs.writeFileSync(HOMEPAGE_OUTPUT_FILE, homepageHTML);
    console.log(`✅ Homepage written to ${HOMEPAGE_OUTPUT_FILE}`);
    console.log(`   File size: ${(homepageHTML.length / 1024).toFixed(1)} KB`);

    fs.writeFileSync(IMPLEMENTATIONS_OUTPUT_FILE, implementationsHTML);
    console.log(`✅ Implementation view written to ${IMPLEMENTATIONS_OUTPUT_FILE}`);
    console.log(`   File size: ${(implementationsHTML.length / 1024).toFixed(1)} KB`);

    fs.writeFileSync(CONSTRAINTS_OUTPUT_FILE, constraintsHTML);
    console.log(`✅ Constraint view written to ${CONSTRAINTS_OUTPUT_FILE}`);
    console.log(`   File size: ${(constraintsHTML.length / 1024).toFixed(1)} KB`);

    fs.writeFileSync(COMPARE_OUTPUT_FILE, compareHTML);
    console.log(`✅ Compare page written to ${COMPARE_OUTPUT_FILE}`);
    console.log(`   File size: ${(compareHTML.length / 1024).toFixed(1)} KB`);

    fs.writeFileSync(TIMELINE_OUTPUT_FILE, timelineHTML);
    console.log(`✅ Timeline written to ${TIMELINE_OUTPUT_FILE}`);
    console.log(`   File size: ${(timelineHTML.length / 1024).toFixed(1)} KB`);

    fs.writeFileSync(CAPABILITIES_REDIRECT_FILE, redirectHTML);
    console.log(`✅ Capabilities redirect written to ${CAPABILITIES_REDIRECT_FILE}`);

    const notFoundHTML = generate404HTML();
    fs.writeFileSync(NOT_FOUND_OUTPUT_FILE, notFoundHTML);
    console.log(`✅ 404 page written to ${NOT_FOUND_OUTPUT_FILE}`);

    const aboutFile = path.join(outputDir, 'about.html');
    fs.writeFileSync(aboutFile, aboutHTML);
    console.log(`✅ About page written to ${aboutFile}`);
    console.log(`   File size: ${(aboutHTML.length / 1024).toFixed(1)} KB`);

    // Phase 5C: Generate bridge pages (includes changes + coverage pages)
    const bridgePages = generateBridgePages(ontologyData, framingCache, discoveryConfig);
    let bridgeCount = 0;
    let bridgeTotalSize = 0;
    for (const [relPath, html] of Object.entries(bridgePages)) {
        const fullPath = path.join(BRIDGE_OUTPUT_DIR, relPath);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(fullPath, html);
        bridgeCount++;
        bridgeTotalSize += html.length;
    }
    console.log(`✅ Bridge pages written: ${bridgeCount} pages (${(bridgeTotalSize / 1024).toFixed(1)} KB total)`);

    // Generate sitemap with bridge pages (curated via discovery.yml)
    const sitemapXml = generateSitemap(Object.keys(bridgePages), discoveryConfig, ontologyData.evidence);
    fs.writeFileSync(path.join(outputDir, 'sitemap.xml'), sitemapXml);
    console.log(`✅ Sitemap written`);

    // Generate machine-readable discovery files
    const robotsTxt = generateRobotsTxt();
    fs.writeFileSync(path.join(outputDir, 'robots.txt'), robotsTxt);
    console.log(`✅ robots.txt written`);

    const llmsTxt = generateLlmsTxt(ontologyData);
    fs.writeFileSync(path.join(outputDir, 'llms.txt'), llmsTxt);
    console.log(`✅ llms.txt written (${(llmsTxt.length / 1024).toFixed(1)} KB)`);

    const agentsJson = generateAgentsJson(ontologyData);
    fs.writeFileSync(path.join(outputDir, 'agents.json'), agentsJson);
    console.log(`✅ agents.json written (${(agentsJson.length / 1024).toFixed(1)} KB)`);

    const feedXml = generateFeedXml(platforms);
    fs.writeFileSync(path.join(outputDir, 'index.xml'), feedXml);
    console.log(`✅ index.xml (RSS feed) written (${(feedXml.length / 1024).toFixed(1)} KB)`);
}

main();
