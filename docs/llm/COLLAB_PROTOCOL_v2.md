# Collaboration Protocol v2 (Codex + Claude + Maintainer)

## Version History

| Version | Date | Summary |
|---------|------|---------|
| v1 | 2026-02-07 | Initial protocol used for first joint Claude+Codex+Maintainer milestone run |
| v2 (current) | 2026-02-07 | Introduced explicit protocol versioning and historical tracking at top of document |

Project: **AI Feature Tracker**  
Focus milestone: **Link checker replacement (reduce false 403 "broken" reports)**

---

## 1) Mission for this milestone

Replace/upgrade link checking so results are trustworthy and actionable:
- minimize false positives from bot protection / anti-scraping behavior
- classify ambiguous outcomes clearly (not just broken/not-broken)
- keep contributor/maintainer workflow lightweight

---

## 2) Roles and decision authority

### Human Maintainer (final authority)
- Owns priorities, acceptance criteria, and merge decisions
- Breaks ties when AI collaborators disagree
- Approves rollout to scheduled workflows

### Claude (primary engine owner)
- HTTP strategy and fetch behavior
- retry/backoff, redirect policy, request profile strategy
- status classification heuristics for anti-bot/403-heavy responses

### Codex (primary integration owner)
- CLI UX (flags, output modes)
- report schema + formatting for issues/PR review
- workflow wiring, docs updates, regression harness and fixtures

> Cross-review rule: each AI reviews the other’s PRs; only maintainer merges.

---

## 3) Canonical output schema (shared contract)

All link-check runs should emit records with:
- `url`
- `category` = `ok | broken | soft-blocked | rate-limited | timeout | needs-manual-review`
- `http_code` (nullable)
- `final_url` (nullable)
- `evidence` (short machine-readable reason)
- `checked_at` (ISO timestamp)

Optional but useful:
- `attempts`
- `method_used`
- `request_profile`
- `latency_ms`

---

## 4) 403 handling policy (explicit)

A single 403 must **not** auto-classify as `broken`.

Default policy:
1. initial 403 → classify provisional `soft-blocked`
2. retry with bounded strategy (headers/profile/backoff)
3. if still inconclusive and signals conflict → `needs-manual-review`
4. only classify `broken` with strong corroborating evidence

This policy is mandatory to reduce noisy issue creation.

---

## 5) Work plan (stacked PR model)

### PR-1: Contract + tests skeleton
- add schema contract docs
- add fixtures for `ok/broken/soft-blocked/rate-limited/timeout`
- add baseline parser/report tests

### PR-2: Engine behavior
- implement fetch/retry/classification strategy
- ensure 403 policy behavior matches contract
- add deterministic tests for classification outcomes

### PR-3: Integration + migration
- CLI flags and output options
- workflow updates and issue/report templates
- docs migration from old checker behavior

---

## 6) Handoff template (required every transfer)

```text
Handoff: <task>
Owner: <Claude|Codex>
Status: <done|blocked|needs-review>
Changed files: <list>
Tests run: <commands + result>
Risks/assumptions: <bullets>
Next owner: <Claude|Codex|Maintainer>
```

---

## 7) Definition of done (per task)

A task is complete only if all are true:
- acceptance criteria satisfied
- tests added/updated and passing
- docs updated for behavior changes
- handoff posted
- maintainer sign-off received

---

## 8) Quick milestone acceptance criteria

For link checker replacement to be accepted:
1. false-"broken" rate from 403-heavy links is materially reduced
2. ambiguous links are categorized as `soft-blocked` or `needs-manual-review`
3. CLI and workflow outputs are easy to triage
4. docs explain interpretation of each category

---

## 9) Communication rhythm (lightweight)

Daily/working-session check-in:
```text
Yesterday: <completed>
Today: <next steps>
Blockers: <if any>
```

Keep updates brief; prioritize handoffs and test evidence.

---

## 10) Handshake Acknowledgment

### Codex (OpenAI)

**Signed:** Codex (OpenAI), local workspace implementation + integration collaborator
**Handshake status:** Accepted and active for this repository collaboration model
**Timestamp:** 2026-02-07T17:02:25-07:00 (America/Denver)

### Claude (Anthropic)

**Signed:** Claude (Anthropic), HTTP engine + fetch/retry/classification strategy owner
**Handshake status:** Accepted — protocol reviewed and consented to in full
**Notes:**
- Role assignment (§2) acknowledged: I own HTTP strategy, status classification, retry/backoff, and request profile logic
- Output schema contract (§3) accepted as the shared interface
- 403 handling policy (§4) endorsed — the "never auto-break on a single 403" principle is exactly right
- Cross-review commitment (§2 cross-review rule) accepted — I'll review Codex's PRs with the same rigor I'd want applied to mine
- Handoff template (§6) adopted for all task transfers
**Timestamp:** 2026-02-07T17:04:00-07:00 (America/Denver)
