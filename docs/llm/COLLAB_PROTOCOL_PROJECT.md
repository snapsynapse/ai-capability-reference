# Collaboration Protocol Project Profile — AI Feature Tracker

This file instantiates the global collaboration core for this repository.

Base document: [`COLLAB_PROTOCOL_CORE.md`](./COLLAB_PROTOCOL_CORE.md)

---

## 1) Project profile header

| Field | Value |
|-------|-------|
| **Project** | AI Feature Tracker |
| **Current milestone** | Link checker reliability and collaboration protocol hardening |
| **Risk tier** | Medium |
| **Cross-review mode** | Aspirational (non-blocking) |
| **Merge policy** | Maintainer merges to `main` after review |
| **Test policy** | Deterministic tests required; live smoke tests optional and non-blocking |

---

## 2) Agent roster

| Role | Agent | Model | Lane |
|------|-------|-------|------|
| Engine owner | Claude | Anthropic Opus 4.6 | HTTP strategy, classification, retry/backoff |
| Integration owner | Codex | OpenAI 5.3 | CLI/UX, workflow wiring, docs |
| Maintainer | Human | — | Final authority, merge, lane assignment |

---

## 3) Lane ownership (current milestone)

Lane assignments may only change via a logged maintainer decision in `docs/WORKLOG.md`.

| Lane | Owner | Files |
|------|-------|-------|
| Engine | Claude | `scripts/lib/link-engine.js`, `scripts/lib/link-schema.js`, `tests/link-engine.test.js`, `tests/link-schema.test.js`, `tests/challenge-detection.test.js`, `tests/smoke-live.test.js`, `tests/fixtures/` |
| Integration | Codex | `scripts/check-links.js`, `tests/check-links.integration.test.js`, `.github/workflows/check-links.yml`, `README.md`, `VERIFICATION.md`, `tests/README.md` |
| Shared (append-only) | Both | `docs/WORKLOG.md` |

---

## 4) Domain contract

### Output schema

All link-check runs emit records with these required fields:

| Field | Type | Description |
|-------|------|-------------|
| `url` | string | The URL that was checked |
| `category` | enum | `ok \| broken \| soft-blocked \| rate-limited \| timeout \| needs-manual-review` |
| `http_code` | number \| null | Final HTTP status code |
| `final_url` | string \| null | URL after redirects |
| `evidence` | string | Short machine-readable classification reason |
| `checked_at` | string (ISO 8601) | Timestamp of check |

Optional fields: `attempts`, `method_used`, `request_profile`, `latency_ms`

### Special handling policy

A single HTTP 403 must **not** auto-classify as `broken`.

Pipeline:
1. Initial 403 → classify provisional `soft-blocked`
2. Retry with bounded strategy (header rotation, profile rotation, backoff)
3. If still inconclusive and signals conflict → `needs-manual-review`
4. Only classify `broken` with strong corroborating evidence (e.g., DNS failure, connection refused)

This policy is mandatory to reduce noisy issue creation.

---

## 5) Milestone acceptance criteria

1. False-"broken" rate from 403-heavy links is materially reduced
2. Ambiguous links are categorized as `soft-blocked` or `needs-manual-review`
3. CLI and workflow outputs are easy to triage
4. Docs explain interpretation of each category

---

## 6) Working files

| Document | Path | Purpose |
|----------|------|---------|
| Shared worklog | [`WORKLOG.md`](./WORKLOG.md) | Session coordination |
| Current retro | [`COLLAB_RETRO.md`](./COLLAB_RETRO.md) | Active retrospective |
| Retro archive | [`COLLAB_RETRO_v1.md`](./COLLAB_RETRO_v1.md) | Archived v1 retro |
| Protocol index | [`COLLAB_PROTOCOL.md`](./COLLAB_PROTOCOL.md) | Version history and doc map |

---

## 7) Handshake acknowledgments

### Codex (OpenAI)

**Signed:** Codex (OpenAI), integration + CLI + docs lane owner
**Handshake status:** Accepted and active
**Timestamp:** 2026-02-07T17:02:25-07:00 (America/Denver)

### Claude (Anthropic)

**Signed:** Claude (Anthropic), engine + classification + retry strategy lane owner
**Handshake status:** Accepted — core protocol and project profile reviewed and consented to
**Notes:**
- Lane ownership (§3) acknowledged
- Domain contract (§4) accepted as the shared interface
- 403 handling policy endorsed
- Cross-review acknowledged as aspirational, not blocking
- Both handoff formats (quick + full) adopted
**Timestamp:** 2026-02-07T17:04:00-07:00 (America/Denver)

> Handshakes carry forward across protocol versions unless roles change. Re-signing is only needed when an agent's lane assignment changes.
