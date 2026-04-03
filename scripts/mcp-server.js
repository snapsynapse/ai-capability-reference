#!/usr/bin/env node
'use strict';

/**
 * MCP (Model Context Protocol) server for AI Tool Watch.
 * Zero dependencies — uses only Node.js built-ins.
 * Reads pre-generated JSON files from docs/api/v1/ and exposes 15 read-only tools.
 *
 * Error responses follow the Graceful Boundaries pattern:
 * structured refusal with constructive guidance so agents can self-correct.
 * See: https://github.com/snapsynapse/graceful-boundaries
 *
 * Usage:  node scripts/mcp-server.js          (stdio transport)
 * Config: See mcp.json in the project root for Claude Code / MCP client config.
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(__dirname, '..', 'docs', 'api', 'v1');

function loadData() {
    const data = {};
    for (const file of fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'))) {
        data[file.replace('.json', '')] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
    }
    return data;
}

const data = loadData();

// ---------------------------------------------------------------------------
// ID indices (built once for constructive guidance)
// ---------------------------------------------------------------------------

const VALID_IDS = {
    capabilities: (data.capabilities?.capabilities || []).map(c => c.id),
    products: (data.products?.products || []).map(p => p.id),
    providers: (data.providers?.providers || []).map(p => p.id),
    implementations: (data.implementations?.implementations || []).map(i => i.id),
    model_access: (data['model-access']?.model_access || []).map(m => m.id)
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SERVER_INFO = { name: 'ai-tool-watch', version: '2.0.0' };

function meta() {
    return {
        generated: data.index?.meta?.generated || null,
        server: `${SERVER_INFO.name}/${SERVER_INFO.version}`,
        freshness_note: 'Check the verified date on each record before presenting data as current.'
    };
}

function textResult(obj) {
    return { content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }] };
}

/**
 * Structured error following Graceful Boundaries.
 * Every error includes: error (machine category), detail (human explanation),
 * why (reason the constraint exists), and guidance (constructive next step).
 */
function structuredError({ error, detail, why, guidance }) {
    return {
        content: [{ type: 'text', text: JSON.stringify({ error, detail, why, guidance }, null, 2) }],
        isError: true
    };
}

/** Find closest matching ID using simple substring + edit distance. */
function suggestId(input, validIds) {
    const q = input.toLowerCase();
    // Substring match first
    const substringMatches = validIds.filter(id => id.includes(q) || q.includes(id));
    if (substringMatches.length > 0) return substringMatches.slice(0, 3);
    // Simple character overlap fallback
    const scored = validIds.map(id => {
        const chars = new Set(q.split(''));
        const overlap = id.split('').filter(c => chars.has(c)).length;
        return { id, score: overlap / Math.max(id.length, q.length) };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 3).filter(s => s.score > 0.3).map(s => s.id);
}

function notFoundError(entityType, id, validIds, listTool) {
    const suggestions = suggestId(id, validIds);
    const guidance = { use_tool: listTool, reason: `Call ${listTool} to see all valid ${entityType} IDs.` };
    if (suggestions.length > 0) guidance.did_you_mean = suggestions;
    return structuredError({
        error: 'not_found',
        detail: `No ${entityType} found with ID "${id}".`,
        why: `IDs are kebab-case slugs derived from entity names. The exact ID must match.`,
        guidance
    });
}

// ---------------------------------------------------------------------------
// Tool definitions (JSON Schema for inputs)
// ---------------------------------------------------------------------------

const TOOLS = [
    {
        name: 'list_capabilities',
        description: 'List all capabilities with IDs, names, and groups. Returns a summary of all tracked AI capabilities. Call this first to discover valid capability IDs.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false }
    },
    {
        name: 'get_capability',
        description: 'Get full details for a capability by ID, including implementations, products, what counts/doesn\'t count, and constraints. Call list_capabilities first if you don\'t know the ID.',
        inputSchema: {
            type: 'object',
            properties: { id: { type: 'string', description: 'Capability ID (e.g. "search-the-web", "generate-images"). Use list_capabilities to discover valid IDs.' } },
            required: ['id'],
            additionalProperties: false
        }
    },
    {
        name: 'list_products',
        description: 'List all products. Optionally filter by kind: "hosted" (e.g. ChatGPT, Claude) or "runtime" (e.g. LM Studio, Ollama). Call this first to discover valid product IDs.',
        inputSchema: {
            type: 'object',
            properties: { kind: { type: 'string', enum: ['hosted', 'runtime'], description: 'Filter by product kind' } },
            additionalProperties: false
        }
    },
    {
        name: 'get_product',
        description: 'Get full details for a product by ID, including implementations, plans, and surfaces. Call list_products first if you don\'t know the ID.',
        inputSchema: {
            type: 'object',
            properties: { id: { type: 'string', description: 'Product ID (e.g. "chatgpt", "claude", "gemini"). Use list_products to discover valid IDs.' } },
            required: ['id'],
            additionalProperties: false
        }
    },
    {
        name: 'compare_products',
        description: 'Compare two products by capability overlap. Shows shared capabilities, unique-to-each, and counts. Only works for hosted products (chatgpt, claude, copilot, gemini, grok, perplexity).',
        inputSchema: {
            type: 'object',
            properties: {
                product_a: { type: 'string', description: 'First product ID (hosted only)' },
                product_b: { type: 'string', description: 'Second product ID (hosted only)' }
            },
            required: ['product_a', 'product_b'],
            additionalProperties: false
        }
    },
    {
        name: 'check_availability',
        description: 'Check whether a product implements a specific capability, with gating, plan details, and constraints.',
        inputSchema: {
            type: 'object',
            properties: {
                product: { type: 'string', description: 'Product ID (e.g. "chatgpt")' },
                capability: { type: 'string', description: 'Capability ID (e.g. "search-the-web")' }
            },
            required: ['product', 'capability'],
            additionalProperties: false
        }
    },
    {
        name: 'search',
        description: 'Search across capabilities, products, and implementations by keyword. Matches against names, IDs, search terms, related terms, and summaries. Returns top 10 matches ranked by relevance.',
        inputSchema: {
            type: 'object',
            properties: { query: { type: 'string', description: 'Search query (e.g. "voice", "code generation", "image")' } },
            required: ['query'],
            additionalProperties: false
        }
    },
    {
        name: 'get_plan',
        description: 'Get the capabilities and implementations available on a specific subscription plan for a product. Answers "What do I get on ChatGPT Plus?" or "What\'s included in Claude Pro?"',
        inputSchema: {
            type: 'object',
            properties: {
                product: { type: 'string', description: 'Product ID (e.g. "chatgpt", "claude")' },
                plan: { type: 'string', description: 'Plan name (e.g. "Plus", "Pro", "Free"). Case-sensitive — use get_product to discover available plans.' }
            },
            required: ['product', 'plan'],
            additionalProperties: false
        }
    },
    {
        name: 'list_providers',
        description: 'List all providers with IDs, names, websites, status pages, and their products.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false }
    },
    {
        name: 'get_provider',
        description: 'Get full details for a provider by ID, including website, status page, and product list. Call list_providers first if you don\'t know the ID.',
        inputSchema: {
            type: 'object',
            properties: { id: { type: 'string', description: 'Provider ID (e.g. "openai", "anthropic", "google"). Use list_providers to discover valid IDs.' } },
            required: ['id'],
            additionalProperties: false
        }
    },
    {
        name: 'find_products_by_capabilities',
        description: 'Find products that support ALL of the specified capabilities. Answers "Which AI products can do web search AND generate images?" Returns products with their gating level for each requested capability.',
        inputSchema: {
            type: 'object',
            properties: {
                capabilities: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Array of capability IDs that must ALL be supported (e.g. ["search-the-web", "generate-images"]). Use list_capabilities to discover valid IDs.',
                    minItems: 1
                }
            },
            required: ['capabilities'],
            additionalProperties: false
        }
    },
    {
        name: 'get_evidence',
        description: 'Get verification sources, changelog, and freshness dates for an implementation. Use this to cite claims or check how current the data is.',
        inputSchema: {
            type: 'object',
            properties: { implementation_id: { type: 'string', description: 'Implementation ID (e.g. "chatgpt-search", "claude-web-search"). These are listed in capability and product detail responses.' } },
            required: ['implementation_id'],
            additionalProperties: false
        }
    },
    {
        name: 'list_model_access',
        description: 'List all open/self-hostable models with IDs, names, providers, deployment modes, and related capabilities. Covers models like Llama, Mistral, DeepSeek, and Qwen.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false }
    },
    {
        name: 'get_model_access',
        description: 'Get full details for an open model by ID, including deployment modes, common runtimes, constraints, and related capabilities. Call list_model_access first if you don\'t know the ID.',
        inputSchema: {
            type: 'object',
            properties: { id: { type: 'string', description: 'Model access ID (e.g. "llama", "deepseek-v3-r1", "mistral-small-4"). Use list_model_access to discover valid IDs.' } },
            required: ['id'],
            additionalProperties: false
        }
    },
    {
        name: 'get_staleness_report',
        description: 'Get a report of evidence records whose verified date exceeds a threshold. Answers "what data might be outdated?" Default threshold is 30 days.',
        inputSchema: {
            type: 'object',
            properties: { threshold_days: { type: 'number', description: 'Number of days after which data is considered stale (default: 30)' } },
            additionalProperties: false
        }
    }
];

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

function handleListCapabilities() {
    const caps = (data.capabilities?.capabilities || []).map(c => ({
        id: c.id, name: c.name, group: c.group, summary: c.summary,
        implementation_count: c.implementation_count, product_count: c.product_count
    }));
    return textResult({ meta: meta(), data: caps });
}

function handleGetCapability({ id }) {
    const cap = (data.capabilities?.capabilities || []).find(c => c.id === id);
    if (!cap) return notFoundError('capability', id, VALID_IDS.capabilities, 'list_capabilities');
    return textResult({ meta: meta(), data: cap });
}

function handleListProducts({ kind } = {}) {
    let products = data.products?.products || [];
    if (kind) products = products.filter(p => p.product_kind === kind);
    const summary = products.map(p => ({
        id: p.id, name: p.name, provider: p.provider, product_kind: p.product_kind,
        summary: p.summary, implementation_count: p.implementation_count
    }));
    return textResult({ meta: meta(), data: summary });
}

function handleGetProduct({ id }) {
    const product = (data.products?.products || []).find(p => p.id === id);
    if (!product) return notFoundError('product', id, VALID_IDS.products, 'list_products');

    // Enrich with implementation details
    const implDetails = (product.implementations || []).map(implId => {
        const impl = (data.implementations?.implementations || []).find(i => i.id === implId);
        if (!impl) return { id: implId };
        return {
            id: impl.id, name: impl.name, capabilities: impl.capabilities,
            gating: impl.gating, status: impl.status, plans: impl.plans,
            surfaces: impl.surfaces, talking_point: impl.talking_point, verified: impl.verified
        };
    });

    // Include available plan names for discoverability
    const planEntitlements = data['plan-entitlements']?.products?.[id];
    const availablePlans = planEntitlements ? Object.keys(planEntitlements.plans) : [];

    return textResult({
        meta: meta(),
        data: { ...product, implementation_details: implDetails, available_plans: availablePlans }
    });
}

function handleCompareProducts({ product_a, product_b }) {
    const hostedIds = (data.products?.products || []).filter(p => p.product_kind === 'hosted').map(p => p.id);
    const comparisons = data['product-comparisons']?.comparisons || [];
    const match = comparisons.find(c =>
        (c.products[0] === product_a && c.products[1] === product_b) ||
        (c.products[0] === product_b && c.products[1] === product_a)
    );
    if (!match) {
        return structuredError({
            error: 'not_found',
            detail: `No comparison found for "${product_a}" and "${product_b}".`,
            why: 'Pre-computed comparisons exist only for hosted product pairs.',
            guidance: { valid_hosted_ids: hostedIds, use_tool: 'list_products', reason: 'Call list_products with kind="hosted" to see comparable products.' }
        });
    }

    // If the caller reversed the order, swap only_a/only_b labels
    let result = { ...match };
    if (match.products[0] === product_b) {
        result = {
            products: [product_a, product_b],
            shared_capabilities: match.shared_capabilities,
            only_a: match.only_b,
            only_b: match.only_a,
            shared_count: match.shared_count,
            only_a_count: match.only_b_count,
            only_b_count: match.only_a_count
        };
    }

    return textResult({ meta: meta(), data: result });
}

function handleCheckAvailability({ product, capability }) {
    const matrix = data['capability-matrix']?.matrix || {};
    const capRow = matrix[capability];
    if (!capRow) return notFoundError('capability', capability, VALID_IDS.capabilities, 'list_capabilities');
    const cell = capRow[product];
    if (!cell) {
        return structuredError({
            error: 'not_found',
            detail: `Product "${product}" not found in the capability matrix.`,
            why: 'The capability matrix covers products that have at least one tracked implementation.',
            guidance: {
                valid_products_for_capability: Object.keys(capRow),
                use_tool: 'list_products',
                reason: 'Call list_products to see all product IDs, or check the valid_products_for_capability list above.'
            }
        });
    }

    // Enrich with full implementation details
    const implDetails = (cell.implementations || []).map(implId => {
        const impl = (data.implementations?.implementations || []).find(i => i.id === implId);
        if (!impl) return { id: implId };
        return {
            id: impl.id, name: impl.name, gating: impl.gating, status: impl.status,
            plans: impl.plans, surfaces: impl.surfaces,
            talking_point: impl.talking_point, verified: impl.verified
        };
    });

    return textResult({
        meta: meta(),
        data: {
            product, capability,
            available: cell.available,
            best_gating: cell.best_gating,
            implementations: implDetails
        }
    });
}

function handleSearch({ query }) {
    const q = query.toLowerCase();
    const results = [];

    // Search capabilities
    for (const cap of (data.capabilities?.capabilities || [])) {
        let score = 0;
        if (cap.id === q) score = 100;
        else if (cap.name.toLowerCase().includes(q)) score = 80;
        else if ((cap.search_terms || []).some(t => t.toLowerCase().includes(q))) score = 60;
        else if ((cap.related_terms || []).some(t => t.toLowerCase().includes(q))) score = 50;
        else if (cap.summary && cap.summary.toLowerCase().includes(q)) score = 30;
        if (score > 0) results.push({ type: 'capability', id: cap.id, name: cap.name, summary: cap.summary, score });
    }

    // Search products
    for (const prod of (data.products?.products || [])) {
        let score = 0;
        if (prod.id === q) score = 100;
        else if (prod.name.toLowerCase().includes(q)) score = 80;
        else if (prod.summary && prod.summary.toLowerCase().includes(q)) score = 30;
        if (score > 0) results.push({ type: 'product', id: prod.id, name: prod.name, summary: prod.summary, score });
    }

    // Search implementations
    for (const impl of (data.implementations?.implementations || [])) {
        let score = 0;
        if (impl.id === q) score = 100;
        else if (impl.name.toLowerCase().includes(q)) score = 70;
        else if (impl.talking_point && impl.talking_point.toLowerCase().includes(q)) score = 20;
        if (score > 0) results.push({
            type: 'implementation', id: impl.id, name: impl.name,
            product: impl.product, gating: impl.gating, score
        });
    }

    // Search model access
    for (const model of (data['model-access']?.model_access || [])) {
        let score = 0;
        if (model.id === q) score = 100;
        else if (model.name.toLowerCase().includes(q)) score = 80;
        else if (model.summary && model.summary.toLowerCase().includes(q)) score = 30;
        if (score > 0) results.push({
            type: 'model_access', id: model.id, name: model.name,
            provider: model.provider, summary: model.summary, score
        });
    }

    results.sort((a, b) => b.score - a.score);
    return textResult({ meta: meta(), data: results.slice(0, 10), total_matches: results.length });
}

function handleGetPlan({ product, plan }) {
    const planData = data['plan-entitlements']?.products?.[product];
    if (!planData) return notFoundError('product', product, VALID_IDS.products, 'list_products');

    const planEntry = planData.plans?.[plan];
    if (!planEntry) {
        const availablePlans = Object.keys(planData.plans || {});
        return structuredError({
            error: 'not_found',
            detail: `Plan "${plan}" not found for product "${product}".`,
            why: 'Plan names are case-sensitive and must match exactly (e.g. "Plus", "Pro", "Free").',
            guidance: { available_plans: availablePlans, use_tool: 'get_product', reason: `Call get_product with id="${product}" to see full product details including plan names.` }
        });
    }

    // Enrich implementations with details
    const implDetails = (planEntry.implementations || []).map(implId => {
        const impl = (data.implementations?.implementations || []).find(i => i.id === implId);
        if (!impl) return { id: implId };
        return {
            id: impl.id, name: impl.name, capabilities: impl.capabilities,
            gating: impl.gating, talking_point: impl.talking_point, verified: impl.verified
        };
    });

    return textResult({
        meta: meta(),
        data: {
            product,
            plan,
            capabilities: planEntry.capabilities,
            capability_count: planEntry.capability_count,
            implementations: implDetails,
            implementation_count: planEntry.implementation_count
        }
    });
}

function handleListProviders() {
    const providers = (data.providers?.providers || []).map(p => ({
        id: p.id, name: p.name, website: p.website, status_page: p.status_page,
        product_count: (p.products || []).length, products: p.products
    }));
    return textResult({ meta: meta(), data: providers });
}

function handleGetProvider({ id }) {
    const provider = (data.providers?.providers || []).find(p => p.id === id);
    if (!provider) return notFoundError('provider', id, VALID_IDS.providers, 'list_providers');
    return textResult({ meta: meta(), data: provider });
}

function handleFindProductsByCapabilities({ capabilities }) {
    // Validate all capability IDs first
    const invalid = capabilities.filter(c => !VALID_IDS.capabilities.includes(c));
    if (invalid.length > 0) {
        return structuredError({
            error: 'invalid_input',
            detail: `Unknown capability ID(s): ${invalid.join(', ')}.`,
            why: 'All capability IDs must be valid kebab-case slugs from the capability list.',
            guidance: {
                did_you_mean: invalid.map(id => ({ input: id, suggestions: suggestId(id, VALID_IDS.capabilities) })),
                use_tool: 'list_capabilities',
                reason: 'Call list_capabilities to see all valid capability IDs.'
            }
        });
    }

    const matrix = data['capability-matrix']?.matrix || {};
    const allProducts = (data.products?.products || []);

    const results = [];
    for (const product of allProducts) {
        const capDetails = [];
        let hasAll = true;
        for (const capId of capabilities) {
            const cell = matrix[capId]?.[product.id];
            if (!cell || !cell.available) { hasAll = false; break; }
            capDetails.push({ capability: capId, best_gating: cell.best_gating });
        }
        if (hasAll) {
            results.push({
                product_id: product.id,
                product_name: product.name,
                product_kind: product.product_kind,
                provider: product.provider,
                capability_details: capDetails
            });
        }
    }

    return textResult({
        meta: meta(),
        data: {
            queried_capabilities: capabilities,
            matching_products: results,
            match_count: results.length
        }
    });
}

function handleGetEvidence({ implementation_id }) {
    // Try direct match on evidence ID pattern
    const evidenceId = `implementation-${implementation_id}`;
    let record = (data.evidence?.evidence || []).find(e => e.id === evidenceId);

    // Fallback: try matching by entity_id
    if (!record) {
        record = (data.evidence?.evidence || []).find(e => e.entity_id === implementation_id);
    }

    if (!record) {
        const suggestions = suggestId(implementation_id, VALID_IDS.implementations);
        return structuredError({
            error: 'not_found',
            detail: `No evidence record found for implementation "${implementation_id}".`,
            why: 'Evidence records are keyed by implementation ID. The ID must match an existing implementation.',
            guidance: {
                did_you_mean: suggestions.length > 0 ? suggestions : undefined,
                use_tool: 'search',
                reason: 'Use search to find the correct implementation ID, or call get_product/get_capability to see implementation IDs listed in their responses.'
            }
        });
    }

    return textResult({ meta: meta(), data: record });
}

function handleListModelAccess() {
    const models = (data['model-access']?.model_access || []).map(m => ({
        id: m.id, name: m.name, provider: m.provider, status: m.status,
        deployment_modes: m.deployment_modes, related_capabilities: m.related_capabilities,
        summary: m.summary, last_verified: m.last_verified
    }));
    return textResult({ meta: meta(), data: models });
}

function handleGetModelAccess({ id }) {
    const model = (data['model-access']?.model_access || []).find(m => m.id === id);
    if (!model) return notFoundError('model', id, VALID_IDS.model_access, 'list_model_access');
    return textResult({ meta: meta(), data: model });
}

function handleGetStalenessReport({ threshold_days } = {}) {
    const threshold = threshold_days || 30;
    const now = Date.now();
    const records = [];

    for (const ev of (data.evidence?.evidence || [])) {
        if (!ev.verified) continue;
        const daysSince = Math.floor((now - new Date(ev.verified).getTime()) / 86400000);
        if (daysSince > threshold) {
            records.push({
                id: ev.id, entity_id: ev.entity_id,
                verified: ev.verified, checked: ev.checked,
                days_since_verified: daysSince
            });
        }
    }

    records.sort((a, b) => b.days_since_verified - a.days_since_verified);

    return textResult({
        meta: meta(),
        data: {
            threshold_days: threshold,
            stale_count: records.length,
            total_evidence_records: (data.evidence?.evidence || []).length,
            records
        }
    });
}

const TOOL_HANDLERS = {
    list_capabilities: handleListCapabilities,
    get_capability: handleGetCapability,
    list_products: handleListProducts,
    get_product: handleGetProduct,
    compare_products: handleCompareProducts,
    check_availability: handleCheckAvailability,
    search: handleSearch,
    get_plan: handleGetPlan,
    list_providers: handleListProviders,
    get_provider: handleGetProvider,
    find_products_by_capabilities: handleFindProductsByCapabilities,
    get_evidence: handleGetEvidence,
    list_model_access: handleListModelAccess,
    get_model_access: handleGetModelAccess,
    get_staleness_report: handleGetStalenessReport
};

// ---------------------------------------------------------------------------
// JSON-RPC / MCP transport (stdio)
// ---------------------------------------------------------------------------

function jsonRpcResponse(id, result) {
    return JSON.stringify({ jsonrpc: '2.0', id, result });
}

function jsonRpcError(id, code, message) {
    return JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } });
}

function handleMessage(msg) {
    const { id, method, params } = msg;

    switch (method) {
        case 'initialize':
            return jsonRpcResponse(id, {
                protocolVersion: '2024-11-05',
                capabilities: { tools: {} },
                serverInfo: SERVER_INFO
            });

        case 'notifications/initialized':
            return null; // No response for notifications

        case 'ping':
            return jsonRpcResponse(id, {});

        case 'tools/list':
            return jsonRpcResponse(id, { tools: TOOLS });

        case 'tools/call': {
            const toolName = params?.name;
            const handler = TOOL_HANDLERS[toolName];
            if (!handler) {
                const validTools = Object.keys(TOOL_HANDLERS);
                return jsonRpcResponse(id, structuredError({
                    error: 'unknown_tool',
                    detail: `No tool named "${toolName}".`,
                    why: 'The tool name must match one of the registered MCP tools exactly.',
                    guidance: { available_tools: validTools }
                }));
            }
            try {
                const result = handler(params?.arguments || {});
                return jsonRpcResponse(id, result);
            } catch (err) {
                return jsonRpcResponse(id, structuredError({
                    error: 'tool_error',
                    detail: `Tool "${toolName}" threw an error: ${err.message}`,
                    why: 'An unexpected error occurred while processing the request.',
                    guidance: { retry: true, reason: 'Check that all input parameters are valid and try again.' }
                }));
            }
        }

        default:
            if (method?.startsWith('notifications/')) return null;
            return jsonRpcError(id, -32601, `Method not found: ${method}`);
    }
}

// ---------------------------------------------------------------------------
// stdin/stdout line-buffered transport
// ---------------------------------------------------------------------------

let buffer = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
    buffer += chunk;
    let newlineIdx;
    while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIdx).trim();
        buffer = buffer.slice(newlineIdx + 1);
        if (!line) continue;

        let msg;
        try {
            msg = JSON.parse(line);
        } catch {
            process.stdout.write(jsonRpcError(null, -32700, 'Parse error') + '\n');
            continue;
        }

        const response = handleMessage(msg);
        if (response !== null) {
            process.stdout.write(response + '\n');
        }
    }
});

process.stdin.on('end', () => process.exit(0));

// Prevent unhandled errors from crashing the server
process.on('uncaughtException', err => {
    console.error('[mcp-server] Uncaught exception:', err.message);
});

console.error(`[mcp-server] AI Tool Watch MCP server started (${data.index?.meta?.generated || 'unknown'} data)`);
