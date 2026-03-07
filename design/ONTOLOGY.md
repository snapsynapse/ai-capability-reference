# AI Capability Reference Ontology

Status: Draft 1  
Last updated: 2026-03-07

This document defines the recommended ontology for the project at a level above the current feature schema.

This ontology should be read alongside the governing principle in [ONTOLOGY_FIRST.md](ONTOLOGY_FIRST.md).

The goal is to stop organizing the project around unstable buckets like `other` or overloaded buckets like `local models`, and instead describe the domain as a small set of entity types and relationships.

## Why This Exists

The existing project was built around "platform features."

That was a useful starting point, but it creates recurring problems:

- vendor features are not a stable conceptual unit
- one feature often spans several user-facing abilities
- some entries describe access, some describe tools, some describe products, and some describe model families
- `other` becomes a dumping ground whenever the schema does not know what kind of thing an item is

The ontology should answer a more basic question first:

What kind of thing is this?

Once that is explicit, the project can decide whether the thing belongs in the reference and how it should be displayed.

## Core Design Principle

Prefer relationships over buckets.

Do not ask:

- "Which category does this belong in?"

Ask:

- "What kind of entity is this?"
- "What user capability does it support?"
- "What product or surface is it part of?"
- "What constraints and evidence apply?"

## Core Entity Types

### 1. Capability

A plain-English thing a person wants to do.

Examples:

- `search-the-web`
- `speak-back-in-real-time`
- `organize-work-in-projects`
- `use-files-i-provide`
- `connect-to-external-systems`

Notes:

- Capabilities are the primary user-facing concept.
- Capabilities should be stable even when vendors rename products.
- Capabilities are not brands, model names, or UI surfaces.

### 2. Implementation

A concrete vendor- or product-specific mechanism that delivers one or more capabilities.

Examples:

- ChatGPT Advanced Voice Mode
- Claude Projects
- Gemini Live
- Copilot in Office Apps
- Anthropic Excel plug-in

Notes:

- The current repo’s "feature" records are mostly implementation records.
- An implementation may map to multiple capabilities.
- An implementation may exist only on some plans or surfaces.

### 3. Product

A user-facing container where implementations live.

Examples:

- ChatGPT
- Claude
- Gemini
- Copilot
- NotebookLM
- Claude for Excel, if that becomes a distinct packaged product

Notes:

- A provider may have multiple products.
- A product may contain many implementations.

### 4. Provider

The company or organization behind a product.

Examples:

- OpenAI
- Anthropic
- Google
- Microsoft
- Perplexity
- xAI
- Intelligent Internet

Notes:

- A provider is not automatically in scope just because it exists.
- The ontology should support providers beyond today’s tracked set without forcing them all into the main reference.

### 5. Plan

The commercial or entitlement layer controlling access.

Examples:

- Free
- Plus
- Pro
- Team
- Enterprise
- Workspace add-on

Notes:

- Plans belong to products, not directly to capabilities.
- Plan constraints should be attached to implementations.

### 6. Surface

Where a user accesses the product or implementation.

Examples:

- web
- desktop
- mobile
- terminal
- API
- browser extension
- Excel
- Word
- VS Code

Notes:

- Surfaces are access contexts, not capabilities.
- "Inside Excel" and "upload an Excel file" are not the same thing.

### 7. Deployment Mode

How the product or implementation runs.

Examples:

- hosted SaaS
- self-hosted
- local-on-device
- API-only
- embedded-in-suite
- browser-native

Notes:

- This replaces the old "local models" idea as a top-level organizing concept.
- "Local" should be treated as a deployment mode or constraint, not as a peer vendor bucket.

### 8. Model Access

The model or model family exposed to the user, if model choice materially matters.

Examples:

- GPT-5.2
- Claude Opus
- Gemini 2.5 Pro
- Llama
- Qwen
- DeepSeek

Notes:

- Model access is often a constraint or differentiator, not a primary user capability.
- Do not automatically elevate model names to top-level navigation.

### 9. Constraint

Anything that limits or shapes real-world use.

Examples:

- plan requirement
- admin enablement
- file size limits
- rate limits
- region restrictions
- supported formats
- hardware requirements
- partial feature access

Notes:

- Constraints are often what users actually need to know before they can use a capability.
- A capability page should summarize constraints across implementations.

### 10. Evidence

The support for claims in the reference.

Examples:

- official source links
- verified date
- checked date
- changelog
- notes on uncertainty

Notes:

- Evidence remains critical regardless of how the front end is reframed.
- The repo now materializes evidence as a first-class layer in [`data/evidence/index.json`](/Users/snap/Git/ai-capability-reference/data/evidence/index.json).

## Relationship Model

The core graph looks like this:

```text
Provider -> Product -> Implementation
Implementation -> Capability
Implementation -> Plan
Implementation -> Surface
Implementation -> Deployment Mode
Implementation -> Model Access
Implementation -> Constraint
Implementation -> Evidence
Product -> Evidence
Model Access -> Evidence
```

Important relationship rules:

- one implementation may map to many capabilities
- one capability may have many implementations
- one product may expose many implementations
- one provider may own many products
- surfaces and deployment modes describe access context, not user intent

## Distinctions The Ontology Must Preserve

These distinctions matter and should not be collapsed.

### Attached File Access vs Connected App Access

Attached file access means the user gives the AI a file directly in the interaction.

Examples:

- uploading a PDF
- dragging in an Excel file
- attaching a CSV to a chat

Connected app access means the AI reaches into a live external service or system.

Examples:

- Google Drive connector
- Microsoft Graph integration
- Slack connector
- Excel plug-in with live workbook access

These are different because:

- attached files are point-in-time user-provided artifacts
- connected apps imply a continuing system relationship
- connected apps often require auth, admin approval, or enterprise setup

### Connected App Access vs Embedded Workspace Access

Connected app access means the AI can reach a system.

Embedded workspace access means the AI is available inside another product’s interface.

Examples of embedded workspace access:

- AI in Excel
- AI in Word
- Claude Code in VS Code
- AI inside Xcode

An implementation can be both connected and embedded, but those are separate properties.

### Model Access vs Capability

Having access to a stronger model is not automatically a separate capability.

Examples:

- GPT-4 Access
- Gemini Advanced
- Claude Extended Thinking
- Grok Think Mode

These often modify quality, depth, speed, or limits of existing capabilities rather than introducing a new user-facing ability.

## Canonical Example: Anthropic Excel Plug-in vs Uploading an Excel File

This is the reference example for keeping the ontology clean.

### Case A: Anthropic Excel Plug-in

This should generally be modeled as:

| Entity Type | Example value |
|---|---|
| Provider | Anthropic |
| Product | Claude or a Claude-for-Excel style product wrapper |
| Implementation | Anthropic Excel plug-in |
| Capability | `connect-to-external-systems` |
| Capability | `make-and-edit-documents` |
| Capability | possibly `use-files-i-provide`, if workbook content can be directly worked on |
| Surface | Excel |
| Deployment Mode | `embedded-in-suite` |
| Constraint | Requires Excel environment, account auth, and possibly org/admin enablement |
| Evidence | Vendor docs, release notes, plan docs |

Interpretation:

- the AI is available inside Excel
- the AI may have live access to workbook context
- the implementation depends on an external product integration, not just chat upload

### Case B: Uploading an Excel File Into Chat

This should generally be modeled as:

| Entity Type | Example value |
|---|---|
| Provider | depends on the chat product |
| Product | ChatGPT, Claude, Gemini, etc. |
| Implementation | file upload / spreadsheet analysis support |
| Capability | `use-files-i-provide` |
| Capability | possibly `read-text-and-documents` |
| Capability | possibly a future `analyze-spreadsheets` capability if that becomes editorially important |
| Surface | web, desktop, or mobile chat interface |
| Deployment Mode | `hosted SaaS` |
| Constraint | file size limits, parser quality, supported formats, no live connection unless separately integrated |
| Evidence | product help docs, file upload docs, supported formats docs |

Interpretation:

- the user provides a copy or attachment
- the system usually does not have ongoing workbook access
- "supports Excel files" does not imply "integrates with Excel"

### Canonical Rule

If the user sees "Excel" in both cases, that does not make them the same kind of thing.

The ontology must preserve:

- file upload
- live integration
- embedded workspace

as separate concepts.

## Recommended Scope Rules

Do not include entities simply because they exist.

A provider, product, or implementation should be included when at least one of the following is true:

- it is meaningfully user-facing for the project audience
- it materially changes what a user can do
- it changes plan or entitlement decisions
- it is actively used in the maintainer’s teaching or demonstrations
- it represents an important deployment mode the audience needs to understand

This prevents the project from turning into a catalog of every provider and every model family.

## What To Do About Intelligent Internet

The right question is not "where do they belong?"

The right question is "what kind of thing are they in this ontology?"

Examples:

- if Intelligent Internet is the company, it is a `Provider`
- if it offers a user-facing AI app, that app is a `Product`
- if it exposes a named integration or workflow, that is an `Implementation`
- if it mainly exposes models, those may be `Model Access`
- if it is not materially user-facing for this audience, it may remain out of scope

## Implications For The Existing Repo

The current repo can be reinterpreted like this:

- current platform files mostly represent `Product` plus nested `Implementation` records
- current feature sections mostly represent `Implementation`
- current pricing tables mostly represent `Plan`
- current platforms table is partly `Surface`
- current gating, limits, notes, and regional sections are `Constraint`
- current sources and dates are `Evidence`

That means the existing data is still useful, but the ontology above should govern future schema decisions.

## Immediate Recommendations

1. Remove `other` as an accepted conceptual destination.
2. Stop using "local models" as a top-level peer bucket.
3. Treat local/open/self-hosted as deployment mode plus model access.
4. Introduce an explicit distinction between uploaded files, connected systems, and embedded workspaces.
5. Keep model access in the ontology, but do not let it dominate the main capability navigation.

## Next Schema Question

Once this ontology is accepted, the next implementation decision is:

Should the repo add separate first-class records for `Capability`, `Product`, and `Implementation`, or should it continue to store implementation records in platform markdown and layer the ontology over them progressively?

The migration strategy currently recommends the progressive path.
