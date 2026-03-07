# Capability Taxonomy Draft

Status: Draft 1  
Last updated: 2026-03-07

This document defines the first-pass capability taxonomy for evolving this project from a feature tracker into a capability-first reference while keeping the existing feature-first view alive during migration.

For the higher-level entity model that sits above this taxonomy, see [ONTOLOGY.md](ONTOLOGY.md).

## Purpose

The project should answer two different questions from the same source of truth:

- "What can my AI do?"
- "What does Vendor X call this, and what plan do I need?"

The capability layer is the user-facing editorial model. Vendor features remain important, but they become implementations of one or more capabilities rather than the primary concept users must learn first.

## Canonical Layers

Use these four layers consistently:

1. Capability  
   Plain-English thing a person wants to do.
2. Implementation  
   Vendor-specific product, mode, or branded feature name.
3. Constraint  
   Plan, surface, region, limits, admin controls, and caveats.
4. Evidence  
   Sources, verified dates, checked dates, and changelog.

## Working Principles

- Capabilities should be understandable without vendor knowledge.
- Capabilities should stay stable longer than vendor branding.
- A feature may map to multiple capabilities.
- A capability may have multiple implementations across vendors.
- The existing `Category` field should not be treated as the future canonical taxonomy.

## Why The Current Category Model Is Not Enough

The current feature dataset tracks 70 features, but 17 of them are in `other`. That is a useful signal that the current category system is working as a lightweight filter, not as a durable editorial model.

Other pressure points:

- `voice` currently mixes input and output into one bucket.
- `coding` often also means document editing or workspace collaboration.
- `integrations` can mean connectors, APIs, actions, or reusable tool access.
- `browser`, `search`, `research`, and `agents` overlap heavily in practice.
- `local-files` and `cloud-files` describe storage sources, not user intent.

Conclusion: keep `Category` for the existing site during migration, but build the capability-first experience on a separate capability layer.

## First-Pass Capability Groups

These groups are intentionally human-readable and broad enough to support multiple vendors.

### 1. Understand

#### `read-text-and-documents`
Can read prompts, pasted text, PDFs, documents, and similar content.

#### `see-images-and-screens`
Can interpret images, screenshots, camera input, or visual interface context.

#### `hear-audio-and-speech`
Can accept spoken input or audio for understanding.

### 2. Respond

#### `write-and-explain`
Can produce useful written responses, summaries, and structured output.

#### `speak-back-in-real-time`
Can respond with live or near-live audio conversation.

### 3. Create

#### `make-and-edit-documents`
Can create or iteratively edit documents, presentations, notes, or standalone outputs.

#### `write-and-edit-code`
Can generate, refactor, or execute code-oriented work.

#### `generate-images`
Can create or transform images from prompts or edits.

#### `generate-video`
Can create or transform video.

### 4. Work With My Stuff

#### `use-files-i-provide`
Can work with uploaded local files or attached documents.

#### `organize-work-in-projects`
Can keep persistent workspaces, collections, projects, or reusable folders of context.

#### `remember-context-over-time`
Can store memory, preferences, or persistent chat context across sessions.

### 5. Act For Me

#### `search-the-web`
Can fetch current information from the web in-line.

#### `do-multi-step-research`
Can plan, search, synthesize, and cite across multiple sources.

#### `take-actions-and-run-tools`
Can execute tools, browse sites, click, submit, run commands, or otherwise act beyond plain chat.

### 6. Connect

#### `connect-to-external-systems`
Can use connectors, integrations, MCP, remote data sources, or third-party services.

#### `build-reusable-ai-workflows`
Can create reusable assistants, agents, gems, GPTs, or similar packaged behavior.

### 7. Access Context

#### `use-it-on-my-surfaces`
Can be accessed on web, desktop, mobile, terminal, browser extension, or API.

This is still a capability, but it behaves differently from the others: it is largely composed from constraints and surfaces rather than a single feature implementation.

## Initial Editorial Notes

The taxonomy above is intentionally a little redundant in plain English. That is acceptable at this stage. It is better for a newcomer to distinguish between "search the web" and "do multi-step research" than to force both into one abstract bucket.

`write-and-explain` is foundational, but it may not need to appear as a prominent public category if nearly every product supports it. It can remain in the canonical model while being visually deemphasized in the site IA.

`use-it-on-my-surfaces` should probably be presented as a supporting lens or filter rather than a primary homepage bucket.

## Example Mappings From Current Features

These examples show why capability mappings must support many-to-many relationships.

| Current feature | Likely capability mappings |
|---|---|
| ChatGPT Advanced Voice Mode | `hear-audio-and-speech`, `speak-back-in-real-time` |
| ChatGPT Agent Mode | `do-multi-step-research`, `take-actions-and-run-tools`, `connect-to-external-systems` |
| ChatGPT Atlas Browser | `search-the-web`, `take-actions-and-run-tools`, `use-it-on-my-surfaces` |
| ChatGPT Custom GPTs + Actions | `build-reusable-ai-workflows`, `connect-to-external-systems` |
| ChatGPT Projects | `organize-work-in-projects`, `use-files-i-provide`, `remember-context-over-time` |
| Claude Artifacts | `make-and-edit-documents`, `write-and-edit-code` |
| Claude Code | `write-and-edit-code`, `take-actions-and-run-tools`, `use-it-on-my-surfaces` |
| Claude Connectors | `connect-to-external-systems`, `take-actions-and-run-tools` |
| Gemini Gems | `build-reusable-ai-workflows`, `organize-work-in-projects` |
| Gemini Live | `hear-audio-and-speech`, `speak-back-in-real-time` |
| Perplexity Pro Search | `search-the-web`, `do-multi-step-research` |
| Perplexity Collections (Spaces) | `organize-work-in-projects`, `use-files-i-provide` |
| Copilot in Office Apps | `use-files-i-provide`, `connect-to-external-systems`, `make-and-edit-documents` |

## What Counts As A Capability Record Later

When the repo introduces explicit capability records, each capability should eventually contain:

- A plain-language definition
- A short "what counts" note
- A short "what does not count" note
- Related vendor terms
- Common constraints that users should expect
- Linked feature implementations

## Pressure Points To Watch

If any of the following start happening, call it out before pushing further:

- We are inventing awkward capability names just to preserve an old feature-first card layout.
- We are forcing every feature into exactly one capability.
- We are using vendor language as the primary capability label.
- We are mixing "interface surface" and "user intent" in the same taxonomy level without being explicit.
- We are preserving `other` as a permanent sink instead of reducing ambiguity.

## Recommendation For The Next Data Step

Do not replace feature records yet.

Instead:

1. Keep the existing feature markdown files as the canonical implementation/evidence records.
2. Add a capability mapping layer on top of them.
3. Build the first capability-first experience as a new presentation over those mappings.
4. Retain the existing feature-first dashboard until the capability view proves it can carry the editorial load.
