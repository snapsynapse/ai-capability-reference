# Model Access Extension

Status: Draft 1  
Last updated: 2026-03-07

This document defines how the ontology-first schema should handle open/self-hosted model families that do not fit cleanly into the hosted-product implementation map.

## Why This Exists

The original [`data/archive/platforms/local-models.md`](/Users/snap/Git/ai-capability-reference/data/archive/platforms/local-models.md) bundle mixed several different kinds of things:

- model families
- model variants
- deployment assumptions
- runtime products
- hardware constraints

That bundle was useful in the earlier feature-tracker framing, but it is not a clean ontology-aligned record shape.

The main issue is that most entries in that file are not `Product` records and not `Implementation` records.

They are primarily `Model Access` records.

## Ontology Interpretation

In the open/self-hosted domain, the key distinction is:

- `Model Access`: the model family or model line a user can run or choose
- `Product`: the runtime or interface used to run it
- `Deployment Mode`: self-hosted, local-on-device, local API, browser UI, terminal UI

Examples:

- `Llama 4` is a `Model Access` record
- `Qwen-Coder` is a `Model Access` record
- `Ollama` is a `Product`
- `LM Studio` is a `Product`
- `text-generation-webui` is a `Product`

The current `Local Hosting Options` section is really describing runtime products, not model access.

That runtime/tooling decomposition has now started through first-class product records for Ollama, LM Studio, and `text-generation-webui`.

## Recommendation

Add `Model Access` as a first-class record type for this domain.

Canonical path:

`data/model-access/*.md`

The evidence source for these records now lives in provider-specific platform files such as:

- [`data/platforms/meta-open-models.md`](/Users/snap/Git/ai-capability-reference/data/platforms/meta-open-models.md)
- [`data/platforms/mistral-open-models.md`](/Users/snap/Git/ai-capability-reference/data/platforms/mistral-open-models.md)
- [`data/platforms/deepseek-open-models.md`](/Users/snap/Git/ai-capability-reference/data/platforms/deepseek-open-models.md)
- [`data/platforms/alibaba-open-models.md`](/Users/snap/Git/ai-capability-reference/data/platforms/alibaba-open-models.md)

## What A Model Access Record Is For

A model-access record should answer questions like:

- What model family is this?
- Who publishes it?
- Is it open-weight or otherwise locally runnable?
- What kinds of deployment are realistic?
- What hardware or licensing constraints matter?
- Which capabilities is it especially associated with?

It should not pretend the model family is itself a chat product.

## Suggested Record Shape

```markdown
---
id: llama-4
name: Llama 4
provider: meta
record_source: data/platforms/meta-open-models.md
source_heading: Llama 4 (Meta)
last_verified: 2026-02-22
status: active
---

## Summary

Meta's open-weight multimodal model family for self-hosted deployment.

## Deployment Modes

- self-hosted
- local-on-device
- local-api

## Common Runtimes

- Ollama
- LM Studio
- vLLM

## Constraints

- hardware needs depend heavily on model size
- quantized variants are often required for consumer hardware
- license terms may differ from Apache-style open licenses

## Related Capabilities

- see-images-and-screens
- write-and-explain
```

## What Not To Do

Do not:

- force model families into the `Product` record type
- force all model records into the `Implementation Map`
- treat "local models" as a single product
- treat runtime products and model families as the same thing

## Current Transitional Boundary

This repo now has:

- hosted SaaS products represented as `Product` plus `Implementation Map`
- open model families represented progressively as `Model Access`

What is still transitional:

- the legacy [`data/archive/platforms/local-models.md`](/Users/snap/Git/ai-capability-reference/data/archive/platforms/local-models.md) archive file
- any remaining evidence that still needs to move into first-class provider/product/model-access records

The runtime products now exist as first-class `Product` records and now use provider-specific evidence sources such as [`data/platforms/ollama-runtime.md`](/Users/snap/Git/ai-capability-reference/data/platforms/ollama-runtime.md), [`data/platforms/lm-studio-runtime.md`](/Users/snap/Git/ai-capability-reference/data/platforms/lm-studio-runtime.md), and [`data/platforms/oobabooga-runtime.md`](/Users/snap/Git/ai-capability-reference/data/platforms/oobabooga-runtime.md).
The static site generator only reads active platform evidence from `data/platforms/`, so the legacy bundle is no longer part of the active build graph.

## Recommended Next Step

Continue reducing the legacy archive file until it is no longer needed for active editing.
