# Capability-First Migration Strategy

Status: Draft 1  
Last updated: 2026-03-07

This document describes how to move toward a capability-first product without breaking or prematurely deleting the current feature-first site.

The governing principle for future decisions is documented in [ONTOLOGY_FIRST.md](ONTOLOGY_FIRST.md).

For the higher-level domain model that should guide future schema choices, see [ONTOLOGY.md](ONTOLOGY.md).

The first concrete repo-facing data shape is proposed in [SCHEMA_PROPOSAL.md](SCHEMA_PROPOSAL.md).

## Decision

The project should follow a coexistence path:

- Capability-first is the forward-facing direction.
- Feature-first remains available during migration.
- Coexistence is a migration strategy, not a permanent design constraint.

If coexistence starts distorting the schema or taxonomy, that should be called out explicitly and revisited.

## Current System Summary

Today the repo is optimized around platform feature records:

- One markdown file per platform in `data/platforms/`
- One section per vendor feature
- Per-feature pricing, surfaces, status, gating, sources, and changelog
- A static site generator in [`scripts/build.js`](/Users/snap/Git/ai-capability-reference/scripts/build.js) that renders the feature-first dashboard

That is a solid foundation for evidence and verification. It is not yet a capability-native model.

## Core Architectural Direction

Maintain a shared canonical data layer and support multiple views over it.

### Canonical Source Of Truth

Keep implementation close to the current feature records while materializing evidence into a first-class layer:

- platform metadata
- plan pricing
- feature implementations
- constraints
- evidence inputs

### New Layer To Add

Add an explicit capability mapping layer that can relate one feature to many capabilities.

The capability layer should become the basis for:

- a future capability-first homepage
- capability landing pages or grouped sections
- beginner-facing explanations
- plan/entitlement guidance phrased in human terms

### Existing View To Preserve

Keep the current feature-first dashboard available as long as it remains useful and low-friction to maintain.

## Minimal Schema Evolution

The safest first move is extension, not replacement.

### Keep

Keep the current platform markdown feature records intact.

They already store:

- implementation names
- plan constraints
- platform/surface constraints
- evidence and freshness metadata
- sources and changelog

### Add

Add a capability mapping layer that the current system does not yet support.

Recommended first-pass shape:

1. Capability catalog file  
   A new machine-readable or markdown-backed list of canonical capabilities.
2. Feature-to-capability mappings  
   Each feature should link to one or more capability IDs.
3. Optional mapping notes  
   Short notes where a feature only partially satisfies a capability.

### Avoid For Now

- Replacing `Category` with capability IDs
- Deleting existing feature records
- Forcing capability prose into every platform file before the model settles
- Rewriting the build pipeline around capabilities before the mappings are tested

## Suggested Data Shape

The exact file format is still open, but the model should support this relationship:

```text
Capability 1 ---< FeatureCapabilityMap >--- Implementation Feature
```

At minimum, the mapping layer needs:

- `capability_id`
- `platform_id`
- `feature_name` or stable feature slug
- optional `notes`
- optional `strength`

`strength` is useful if a feature is:

- a primary implementation
- a partial implementation
- adjacent but not complete

That prevents misleading "yes/no" claims in the capability-first view.

## Why Not Use Category As The Capability Layer

Because the current category field is doing a different job.

It is:

- singular
- implementation-oriented
- optimized for filtering cards
- too coarse in some places and too vague in others

Evidence of schema pressure:

- 17 current features are in `other`
- `voice` collapses listening and speaking
- `browser`, `research`, `search`, and `agents` overlap
- `local-files` and `cloud-files` describe source location, not user intent

Conclusion: preserve `Category` for backward compatibility, but do not treat it as the future canonical taxonomy.

## Suggested Migration Phases

### Phase 1: Editorial foundation

- Draft and agree on the capability taxonomy
- Create capability definitions and mapping rules
- Identify ambiguous or multi-capability features

### Phase 2: Data extension

- Add capability records
- Add feature mappings
- Keep existing build and current dashboard working

### Phase 3: Alternative presentation

- Introduce a capability-first entry point or homepage section
- Reuse the same implementation data and ontology-native evidence layer underneath
- Keep feature-first navigation available

### Phase 4: Evaluate pressure

Check whether the old and new views still fit naturally over the same model.

If not, decide whether to:

- simplify the old view
- freeze the old view
- retire the old view

## Maintainer Guidance For Future Models

When making changes in this repo during migration:

- Prefer extending the shared data model over creating duplicate content systems.
- Treat vendor features as implementation records, not the top-level conceptual model.
- Preserve evidence quality and verification dates even when reframing content.
- Flag any case where maintaining the legacy view requires awkward taxonomy decisions.
- Document new assumptions in-repo so they do not live only in a chat thread.

## Immediate Next Steps

1. Pressure-test [`CAPABILITY_TAXONOMY.md`](CAPABILITY_TAXONOMY.md) against all current features.
2. Choose the first persisted capability data format.
3. Add a thin mapping layer without disturbing verification workflows.
4. Prototype a capability-first homepage or landing section before any large schema rewrite.
