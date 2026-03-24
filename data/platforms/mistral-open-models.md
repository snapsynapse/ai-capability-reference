---
name: Mistral Open Models
vendor: Mistral
logo: https://cdn.simpleicons.org/mistralai
pricing_page: https://mistral.ai/models
last_verified: 2026-03-19
build_visibility: hidden
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
| Verified | 2026-03-20|
| Checked | 2026-03-24|

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

## Mistral Large / Mistral Nemo

| Property | Value |
|----------|-------|
| Category | other |
| Status | ga |
| Gating | free |
| URL | https://mistral.ai/technology/ |
| Launched | 2024-07-18T12:00Z |
| Verified | 2026-03-21|
| Checked | 2026-03-24|

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

> "Mistral offers several open models. **Mistral Nemo (12B) runs on consumer hardware**—great for local use. Mistral Large (123B) needs serious GPU power. Note: both are **deprecated on hosted platforms** (Vertex AI, La Plateforme) in favor of Mistral Small 4, but **open weights remain available** for self-hosted via Ollama and LM Studio."

### Sources

- [Mistral Models](https://mistral.ai/technology/)
- [Ollama Mistral](https://ollama.com/library/mistral)

### Changelog

| Date | Change |
|------|--------|
| 2026-03-21T12:00Z | [Verified] Models deprecated on hosted platforms (Vertex AI, La Plateforme); open weights still available for self-hosted; Mistral Small 4 now recommended |
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
| Verified | 2026-02-22|
| Checked | 2026-03-24|

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

## Mistral Small 4

| Property | Value |
|----------|-------|
| Category | other |
| Status | ga |
| Gating | free |
| URL | https://mistral.ai/news/mistral-small-4 |
| Launched | 2026-03-16T12:00Z |
| Verified | 2026-03-24|
| Checked | 2026-03-24|

### Availability

| Plan | Available | Limits | Notes |
|------|-----------|--------|-------|
| Self-hosted | ✅ | Your hardware | 119B MoE (6B active); datacenter GPUs required |
| Mistral API | ✅ | Usage-based | Hosted endpoint: mistral-small-2603 |
| NVIDIA NIM | ✅ | Usage-based | Day-0 NIM support |

### Platforms

| Platform | Available | Notes |
|----------|-----------|-------|
| Windows | ⚠️ | Via vLLM/SGLang; requires datacenter GPU |
| macOS | ❌ | Not practical (GPU requirements) |
| Linux | ✅ | Primary deployment target |
| iOS | ❌ | Not practical |
| Android | ❌ | Not practical |
| Chrome | ❌ |  |
| web | ❌ | Self-hosted or API only |
| terminal | ✅ | Via vLLM/SGLang CLI |
| API | ✅ | Mistral API + local API |

### Regional

No restrictions (Apache 2.0 license). Mistral API availability may vary.

### Talking Point

> "Mistral Small 4 is a 119B Mixture-of-Experts model with only 6B active parameters per token. It combines instruct, reasoning, vision, and code in one open model. **Apache 2.0 license**, but requires **datacenter GPUs (4× H100 minimum)**—this is not a consumer-hardware model. Also available via the Mistral API as `mistral-small-2603`."

### Sources

- [Mistral Small 4 Announcement](https://mistral.ai/news/mistral-small-4)
- [Mistral Small 4 Docs](https://docs.mistral.ai/models/mistral-small-4-0-26-03)
- [HuggingFace Model Card](https://huggingface.co/mistralai/Mistral-Small-4-119B-2603)

### Changelog

| Date | Change |
|------|--------|
| 2026-03-16T12:00Z | Initial entry |

---

## Leanstral (Mistral)

| Property | Value |
|----------|-------|
| Category | coding |
| Status | ga |
| Gating | free |
| URL | https://mistral.ai/news/leanstral |
| Launched | 2026-03-16T12:00Z |
| Verified | 2026-03-24|
| Checked | 2026-03-24|

### Availability

| Plan | Available | Limits | Notes |
|------|-----------|--------|-------|
| Self-hosted | ✅ | Your hardware | Apache 2.0 weights |
| Mistral Labs API | ✅ | Time-limited | Endpoint: labs-leanstral-2603 |
| Mistral Vibe | ✅ | Agent mode | Web-based access |

### Platforms

| Platform | Available | Notes |
|----------|-----------|-------|
| Windows | ✅ | Via Ollama |
| macOS | ✅ | Via Ollama |
| Linux | ✅ | Native support |
| iOS | ❌ | Not practical |
| Android | ❌ | Not practical |
| Chrome | ❌ |  |
| web | ✅ | Mistral Vibe agent mode |
| terminal | ✅ | Ollama CLI |
| API | ✅ | Mistral Labs API + local API |

### Regional

No restrictions (Apache 2.0 license).

### Talking Point

> "Leanstral is Mistral's open-source code agent built for Lean 4 formal verification. **Apache 2.0 weights** with MCP tool-use training. Available self-hosted, via the Labs API, or in Mistral Vibe's agent mode."

### Sources

- [Leanstral Announcement](https://mistral.ai/news/leanstral)
- [Mistral Docs Changelog](https://docs.mistral.ai/getting-started/changelog)

### Changelog

| Date | Change |
|------|--------|
| 2026-03-16T12:00Z | Initial entry |
