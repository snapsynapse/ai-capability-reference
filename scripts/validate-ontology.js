#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIRS = {
    capabilities: path.join(ROOT, 'data', 'capabilities'),
    providers: path.join(ROOT, 'data', 'providers'),
    products: path.join(ROOT, 'data', 'products'),
    modelAccess: path.join(ROOT, 'data', 'model-access'),
    platforms: path.join(ROOT, 'data', 'platforms'),
    implementationsFile: path.join(ROOT, 'data', 'implementations', 'index.yml'),
    evidenceFile: path.join(ROOT, 'data', 'evidence', 'index.json')
};

function parseFrontmatter(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return { frontmatter: {}, body: content };

    const frontmatter = {};
    match[1].split('\n').forEach(line => {
        const [key, ...rest] = line.split(':');
        if (!key || rest.length === 0) return;
        frontmatter[key.trim()] = rest.join(':').trim();
    });

    return {
        frontmatter,
        body: content.slice(match[0].length).trim()
    };
}

function parseBulletSection(body, heading) {
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = body.match(new RegExp(`## ${escaped}\\n\\n([\\s\\S]*?)(?=\\n## |$)`));
    if (!match) return [];
    return match[1]
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('- '))
        .map(line => line.slice(2).trim());
}

function parseTable(tableText) {
    const lines = tableText.trim().split('\n').filter(Boolean);
    if (lines.length < 2) return [];

    const headers = lines[0].split('|').map(h => h.trim()).filter(Boolean);
    const rows = [];
    for (let i = 2; i < lines.length; i++) {
        const cells = lines[i].split('|').map(c => c.trim()).filter(Boolean);
        const row = {};
        headers.forEach((header, idx) => {
            row[header.toLowerCase().replace(/\s+/g, '_')] = cells[idx] || '';
        });
        rows.push(row);
    }
    return rows;
}

function listMarkdownFiles(dir, { includeReadme = false } = {}) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
        .filter(file => file.endsWith('.md'))
        .filter(file => includeReadme || file !== 'README.md')
        .sort();
}

function loadIdRecords(dir, opts = {}) {
    return listMarkdownFiles(dir, opts).map(file => {
        const fullPath = path.join(dir, file);
        const content = fs.readFileSync(fullPath, 'utf8');
        const { frontmatter, body } = parseFrontmatter(content);
        return {
            file,
            path: fullPath,
            id: frontmatter.id || '',
            frontmatter,
            body
        };
    });
}

function loadPlatformRecords(dir) {
    return listMarkdownFiles(dir).map(file => {
        const fullPath = path.join(dir, file);
        const content = fs.readFileSync(fullPath, 'utf8');
        const { frontmatter } = parseFrontmatter(content);
        return {
            file,
            path: fullPath,
            source_file: path.relative(ROOT, fullPath).replace(/\\/g, '/'),
            frontmatter
        };
    });
}

function parseFeature(section) {
    const trimmed = section.trim();
    const lines = trimmed.split('\n');
    const nameMatch = lines[0].match(/^## (.+)/);
    if (!nameMatch) return null;

    const feature = {
        name: nameMatch[1],
        launched: '',
        verified: '',
        checked: ''
    };

    const propTableMatch = trimmed.match(/\| Property \| Value \|[\s\S]*?\n\n/);
    if (!propTableMatch) return feature;

    parseTable(propTableMatch[0]).forEach(row => {
        if (row.property === 'Launched') feature.launched = row.value;
        if (row.property === 'Verified') feature.verified = row.value;
        if (row.property === 'Checked') feature.checked = row.value;
    });

    return feature;
}

function loadSourceFeatureLookup(dir) {
    const lookup = new Map();
    listMarkdownFiles(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        const content = fs.readFileSync(fullPath, 'utf8');
        const { body } = parseFrontmatter(content);
        const sourceFile = path.relative(ROOT, fullPath).replace(/\\/g, '/');
        const featureSections = body.split(/\n---\n/).slice(1);
        featureSections.map(parseFeature).filter(Boolean).forEach(feature => {
            lookup.set(`${sourceFile}::${feature.name}`, feature);
        });
    });
    return lookup;
}

function parseImplementationIndex(filepath) {
    const lines = fs.readFileSync(filepath, 'utf8').split('\n');
    const entries = [];
    let current = null;
    let arrayKey = null;
    let blockKey = null;

    const pushCurrent = () => {
        if (current) entries.push(current);
    };

    for (const rawLine of lines) {
        const line = rawLine.replace(/\r$/, '');

        if (blockKey) {
            if (line.startsWith('    ')) {
                current[blockKey] += `${current[blockKey] ? '\n' : ''}${line.slice(4)}`;
                continue;
            }
            if (line === '') {
                current[blockKey] += '\n';
                continue;
            }
            blockKey = null;
        }

        if (line.startsWith('- id: ')) {
            pushCurrent();
            current = { id: line.slice(6).trim() };
            arrayKey = null;
            continue;
        }

        if (!current) continue;

        const blockMatch = line.match(/^  ([a-z_]+): \|$/);
        if (blockMatch) {
            blockKey = blockMatch[1];
            current[blockKey] = '';
            arrayKey = null;
            continue;
        }

        const emptyArrayMatch = line.match(/^  ([a-z_]+): \[\]$/);
        if (emptyArrayMatch) {
            current[emptyArrayMatch[1]] = [];
            arrayKey = null;
            continue;
        }

        const arrayMatch = line.match(/^  ([a-z_]+):$/);
        if (arrayMatch) {
            current[arrayMatch[1]] = [];
            arrayKey = arrayMatch[1];
            continue;
        }

        if (arrayKey && line.startsWith('    - ')) {
            current[arrayKey].push(line.slice(6).trim());
            continue;
        }

        const scalarMatch = line.match(/^  ([a-z_]+):\s*(.*)$/);
        if (scalarMatch) {
            current[scalarMatch[1]] = scalarMatch[2].trim();
            arrayKey = null;
        }
    }

    pushCurrent();
    return entries;
}

function loadEvidenceIndex(filepath) {
    if (!fs.existsSync(filepath)) return [];
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

function evidenceKey(entityType, entityId) {
    return `${entityType}:${entityId}`;
}

function headingExists(sourceFile, heading) {
    const fullPath = path.join(ROOT, sourceFile);
    if (!fs.existsSync(fullPath)) return false;
    const content = fs.readFileSync(fullPath, 'utf8');
    return content.includes(`\n## ${heading}\n`);
}

function fail(errors, message) {
    errors.push(message);
}

function validate() {
    const errors = [];
    const capabilities = loadIdRecords(DIRS.capabilities);
    const providers = loadIdRecords(DIRS.providers);
    const products = loadIdRecords(DIRS.products);
    const modelAccess = loadIdRecords(DIRS.modelAccess);
    const platforms = loadPlatformRecords(DIRS.platforms);
    const implementations = parseImplementationIndex(DIRS.implementationsFile);
    const evidenceRecords = loadEvidenceIndex(DIRS.evidenceFile);

    const capabilityIds = new Set(capabilities.map(record => record.id));
    const providerIds = new Set(providers.map(record => record.id));
    const productIds = new Set(products.map(record => record.id));
    const implementationIds = new Set();
    const platformMetaBySource = new Map(platforms.map(record => [record.source_file, record.frontmatter]));
    const modelAccessIds = new Set(modelAccess.filter(record => record.file !== 'README.md').map(record => record.id));
    const evidenceKeys = new Set();
    const productsById = new Map(products.map(record => [record.id, record]));
    const sourceFeatureLookup = loadSourceFeatureLookup(DIRS.platforms);

    capabilities.forEach(record => {
        if (record.id !== record.file.replace(/\.md$/, '')) {
            fail(errors, `Capability filename/id mismatch: ${record.file} -> ${record.id}`);
        }
    });

    providers.forEach(record => {
        if (record.id !== record.file.replace(/\.md$/, '')) {
            fail(errors, `Provider filename/id mismatch: ${record.file} -> ${record.id}`);
        }

        const productsList = parseBulletSection(record.body, 'Products');
        productsList.forEach(productId => {
            if (!productIds.has(productId)) {
                fail(errors, `Provider ${record.id} references missing product: ${productId}`);
            }
        });
    });

    products.forEach(record => {
        if (record.id !== record.file.replace(/\.md$/, '')) {
            fail(errors, `Product filename/id mismatch: ${record.file} -> ${record.id}`);
        }

        if (!providerIds.has(record.frontmatter.provider)) {
            fail(errors, `Product ${record.id} references missing provider: ${record.frontmatter.provider}`);
        }

        if (record.frontmatter.record_source && !fs.existsSync(path.join(ROOT, record.frontmatter.record_source))) {
            fail(errors, `Product ${record.id} has missing record_source: ${record.frontmatter.record_source}`);
        }

        if (record.frontmatter.record_source && platformMetaBySource.get(record.frontmatter.record_source)?.build_visibility === 'archive') {
            fail(errors, `Product ${record.id} points to archived record_source: ${record.frontmatter.record_source}`);
        }

        if (record.frontmatter.source_heading && record.frontmatter.record_source && !headingExists(record.frontmatter.record_source, record.frontmatter.source_heading)) {
            fail(errors, `Product ${record.id} missing source heading: ${record.frontmatter.source_heading}`);
        }
    });

    // Bidirectional provider ↔ product consistency
    const providerToProducts = new Map();
    providers.forEach(record => {
        providerToProducts.set(record.id, new Set(parseBulletSection(record.body, 'Products')));
    });
    products.forEach(record => {
        const providerId = record.frontmatter.provider;
        const providerProducts = providerToProducts.get(providerId);
        if (providerProducts && !providerProducts.has(record.id)) {
            fail(errors, `Product ${record.id} claims provider ${providerId}, but provider does not list it`);
        }
    });

    modelAccess.forEach(record => {
        if (record.file === 'README.md') return;
        if (record.id !== record.file.replace(/\.md$/, '')) {
            fail(errors, `Model access filename/id mismatch: ${record.file} -> ${record.id}`);
        }

        if (!providerIds.has(record.frontmatter.provider)) {
            fail(errors, `Model access ${record.id} references missing provider: ${record.frontmatter.provider}`);
        }

        if (record.frontmatter.record_source && !fs.existsSync(path.join(ROOT, record.frontmatter.record_source))) {
            fail(errors, `Model access ${record.id} has missing record_source: ${record.frontmatter.record_source}`);
        }

        if (record.frontmatter.record_source && platformMetaBySource.get(record.frontmatter.record_source)?.build_visibility === 'archive') {
            fail(errors, `Model access ${record.id} points to archived record_source: ${record.frontmatter.record_source}`);
        }

        if (record.frontmatter.source_heading && record.frontmatter.record_source && !headingExists(record.frontmatter.record_source, record.frontmatter.source_heading)) {
            fail(errors, `Model access ${record.id} missing source heading: ${record.frontmatter.source_heading}`);
        }

        const related = parseBulletSection(record.body, 'Related Capabilities');
        related.forEach(capabilityId => {
            if (!capabilityIds.has(capabilityId)) {
                fail(errors, `Model access ${record.id} references missing capability: ${capabilityId}`);
            }
        });
    });

    implementations.forEach(entry => {
        if (implementationIds.has(entry.id)) {
            fail(errors, `Duplicate implementation id: ${entry.id}`);
        }
        implementationIds.add(entry.id);

        if (!productIds.has(entry.product)) {
            fail(errors, `Implementation ${entry.id} references missing product: ${entry.product}`);
        }

        if (!providerIds.has(entry.provider)) {
            fail(errors, `Implementation ${entry.id} references missing provider: ${entry.provider}`);
        }

        const caps = entry.capabilities || [];
        caps.forEach(capabilityId => {
            if (!capabilityIds.has(capabilityId)) {
                fail(errors, `Implementation ${entry.id} references missing capability: ${capabilityId}`);
            }
        });

        // Every implementation must map to at least one capability or be explicitly deferred
        if (caps.length === 0) {
            const notes = (entry.notes || '').toLowerCase();
            if (!notes.includes('transitional')) {
                fail(errors, `Implementation ${entry.id} has no capabilities and no transitional deferral note`);
            }
        }

        if (entry.source_file && !fs.existsSync(path.join(ROOT, entry.source_file))) {
            fail(errors, `Implementation ${entry.id} has missing source_file: ${entry.source_file}`);
        }

        if (entry.source_file && platformMetaBySource.get(entry.source_file)?.build_visibility === 'archive') {
            fail(errors, `Implementation ${entry.id} points to archived source_file: ${entry.source_file}`);
        }

        if (entry.source_file && entry.source_heading && !headingExists(entry.source_file, entry.source_heading)) {
            fail(errors, `Implementation ${entry.id} missing source heading: ${entry.source_heading}`);
        }
    });

    evidenceRecords.forEach(record => {
        const key = evidenceKey(record.entity_type, record.entity_id);
        if (evidenceKeys.has(key)) {
            fail(errors, `Duplicate evidence record: ${key}`);
        }
        evidenceKeys.add(key);

        if (!['implementation', 'product', 'model_access'].includes(record.entity_type)) {
            fail(errors, `Evidence ${record.id || key} has invalid entity_type: ${record.entity_type}`);
        }

        if (!record.entity_id) {
            fail(errors, `Evidence ${record.id || key} missing entity_id`);
        }

        if (record.entity_type === 'implementation' && !implementationIds.has(record.entity_id)) {
            fail(errors, `Evidence ${record.id || key} references missing implementation: ${record.entity_id}`);
        }

        if (record.entity_type === 'product' && !productIds.has(record.entity_id)) {
            fail(errors, `Evidence ${record.id || key} references missing product: ${record.entity_id}`);
        }

        if (record.entity_type === 'model_access' && !modelAccessIds.has(record.entity_id)) {
            fail(errors, `Evidence ${record.id || key} references missing model access: ${record.entity_id}`);
        }

        if (!record.source_file || !fs.existsSync(path.join(ROOT, record.source_file))) {
            fail(errors, `Evidence ${record.id || key} has missing source_file: ${record.source_file}`);
        }

        if (record.source_file && platformMetaBySource.get(record.source_file)?.build_visibility === 'archive') {
            fail(errors, `Evidence ${record.id || key} points to archived source_file: ${record.source_file}`);
        }

        if (record.source_heading && !headingExists(record.source_file, record.source_heading)) {
            fail(errors, `Evidence ${record.id || key} missing source heading: ${record.source_heading}`);
        }

        if (!record.verified) {
            fail(errors, `Evidence ${record.id || key} missing verified date`);
        }

        if (!record.checked) {
            fail(errors, `Evidence ${record.id || key} missing checked date`);
        }

        const sourceFeature = record.source_heading
            ? sourceFeatureLookup.get(`${record.source_file}::${record.source_heading}`)
            : null;

        if (sourceFeature) {
            if (record.launched !== sourceFeature.launched) {
                fail(errors, `Evidence ${record.id || key} launched date is out of sync with source feature`);
            }
            if (record.verified !== sourceFeature.verified) {
                fail(errors, `Evidence ${record.id || key} verified date is out of sync with source feature`);
            }
            if (record.checked !== sourceFeature.checked) {
                fail(errors, `Evidence ${record.id || key} checked date is out of sync with source feature`);
            }
        } else if (record.entity_type === 'product') {
            const productRecord = productsById.get(record.entity_id);
            const expectedVerified = productRecord?.frontmatter?.last_verified || '';
            if (record.verified !== expectedVerified) {
                fail(errors, `Evidence ${record.id || key} verified date is out of sync with product metadata`);
            }
            if (record.checked !== expectedVerified) {
                fail(errors, `Evidence ${record.id || key} checked date is out of sync with product metadata`);
            }
        }
    });

    implementations.forEach(entry => {
        if (!evidenceKeys.has(evidenceKey('implementation', entry.id))) {
            fail(errors, `Implementation ${entry.id} is missing evidence coverage`);
        }
    });

    products.forEach(record => {
        if (!evidenceKeys.has(evidenceKey('product', record.id))) {
            fail(errors, `Product ${record.id} is missing evidence coverage`);
        }
    });

    modelAccess.forEach(record => {
        if (record.file === 'README.md') return;
        if (!evidenceKeys.has(evidenceKey('model_access', record.id))) {
            fail(errors, `Model access ${record.id} is missing evidence coverage`);
        }
    });

    return {
        errors,
        summary: {
            capabilities: capabilities.length,
            providers: providers.length,
            products: products.length,
            model_access_records: modelAccess.filter(record => record.file !== 'README.md').length,
            implementations: implementations.length,
            evidence_records: evidenceRecords.length
        }
    };
}

const result = validate();
console.log(JSON.stringify(result.summary, null, 2));

if (result.errors.length) {
    console.error('\nOntology validation failed:\n');
    result.errors.forEach(error => console.error(`- ${error}`));
    process.exit(1);
}

console.log('\nOntology validation passed.');
