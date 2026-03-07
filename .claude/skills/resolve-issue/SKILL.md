---
name: resolve-issue
description: Triage and resolve a verification issue from the AI feature tracker. Reads the GitHub issue, compares against current data, researches if needed, updates data files, and closes the issue with an audit comment.
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

### Step 2: Read current data

Read the relevant `data/platforms/<platform>.md` file. Identify the feature section that matches the issue.

### Step 3: Assess — apply these heuristics IN ORDER

**Close immediately as duplicate if:**
- An older `verification-inconclusive` issue exists for the same feature AND a newer `verification-conflict` issue also exists. Close the older one with comment: "Superseded by #[newer]. Consolidating to the newer issue."

**Close with no data change (bump Checked date only) if:**
- Both models agree on the facts but the "conflict" is about phrasing or terminology
- One model (usually Perplexity) says "insufficient sources" but the other confirms our existing data is correct
- The flagged change is an incremental UX improvement, not a change to status, gating, pricing tiers, platform availability, or regional availability
- The issue asks about a feature that IS correctly reflected in our data

**Research and update data if:**
- A model reports a genuine change to: gating (free/paid), plan availability, platform support, status (ga/beta/preview/deprecated), or regional availability
- Both models report something different from what our data says
- One model makes a specific, sourced claim that contradicts our data

### Step 4: Research (only if needed)

When research is needed, check official sources first:
1. Fetch the feature's official URL from the data file
2. Use Perplexity via curl for broader search:
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

- **Never update Claude/Anthropic data based on your own knowledge.** Always verify against official sources. You ARE Claude — this is a conflict of interest.
- **Always present your assessment to the user before making changes** if the issue requires data updates. For no-change closes and duplicate closes, proceed directly.
- **The talking point must be presenter-ready.** It's used in a classroom setting. Bold the key access/pricing info.
- **Changelog entries are reverse chronological** — newest at top.
- **Don't forget to update `last_verified` in the frontmatter** if you're updating any feature for that platform.
