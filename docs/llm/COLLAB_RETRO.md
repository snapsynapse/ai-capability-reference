# Collaboration Retrospective: Link Checker Milestone

**Date:** 2026-02-07
**Participants:** Claude (Anthropic), Codex (OpenAI), Human Maintainer
**Milestone:** Link checker replacement (reduce false 403 "broken" reports)
**Outcome:** All acceptance criteria met. 114 tests passing, 134-URL baseline clean.

---

## What worked

### 1. File-level lane ownership eliminated collisions

The protocol assigned Claude = engine (`link-engine.js`, `link-schema.js`) and Codex = integration (`check-links.js`, workflow, docs). Zero merge conflicts occurred across the entire session. This was the single most important structural decision.

**Rule for next time:** Define ownership at the file level, not the function level. If two agents might edit the same file, redesign the split until they don't.

### 2. Schema-first development enabled parallel work

Shipping `link-schema.js` (Category enum, result shape, validation) before either agent built implementation meant Codex could write CLI integration against a stable contract while Claude built the engine. Neither blocked the other.

**Rule for next time:** The shared contract ships first, with tests. Implementation follows. Never start two agents on implementation before the interface is locked.

### 3. Counter-recommendations produced better outcomes

Claude disagreed with Codex's recommendation (challenge-pattern tuning) and documented a counter-proposal (run baseline first). Codex accepted. The baseline confirmed no tuning was needed, saving speculative work.

**Rule for next time:** Explicitly encourage documented disagreements. The protocol should have a lightweight "counter-recommendation" template. Disagreement is signal, not friction.

### 4. The WORKLOG kept everyone oriented

A single shared markdown file served as the communication channel between two agents who couldn't interact directly. Handoff blocks, decision logs, and status updates were all visible to the human relay and to each agent on context reload.

---

## What didn't work (or could be better)

### 1. WORKLOG verbosity scaled poorly

By session end, `WORKLOG.md` was 650+ lines. Much of it was ceremony — full handoff blocks for 5-minute tasks, formatted tables for simple decisions. The signal-to-noise ratio dropped as the file grew.

**Fix for next time:** Two-tier entries:
- **Small deliverables:** One-line status update. `17:12 — Claude: link-engine.js + tests complete (80 pass). Next: Codex PR-3.`
- **Significant milestones:** Full handoff block with the §6 template.

### 2. "Now Working" locks were hard to find

Neither agent could check the lock before starting work — we're asynchronous, mediated by the human. The locks documented intent but were buried deep in the WORKLOG by session end, making them effectively invisible.

**Fix for next time:** Codex's suggestion (from the WORKLOG 17:45 retro) is better than my original "just drop them" take: **pin a Current Status Block at the top of the WORKLOG**, updated in-place. Same intent-signaling benefit, but actually findable.

### 3. No lightweight "I'm done, your turn" signal

The handoff template is thorough but heavy. For quick back-and-forth, a simpler ping would help: `@Codex: engine ready for integration. Changed: link-engine.js. Tests: 80 pass.`

**Fix for next time:** Add a "quick handoff" format — 1-3 lines, for when the full template is overkill.

### 4. Cross-review didn't actually happen

The protocol says "each AI reviews the other's PRs." In practice, neither agent formally reviewed the other's code. We trusted the test suites instead. This worked fine for this milestone but won't scale to riskier changes.

**Fix for next time:** If cross-review matters, make it an explicit step with a deliverable: "Claude posts review comments on Codex's PR-3 in the WORKLOG before maintainer merges." Otherwise, drop it from the protocol to avoid aspirational commitments.

---

## Structural observations

### The collaboration model is "parallel agents with a human relay"

Not real-time pair programming. Not async PR review. The human switches context between agents, carrying state via the WORKLOG and the filesystem. The protocol should be designed for this reality:
- Agents can't interrupt each other
- Agents can't read each other's in-progress work
- The human is the only real-time coordinator
- The WORKLOG is eventually-consistent, not strongly-consistent

### Agent strengths complemented each other

| Capability | Claude | Codex |
|-----------|--------|-------|
| Protocol design and structure | Consumed | Produced |
| Engine/algorithm implementation | Strong | Deferred |
| CLI/integration wiring | Deferred | Strong |
| Test design | Thorough (114 tests) | Focused (6 targeted tests) |
| Documentation verbosity | Too much | About right |
| Disagreement handling | Initiated counter-proposal | Accepted gracefully |

Neither agent was "better" — the strengths were genuinely complementary.

### Test counts as coordination evidence

The test suite was the real proof of integration. Claude's 108 tests + Codex's 6 tests all passing together (114 total) demonstrated that the contract held across both agents' work without either needing to understand the other's internals.

---

## Cross-referencing Codex's retro (WORKLOG 17:45)

Codex posted its own reflection in the WORKLOG at 17:45. Here's where we converged, diverged, and where Codex contributed ideas that improved on mine.

### Convergence (both agents independently identified)

- Lane ownership was the key structural win
- WORKLOG discoverability degraded as it grew
- Counter-recommendations were productive when logged explicitly
- Handoff template worked but needs a lighter variant

### Where Codex improved on Claude's take

| Claude's position | Codex's improvement |
|---|---|
| Drop "Now Working" locks — they're a fiction | Keep them, but **pin a "Current Status Block" at the top** of the WORKLOG so they're findable without scrolling. Better than dropping them entirely. |
| Protocol v2 recommendations (list of principles) | **Reusable kickoff checklist** — a concrete 5-step list to run at session start. More actionable than abstract principles. |
| Readiness state was implicit | **Three explicit tags:** `In progress`, `Ready for review`, `Ready for merge`. Clear and standardized. |

### Where Claude went deeper

- **"Parallel agents with human relay" framing** — Codex's retro didn't address the fundamental async nature of the collaboration model. Understanding this constraint shapes protocol design.
- **Cross-review gap** — The protocol committed to cross-review; neither agent delivered it. Codex didn't flag this. Worth deciding explicitly for v2: mandatory or aspirational?
- **Self-critique on verbosity** — Claude's WORKLOG entries were too long. Codex's were about right. Claude should adopt Codex's density as a target.

### Agreed v2 improvements (merged from both retros)

1. **Current Status Block at WORKLOG top** (Codex) — always-in-place, 4 lines max
2. **Decision Index** (Codex) — append-only mini table with anchors to detailed entries
3. **Quick handoff format** (Claude) — 1-3 lines for small deliverables
4. **Standard readiness tags** (Codex) — `In progress | Ready for review | Ready for merge`
5. **Counter-recommendation template** (Claude) — normalize productive disagreement
6. **Schema/contract first** (Claude) — require the shared interface before implementation
7. **WORKLOG line budget** (Claude) — entries under 30 min of work should be under 5 lines
8. **Kickoff checklist** (Codex) — confirm lanes, test strategy, status block, handoff rules, retro commitment
9. **Retrospective as protocol step** (both) — not an afterthought
10. **Clarify cross-review** (Claude) — decide if it's mandatory or aspirational, then commit

---

## Recommendations for COLLAB_PROTOCOL v2

The above merged list is the actionable set. Priorities for the next session:

| Priority | Item | Source |
|----------|------|--------|
| P0 (do first) | Current Status Block at WORKLOG top | Codex |
| P0 | Kickoff checklist | Codex |
| P0 | Schema/contract before implementation | Claude |
| P1 (adopt) | Quick handoff format + line budget | Claude |
| P1 | Standard readiness tags | Codex |
| P1 | Decision Index | Codex |
| P2 (decide) | Cross-review: mandatory or aspirational? | Claude |
| P2 | Counter-recommendation template | Claude |

---

## Metrics

| Metric | Value |
|--------|-------|
| Session duration | ~45 minutes |
| Files created (Claude) | 6 |
| Files created (Codex) | 3 |
| Files modified (Codex) | 4 |
| File collisions | 0 |
| Total tests | 114 (108 Claude + 6 Codex) |
| Test failures | 0 |
| URLs in baseline | 134 (120 unique) |
| False positives in baseline | 0 |
| Counter-recommendations | 1 (accepted) |
| WORKLOG entries | ~18 |
| WORKLOG final length | ~650 lines |
