# Access Layers: SEO, JSON, and MCP

Status: Draft 1
Last updated: 2026-03-15

This document describes the three access layers that sit on top of the ontology-backed data model. All three are presentation layers — they consume the same canonical source and should never become independent data systems.

## Governing Principle

The ontology is the model. Everything else is a view.

```text
Canonical data (markdown, YAML, JSON)
  ├── Site views (capability-first, implementation-first, constraints)
  ├── SEO layer (bridge pages, structured data, synonym mapping)
  ├── JSON export (stable machine-readable artifacts)
  └── MCP layer (read-only agent-queryable interface)
```

Each layer adds reach without adding a second source of truth.

## Why These Three Layers

### The site serves humans who already found us

The current build generates HTML views for people browsing the reference directly. This works for direct traffic and bookmarks but does not capture search traffic or serve agents.

### SEO captures humans who are searching

Most people looking for this information don't know this site exists. They search for "can ChatGPT upload files" or "Claude vs Gemini voice mode." The SEO layer bridges the gap between the ontology's internal vocabulary and the language people actually use to search.

### JSON serves agents and tools that read data

Agents, scripts, and downstream tools need structured data with stable IDs, cross-links, and freshness metadata. Scraping HTML is fragile. The JSON export provides a stable public data contract.

### MCP serves agents that want to query

An MCP-compatible read layer lets agents ask questions ("Which AI tools support web search on the free tier?") without downloading and parsing the full export. It sits on top of the JSON artifacts.

## Delivery Sequence

1. **SEO vocabulary** — add `search_terms` to capability records (prerequisite for both SEO pages and JSON export)
2. **JSON export** — generate canonical JSON from the build pipeline (Phase 5 of the roadmap)
3. **SEO bridge pages** — generate programmatic pages from JSON (can happen alongside or after JSON)
4. **Structured data** — add schema.org markup to generated HTML
5. **MCP read layer** — read-only interface over the JSON artifacts

Steps 1 and 2 are the immediate next work. Steps 3–5 build on them.

## Layer 1: SEO Vocabulary

### Problem

The ontology uses capability slugs like `search-the-web`. Users search for "web search", "web browsing", "internet access", "real-time information." The site cannot rank for queries it doesn't use.

### Solution

Add a `search_terms` field to each capability record. This is a list of the exact phrases people use when searching for this capability.

```markdown
---
id: search-the-web
name: Search the Web
group: act
status: active
search_terms:
  - web search
  - web browsing
  - internet access
  - real-time information
  - browse the internet
  - grounding
---
```

These terms feed:
- on-page content (natural language paragraphs that include search terms)
- structured data (`DefinedTerm` alternate names)
- JSON export (agents can use them for discovery)
- FAQ generation ("Can ChatGPT search the web?" derives from product × search term)

### Scope

Every capability record gets `search_terms`. Implementation records do not need them — their vendor names (e.g., "ChatGPT Search", "Perplexity Pro Search") are already the terms people search for.

## Layer 2: JSON Export

### Purpose

Generate canonical JSON artifacts from the same ontology-backed source used by the site build.

### Artifacts

One stable export covering all first-class entity types and their relationships:

- `capabilities.json` — all capabilities with search terms, definitions, and related implementations
- `products.json` — all products with provider links, plan tiers, and implementation lists
- `implementations.json` — all implementations with capability mappings, constraints, plan availability, and evidence
- `providers.json` — all providers with product lists
- `model-access.json` — all model-access records with deployment and constraint details
- `evidence.json` — the existing evidence index (already JSON)

### Derived views

Optimized for common lookups:

- `capability-matrix.json` — capability × product availability grid
- `product-comparisons.json` — pairwise product capability overlap
- `plan-entitlements.json` — what each plan tier unlocks across products

### Data contract

Every JSON artifact must include:

- stable IDs matching the canonical records
- cross-links using those IDs (not display names)
- freshness fields (`verified`, `checked`, `launched`)
- source attribution (`sources`, `source_file`)
- generation timestamp

### Generation

A new script (`scripts/export-json.js` or integrated into `scripts/build.js`) that reads the same canonical sources and produces JSON alongside the HTML output.

## Layer 3: SEO Bridge Pages

### Purpose

Capture search traffic from people using query patterns that don't match the site's current URL structure.

### Page types

All generated programmatically from the JSON export or canonical data:

| Page type | URL pattern | Source data | Example |
|---|---|---|---|
| Product comparison | `/compare/{product}-vs-{product}` | Capability matrix, filtered to two products | `/compare/chatgpt-vs-claude` |
| Capability check | `/can/{product}/{capability-slug}` | Implementation record + constraints | `/can/chatgpt/search-the-web` |
| Best for use case | `/best-for/{use-case}` | Capability record + implementations ranked | `/best-for/coding` |
| Capability landing | `/capability/{slug}` | Capability record + all implementations | `/capability/search-the-web` |

### Content requirements

Each bridge page must have substantive content to avoid thin-content penalties:

- implementation-specific details (not just a template with swapped names)
- plan availability tables with actual tier data
- constraints and caveats
- evidence sources and freshness dates
- talking points where available

### Structured data per page type

| Page type | Schema.org type | Key properties |
|---|---|---|
| Product comparison | `ItemList` + `SoftwareApplication` | `itemListElement`, `featureList` |
| Capability check | `FAQPage` | `mainEntity` (question/answer pairs) |
| Best for use case | `ItemList` | `itemListElement` with ordering |
| Capability landing | `DefinedTerm` + `ItemList` | `name`, `description`, `termCode` |

### FAQ generation

Each capability × product combination generates a natural FAQ pair:

- Question: "Can {product} {capability search term}?"
- Answer: derived from implementation record (availability, plan requirements, constraints)

Example:
- Q: "Can ChatGPT search the web?"
- A: "Yes. ChatGPT Search is available on Free, Plus ($20/mo), and Pro ($200/mo) plans across web, desktop, and mobile. It uses real-time web search to provide current information with source citations."

These FAQ pairs appear on both capability pages and bridge pages, and are marked up with `FAQPage` structured data.

## Layer 4: MCP Read Interface

### Purpose

Let agents query the reference without downloading and parsing files. Read-only.

### Design principles

- read-only — no mutations through MCP
- schema-documented — every tool has typed parameters and return shapes
- backed by generated artifacts — reads from JSON export, not from markdown directly
- no bespoke logic — if a query requires complex joins, the JSON export should pre-compute the view

### Implementation

**Status:** Implemented — `scripts/mcp-server.js` (zero dependencies, stdio transport)

**Configuration:** See `mcp.json` in the project root.

| Tool | Parameters | Returns |
|---|---|---|
| `list_capabilities` | (none) | All capabilities with IDs, names, groups, search terms |
| `get_capability` | `id` | Full capability record with implementations and availability |
| `list_products` | `kind` (optional: hosted/runtime) | All products with IDs, names, providers |
| `get_product` | `id` | Full product record with implementations and plan tiers |
| `compare_products` | `product_a`, `product_b` | Capability overlap, differences, plan comparison |
| `check_availability` | `product`, `capability` | Whether and how the product implements the capability, with constraints |
| `search` | `query` | Fuzzy match across capabilities, implementations, and search terms |

Every tool response includes freshness metadata (`meta.generated`, `meta.freshness_note`) so callers can present data with appropriate date context.

### Source data

All MCP tools read from the generated JSON artifacts in `docs/api/v1/`. If the JSON export changes shape, the MCP layer updates to match. The JSON contract is the interface boundary.

## Shared Data Contract

These fields should be present in capability records and survive into all access layers:

| Field | Used by | Description |
|---|---|---|
| `id` | All layers | Stable identifier, used in URLs and cross-links |
| `name` | All layers | Display name |
| `search_terms` | SEO, JSON, MCP | Search vocabulary for discovery |
| `summary` | All layers | ~40-50 word definition, optimized for featured snippets |
| `what_counts` | Site, JSON, MCP | Inclusion criteria |
| `what_does_not_count` | Site, JSON, MCP | Exclusion criteria |
| `related_terms` | SEO, JSON | Vendor terminology mapping |
| `implementations` | All layers | Cross-linked implementation records |

## Relationship to Roadmap

| Roadmap phase | Access layer work |
|---|---|
| Phase 5: Agent-Readable Data Access | JSON export (done) + MCP layer (done) |
| Not yet in roadmap | SEO vocabulary, bridge pages, structured data |

The SEO work should be added to the roadmap. It shares infrastructure with Phase 5 and should be sequenced alongside it, not after.

## Security and Usage Considerations

The project is a static site with no server, no database, and no user data. The "API" is pre-generated JSON files. This constrains the risk surface but does not eliminate it.

### Risks that actually matter

1. **Stale data cited as current.** The AI landscape changes weekly. Every record includes `verified` and `checked` dates. Consumers must surface these dates — presenting undated claims as fact is the primary misuse vector.

2. **Stripped caveats.** An agent that says "ChatGPT can do X" without mentioning it requires a paid plan or isn't available in certain regions is misleading. The data includes gating, plan availability, and constraints specifically to prevent this.

3. **Bandwidth abuse.** GitHub Pages has soft bandwidth limits. Aggressive polling or hotlinking could cause throttling. The `robots.txt` asks for 1-second crawl delays; the API usage guide recommends hourly polling at most.

4. **Misrepresentation.** Someone could modify the data and present it as canonical. Generation timestamps and stable source URLs help but cannot prevent this.

### Risks that do not apply

- **Injection attacks** — no server-side execution, no database, no user input processing
- **Authentication bypass** — no authentication exists; all data is intentionally public
- **Data exfiltration** — no private data; everything published is meant to be read
- **Supply chain** — zero npm dependencies; build uses only Node.js built-ins

### MCP-specific guidance

- The MCP layer must be **read-only**. No mutations, no writes, no side effects.
- Tool responses should include freshness metadata (`verified` date) so the calling agent can present it.
- Tools should preserve gating and constraint context — never return a bare "yes" for availability without the plan/surface/regional qualifiers.
- The MCP layer reads from generated JSON artifacts. It should not parse markdown, scrape HTML, or maintain its own data.

See `SECURITY.md` for the full security policy and `docs/api/v1/USAGE.md` for consumer guidance.

## What Not To Do

- Do not create a separate database or API server — the generated JSON files are the data layer
- Do not let SEO page generation introduce data that doesn't exist in canonical records
- Do not let the MCP layer accept writes — this is a read-only reference
- Do not optimize for SEO at the expense of the ontology — if a search term doesn't map cleanly to the ontology, the ontology wins
- Do not generate bridge pages without substantive content — thin programmatic pages are a ranking penalty
