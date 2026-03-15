---
name: resolve-issue
description: Triage and resolve a verification issue from the AI Capability Reference. Reads the GitHub issue, compares against current data, researches if needed, updates data files, and closes the issue with an audit comment.
argument-hint: [issue-number or "batch" platform-name]
allowed-tools: Bash, Read, Edit, Write, Grep, Glob, WebFetch, Task
---

## Resolve AI Capability Reference Issue

You are resolving verification issues for the AI Capability Reference project at `/Users/snap/Git/ai-capability-reference`.

### Context

This project tracks AI product features across platforms (ChatGPT, Claude, Gemini, Grok, Copilot, Perplexity, local/open models). An automated verification pipeline queries multiple LLMs and creates GitHub issues when models disagree or can't reach consensus. Your job is to resolve these issues by checking the facts and updating the data.

**Data files:** `data/platforms/<platform>.md` (markdown with frontmatter, tables, and changelog)
**Issue types:**
- `verification-inconclusive` — models couldn't reach 3/3 consensus
- `verification-conflict` — models actively disagreed
- `broken-links` — URL validation failures

### Arguments

- Single issue: `/resolve-issue 123` — resolve issue #123
- Batch mode: `/resolve-issue batch claude` — resolve all open issues for a platform

---

### Step 1: Fetch the issue

```
gh issue view $ARGUMENTS --repo snapsynapse/ai-capability-reference --json number,title,body,labels
```

For batch mode, list all open issues for the platform:
```
gh issue list --repo snapsynapse/ai-capability-reference --state open --search "<platform>" --json number,title,labels
```

**Batch workflow:** When resolving multiple issues for a platform, read all the issues and the data file once, then write a structured assessment document before making any changes. This lets you spot cross-issue patterns and present everything to the user in one pass. Use this format:

```markdown
# Batch Assessment — [Platform]
**Date:** YYYY-MM-DD
**Issues:** #N, #N, #N

---
## Issue #N — Feature Name
**Conflict:** [one-line summary of what the models disagreed on]

### Internal Consistency Check
- [findings from Step 2]

### Research Findings
- [what external research revealed, or "Unavailable — API outage" with fallback analysis]

### Assessment
**Resolution: [No change / Data update / Duplicate]** (Confidence: High/Medium/Low)
[reasoning]

### Proposed Changes
[numbered list, or "None"]

---
## Summary Table
| Issue | Feature | Resolution | Data Change? | Confidence |
```

Present this document to the user before applying any changes. For no-change closes and duplicates, you can proceed after presenting without waiting for explicit per-issue approval.

### Step 2: Read current data and check internal consistency

Read the relevant `data/platforms/<platform>.md` file. Identify the feature section that matches the issue.

Before assessing the issue itself, scan the feature's data for internal contradictions — these are often more reliable indicators of errors than the model responses:
- Does the **Gating** field match the **availability table**? (e.g., `Gating: paid` but Free tier shows ✅ means one of them is wrong)
- Does the **talking point** match the actual gating/status? (e.g., talking point says "available on all plans" but Gating says `paid`)
- Is the **platforms table** complete? Check whether major surfaces (terminal/CLI, Linux, API) are missing when they plausibly exist for this feature.
- Do the **source URLs** still work? A 404 is worth noting even if it's not the issue being resolved.

### Step 3: Assess — apply these heuristics IN ORDER

**Close immediately as duplicate if:**
- An older `verification-inconclusive` issue exists for the same feature AND a newer `verification-conflict` issue also exists. Close the older one with comment: "Superseded by #[newer]. Consolidating to the newer issue."

**Close with no data change (bump Checked date only) if:**
- One model (usually Perplexity) says "insufficient sources" but the other confirms our existing data is correct
- The flagged change is an incremental UX improvement, not a change to status, gating, pricing tiers, platform availability, or regional availability
- The issue asks about a feature that IS correctly reflected in our data AND the internal consistency check (Step 2) found no contradictions

**Research and update data if:**
- The internal consistency check (Step 2) found contradictions in the data file — even if the models didn't flag them
- A model reports a genuine change to: gating (free/paid), plan availability, platform support, status (ga/beta/preview/deprecated), or regional availability
- Both models report something different from what our data says
- One model makes a specific, sourced claim that contradicts our data
- The models describe a "phrasing/terminology" difference but the underlying facts touch gating, pricing, or platform availability (e.g., "DALL-E 3 vs GPT-4o" may sound like naming but if one model says free and the other says paid, that's a real discrepancy worth investigating)

### Step 4: Research

**For Claude/Anthropic features: ALWAYS research externally.** You are Claude — you cannot objectively assess your own product's data. Every Claude issue must include at least one Perplexity search or official URL fetch, even if the issue looks like an obvious no-change close. This is non-negotiable.

**For all other platforms:** research when Step 3 indicates it's needed, or when the internal consistency check found issues.

**Research hierarchy** — try these in order. If a higher-priority source is unavailable (API error, timeout, outage), fall back to the next level:

1. **Perplexity search** (preferred) — broadest, most current. Use `sonar-pro` model with `search_recency_filter: "month"`.
2. **Official URL fetch** — fetch the feature's URL from the data file directly. Good for confirming specific facts.
3. **Model consensus + internal consistency** — when external research is completely unavailable, you can still assess using the model responses embedded in the issue plus the internal consistency check from Step 2. This is a valid fallback but carries lower confidence.

When falling back to level 3, note it in your assessment and flag the issue for re-verification when research capability is restored. Downgrade your confidence accordingly.

```bash
curl -s -X POST "https://api.perplexity.ai/chat/completions" \
  -H "Authorization: Bearer $(jq -r '.environmentVariables.PERPLEXITY_API_KEY' ~/.claude/settings.json)" \
  -H "Content-Type: application/json" \
  -d '{"model": "sonar-pro", "messages": [{"role": "user", "content": "<QUERY>"}], "web_search_options": {"search_context_size": "high"}, "search_recency_filter": "month"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['choices'][0]['message']['content']); print('---CITATIONS---'); [print(c) for c in d.get('citations',[])]"
```

Frame queries to discover, not confirm: "What is the current state of [feature] in February 2026?" NOT "Is [feature] still GA?"

### Step 5: Update data (only if change confirmed)

Edit the feature section in `data/platforms/<platform>.md`:
- Update the changed fields (status, gating, availability table, platforms table, regional, talking point)
- Set `Verified` to today's date (YYYY-MM-DD format, e.g. `2026-02-17`)
- Set `Checked` to today's date
- Add a changelog entry with `[Verified]` prefix at the TOP of the changelog table:
  ```
  | 2026-02-17T12:00Z | [Verified] Description of what changed |
  ```
- Update the talking point to reflect the new reality
- Add/update source URLs if better ones were found

**If no data change needed**, only bump the `Checked` date.

**Handling temporary state changes** (promotions, trials, limited-time access):
When a feature's availability is temporarily different from its default (e.g., a paid feature with a free promotion), represent the *current* state in the data since that's what users will encounter:
- Keep the **Gating** field at the default/permanent value (e.g., `paid`)
- Set affected availability rows to `⚠️` with a note like `Temporary promotion`
- Update the **talking point** to mention both the default and the temporary state
- Add a **changelog entry** describing the promotion
- The next verification cycle will catch when the promotion ends and revert the rows

### Step 6: Close the issue with audit comment

**For data updates:**
```bash
gh issue close <NUMBER> --repo snapsynapse/ai-capability-reference --comment "$(cat <<'EOF'
**Resolved — data updated.**

Confirmed via [source](URL): description of what was confirmed.

Changes applied to `data/platforms/<platform>.md`:
- field: old → new
- field: old → new
- Verified/Checked dates set to YYYY-MM-DD
EOF
)"
```

**For no-change closes:**
```bash
gh issue close <NUMBER> --repo snapsynapse/ai-capability-reference --comment "$(cat <<'EOF'
**Closed — no data change needed.**

Reason: [why this isn't a real change]. Checked date bumped to YYYY-MM-DD.
EOF
)"
```

**For duplicate closes:**
```bash
gh issue close <NUMBER> --repo snapsynapse/ai-capability-reference --comment "$(cat <<'EOF'
**Closed — superseded by #[newer].** Consolidating to the newer issue.
EOF
)"
```

### Step 7: Report results

After resolving, report to the user:
- Issue number and feature name
- Resolution type (data updated / no change / duplicate)
- What changed (if anything)
- Remaining open issues for the platform (if in batch mode)

---

### Important rules

- **Never update Claude/Anthropic data based on your own knowledge.** You ARE Claude — every Claude issue requires external verification via Perplexity or official URL fetch. Even for no-change closes, you must show evidence from an external source. See Step 4.
- **Always check internal consistency before assessing.** The most common real errors are contradictions within the data file itself (gating vs availability table, talking point vs actual data, missing platform rows). The model responses in the issue are a starting point, not the whole picture.
- **Always present your assessment to the user before making changes** if the issue requires data updates. For no-change closes and duplicate closes, proceed directly.
- **The talking point must be presenter-ready.** It's used in a classroom setting. Bold the key access/pricing info.
- **Changelog entries are reverse chronological** — newest at top.
- **Don't forget to update `last_verified` in the frontmatter** if you're updating any feature for that platform.
- **When closing with no change, be specific about why.** Don't just say "data is correct." Name which fields you verified and what sources you checked. This creates an audit trail.
