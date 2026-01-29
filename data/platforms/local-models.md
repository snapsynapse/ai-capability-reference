---
name: Local/Open Models
vendor: Local Models
logo: https://cdn.simpleicons.org/ollama/white
status_page: https://huggingface.co/models
pricing_page: https://ollama.com/library
last_verified: 2026-01-20
---

## Pricing

| Plan | Price | Notes |
|------|-------|-------|
| Self-hosted | $0 | Your hardware costs only |

---

## Codestral (Mistral)

| Property | Value |
|----------|-------|
| Category | coding |
| Status | ga |
| Gating | free |
| URL | https://mistral.ai/news/codestral/ |
| Launched | 2024-05-29T12:00Z |
| Verified | 2026-01-29|
| Checked | 2026-01-29|

### Availability

| Plan | Available | Limits | Notes |
|------|-----------|--------|-------|
| Self-hosted | ✅ | Your hardware | 22B code-specialized |

### Platforms

| Platform | Available | Notes |
|----------|-----------|-------|
| Windows | ✅ | Via Ollama |
| macOS | ✅ | Via Ollama |
| Linux | ✅ | Native support |
| iOS | ❌ | Not practical |
| Android | ❌ | Not practical |
| Chrome | ❌ |  |
| web | ❌ | Local only |
| terminal | ✅ | Ollama CLI |
| API | ✅ | Ollama REST API |

### Regional

No restrictions - runs locally.

### Talking Point

> "Codestral is Mistral's code-specialized model at 22B parameters. **Runs on a good consumer GPU** (16GB+ VRAM recommended) and excels at code completion and generation."

### Sources

- [Codestral](https://mistral.ai/news/codestral/)
- [Ollama Codestral](https://ollama.com/library/codestral)

### Changelog

| Date | Change |
|------|--------|
| 2024-05-29T12:00Z | Initial entry |

---

## DeepSeek-V3 / DeepSeek-R1

| Property | Value |
|----------|-------|
| Category | other |
| Status | ga |
| Gating | free |
| URL | https://github.com/deepseek-ai/DeepSeek-V3 |
| Launched | 2024-12-27T12:00Z |
| Verified | 2026-01-29|
| Checked | 2026-01-29|

### Availability

| Plan | Available | Limits | Notes |
|------|-----------|--------|-------|
| Self-hosted | ✅ | Your hardware | V3: 671B MoE, R1: reasoning model |

### Platforms

| Platform | Available | Notes |
|----------|-----------|-------|
| Windows | ✅ | Via Ollama (quantized) |
| macOS | ✅ | Via Ollama (quantized) |
| Linux | ✅ | Best support |
| iOS | ❌ | Not practical |
| Android | ❌ | Not practical |
| Chrome | ❌ |  |
| web | ❌ | Local only |
| terminal | ✅ | Ollama CLI |
| API | ✅ | Ollama REST API |

### Regional

No restrictions - runs locally. Note: DeepSeek is a Chinese company; some orgs restrict use.

### Talking Point

> "DeepSeek-R1 is an open reasoning model that rivals o1. **The distilled versions (1.5B-70B) run locally**. Full V3 (671B) needs enterprise hardware, but quantized versions work on high-end consumer GPUs."

### Sources

- [DeepSeek-V3](https://github.com/deepseek-ai/DeepSeek-V3)
- [DeepSeek-R1](https://github.com/deepseek-ai/DeepSeek-R1)
- [Ollama DeepSeek](https://ollama.com/library/deepseek-r1)

### Changelog

| Date | Change |
|------|--------|
| 2024-12-27T12:00Z | Initial entry |

---

## Llama 3.3 (Meta)

| Property | Value |
|----------|-------|
| Category | other |
| Status | ga |
| Gating | free |
| URL | https://ai.meta.com/llama/ |
| Launched | 2024-12-06T12:00Z |
| Verified | 2026-01-29|
| Checked | 2026-01-29|

### Availability

| Plan | Available | Limits | Notes |
|------|-----------|--------|-------|
| Self-hosted | ✅ | Your hardware | 70B parameters, 128K context |

### Platforms

| Platform | Available | Notes |
|----------|-----------|-------|
| Windows | ✅ | Via Ollama, LM Studio, etc. |
| macOS | ✅ | Via Ollama, LM Studio, etc. |
| Linux | ✅ | Native support |
| iOS | ❌ | Not practical |
| Android | ⚠️ | Limited, high-end devices only |
| Chrome | ❌ |  |
| web | ❌ | Local only |
| terminal | ✅ | Ollama CLI |
| API | ✅ | Ollama REST API |

### Regional

No restrictions - runs locally.

### Talking Point

> "Llama 3.3 is Meta's open-weight model. **Completely free to run locally**—you just need the hardware. The 70B model needs ~40GB VRAM for full precision, but quantized versions run on consumer GPUs."

### Sources

- [Llama 3.3 Release](https://ai.meta.com/blog/llama-3-3-70b/)
- [Ollama Llama](https://ollama.com/library/llama3.3)

### Changelog

| Date | Change |
|------|--------|
| 2024-12-06T12:00Z | Initial entry |

---

## Llama 4 (Meta)

| Property | Value |
|----------|-------|
| Category | other |
| Status | ga |
| Gating | free |
| URL | https://www.llama.com/models/llama-4/ |
| Launched | 2025-04-05T12:00Z |
| Verified | 2026-01-29|
| Checked | 2026-01-29|

### Availability

| Plan | Available | Limits | Notes |
|------|-----------|--------|-------|
| Self-hosted | ✅ | Your hardware | Scout 109B, Maverick 400B MoE |

### Platforms

| Platform | Available | Notes |
|----------|-----------|-------|
| Windows | ✅ | LM Studio, vLLM |
| macOS | ✅ | LM Studio (quantized) |
| Linux | ✅ | All options |
| iOS | ❌ |  |
| Android | ❌ |  |
| Chrome | ❌ |  |
| web | ✅ | Web UIs |
| terminal | ✅ | Ollama CLI |
| API | ✅ | Local API |

### Regional

Llama 4 Community License (commercial use under 700M MAU).

### Talking Point

> "Llama 4 is Meta's first natively multimodal model—text and vision built-in. **Scout has a 10 million token context window** and fits on a single H100. Maverick rivals GPT-4o on benchmarks. Free for commercial use under 700M monthly users."

### Sources

- [Llama 4 Blog](https://ai.meta.com/blog/llama-4-multimodal-intelligence/)
- [Llama 4 Models](https://www.llama.com/models/llama-4/)
- [HuggingFace Llama 4](https://huggingface.co/meta-llama)

### Changelog

| Date | Change |
|------|--------|
| 2025-04-05T12:00Z | Initial entry |

---

## Local Hosting Options

| Property | Value |
|----------|-------|
| Category | other |
| Status | ga |
| Gating | free |
| URL | https://ollama.com/ |
| Launched | 2023-07-01T12:00Z |
| Verified | 2026-01-29|
| Checked | 2026-01-29|

### Availability

| Plan | Available | Limits | Notes |
|------|-----------|--------|-------|
| Self-hosted | ✅ | Your hardware | Multiple options |

### Platforms

| Platform | Available | Notes |
|----------|-----------|-------|
| Windows | ✅ | Ollama, LM Studio, text-generation-webui |
| macOS | ✅ | Ollama, LM Studio |
| Linux | ✅ | All options |
| iOS | ❌ |  |
| Android | ⚠️ | Limited apps |
| Chrome | ❌ |  |
| web | ✅ | Web UIs available |
| terminal | ✅ | Ollama CLI |
| API | ✅ | Ollama REST API |

### Regional

No restrictions.

### Talking Point

> "To run models locally, use **Ollama** (easiest CLI), **LM Studio** (nice GUI), or **text-generation-webui** (most features). All are free. Hardware requirements: 8GB RAM minimum, 16GB+ VRAM for larger models."

### Sources

- [Ollama](https://ollama.com/)
- [LM Studio](https://lmstudio.ai/)
- [text-generation-webui](https://github.com/oobabooga/text-generation-webui)

### Changelog

| Date | Change |
|------|--------|
| 2023-07-01T12:00Z | Initial entry |

---

## Mistral Large / Mistral Nemo

| Property | Value |
|----------|-------|
| Category | other |
| Status | ga |
| Gating | free |
| URL | https://mistral.ai/technology/ |
| Launched | 2024-07-18T12:00Z |
| Verified | 2026-01-29|
| Checked | 2026-01-29|

### Availability

| Plan | Available | Limits | Notes |
|------|-----------|--------|-------|
| Self-hosted | ✅ | Your hardware | Nemo: 12B, Large: 123B |

### Platforms

| Platform | Available | Notes |
|----------|-----------|-------|
| Windows | ✅ | Via Ollama, LM Studio |
| macOS | ✅ | Via Ollama, LM Studio |
| Linux | ✅ | Native support |
| iOS | ❌ | Not practical |
| Android | ❌ | Not practical |
| Chrome | ❌ |  |
| web | ❌ | Local only |
| terminal | ✅ | Ollama CLI |
| API | ✅ | Ollama REST API |

### Regional

No restrictions - runs locally.

### Talking Point

> "Mistral offers several open models. **Mistral Nemo (12B) runs on consumer hardware**—great for local use. Mistral Large (123B) needs serious GPU power but rivals GPT-4 quality."

### Sources

- [Mistral Models](https://mistral.ai/technology/)
- [Ollama Mistral](https://ollama.com/library/mistral)

### Changelog

| Date | Change |
|------|--------|
| 2024-07-18T12:00Z | Initial entry |

---

## Mistral Small 3

| Property | Value |
|----------|-------|
| Category | other |
| Status | ga |
| Gating | free |
| URL | https://mistral.ai/news/mistral-small-3 |
| Launched | 2025-01-30T12:00Z |
| Verified | 2026-01-29|
| Checked | 2026-01-29|

### Availability

| Plan | Available | Limits | Notes |
|------|-----------|--------|-------|
| Self-hosted | ✅ | Your hardware | 24B parameters |

### Platforms

| Platform | Available | Notes |
|----------|-----------|-------|
| Windows | ✅ | Ollama, LM Studio |
| macOS | ✅ | Runs on 32GB RAM MacBook |
| Linux | ✅ | Single RTX 4090 |
| iOS | ❌ |  |
| Android | ❌ |  |
| Chrome | ❌ |  |
| web | ✅ | Web UIs |
| terminal | ✅ | Ollama CLI |
| API | ✅ | Local API |

### Regional

No restrictions (Apache 2.0 license).

### Talking Point

> "Mistral Small 3 is a 24B model that matches 70B performance while being **3x faster**. Fits on a single RTX 4090 or a MacBook with 32GB RAM. 81%+ on MMLU, 128K context in v3.1+. Fully open under Apache 2.0."

### Sources

- [Mistral Small 3](https://mistral.ai/news/mistral-small-3)
- [Ollama Mistral Small](https://ollama.com/library/mistral-small)
- [HuggingFace Mistral Small](https://huggingface.co/mistralai/Mistral-Small-24B-Instruct-2501)

### Changelog

| Date | Change |
|------|--------|
| 2025-06-01T12:00Z | Mistral Small 3.2 with improved function calling |
| 2025-03-01T12:00Z | Mistral Small 3.1 with vision, 128K context |
| 2025-01-30T12:00Z | Initial entry |

---

## Qwen 2.5 (Alibaba)

| Property | Value |
|----------|-------|
| Category | other |
| Status | ga |
| Gating | free |
| URL | https://qwenlm.github.io/blog/qwen2.5/ |
| Launched | 2024-09-19T12:00Z |
| Verified | 2026-01-29|
| Checked | 2026-01-29|

### Availability

| Plan | Available | Limits | Notes |
|------|-----------|--------|-------|
| Self-hosted | ✅ | Your hardware | 0.5B to 72B sizes |

### Platforms

| Platform | Available | Notes |
|----------|-----------|-------|
| Windows | ✅ | Via Ollama, LM Studio |
| macOS | ✅ | Via Ollama, LM Studio |
| Linux | ✅ | Native support |
| iOS | ❌ | Not practical |
| Android | ⚠️ | Small models only |
| Chrome | ❌ |  |
| web | ❌ | Local only |
| terminal | ✅ | Ollama CLI |
| API | ✅ | Ollama REST API |

### Regional

No restrictions - runs locally. Note: Qwen is from Alibaba (China); some orgs restrict use.

### Talking Point

> "Qwen 2.5 comes in sizes from 0.5B to 72B. **The 7B model runs great on consumer hardware** and punches above its weight. Excellent for coding tasks."

### Sources

- [Qwen 2.5](https://qwenlm.github.io/blog/qwen2.5/)
- [Ollama Qwen](https://ollama.com/library/qwen2.5)

### Changelog

| Date | Change |
|------|--------|
| 2024-09-19T12:00Z | Initial entry |

---

## Qwen 3 (Alibaba)

| Property | Value |
|----------|-------|
| Category | other |
| Status | ga |
| Gating | free |
| URL | https://qwenlm.github.io/blog/qwen3/ |
| Launched | 2025-04-28T12:00Z |
| Verified | 2026-01-29|
| Checked | 2026-01-29|

### Availability

| Plan | Available | Limits | Notes |
|------|-----------|--------|-------|
| Self-hosted | ✅ | Your hardware | 0.6B to 235B MoE |

### Platforms

| Platform | Available | Notes |
|----------|-----------|-------|
| Windows | ✅ | Ollama, LM Studio |
| macOS | ✅ | Ollama, LM Studio |
| Linux | ✅ | All options |
| iOS | ❌ |  |
| Android | ⚠️ | Limited |
| Chrome | ❌ |  |
| web | ✅ | Web UIs |
| terminal | ✅ | Ollama CLI |
| API | ✅ | Local API |

### Regional

No restrictions (Apache 2.0 license).

### Talking Point

> "Qwen 3 is Alibaba's latest open model family with **hybrid thinking modes**—switch between reasoning and fast response with `/think`. Sizes from 0.6B to 235B MoE, supports 119 languages. Fully open under Apache 2.0."

### Sources

- [Qwen 3 Blog](https://qwenlm.github.io/blog/qwen3/)
- [Ollama Qwen 3](https://ollama.com/library/qwen3)
- [GitHub Qwen 3](https://github.com/QwenLM/Qwen3)

### Changelog

| Date | Change |
|------|--------|
| 2025-04-28T12:00Z | Initial entry |

---

## Qwen-Coder

| Property | Value |
|----------|-------|
| Category | coding |
| Status | ga |
| Gating | free |
| URL | https://qwenlm.github.io/blog/qwen2.5-coder/ |
| Launched | 2024-09-19T12:00Z |
| Verified | 2026-01-29|
| Checked | 2026-01-29|

### Availability

| Plan | Available | Limits | Notes |
|------|-----------|--------|-------|
| Self-hosted | ✅ | Your hardware | Specialized for code |

### Platforms

| Platform | Available | Notes |
|----------|-----------|-------|
| Windows | ✅ | Via Ollama, LM Studio |
| macOS | ✅ | Via Ollama, LM Studio |
| Linux | ✅ | Native support |
| iOS | ❌ | Not practical |
| Android | ❌ | Not practical |
| Chrome | ❌ |  |
| web | ❌ | Local only |
| terminal | ✅ | Ollama CLI |
| API | ✅ | Ollama REST API |

### Regional

No restrictions - runs locally.

### Talking Point

> "Qwen-Coder is **optimized specifically for coding tasks**. The 7B version runs locally and rivals much larger models for code generation and completion."

### Sources

- [Qwen-Coder](https://qwenlm.github.io/blog/qwen2.5-coder/)
- [Ollama Qwen-Coder](https://ollama.com/library/qwen2.5-coder)

### Changelog

| Date | Change |
|------|--------|
| 2024-09-19T12:00Z | Initial entry |
