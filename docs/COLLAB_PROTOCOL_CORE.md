# Collaboration Protocol Core (Global Template)

This is the reusable baseline protocol for **multi-LLM collaboration with a human maintainer relay**.

Use this document across projects. Put project-specific details in a separate profile document (`COLLAB_PROTOCOL_PROJECT.md`).

---

## 1) Collaboration model

This protocol governs **parallel agents with a human relay**:

- Agents work concurrently on owned files, coordinated through a shared WORKLOG
- Agents cannot see each other's in-progress work or communicate directly
- The human maintainer is the only real-time coordinator and the final decision authority
- The WORKLOG is eventually-consistent, not strongly-consistent

All protocol rules are designed for this reality. Do not assume real-time awareness of what other agents are doing.

---

## 2) Required roles

- **Maintainer (required, exactly one):** priorities, tie-breaks, merge authority, lane assignment
- **Agents (required, two or more):** each agent owns a defined lane of files

Agent names, models, and lane assignments are configured in the project profile. The core protocol does not limit the number of agents — a session may have two, three, or more.

---

## 3) Invariant rules (always apply)

These rules cannot be overridden by the project profile:

1. **File-level lane ownership** must be defined before implementation begins. Each file has exactly one owner. If two agents might edit the same file, redesign the split. Lane assignments can only be revised by a logged maintainer decision in the WORKLOG.
2. **Contract-first rule:** shared interfaces, schemas, and enums ship with tests before any agent begins parallel implementation. This prevents integration drift — without a locked contract, agents working in parallel will build against incompatible assumptions.
3. **Handoffs are mandatory** after every completed task (quick or full format, per §5).
4. **Every completed task must include test evidence** (command + pass count).
5. **Retrospective required** at milestone close (see §9).
6. **Counter-recommendations are encouraged.** When an agent disagrees with another agent's recommendation, they document it using the template in §5. Disagreement is signal, not friction.

---

## 4) Cross-review policy

Default: **aspirational, non-blocking**.

When cross-review happens, the reviewing agent posts comments in the WORKLOG. Neither agent should wait for cross-review to declare a task complete. The test suite is the primary integration contract; cross-review is supplementary.

If a milestone is security-critical or high-risk, the maintainer may set cross-review to **mandatory** in the project profile.

---

## 5) Handoff formats

### Full handoff (significant milestones or ownership transfers)

```text
Handoff: <task>
Owner: <agent name>
Status: <In progress|Ready for review|Ready for merge>
Changed files: <list>
Tests run: <commands + results>
Risks/assumptions: <bullets>
Blocking items: <none|list>
Next owner: <agent name|Maintainer>
```

### Quick handoff (tasks under 30 minutes)

```text
<timestamp> — <owner>: <what changed> (<tests pass count>). Next: <owner> <next task>.
```

Example: `17:12 — Claude: link-engine.js + tests complete (80 pass). Next: Codex PR-3.`

### Counter-recommendation (disagreement)

```text
**<Other agent> recommended:** <summary>
**<This agent>'s counter-recommendation:** <alternative>
**Reasoning:** <bullets>
**Agreed action:** <what actually happens>
```

---

## 6) Shared WORKLOG requirements

### Pinned status block (top of file, updated in-place)

```text
Now Working (<Agent 1 name>): <task|idle>
Now Working (<Agent 2 name>): <task|idle>
[... one line per active agent ...]
Maintainer Focus: <current priority>
Next Review Checkpoint: <description>
```

Each agent updates **only their own** "Now Working" line when starting or finishing work. The "Maintainer Focus" and "Next Review Checkpoint" lines are **maintainer-only** — agents should not edit them.

### Decision index (after status block, append-only)

| Decision | Owner | Timestamp | Section |
|----------|-------|-----------|---------|

One row per significant decision. Keeps the WORKLOG scannable as it grows.

### Entry budget

- Tasks under 30 minutes: quick handoff (1-3 lines max)
- Tasks over 30 minutes or ownership transfers: full handoff
- Tables and detailed analysis: only for milestone-level deliverables

---

## 7) Definition of done (global)

A task is done only when all are true:

- Acceptance criteria met (defined in project profile)
- Tests added/updated and passing
- Docs updated if behavior changed
- Handoff posted (quick or full, per §5)
- Status marked `Ready for review` or `Ready for merge`

---

## 8) Session kickoff checklist

Run at the start of every collaborative session:

- [ ] Confirm lane boundaries and file ownership (project profile §3)
- [ ] Confirm shared contract/schema exists with tests, or create it first
- [ ] Initialize WORKLOG with pinned status block (one line per agent)
- [ ] Confirm handoff format expectations (quick vs full thresholds)
- [ ] Confirm acceptance criteria and risk tier (project profile §1)
- [ ] Commit to closing retro at milestone end (§9)

---

## 9) Retrospective

Every milestone closes with a retrospective document (`docs/COLLAB_RETRO.md`). Previous retros are archived as `COLLAB_RETRO_v<N>.md`.

Minimum retro content:

```text
Wins: <what worked>
Risks: <what was risky>
Surprises: <what was unexpected>
Repeat: <what to do again>
Change: <what to do differently>
```

Detailed retros may expand with cross-agent comparison, metrics, and protocol recommendations. Review previous retros before changing the protocol.

---

## 10) Versioning

- The protocol index (`COLLAB_PROTOCOL.md`) maintains the version history table
- Archive old protocol versions as `COLLAB_PROTOCOL_v<N>.md`
- Archive retros as `COLLAB_RETRO_v<N>.md`
- Bump protocol major version only when invariant rules (§3) change
- Link to the relevant retro from each version history row when available
