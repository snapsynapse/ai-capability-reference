#!/usr/bin/env node

/**
 * generate-framing.js — Generate AI-powered page framing for discovery pages.
 *
 * For each discovery-layer page, generates 2-3 contextual sentences at build time
 * using Claude. Results are cached in data/framing-cache.json, keyed by page path.
 * Only regenerates when the underlying data changes (input hash comparison).
 *
 * Usage:
 *   node scripts/generate-framing.js [--dry-run] [--force] [--page /capability/generate-images/]
 *
 * Requires ANTHROPIC_API_KEY environment variable.
 *
 * Fallback: if no API key is available, template framing is used automatically
 * by build.js (no need to run this script).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT_DIR = path.join(__dirname, '..');
const FRAMING_CACHE_FILE = path.join(ROOT_DIR, 'data', 'framing-cache.json');
const DISCOVERY_FILE = path.join(ROOT_DIR, 'data', 'discovery.yml');
const DATA_EXPORT_FILE = path.join(ROOT_DIR, 'docs', 'assets', 'data.json');
const EVIDENCE_FILE = path.join(ROOT_DIR, 'data', 'evidence', 'index.json');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');
const PAGE_FILTER = (() => {
    const idx = args.indexOf('--page');
    return idx !== -1 ? args[idx + 1] : null;
})();

// ---------------------------------------------------------------------------
// Minimal YAML parser for discovery.yml (mirrors build.js implementation)
// ---------------------------------------------------------------------------
function parseDiscoveryYml(filepath) {
    if (!fs.existsSync(filepath)) return { discovery_set: [], coverage_pages: [] };
    const lines = fs.readFileSync(filepath, 'utf-8').split('\n');
    const result = { sitemap_strategy: 'all', discovery_set: [], type_defaults: {}, coverage_pages: [] };
    let section = null;
    let currentItem = null;
    let typeDefaultsSection = false;

    for (const rawLine of lines) {
        const line = rawLine.replace(/\r$/, '');
        if (line.trim() === '' || line.trim().startsWith('#')) continue;

        const topKeyMatch = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
        if (topKeyMatch && !line.startsWith(' ')) {
            const key = topKeyMatch[1];
            const val = topKeyMatch[2].trim().replace(/\s+#.*$/, '').trim();
            if (key === 'sitemap_strategy') {
                result.sitemap_strategy = val;
            } else if (key === 'discovery_set') {
                section = 'discovery_set'; currentItem = null; typeDefaultsSection = false;
            } else if (key === 'type_defaults') {
                if (currentItem) {
                    if (section === 'discovery_set') result.discovery_set.push(currentItem);
                    else if (section === 'coverage_pages') result.coverage_pages.push(currentItem);
                    currentItem = null;
                }
                section = 'type_defaults'; typeDefaultsSection = true;
            } else if (key === 'coverage_pages') {
                if (currentItem) {
                    if (section === 'discovery_set') result.discovery_set.push(currentItem);
                    else if (section === 'coverage_pages') result.coverage_pages.push(currentItem);
                    currentItem = null;
                }
                section = 'coverage_pages'; typeDefaultsSection = false;
            }
            continue;
        }

        const listItemMatch = line.match(/^  - ([a-zA-Z_]+):\s*(.*)$/);
        if (listItemMatch) {
            if (currentItem) {
                if (section === 'discovery_set') result.discovery_set.push(currentItem);
                else if (section === 'coverage_pages') result.coverage_pages.push(currentItem);
            }
            currentItem = { [listItemMatch[1]]: listItemMatch[2].trim().replace(/^"(.*)"$/, '$1') };
            continue;
        }

        if (currentItem && line.match(/^    [a-zA-Z_]+:/)) {
            const contMatch = line.match(/^    ([a-zA-Z_]+):\s*(.*)$/);
            if (contMatch) {
                let val = contMatch[2].trim().replace(/^"(.*)"$/, '$1');
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
                    const num = Number(val);
                    currentItem[contMatch[1]] = isNaN(num) ? val : num;
                }
            }
            continue;
        }

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

    if (currentItem) {
        if (section === 'discovery_set') result.discovery_set.push(currentItem);
        else if (section === 'coverage_pages') result.coverage_pages.push(currentItem);
    }

    return result;
}

// ---------------------------------------------------------------------------
// Cache management
// ---------------------------------------------------------------------------
function loadCache() {
    if (!fs.existsSync(FRAMING_CACHE_FILE)) return {};
    try {
        return JSON.parse(fs.readFileSync(FRAMING_CACHE_FILE, 'utf-8'));
    } catch (e) {
        return {};
    }
}

function saveCache(cache) {
    fs.writeFileSync(FRAMING_CACHE_FILE, JSON.stringify(cache, null, 2));
}

function hashInput(obj) {
    return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex').slice(0, 16);
}

// ---------------------------------------------------------------------------
// Build page contexts from data export
// ---------------------------------------------------------------------------
function buildPageContexts(dataExport, evidenceRecords, discoveryConfig) {
    const contexts = [];
    const capabilities = dataExport.capabilities || [];
    const products = dataExport.products || [];
    const implementations = dataExport.implementations || [];

    // Product map for quick lookup
    const productMap = new Map(products.map(p => [p.id, p]));
    const capMap = new Map(capabilities.map(c => [c.id, c]));

    // Evidence for latest dates
    const productLastmod = {};
    for (const rec of evidenceRecords) {
        const m = rec.source_file && rec.source_file.match(/platforms\/(\w+)\.md/);
        if (!m) continue;
        const prod = m[1];
        for (const entry of (rec.changelog || [])) {
            const d = entry.date ? entry.date.split('T')[0] : '';
            if (!productLastmod[prod] || d > productLastmod[prod]) productLastmod[prod] = d;
        }
    }

    const now = new Date();
    const monthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const hostedProducts = products.filter(p => p.product_kind !== 'runtime');

    // Capability pages
    for (const cap of capabilities) {
        const pagePath = `capability/${cap.id}/`;
        if (PAGE_FILTER && PAGE_FILTER !== `/${pagePath}`) continue;

        // Count products with this capability
        const productIds = new Set(
            implementations
                .filter(i => i.capabilities && i.capabilities.includes(cap.id))
                .map(i => i.product)
        );
        const count = productIds.size;

        // Find most recent change related to this cap
        let latestChange = null;
        for (const rec of evidenceRecords) {
            if (!rec.changelog || !rec.changelog.length) continue;
            // Check if this evidence record is for an impl that covers this cap
            const implId = `implementation-${rec.entity_id}`;
            const impl = implementations.find(i => i.id === rec.entity_id || i.id === implId);
            if (!impl || !impl.capabilities || !impl.capabilities.includes(cap.id)) continue;
            for (const entry of rec.changelog) {
                if (!latestChange || entry.date > latestChange.date) {
                    latestChange = { date: entry.date.split('T')[0], text: entry.change };
                }
            }
        }

        const inputData = { type: 'capability', capId: cap.id, capName: cap.name, count, latestChange, monthYear };
        const prompt = `Write 2-3 sentences (max 60 words total) introducing the "${cap.name}" capability page on AITool.watch.

Context:
- ${count} AI products currently support this capability
- Most recent change: ${latestChange ? `"${latestChange.text}" on ${latestChange.date}` : 'none recorded'}
- Current month: ${monthYear}
- Cap summary: ${cap.summary || 'N/A'}

Rules:
- Start with "This page tracks AI tools that currently support ${cap.name.toLowerCase()}."
- State that inclusion requires verified functionality, not marketing claims
- Mention the product count and a brief change note
- Do NOT use the word "delve" or "explore"
- Factual tone, no hype

Output ONLY the 2-3 sentences, no quotes, no preamble.`;

        contexts.push({ pagePath, inputData, prompt });
    }

    // Comparison pages
    for (let i = 0; i < hostedProducts.length; i++) {
        for (let j = i + 1; j < hostedProducts.length; j++) {
            const prodA = hostedProducts[i];
            const prodB = hostedProducts[j];
            const pagePath = `compare/${prodA.id}-vs-${prodB.id}/`;
            if (PAGE_FILTER && PAGE_FILTER !== `/${pagePath}`) continue;

            const capsA = new Set(implementations.filter(impl => impl.product === prodA.id).flatMap(i => i.capabilities || []));
            const capsB = new Set(implementations.filter(impl => impl.product === prodB.id).flatMap(i => i.capabilities || []));
            const shared = [...capsA].filter(c => capsB.has(c));
            const onlyA = [...capsA].filter(c => !capsB.has(c));
            const onlyB = [...capsB].filter(c => !capsA.has(c));

            const onlyANames = onlyA.slice(0, 3).map(cid => capMap.get(cid)?.name || cid).join(', ');
            const onlyBNames = onlyB.slice(0, 3).map(cid => capMap.get(cid)?.name || cid).join(', ');

            const inputData = { type: 'comparison', idA: prodA.id, idB: prodB.id, sharedCount: shared.length, onlyACount: onlyA.length, onlyBCount: onlyB.length };
            const prompt = `Write 2-3 sentences (max 70 words) introducing the "${prodA.name} vs ${prodB.name}" comparison page on AITool.watch.

Context:
- Shared capabilities: ${shared.length}
- Only ${prodA.name}: ${onlyANames || 'none unique'} (${onlyA.length} total)
- Only ${prodB.name}: ${onlyBNames || 'none unique'} (${onlyB.length} total)
- Data is verified, not from marketing pages

Rules:
- Summarize the key differences concisely
- Mention what each product uniquely offers (use the most interesting 2-3 items)
- Factual tone, no hype
- Do NOT use the word "delve" or "explore"

Output ONLY the 2-3 sentences, no quotes, no preamble.`;

            contexts.push({ pagePath, inputData, prompt });
        }
    }

    // Changes pages
    const changeProducts = ['chatgpt', 'claude', 'gemini', 'copilot', 'grok', 'perplexity'];
    for (const prodId of changeProducts) {
        const pagePath = `changes/${prodId}/`;
        if (PAGE_FILTER && PAGE_FILTER !== `/${pagePath}`) continue;

        const product = productMap.get(prodId);
        if (!product) continue;

        const productChanges = [];
        for (const rec of evidenceRecords) {
            const m = rec.source_file && rec.source_file.match(/platforms\/(\w+)\.md/);
            if (!m || m[1] !== prodId) continue;
            for (const entry of (rec.changelog || [])) {
                productChanges.push({ date: entry.date, change: entry.change });
            }
        }
        productChanges.sort((a, b) => b.date.localeCompare(a.date));

        const count30d = productChanges.filter(c => {
            const d = new Date(c.date);
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - 30);
            return d >= cutoff;
        }).length;

        const latest = productChanges[0];
        const inputData = { type: 'changes', prodId, total: productChanges.length, count30d };
        const prompt = `Write 2-3 sentences (max 60 words) introducing the "${product.name} Recent Changes" page on AITool.watch.

Context:
- Total changes recorded: ${productChanges.length}
- Changes in last 30 days: ${count30d}
- Most recent change: ${latest ? `"${latest.change}" on ${latest.date.split('T')[0]}` : 'none'}

Rules:
- State this tracks verified changes to ${product.name}
- Mention the 30-day count and most recent change (brief)
- Factual tone, no hype

Output ONLY the 2-3 sentences, no quotes, no preamble.`;

        contexts.push({ pagePath, inputData, prompt });
    }

    // Changes index
    if (!PAGE_FILTER || PAGE_FILTER === '/changes/') {
        const allChanges = [];
        for (const rec of evidenceRecords) {
            for (const entry of (rec.changelog || [])) {
                allChanges.push({ date: entry.date, change: entry.change });
            }
        }
        allChanges.sort((a, b) => b.date.localeCompare(a.date));
        const count30d = allChanges.filter(c => {
            const d = new Date(c.date);
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - 30);
            return d >= cutoff;
        }).length;
        const latest = allChanges[0];
        const inputData = { type: 'changes-index', total: allChanges.length, count30d };
        const prompt = `Write 2-3 sentences (max 60 words) introducing the "Recent AI Tool Changes" index page on AITool.watch.

Context:
- Total changes across all products: ${allChanges.length}
- Changes in last 30 days: ${count30d}
- Most recent: ${latest ? `"${latest.change}" on ${latest.date.split('T')[0]}` : 'none'}

Rules:
- State this tracks verified changes across ChatGPT, Claude, Gemini, Copilot, Grok, and Perplexity
- Mention the 30-day count
- Factual tone

Output ONLY the 2-3 sentences, no quotes, no preamble.`;

        contexts.push({ pagePath: 'changes/', inputData, prompt });
    }

    return contexts;
}

// ---------------------------------------------------------------------------
// Claude API call
// ---------------------------------------------------------------------------
async function generateFramingText(prompt, apiKey) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'claude-haiku-4-5',
            max_tokens: 200,
            messages: [{ role: 'user', content: prompt }]
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Claude API error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    const text = (data.content || [])
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('');
    return text.trim();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey && !DRY_RUN) {
        console.error('Error: ANTHROPIC_API_KEY not set. Use --dry-run to preview without API calls.');
        process.exit(1);
    }

    if (!fs.existsSync(DATA_EXPORT_FILE)) {
        console.error(`Error: ${DATA_EXPORT_FILE} not found. Run 'node scripts/build.js' first.`);
        process.exit(1);
    }

    console.log('Loading data...');
    const dataExport = JSON.parse(fs.readFileSync(DATA_EXPORT_FILE, 'utf-8'));
    const evidenceRecords = JSON.parse(fs.readFileSync(EVIDENCE_FILE, 'utf-8'));
    const discoveryConfig = parseDiscoveryYml(DISCOVERY_FILE);

    const cache = loadCache();
    const contexts = buildPageContexts(dataExport, evidenceRecords, discoveryConfig);

    console.log(`Found ${contexts.length} pages to consider${PAGE_FILTER ? ` (filtered: ${PAGE_FILTER})` : ''}`);

    let generated = 0;
    let skipped = 0;
    let errors = 0;

    for (const { pagePath, inputData, prompt } of contexts) {
        const inputHash = hashInput(inputData);
        const cacheKey = pagePath;
        const cacheEntry = cache[cacheKey];

        // Skip if cached and hash matches (data hasn't changed)
        if (!FORCE && cacheEntry && cacheEntry._hash === inputHash) {
            skipped++;
            continue;
        }

        if (DRY_RUN) {
            console.log(`\n[DRY RUN] Would generate framing for: ${pagePath}`);
            console.log(`  Input hash: ${inputHash}`);
            console.log(`  Prompt (first 200 chars): ${prompt.slice(0, 200)}...`);
            generated++;
            continue;
        }

        try {
            process.stdout.write(`Generating framing for ${pagePath}... `);
            const text = await generateFramingText(prompt, apiKey);
            cache[cacheKey] = { text, _hash: inputHash, _generated: new Date().toISOString() };
            console.log('OK');
            generated++;

            // Save after each successful generation to avoid losing work
            saveCache(cache);

            // Rate limiting: small delay between calls
            await new Promise(resolve => setTimeout(resolve, 200));
        } catch (err) {
            console.log(`ERROR: ${err.message}`);
            errors++;
        }
    }

    if (!DRY_RUN && generated > 0) {
        saveCache(cache);
    }

    console.log(`\nDone: ${generated} generated, ${skipped} skipped (cached), ${errors} errors`);
    if (errors > 0) process.exit(1);
}

main().catch(err => {
    console.error('Fatal error:', err.message);
    process.exit(1);
});
