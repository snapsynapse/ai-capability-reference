---
id: mistral-small-4
name: Mistral Small 4
provider: mistral
record_source: data/platforms/mistral-open-models.md
source_heading: Mistral Small 4
last_verified: 2026-03-19
status: active
---

## Summary

Mistral Small 4 is a 119B Mixture-of-Experts model (128 experts, 4 active per token, ~6B active parameters) that unifies instruct, reasoning, multimodal, and agentic coding into a single open model. Apache 2.0 license. 256k context window with native vision and a configurable `reasoning_effort` parameter. Available via Mistral API and self-hosted, but requires datacenter-class GPUs (4× H100 minimum).

## Deployment Modes

- self-hosted
- cloud-api (Mistral API / AI Studio)
- cloud-api (NVIDIA NIM)

## Common Runtimes

- vLLM
- SGLang
- llama.cpp
- NVIDIA NIM
- Mistral API

## Constraints

- datacenter-class hardware required: minimum 4× H100 or 2× H200 or 1× DGX B200
- NOT practical for consumer GPUs despite being open-weight
- 119B total parameters but only ~6B active per token (MoE)
- FP8/NVFP4 support recommended for optimal performance

## Related Capabilities

- write-and-explain
- see-images-and-screens
- write-and-edit-code
- take-actions-and-run-tools
