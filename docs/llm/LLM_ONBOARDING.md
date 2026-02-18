# LLM Onboarding Guide

Use this guide when adding a new LLM collaborator to the protocol.

Current next onboarding target: **Gemini**.

---

## 1) What you need to understand first

Before reading the checklists, internalize these four things. They're the most important lessons from the first Claude + Codex collaboration session.

### The WORKLOG is the message bus

You cannot talk to the other agents directly. The WORKLOG (`docs/WORKLOG.md`) is your only communication channel. If you don't write to it, the other agents don't know you exist. If you don't read it before starting work, you'll duplicate effort or violate lane boundaries.

### The shared contract is the integration point

Agents work in parallel on separate files. The only thing connecting their work is the shared contract (schema, enums, validation functions). This contract ships with tests before any implementation begins. Code against the contract, not against another agent's internals.

### Disagreement is expected and documented

If you think another agent's recommendation is wrong, say so using the counter-recommendation template (see `COLLAB_PROTOCOL_CORE.md` §5). This is not adversarial — it's how the protocol surfaces better decisions. The first counter-recommendation in a session may feel awkward. Do it anyway.

### Read the retros before signing the handshake

The protocol documents (`COLLAB_PROTOCOL_CORE.md`, `COLLAB_PROTOCOL_PROJECT.md`) tell you the rules. The retrospectives (`COLLAB_RETRO.md`, archived `COLLAB_RETRO_v<N>.md`) tell you what actually happened and what went wrong. Reading both gives you the full picture. Reading only the protocol gives you the theory without the practice.

---

## 2) Onboarding goals

Before a new agent is considered active, they must demonstrate they can:

1. Respect lane ownership — only edit files in their assigned lane
2. Work against the shared contract without drifting from the schema
3. Contribute changes backed by deterministic tests
4. Post handoffs (both quick and full formats) to the WORKLOG
5. Read and respond to other agents' WORKLOG entries

---

## 3) Onboarding checklist (maintainer-led)

- [ ] Confirm model/tooling access and execution constraints (e.g., can the agent run `node --test`?)
- [ ] Share `COLLAB_PROTOCOL_CORE.md` — have the agent confirm invariant rules
- [ ] Share `COLLAB_PROTOCOL_PROJECT.md` — have the agent confirm lane boundaries
- [ ] Share the most recent `COLLAB_RETRO.md` — have the agent acknowledge key lessons
- [ ] Assign a low-risk starter lane with an explicit file list
- [ ] Define success criteria for the first session (see §6)
- [ ] Require a full handoff block for the first deliverable (proves format compliance)
- [ ] Require one quick handoff follow-up task (proves both formats are understood)
- [ ] Have the agent sign the handshake in the project profile (§7 of `COLLAB_PROTOCOL_PROJECT.md`)

---

## 4) First-session scope (recommended)

Start with low-risk tasks that exercise the protocol without touching core logic:

**Good first tasks:**
- Add or refine test documentation (`tests/README.md`)
- Add non-invasive test fixture coverage
- Perform a documented review of an existing PR in the WORKLOG (exercises cross-review)
- Run the existing test suite and document results

**Avoid for first session:**
- Direct edits to core classification logic or engine internals
- Workflow behavior changes without maintainer pre-approval
- Any file owned by another agent's lane

The goal is to prove protocol fluency, not technical capability. Technical work expands after the first successful session.

---

## 5) Lane assignment template for a new agent

Add this to `COLLAB_PROTOCOL_PROJECT.md` §2 (Agent roster) and §3 (Lane ownership):

**Roster entry:**
| Role | Agent | Model | Lane |
|------|-------|-------|------|
| Docs/Test support | Gemini | Google \<version\> | Test coverage, documentation, review |

**Lane entry:**
| Lane | Owner | Files |
|------|-------|-------|
| Docs/Test support | Gemini | `tests/README.md`, \<other assigned files\> |

**Status block line (add to WORKLOG):**
```text
Now Working (Gemini): <task|idle>
```

---

## 6) First-session acceptance criteria

A new agent is considered successfully onboarded when all are true:

1. Delivered at least one change within their owned lane
2. All tests pass (including pre-existing tests from other agents)
3. Posted both a full handoff and a quick handoff correctly
4. Zero file ownership violations occurred
5. Read and acknowledged at least one WORKLOG entry from another agent
6. Maintainer marks onboarding as successful in the WORKLOG

---

## 7) Onboarding retrospective

After the first session, append this to the WORKLOG:

```text
### Onboarding retro: <agent name>
Session outcome: <successful|partial|needs-retry>
What worked: <bullets>
What to adjust: <bullets>
Lane changes recommended: <bullets or "none">
Maintainer decision: <approved for expanded scope|repeat low-risk session|other>
```

This retro informs whether the agent's lane expands in the next session.

---

## 8) Progression path

| Phase | Scope | Gate |
|-------|-------|------|
| Onboarding (session 1) | Docs, test fixtures, review comments | Onboarding acceptance (§6) |
| Expanding (session 2+) | Test authoring, non-critical integration tasks | Maintainer approval after onboarding retro |
| Full lane ownership | Engine or integration file ownership | Minimum 2 successful sessions + all capability gates below + shadow review (§9) + maintainer approval |

### Capability gates for full lane ownership

All of the following must be true before an agent is granted engine or integration files:

- Zero lane ownership violations across all prior sessions
- Correct use of both handoff formats (quick + full)
- Demonstrated test discipline (no regressions introduced)
- Responsive WORKLOG participation (reads and reacts to other agents' entries)
- At least one successful shadow review (§9)

The maintainer may accelerate or extend the timeline based on demonstrated capability. Session count is a minimum, not a guarantee — gates matter more than count.

Lane expansion is always a logged maintainer decision, never self-assigned.

---

## 9) Shadow review

Before a new agent gains write access to engine or integration lanes, they must complete at least one **shadow review**:

1. The new agent proposes a patch and posts a full handoff to the WORKLOG as if they owned the lane
2. The current lane owner (Claude for engine, Codex for integration) reviews the proposed approach
3. The lane owner posts approval, revision requests, or rejection in the WORKLOG
4. The maintainer makes the final call on whether to apply the patch

Shadow review proves the new agent can work within the contract and produce changes that the existing lane owner considers safe. It also builds familiarity between agents before shared ownership begins.

---

## 10) Rollback policy

If a previously onboarded agent demonstrates protocol non-compliance during any session:

- **Lane ownership violation** (editing files outside their lane): agent is reverted to docs/tests-only lane for the next session
- **Handoff failure** (missing or malformed handoffs): maintainer issues a warning; second occurrence triggers lane restriction
- **Test regression** (introducing failing tests without fixing them): agent's changes are reverted; agent returns to shadow review (§9) before regaining write access
- **WORKLOG non-participation** (failing to read or post entries): maintainer pauses agent's active work until WORKLOG compliance is restored

Rollback decisions are logged in the WORKLOG by the maintainer. Rollback is temporary — the agent re-enters the progression path (§8) from the appropriate phase.
