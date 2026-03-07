# Scope Rules

Status: Draft 1  
Last updated: 2026-03-07

This document defines what belongs in the AI Capability Reference and what does not.

The purpose is to prevent ontology drift and uncontrolled sprawl as the ecosystem changes.

## Core Rule

Inclusion is not based on whether something exists.

Inclusion is based on whether tracking it materially helps the project audience understand what an AI system can do, what access they already have, and what they would gain by changing tools, plans, or deployment modes.

This project is not trying to catalog the whole AI industry.

The working target is:

- consumer-facing AI products that have meaningful real-world usage or visibility
- commercially available model families that ordinary users can select, sign up for, or run locally
- local/open runtimes that materially shape what a person can actually use on their own hardware

That means the reference is intentionally closer to "what people can actually encounter and use" than "everything sold into enterprise AI."

## Audience Reminder

This project is for:

- AI learners
- facilitators and educators
- professionals comparing what their current AI access actually enables
- people trying to understand plan entitlements, constraints, and alternatives

## Inclusion Rules By Record Type

### Cross-Cutting Selection Heuristic

Use this heuristic across all record types:

- include major consumer-facing AI products that appear to have meaningful usage share in the public market
- treat roughly `~1%` share as a practical signal, not a hard rule
- include self-hosted/open model families and runtimes when they are realistically usable by the audience, even if no equivalent market-share number exists

Do not require fake precision where the ecosystem does not provide it.

Public "market share" data is usually available at the product level, not the model level, and different sources measure different things:

- web visits
- app downloads
- active users
- regional usage
- model downloads or local installs

So the `~1%` threshold is a scope heuristic, not a canonical ontology field.

### Provider

Include a provider when at least one of these is true:

- the repo already tracks one of its products, implementations, or model-access records
- the provider is materially relevant to the audience
- the provider represents an important comparison point in teaching or demos

Do not add a provider just to be exhaustive.

### Product

Include a product when it is a meaningful user-facing container for capabilities, implementations, or deployment experience.

Strong reasons to include a product:

- it clears the "meaningful public usage/visibility" bar for consumer AI tools
- people can directly sign up for it, get access to it through a common consumer or prosumer plan, or encounter it in normal use
- it is a runtime or access surface that materially affects local/self-hosted choices

Examples:

- ChatGPT
- Claude
- Gemini
- Copilot
- Ollama
- LM Studio

Do not create a product record when the thing is really:

- only a model family
- only a plan tier
- only a vendor brand umbrella with no clear user-facing container
- primarily an enterprise back-end platform rather than a user-selectable AI product

### Implementation

Include an implementation when it changes what a user can actually do, access, or compare.

Good reasons to track an implementation:

- it unlocks a distinct capability
- it changes plan or entitlement decisions
- it creates an important new workflow or surface
- it is commonly referenced in teaching, demos, or user questions

Do not create an implementation record for:

- generic marketing claims
- model-quality language with no distinct workflow
- every minor naming variation

### Capability

Include a capability when it is:

- plain-English
- user-meaningful
- stable across vendors
- important enough to support user decisions or teaching outcomes

Do not create a capability just because one vendor coined a term for it.

### Model Access

Include a model-access record when:

- the model family is meaningfully selectable, runnable, or comparable for the audience
- it represents an important self-hosted/open alternative
- its access materially changes deployment or capability choices
- it is commercially available or practically accessible to an ordinary user, not only a business procurement artifact

Do not include model-access records solely to catalog the entire open-model ecosystem.

## Explicit Exclusion Rules

Avoid adding records just because they are:

- newly announced but not meaningfully usable yet
- obscure with no audience relevance
- duplicative of an existing record
- better represented as a constraint or note on another record
- too unstable to maintain at the level of detail required here
- enterprise-only infrastructure with little relevance to direct end-user capability decisions
- niche vendors that do not clear either the audience-relevance bar or the practical-usage/visibility bar

## Teaching And Demo Exception

The maintainer's own teaching and demonstration use is a valid reason to include something that might not otherwise qualify.

When that is the main reason for inclusion, note it clearly in the record or supporting docs so future contributors understand why it is in scope.

This is especially useful for:

- rising tools that have not yet stabilized in public usage data
- local/open runtimes used in workshops
- model families that are pedagogically important even when the surrounding product market is noisy

## Open / Self-Hosted Domain Rule

For open/self-hosted systems, do not treat all entries as one category.

Different types belong differently:

- model families -> `Model Access`
- runtimes like Ollama or LM Studio -> `Product`
- deployment facts like local API or terminal access -> `Deployment Mode` or `Surface`

## Decision Questions

Before adding a new record, ask:

1. What kind of thing is this?
2. Is it materially useful for the intended audience?
3. Does it affect capability understanding, entitlement, comparison, or deployment choice?
4. Is it commercially available or practically usable by an ordinary person?
5. Would a reasonable public-usage or teaching rationale justify its inclusion?
6. Is this the cleanest record type for it?

If the answer to those questions is weak, leave it out or record it as a note rather than a new top-level entity.

For borderline cases, add the item to [WATCHLIST.md](WATCHLIST.md) instead of forcing it prematurely into the active ontology.
