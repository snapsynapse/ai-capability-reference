---
name: Local/Open Models
vendor: Various (Meta, Mistral, DeepSeek, Alibaba)
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

## Llama 3.3 (Meta)

| Property | Value |
|----------|-------|
| Category | other |
| Status | ga |
| Gating | free |
| URL | https://ai.meta.com/llama/ |
| Launched | 2024-12-06T12:00Z |
| Verified | 2026-01-20T12:00Z |
| Checked | 2026-01-20T12:00Z |

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

## Mistral Large / Mistral Nemo

| Property | Value |
|----------|-------|
| Category | other |
| Status | ga |
| Gating | free |
| URL | https://mistral.ai/technology/ |
| Launched | 2024-07-18T12:00Z |
| Verified | 2026-01-20T12:00Z |
| Checked | 2026-01-20T12:00Z |

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

## DeepSeek-V3 / DeepSeek-R1

| Property | Value |
|----------|-------|
| Category | other |
| Status | ga |
| Gating | free |
| URL | https://github.com/deepseek-ai/DeepSeek-V3 |
| Launched | 2024-12-27T12:00Z |
| Verified | 2026-01-20T12:00Z |
| Checked | 2026-01-20T12:00Z |

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

## Qwen 2.5 (Alibaba)

| Property | Value |
|----------|-------|
| Category | other |
| Status | ga |
| Gating | free |
| URL | https://qwenlm.github.io/blog/qwen2.5/ |
| Launched | 2024-09-19T12:00Z |
| Verified | 2026-01-20T12:00Z |
| Checked | 2026-01-20T12:00Z |

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

## Qwen-Coder

| Property | Value |
|----------|-------|
| Category | coding |
| Status | ga |
| Gating | free |
| URL | https://qwenlm.github.io/blog/qwen2.5-coder/ |
| Launched | 2024-09-19T12:00Z |
| Verified | 2026-01-20T12:00Z |
| Checked | 2026-01-20T12:00Z |

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

---

## Codestral (Mistral)

| Property | Value |
|----------|-------|
| Category | coding |
| Status | ga |
| Gating | free |
| URL | https://mistral.ai/news/codestral/ |
| Launched | 2024-05-29T12:00Z |
| Verified | 2026-01-20T12:00Z |
| Checked | 2026-01-20T12:00Z |

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

## Local Hosting Options

| Property | Value |
|----------|-------|
| Category | other |
| Status | ga |
| Gating | free |
| URL | https://ollama.com/ |
| Launched | 2023-07-01T12:00Z |
| Verified | 2026-01-20T12:00Z |
| Checked | 2026-01-20T12:00Z |

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
