# Roadmap

Status: Active  
Last updated: 2026-03-07

This roadmap replaces the old feature parking lot with a phase-based plan that matches the repo's current state.

AI Capability Reference is already in a hybrid migration:

- the public site is capability-first on the homepage
- the detailed availability view remains feature-first
- ontology-aligned records now exist alongside the legacy platform markdown source files
- verification, evidence freshness, and maintainer burden reduction remain core operational concerns

The roadmap therefore prioritizes stabilizing the shared model before adding new UX layers.

## Current Position

The project is no longer just a feature dashboard with a backlog of enhancements.

It is now a capability-first, ontology-guided reference with:

- a capability homepage
- a feature-first detailed availability view
- a constraints view
- first-class capability, provider, product, model-access, implementation, and evidence records
- validation and verification tooling that support ongoing maintenance

`data/platforms/` remains the migration-era editorial source of truth for implementation details, constraints, changelog, and evidence inputs.

## Phase 1: Canonicalize The Hybrid Model

Primary goal: make the ontology-backed system internally coherent.

Work in this phase:

- finish implementation-map coverage for all in-scope hosted-product features
- explicitly track records that intentionally have no capability mapping yet
- define handling rules for model-access entitlements, reasoning modifiers, and similar edge cases
- normalize skill layout so canonical sources live in `skills/<name>/src/`, not in repeated surface-local folders
- remove committed duplicate skill copies from `.claude/skills/`, `.perplexity/skills/`, and similar platform-local locations
- treat `skill-provenance` as a required companion dependency for reusable repo skills
- tighten validation so missing links between capability, product, provider, implementation, and evidence records fail fast
- reconcile counts and terminology across docs, build output, and data folders

Exit criteria:

- every in-scope implementation is either mapped to capability IDs or explicitly marked deferred with a reason
- validation covers record integrity and cross-file reference integrity
- roadmap, README, About copy, and design docs no longer imply different project states

## Phase 2: Make Capability-First The Clear Editorial Default

Primary goal: improve the quality and completeness of the capability-first experience.

Work in this phase:

- review all capability records for definition quality, "what counts / does not count," and related terms
- fill weak or uneven capability mappings across products
- improve capability-level summaries of plan, surface, region, and gating constraints
- ensure model-access and runtime-product material appears as supporting context rather than distorting capability IA
- reduce reliance on legacy category thinking as the main editorial lens

Exit criteria:

- capability pages are good enough to explain the project without requiring the feature-first page first
- capability summaries are consistent and trustworthy across all major products
- unresolved ontology edge cases are visible but no longer confusing

## Phase 3: Preserve And Simplify The Legacy Feature View

Primary goal: keep the detailed availability view useful without letting it drive the conceptual model.

Work in this phase:

- retain the feature-first detailed availability page as the entitlement reference
- decide which legacy filters or labels are compatibility-only versus still worth investing in
- reduce conceptual dependence on the current `Category` field, especially `other`
- align constraints, talking points, and implementation detail rendering with the ontology-backed mappings
- document which legacy view elements are frozen, still evolving, or candidates for retirement later

Exit criteria:

- feature-first remains accurate and low-friction
- capability-first and feature-first feel like two views over one model, not two competing systems
- the legacy view no longer pressures the schema into bad taxonomy decisions

## Phase 4: Deferred Product Expansion

Primary goal: only pursue new user-facing experiences after the shared model is stable.

Work in this phase:

- keep Tool Check as a deferred initiative dependent on Phases 1 and 2
- pursue search, comparison, export, or feed features only if they directly leverage the stabilized shared model
- expand scope from the watchlist only after scope and ontology governance are working in practice

Tool Check remains in scope, but it is not the active project center. When it becomes active again, it should be treated as an application of the capability and constraint model rather than as a separate product track.

Tool Check-specific requirements before activation:

- it must consume canonical mappings rather than bespoke metadata
- it must handle corporate-policy caveats explicitly
- it must preserve the distinction between commercial entitlement and org-admin restriction

Exit criteria:

- shared data model is stable enough that new UX work does not invent a second source of truth
- Tool Check can consume canonical mappings instead of bespoke metadata

## Phase 5: Agent-Readable Data Access

Primary goal: make the reference easy for agents and external tools to read, query, and cite through machine-readable interfaces.

Work in this phase:

- generate canonical JSON exports for capabilities, providers, products, implementations, model-access records, constraints, and evidence relationships
- define one stable public data contract for IDs, cross-links, freshness fields, and source attribution
- add derived JSON views optimized for common lookups such as capability-to-implementation, product-to-plan entitlements, and implementation-to-evidence
- expose the data through a lightweight agent-facing interface, starting with static JSON and optionally adding an MCP-compatible read layer later
- document agent usage patterns, including citation expectations, freshness handling, and how to distinguish canonical records from generated views
- keep machine-readable exports generated from the same canonical source as the site so there is no parallel data system

Exit criteria:

- all first-class ontology records and their relationships are exportable in a stable JSON shape
- an agent can answer core repo questions without scraping HTML or relying on markdown heuristics
- source attribution and freshness metadata survive into machine-readable outputs
- any MCP or equivalent access layer is read-only, schema-documented, and backed by canonical generated artifacts rather than bespoke logic

## Working Data Contracts

These contracts should guide implementation across all phases:

- `data/platforms/` stays the authoritative migration-era source for implementation details, plan constraints, surfaces, changelog, and evidence inputs
- `data/capabilities/`, `data/providers/`, `data/products/`, `data/model-access/`, and `data/implementations/index.yml` are first-class ontology records that the build and validation pipeline must keep coherent
- canonical skill sources live under `skills/<name>/src/`; platform-local install folders such as `.claude/skills/` and `.perplexity/skills/` are not source of truth and should not be committed
- reusable repo skills depend on companion `skill-provenance` for provenance continuity across exported bundles and local installs
- `scripts/build.js` continues to generate both the capability-first homepage and the feature-first detailed availability view
- a future export step should generate canonical JSON artifacts from the same ontology-backed source used by the site build
- any MCP or similar agent interface should sit on top of those generated artifacts, not become a second hand-maintained source of truth
- `scripts/validate-ontology.js` is the enforcement point for cross-record integrity and should expand as the migration hardens

## Acceptance Checks

The roadmap is complete when future implementation can satisfy these checks:

- documentation coherence: `ROADMAP.md`, `README.md`, `design/PROJECT_GOALS.md`, and public site copy describe the same project direction
- data-model integrity: ontology validation passes for capabilities, providers, products, model-access records, implementation mappings, and evidence links
- migration completeness: all implementation records are either mapped or intentionally deferred with a stated rationale
- build-output coherence: generated capability and feature pages reflect the same canonical entities and counts
- machine-readable export readiness: generated JSON includes stable IDs, relationships, freshness fields, and source links for all first-class entities
- agent-access readiness: core questions can be answered from JSON or MCP-style reads without scraping HTML
- regression protection: the legacy feature-first availability view remains usable while capability-first stays the primary framing
- skill-structure hygiene: canonical skills remain single-source under `skills/<name>/src/` with no tracked surface-local duplicates
- deferred-initiative gate: Tool Check does not move back to active status until the shared-model prerequisites are complete

## Assumptions

- this roadmap replaces the old roadmap and should be usable as both public positioning and internal sequencing
- Tool Check remains in scope, but is intentionally demoted behind ontology and data stabilization
- agent-readable access should start with generated JSON because it is the lowest-friction, lowest-maintenance interface
- MCP or similar interfaces should be additive, read-only layers over generated artifacts rather than the first delivery target
- accuracy, ontology clarity, maintainer burden reduction, and machine-readable reuse remain the governing priorities
