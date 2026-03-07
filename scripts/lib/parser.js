/**
 * Parser module for AI Capability Reference verification system
 * Extracts structured data from platform markdown files
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'platforms');

/**
 * Parse YAML-like frontmatter from markdown content.
 * @param {string} content - Raw markdown content with optional frontmatter
 * @returns {{frontmatter: Object, body: string}}
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
 * Parse a markdown table into an array of row objects.
 * @param {string} tableText - Markdown table text
 * @returns {Array<Object>}
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
 * Parse a feature section from markdown into a structured object.
 * @param {string} section - Markdown section starting with "## Feature Name"
 * @returns {Object|null}
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
 * Parse a platform markdown file into a structured object.
 * @param {string} filepath - Absolute path to the platform markdown file
 * @returns {Object}
 */
function parsePlatform(filepath) {
    const content = fs.readFileSync(filepath, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);

    // Parse pricing table
    const pricingMatch = body.match(/## Pricing\n\n([\s\S]*?)(?=\n---)/);
    const pricing = pricingMatch ? parseTable(pricingMatch[1]) : [];

    // Parse features (split by ---)
    const featureSections = body.split(/\n---\n/).slice(1);
    const features = featureSections
        .map(parseFeature)
        .filter(Boolean);

    return {
        ...frontmatter,
        pricing,
        features,
        _filepath: filepath
    };
}

/**
 * Load all platform data
 * @returns {Array<Object>}
 */
function loadAllPlatforms() {
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.md') && !f.startsWith('_'));
    return files.map(f => parsePlatform(path.join(DATA_DIR, f)));
}

/**
 * Get a specific platform by name
 * @param {string} name - Platform name (case-insensitive)
 * @returns {Object|null}
 */
function getPlatform(name) {
    const platforms = loadAllPlatforms();
    return platforms.find(p => p.name.toLowerCase() === name.toLowerCase()) || null;
}

/**
 * Get a specific feature from a platform
 * @param {string} platformName - Platform name
 * @param {string} featureName - Feature name
 * @returns {{platform: Object, feature: Object}|null}
 */
function getFeature(platformName, featureName) {
    const platform = getPlatform(platformName);
    if (!platform) return null;

    const feature = platform.features.find(f =>
        f.name.toLowerCase() === featureName.toLowerCase()
    );

    return feature ? { platform, feature } : null;
}

/**
 * Get all features across all platforms
 * @returns {Array<{platform: Object, feature: Object}>}
 */
function getAllFeatures() {
    const platforms = loadAllPlatforms();
    const allFeatures = [];

    for (const platform of platforms) {
        for (const feature of platform.features) {
            allFeatures.push({ platform, feature });
        }
    }

    return allFeatures;
}

/**
 * Find stale features (Checked date older than threshold)
 * @param {number} thresholdDays - Days since last check to consider stale
 * @returns {Array<{platform: Object, feature: Object, daysSinceChecked: number}>}
 */
function findStaleFeatures(thresholdDays = 7) {
    const allFeatures = getAllFeatures();
    const now = new Date();
    const stale = [];

    for (const { platform, feature } of allFeatures) {
        if (!feature.checked) {
            stale.push({ platform, feature, daysSinceChecked: Infinity });
            continue;
        }

        const checkedDate = new Date(feature.checked);
        const daysSinceChecked = Math.floor((now - checkedDate) / (1000 * 60 * 60 * 24));

        if (daysSinceChecked > thresholdDays) {
            stale.push({ platform, feature, daysSinceChecked });
        }
    }

    // Sort by staleness (most stale first)
    stale.sort((a, b) => b.daysSinceChecked - a.daysSinceChecked);

    return stale;
}

/**
 * Serialize feature data for comparison
 * @param {Object} feature - Feature object
 * @returns {Object} Normalized feature data
 */
function serializeFeature(feature) {
    return {
        name: feature.name,
        category: feature.category,
        status: feature.status,
        gating: feature.gating,
        availability: feature.availability.map(a => ({
            plan: a.plan,
            available: a.available,
            limits: a.limits || '',
            notes: a.notes || ''
        })),
        platforms: feature.platforms.map(p => ({
            platform: p.platform,
            available: p.available,
            notes: p.notes || ''
        }))
    };
}

module.exports = {
    parseFrontmatter,
    parseTable,
    parseFeature,
    parsePlatform,
    loadAllPlatforms,
    getPlatform,
    getFeature,
    getAllFeatures,
    findStaleFeatures,
    serializeFeature,
    DATA_DIR
};
