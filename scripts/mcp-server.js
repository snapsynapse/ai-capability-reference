#!/usr/bin/env node
'use strict';

/**
 * MCP (Model Context Protocol) server for AI Capability Reference.
 * Zero dependencies — uses only Node.js built-ins.
 * Reads pre-generated JSON files from docs/api/v1/ and exposes 7 read-only tools.
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
// Helpers
// ---------------------------------------------------------------------------

const SERVER_INFO = { name: 'ai-capability-reference', version: '1.0.0' };

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

function errorResult(msg) {
    return { content: [{ type: 'text', text: JSON.stringify({ error: msg }) }], isError: true };
}

// ---------------------------------------------------------------------------
// Tool definitions (JSON Schema for inputs)
// ---------------------------------------------------------------------------

const TOOLS = [
    {
        name: 'list_capabilities',
        description: 'List all capabilities with IDs, names, and groups. Returns a summary of all 18 tracked AI capabilities.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false }
    },
    {
        name: 'get_capability',
        description: 'Get full details for a capability by ID, including implementations, products, what counts/doesn\'t count, and constraints.',
        inputSchema: {
            type: 'object',
            properties: { id: { type: 'string', description: 'Capability ID (e.g. "search-the-web")' } },
            required: ['id'],
            additionalProperties: false
        }
    },
    {
        name: 'list_products',
        description: 'List all products. Optionally filter by kind (hosted or runtime).',
        inputSchema: {
            type: 'object',
            properties: { kind: { type: 'string', enum: ['hosted', 'runtime'], description: 'Filter by product kind' } },
            additionalProperties: false
        }
    },
    {
        name: 'get_product',
        description: 'Get full details for a product by ID, including implementations, plans, and surfaces.',
        inputSchema: {
            type: 'object',
            properties: { id: { type: 'string', description: 'Product ID (e.g. "chatgpt", "claude")' } },
            required: ['id'],
            additionalProperties: false
        }
    },
    {
        name: 'compare_products',
        description: 'Compare two products by capability overlap. Shows shared capabilities, unique-to-each, and counts.',
        inputSchema: {
            type: 'object',
            properties: {
                product_a: { type: 'string', description: 'First product ID' },
                product_b: { type: 'string', description: 'Second product ID' }
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
                product: { type: 'string', description: 'Product ID' },
                capability: { type: 'string', description: 'Capability ID' }
            },
            required: ['product', 'capability'],
            additionalProperties: false
        }
    },
    {
        name: 'search',
        description: 'Search across capabilities, products, and implementations by keyword. Returns top 10 matches ranked by relevance.',
        inputSchema: {
            type: 'object',
            properties: { query: { type: 'string', description: 'Search query' } },
            required: ['query'],
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
    if (!cap) return errorResult(`Capability not found: ${id}`);
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
    if (!product) return errorResult(`Product not found: ${id}`);

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

    return textResult({
        meta: meta(),
        data: { ...product, implementation_details: implDetails }
    });
}

function handleCompareProducts({ product_a, product_b }) {
    // Normalize order to match pre-computed comparisons
    const comparisons = data['product-comparisons']?.comparisons || [];
    const match = comparisons.find(c =>
        (c.products[0] === product_a && c.products[1] === product_b) ||
        (c.products[0] === product_b && c.products[1] === product_a)
    );
    if (!match) return errorResult(`No comparison found for ${product_a} and ${product_b}. Use hosted product IDs: chatgpt, claude, copilot, gemini, grok, perplexity.`);

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
    if (!capRow) return errorResult(`Capability not found in matrix: ${capability}`);
    const cell = capRow[product];
    if (!cell) return errorResult(`Product not found in matrix: ${product}`);

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

    results.sort((a, b) => b.score - a.score);
    return textResult({ meta: meta(), data: results.slice(0, 10), total_matches: results.length });
}

const TOOL_HANDLERS = {
    list_capabilities: handleListCapabilities,
    get_capability: handleGetCapability,
    list_products: handleListProducts,
    get_product: handleGetProduct,
    compare_products: handleCompareProducts,
    check_availability: handleCheckAvailability,
    search: handleSearch
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
                return jsonRpcResponse(id, errorResult(`Unknown tool: ${toolName}`));
            }
            try {
                const result = handler(params?.arguments || {});
                return jsonRpcResponse(id, result);
            } catch (err) {
                return jsonRpcResponse(id, errorResult(`Tool error: ${err.message}`));
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

console.error(`[mcp-server] AI Capability Reference MCP server started (${data.index?.meta?.generated || 'unknown'} data)`);
