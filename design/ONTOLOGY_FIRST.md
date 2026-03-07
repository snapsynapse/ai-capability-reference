# Ontology-First Project Principle

Status: Draft 1  
Last updated: 2026-03-07

This project should be ontology-first.

That means the canonical question is not:

- "How should these things be grouped?"

The canonical questions are:

- "What kind of thing is this?"
- "How does it relate to the other things in the system?"
- "What user capability does it support?"
- "What constraints and evidence apply?"

## Decision

Ontology is the governing layer for the project.

Taxonomy is a presentation layer built on top of that ontology.

In practice:

- ontology defines the entity types and relationships
- taxonomy defines how those entities are grouped for a given audience or workflow

## Why This Matters Here

This project operates in a fast-changing space where vendors frequently change:

- names
- product packaging
- plan boundaries
- surfaces
- integrations
- branding for similar capabilities

If the project is taxonomy-first, it will repeatedly collapse into unstable bucket debates:

- whether something belongs in `other`
- whether "local models" is a category
- whether a browser is a surface, a product, or a capability
- whether a reasoning mode is a capability or just a model modifier

An ontology-first approach is more stable because it models the domain at the level where change can be absorbed without rewriting the conceptual system.

## Canonical Ontology

The ontology for this project is defined in [ONTOLOGY.md](ONTOLOGY.md).

Its core entity types are:

- `Capability`
- `Implementation`
- `Product`
- `Provider`
- `Plan`
- `Surface`
- `Deployment Mode`
- `Model Access`
- `Constraint`
- `Evidence`

These are the durable building blocks of the project.

## Role Of Taxonomy

Taxonomy still matters, but it should be treated as a secondary layer.

Examples of valid taxonomies:

- beginner-facing capability groups
- educator lesson groupings
- plan and entitlement views
- enterprise procurement views
- deployment-oriented views

This implies that the project may eventually support multiple taxonomies over the same ontology.

That is a strength, not a problem.

## Editorial Implications

For this project, the forward-facing user experience should prioritize:

- plain-English capabilities
- understandable distinctions between similar-looking implementations
- practical constraints users need to know
- evidence and freshness

Vendor terms should usually appear as implementation names or translations, not as the primary conceptual framework.

## Modeling Rules

Use these rules when deciding how to represent something:

1. First determine what kind of entity it is.
2. Then determine which capabilities it supports.
3. Then determine which constraints, surfaces, plans, and evidence apply.
4. Only after that should you decide how it should be grouped in the UI or docs.

If an item does not fit, do not create a junk category.

Instead:

- refine the ontology
- add a missing relationship
- or decide the item is out of scope

## Specific Consequences

- `other` should not exist as a long-term conceptual category.
- "local models" should not exist as a top-level peer category.
- file uploads, live integrations, and embedded workspaces must remain distinct concepts.
- model access and reasoning modes should not automatically become top-level capabilities.
- current feature categories may remain as compatibility fields during migration, but they are not the future conceptual backbone.

## Governance Rule For Future Changes

When a future schema, page, or content decision is proposed, evaluate it in this order:

1. Does it fit the ontology cleanly?
2. Does it preserve important distinctions in the domain?
3. Does it support the intended audience and teaching use case?
4. Only then: is it a useful taxonomy or UI grouping?

If a taxonomy decision conflicts with the ontology, prefer the ontology.

## Recommendation

Future repo work should proceed in this order:

1. ontology
2. schema
3. mappings
4. taxonomy
5. presentation

That sequence should reduce churn and make the project more useful as an educator-facing reference.
