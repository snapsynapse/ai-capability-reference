# API Usage Guide

## Overview

The AI Tool Watch API is a set of static JSON files generated from the same canonical data as the site. There is no authentication, no rate limiting, and no registration required.

Base URL: `https://aitool.watch/api/v1/`

Start at [`index.json`](https://aitool.watch/api/v1/index.json) for a manifest of all available files.

## Files

### Entity files

| File | Description |
|---|---|
| `capabilities.json` | 18 capabilities with search terms, definitions, what-counts/what-doesn't, and cross-links to implementations |
| `products.json` | 9 products (hosted and runtime) with provider links, pricing pages, and implementation lists |
| `implementations.json` | 87 implementations with full plan/surface availability, gating, and evidence cross-links |
| `providers.json` | 13 providers with logo, website, and status page URLs |
| `model-access.json` | 9 open-model records with deployment modes, constraints, and runtime information |
| `evidence.json` | 90 evidence records with sources, changelog, and verification dates |

### Derived views

| File | Description |
|---|---|
| `capability-matrix.json` | Capability x product availability grid with best-gating per cell |
| `product-comparisons.json` | Pairwise capability overlap for all hosted product pairs |
| `plan-entitlements.json` | Per-product breakdown of what each subscription plan unlocks |

## Data Freshness

Every JSON file includes a `meta.generated` timestamp showing when it was built. Entity records include their own freshness fields:

- `verified` — date when a human last confirmed the data is accurate
- `checked` — date when the automated verification cascade last reviewed it
- `launched` — date when the feature originally launched

**Consumers should check these dates before presenting data as current.** The AI landscape changes rapidly. Data older than 30 days should be treated as potentially stale.

## Stability Contract

- File paths under `/api/v1/` are stable. New files may be added but existing files will not be removed or renamed within `v1`.
- Field names within JSON files are stable. New fields may be added but existing fields will not be removed or renamed within `v1`.
- If a breaking change is needed, it will ship under `/api/v2/` with `v1` preserved for a transition period.
- IDs (capability IDs, product IDs, implementation IDs) are stable and safe to use as foreign keys.

## MCP Server

The MCP server (`scripts/mcp-server.js`) exposes 15 read-only tools over stdio JSON-RPC. Configure it via `mcp.json` in the project root.

### Tools

| Tool | Description |
|---|---|
| `list_capabilities` | List all capabilities with IDs, names, and groups |
| `get_capability` | Full details for a capability by ID |
| `list_products` | List products, optionally filter by kind (hosted/runtime) |
| `get_product` | Full details for a product including plan names |
| `compare_products` | Pairwise capability overlap between two hosted products |
| `check_availability` | Whether a product implements a capability, with gating and plan details |
| `search` | Keyword search across capabilities, products, implementations, and open models |
| `get_plan` | Capabilities and implementations included in a specific product plan (now with pricing) |
| `list_providers` | All providers with websites, status pages, and product lists |
| `get_provider` | Full details for a provider by ID |
| `find_products_by_capabilities` | Find products that support ALL of the specified capabilities |
| `get_evidence` | Verification sources, changelog, and freshness dates for an implementation |
| `list_model_access` | All open/self-hostable models with deployment modes and related capabilities |
| `get_model_access` | Full details for an open model by ID |
| `get_staleness_report` | Evidence records whose verified date exceeds a threshold (default 30 days) |

### Error handling

Error responses follow the [Graceful Boundaries](https://github.com/snapsynapse/graceful-boundaries) pattern. Every error includes four fields:

- `error` — machine-parseable category (e.g. `not_found`, `invalid_input`)
- `detail` — human-readable explanation
- `why` — reason the constraint exists
- `guidance` — constructive next step: which tool to call, `did_you_mean` suggestions, or valid IDs

This means an agent that passes an incorrect ID will receive a suggestion of the correct ID and a pointer to the list tool, rather than a bare error string.

## For Agents and MCP Consumers

If you are building an agent or tool that reads this data:

1. **Always include freshness context.** When presenting data to users, include the `verified` date so they know how current it is. Example: "As of March 2026, ChatGPT Search is available on the Free plan."

2. **Respect gating and constraints.** A capability being "available" on a product does not mean it's available to everyone. Check the `gating` field (free/paid/limited) and the `plans` array for specifics.

3. **Link back to sources.** Evidence records include `sources` arrays with URLs. When citing specific claims, include these links so users can verify.

4. **Don't strip caveats.** Implementation records include `talking_point` fields that contain important context (regional restrictions, plan requirements, deprecation notices). Omitting these can mislead users.

5. **Cache responsibly.** The data updates roughly weekly. Caching for 24 hours is reasonable. Caching for months defeats the purpose of freshness tracking.

## Attribution

This data is published under the MIT license. You may use it freely, but we appreciate attribution:

> Data from [AI Tool Watch](https://aitool.watch/) by PAICE.work.

## Bandwidth

This API is served as static files from GitHub Pages. There is no rate limit enforced, but please be reasonable:

- Don't poll for changes more than once per hour
- Cache responses locally rather than re-fetching on every request
- If you need real-time change notification, watch the [GitHub repository](https://github.com/snapsynapse/ai-tool-watch) for commits instead

## Limitations

- This is **read-only data**, not a live service. There is no query API — download the JSON files and filter locally.
- The data covers a curated set of subscription AI products and major open models. It is not exhaustive.
- Plan pricing, surface availability, and feature status change frequently. Always check the `verified` date.
- Regional availability data is incomplete for most products. Absence of regional restrictions does not guarantee global availability.
