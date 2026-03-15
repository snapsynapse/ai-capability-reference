---
name: weekly-roundup
description: >
  Draft the weekly AI Capability Reference roundup post for LinkedIn.
  Use this skill when it is time to write the Tuesday roundup, when
  the user says "draft the roundup," "Tuesday post," "what changed
  this week," or asks for a LinkedIn post summarizing recent capability
  reference updates. Also trigger when the user asks to log a published
  roundup or review the roundup cadence. This skill reads scan results,
  selects the right template, drafts a Post Protocol-compliant post,
  and logs publication to LocalBrain.
metadata:
  skill_bundle: weekly-roundup
  file_role: skill
  version: 1
  version_date: 2026-03-15
  previous_version: null
  change_summary: >
    Initial version. Covers template selection, drafting, compliance,
    and post-publish logging.
---

# Weekly Roundup Skill

## Purpose

Automate the Tuesday LinkedIn roundup for the AI Capability Reference.
This skill handles four jobs:

1. Read scan results and identify what changed this week.
2. Select the right post template based on the week's changes.
3. Draft a Post Protocol-compliant LinkedIn post.
4. Log publication to LocalBrain after posting.


## Dependencies

This skill depends on two reference files. Read both before drafting.

- `references/post-protocol-extract.md` -- the subset of the Post
  Protocol that governs this post slot (lane, packaging order,
  compliance rules, measurement).
- `references/roundup-templates.md` -- the three roundup templates
  with selection criteria and a worked example.

The shared LinkedIn voice profile lives in the `linkedin-post` skill.
If that skill is available, defer to its voice reference and compliance
check. If not, `references/post-protocol-extract.md` contains the
minimum rules needed to draft compliantly.


## Workflow

### Step 1: Gather changes

Identify what changed since the last roundup. Sources, in priority
order:

1. GitHub issues closed since last Tuesday (label: scanner, verification,
   or manual). Use `gh issue list --state closed --since <date>` if
   available, or ask the user.
2. Git log of commits to `data/` since last Tuesday.
3. User's verbal summary of what they updated.

If no structured source is available, ask the user: "What changed in
the capability reference this week?" Do not draft without changes.

If nothing changed, say so. A week with no changes means no roundup
post. Do not invent content.


### Step 2: Select template

Read `references/roundup-templates.md`. Three templates exist:

- **Changes-first** (default): Use when there are 2+ concrete
  platform changes to report. Leads with specifics.
- **Pattern-focused**: Use when the week's changes reveal a trend
  or pattern across platforms (e.g., multiple providers expanding
  free tiers, or a wave of GA promotions). Leads with the tension.
- **Shortest-viable**: Use when the user signals low energy, when
  changes are minor, or when there are fewer than 2 notable changes.
  Keeps the streak alive.

Selection rules:

- 3+ notable changes across 2+ platforms --> changes-first
- 2+ changes that share a pattern --> pattern-focused
- 1 change or minor updates only --> shortest-viable
- User says "keep it short" or similar --> shortest-viable

Present the selection and rationale before drafting. The user may
override.


### Step 3: Draft the post

Follow these rules in order:

1. Read the linkedin-post skill's voice reference if available.
   Otherwise read `references/post-protocol-extract.md`.

2. Apply the selected template from
   `references/roundup-templates.md`.

3. The post must fit the **Bridge** lane (AI onramps for humans,
   practical enablement).

4. Apply packaging order:
   a. Expensive failure (what goes wrong if you miss this)
   b. Human behavior under pressure (how trainers/buyers get burned)
   c. Instrument (the tracker as the verification tool)
   d. Smallest fix (bookmark it, check before your next session)

   Not every element needs to be explicit. The packaging order is a
   bias, not a checklist. The changes-first template naturally
   foregrounds the instrument. The pattern-focused template
   naturally foregrounds the expensive failure.

5. The capability reference link goes at the end of the post,
   inline. Never in comments.

6. Hashtags: exactly 2. Default: #AIStrategy #FutureOfWork.
   Swap one if the week's changes strongly fit a different lane
   (e.g., #AIGovernance for policy-relevant changes).

7. CTA: one only. For changes-first and shortest-viable, the link
   is the CTA. For pattern-focused, a precise question is
   acceptable as an alternative.

Present 2 draft options using the selected template but with
different hook angles. The user picks one.


### Step 4: Compliance check

Run this check on the selected draft before delivering. If the
linkedin-post skill is available, use its full compliance check
instead.

Checks (fail if any violated):

- Plaintext only (no markdown emphasis)
- No em dashes
- No emoji
- No bold, no italics
- Paragraphs scannable (1-3 sentences each)
- First 2 lines work as standalone preview above the fold
- One primary signal
- No hype or guru language
- No influencer patterns ("Here are 7 things...")
- Link at end of post, inline
- Hashtags at end, 2 only
- Character count 900-1,300
- CTA is not needy
- Lane is Bridge
- Packaging order is present as bias

Report: "Compliance: pass" or list violations and fix them before
delivering.


### Step 5: Log publication

After the user confirms the post has been published, log it to
LocalBrain using the `log_published` tool:

- title: "AI Capability Reference Weekly Roundup - [date]"
- channel: linkedin
- company: paice
- content_type: promo
- description: One-line summary of what the post covered

If LocalBrain is not available, append to the daily note instead.

If neither is available, remind the user to log it manually.


## Quick Reference

| Item | Value |
|---|---|
| Post slot | Tuesday 10 AM MT |
| Lane | Bridge |
| Hashtags | #AIStrategy #FutureOfWork |
| Character target | 900-1,300 |
| Link placement | End of post, inline |
| Templates | changes-first, pattern-focused, shortest-viable |
| Scan cadence | Monday evening, Thursday evening |
| Log tool | localbrain:log_published |
