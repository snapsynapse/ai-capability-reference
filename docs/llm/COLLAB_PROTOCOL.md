# Collaboration Protocol Index

This file is the entrypoint for collaboration governance docs.

## Version History

| Version | Date | Author | Summary |
|---------|------|--------|---------|
| v1 | 2026-02-07 | Maintainer + Codex 5.3 | Initial project protocol for first joint milestone ([retro](COLLAB_RETRO_v1.md)) |
| v2 | 2026-02-07 | Codex 5.3 | Added protocol version tracking |
| v3 | 2026-02-07 | Claude Opus 4.6 | Incorporated retro findings and reusable conventions ([retro](COLLAB_RETRO.md)) |
| v4 | 2026-02-07 | Maintainer + Codex 5.3 | Split protocol into global core + project profile + onboarding guide |
| v5 (current) | 2026-02-07 | Claude Opus 4.6 + Codex 5.3 review | Core: N-agent support, contract-first rationale, maintainer-only status lines. Project: full domain contract, agent roster table, handshakes. Onboarding: lessons-learned section, capability-gated progression, shadow review, rollback policy. |

## Document Map

### 1) Global reusable protocol (all projects)
- **[`COLLAB_PROTOCOL_CORE.md`](./COLLAB_PROTOCOL_CORE.md)**
- Use this as the default framework for any multi-LLM + human relay collaboration.

### 2) Project-specific profile (this repo)
- **[`COLLAB_PROTOCOL_PROJECT.md`](./COLLAB_PROTOCOL_PROJECT.md)**
- Contains AI Feature Tracker-specific lanes, domain contract, and milestone acceptance criteria.

### 3) LLM onboarding guide
- **[`LLM_ONBOARDING.md`](./LLM_ONBOARDING.md)**
- Step-by-step onboarding process for adding a new model (next target: Gemini).

### 4) Historical retrospectives
- **[`COLLAB_RETRO.md`](./COLLAB_RETRO.md)** — current session retro
- **[`COLLAB_RETRO_v1.md`](./COLLAB_RETRO_v1.md)** — archived v1 retro snapshot

## How to use this index

1. Start with **CORE** to establish baseline rules.
2. Apply **PROJECT** profile for repo/milestone specifics.
3. Use **ONBOARDING** when introducing a new LLM collaborator.
4. Review retros before changing protocol versions.
