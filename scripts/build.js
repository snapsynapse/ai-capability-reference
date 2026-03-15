#!/usr/bin/env node

/**
 * AI Capability Reference - Static Site Generator
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
const IMPLEMENTATIONS_OUTPUT_FILE = path.join(__dirname, '..', 'docs', 'implementations.html');
const HOMEPAGE_OUTPUT_FILE = path.join(__dirname, '..', 'docs', 'index.html');
const CONSTRAINTS_OUTPUT_FILE = path.join(__dirname, '..', 'docs', 'constraints.html');
const CAPABILITIES_REDIRECT_FILE = path.join(__dirname, '..', 'docs', 'capabilities.html');
const COMPARE_OUTPUT_FILE = path.join(__dirname, '..', 'docs', 'compare.html');
const DATA_EXPORT_FILE = path.join(__dirname, '..', 'docs', 'assets', 'data.json');
const REPO_URL = 'https://github.com/snapsynapse/ai-capability-reference';
const REPO_ISSUES_URL = `${REPO_URL}/issues`;
const REPO_PULLS_URL = `${REPO_URL}/pulls`;
const SITE_URL = 'https://airef.snapsynapse.com/';
const DASHBOARD_TITLE = 'AI Capability Reference';
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

function evidenceKey(entityType, entityId) {
    return `${entityType}:${entityId}`;
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
    if (p === '$0' || p === 'free') return '$0/mo';
    if (p.includes('custom') || p.includes('contact')) return 'Enterprise';
    if (p.includes('/user/mo')) return 'Team';
    if (planName && planName.toLowerCase().includes('team')) return 'Team';
    if (price.includes('/mo')) return price.trim();
    if (price.match(/^\$\d+$/)) return price + '/mo';
    return price.trim();
}

/**
 * Convert price to URL-safe slug for data attributes
 * @param {string} price - Normalized price string
 * @returns {string} URL-safe slug (e.g., "20", "team", "enterprise")
 */
function tierToSlug(price) {
    if (price === '$0/mo') return '0';
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
function renderSiteNav(activePage) {
    const navItems = [
        { id: 'home', label: 'Capabilities', href: 'index.html' },
        { id: 'implementations', label: 'Detailed Availability', href: 'implementations.html' },
        { id: 'compare', label: 'Compare', href: 'compare.html' },
        { id: 'constraints', label: 'Access & Limits', href: 'constraints.html' },
        { id: 'about', label: 'About', href: 'about.html' }
    ];

    return `<header class="site-header">
        <h1><a href="index.html" onclick="passTheme(this)" style="color: inherit; text-decoration: none;"><img src="assets/favicon-32.png" alt="" class="header-logo" width="28" height="28" aria-hidden="true"> AI Capability Reference</a></h1>
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
            <a href="${REPO_URL}" class="github-link" title="View on GitHub">GitHub</a>
            <button class="theme-toggle" onclick="toggleTheme()" title="Toggle light/dark mode">🌓</button>
        </div>
    </header>`;
}

function renderSharedFooter() {
    return `<footer>
            <p>
                Maintained by <a href="https://snapsynapse.com/">SnapSynapse</a>, with public issues and pull requests welcome.
                <a href="${REPO_ISSUES_URL}">Open an issue</a> or
                <a href="${REPO_PULLS_URL}">submit a PR</a>.
            </p>
            <p style="margin-top: 8px;">
                &copy; 2026 | Made by <a href="https://snapsynapse.com/">Snap Synapse</a> via <a href="https://docs.anthropic.com/en/docs/claude-code/overview">Claude Code</a> | 🤓+🤖 | No trackers here, you're welcome.
            </p>
            <p style="margin-top: 12px; display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 8px;">
                <a href="${REPO_URL}" class="footer-social" title="Star on GitHub">⭐ Star</a>
                <a href="https://signalsandsubtractions.substack.com/" class="footer-social" title="Subscribe on Substack"><img src="https://substack.com/favicon.ico" alt="" width="14" height="14" style="vertical-align: middle; margin-right: 4px;">Substack</a>
                <a href="https://www.linkedin.com/in/samrogers/" class="footer-social" title="Connect on LinkedIn"><img src="https://www.linkedin.com/favicon.ico" alt="" width="14" height="14" style="vertical-align: middle; margin-right: 4px;">LinkedIn</a>
                <a href="https://www.testingcatalog.com/tag/release/" class="footer-social" title="Latest News"><img src="https://www.testingcatalog.com/favicon.ico" alt="" width="14" height="14" style="vertical-align: middle; margin-right: 4px;">Latest News</a>
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

    <!-- Favicon -->
    <link rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="assets/favicon-16.png">
    <link rel="apple-touch-icon" sizes="180x180" href="assets/apple-touch-icon.png">

    <!-- Open Graph / Social -->
    <meta property="og:type" content="website">
    <meta property="og:title" content="${DASHBOARD_TITLE} - ${FEATURE_VIEW_TITLE}">
    <meta property="og:description" content="Detailed plan-by-plan availability for AI features across ChatGPT, Claude, Gemini, Copilot, and more.">
    <meta property="og:image" content="assets/og-image.jpg">
    <meta property="og:url" content="${SITE_URL}">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${DASHBOARD_TITLE} - ${FEATURE_VIEW_TITLE}">
    <meta name="twitter:description" content="Detailed plan-by-plan availability for AI features across ChatGPT, Claude, Gemini, Copilot, and more.">
    <meta name="twitter:image" content="assets/og-image.jpg">

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
                if (p === '$0/mo') return 0;
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
    <title>AI Capability Reference</title>
    <meta name="description" content="A maintained reference for AI capability availability across plans, platforms, and access tiers. Compare ChatGPT, Claude, Gemini, Copilot, and more.">

    <link rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="assets/favicon-16.png">
    <link rel="apple-touch-icon" sizes="180x180" href="assets/apple-touch-icon.png">

    <meta property="og:type" content="website">
    <meta property="og:title" content="AI Capability Reference">
    <meta property="og:description" content="A maintained reference for AI capability availability across plans, platforms, and access tiers.">
    <meta property="og:image" content="assets/og-image.jpg">
    <meta property="og:url" content="${SITE_URL}">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="AI Capability Reference">
    <meta name="twitter:description" content="A maintained reference for AI capability availability across plans, platforms, and access tiers.">
    <meta name="twitter:image" content="assets/og-image.jpg">

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
            `<img src="assets/hero-lightmode.jpg" alt="AI Capability Reference" class="site-banner-img about-banner-dark" width="1280" height="640">` +
            `<img src="assets/hero-darkmode.jpg" alt="AI Capability Reference" class="site-banner-img about-banner-light" width="1280" height="640" loading="lazy">` +
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
    <meta name="description" content="About the AI Capability Reference - a plain-English resource for AI capabilities, plans, constraints, and implementations.">

    <!-- Favicon -->
    <link rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="assets/favicon-16.png">
    <link rel="apple-touch-icon" sizes="180x180" href="assets/apple-touch-icon.png">

    <!-- Open Graph / Social -->
    <meta property="og:type" content="website">
    <meta property="og:title" content="About - ${DASHBOARD_TITLE}">
    <meta property="og:description" content="About the AI Capability Reference - a plain-English resource for AI capabilities, plans, constraints, and implementations.">
    <meta property="og:image" content="assets/og-image.jpg">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="About - ${DASHBOARD_TITLE}">
    <meta name="twitter:description" content="About the AI Capability Reference - a plain-English resource for AI capabilities, plans, constraints, and implementations.">
    <meta name="twitter:image" content="assets/og-image.jpg">

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
    <title>AI Capability Reference - Access & Limits</title>
    <meta name="description" content="Find AI features by access tier, platform support, and regional availability. Filter by free, paid, surface, and more.">

    <link rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="assets/favicon-16.png">
    <link rel="apple-touch-icon" sizes="180x180" href="assets/apple-touch-icon.png">
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
    <meta http-equiv="refresh" content="0;url=index.html">
    <link rel="canonical" href="index.html">
    <title>Redirecting...</title>
</head>
<body>
    <p>This page has moved. <a href="index.html">Continue to capabilities</a>.</p>
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
    <link rel="stylesheet" href="assets/styles.css">
    <link rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="assets/favicon-16.png">
    <meta name="description" content="Side-by-side comparison of AI product capabilities">
    <meta property="og:title" content="Compare Products - ${DASHBOARD_TITLE}">
    ${renderThemeInit()}
</head>
<body>
    ${renderSiteNav('compare')}
    <main>
        <section class="compare-controls">
            <h2>Compare Products</h2>
            <p>Select up to 3 products to compare side-by-side.</p>
            <div class="product-selector" role="group" aria-label="Select products to compare">
                ${products.map(p => `<label class="product-checkbox"><input type="checkbox" value="${p.id}" onchange="updateComparison()"> ${p.name}</label>`).join('\n                ')}
            </div>
        </section>
        <section id="comparisonResult" class="comparison-result" aria-live="polite"></section>
        <div class="export-actions" id="compareExport" hidden>
            <button onclick="exportCSV()" class="export-btn">Export CSV</button>
            <button onclick="exportJSON()" class="export-btn">Export JSON</button>
        </div>
    </main>
    ${renderSharedFooter()}
    <script src="assets/search.js"></script>
    <script src="assets/compare.js"></script>
    <script src="assets/export.js"></script>
    ${renderThemeScript()}
</body>
</html>`;
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

    // Phase 2: Generate HTML views from ontology data
    const implementationsHTML = generateHTML(platforms, ontologyData);
    const homepageHTML = generateCapabilitiesHTML(ontologyData);
    const constraintsHTML = generateConstraintsHTML(ontologyData, platforms);
    const compareHTML = generateCompareHTML(ontologyData);
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

    fs.writeFileSync(CAPABILITIES_REDIRECT_FILE, redirectHTML);
    console.log(`✅ Capabilities redirect written to ${CAPABILITIES_REDIRECT_FILE}`);

    const aboutFile = path.join(outputDir, 'about.html');
    fs.writeFileSync(aboutFile, aboutHTML);
    console.log(`✅ About page written to ${aboutFile}`);
    console.log(`   File size: ${(aboutHTML.length / 1024).toFixed(1)} KB`);
}

main();
