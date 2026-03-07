---
title: Capability Scanner — Operations
created: 2026-03-07
updated: 2026-03-07
skill_bundle: capability-scanner
bundle_version: 2.1.0
tags:
  - scanner
  - operations
  - perplexity-computer
---

# Capability Scanner — Operations

This document covers the Perplexity Computer-specific deployment of the `capability-scanner` skill. It is intentionally kept outside the skill bundle so the bundle stays portable across platforms.

For the skill itself, see the canonical source in:

- [src/SKILL.md](/Users/snap/Git/ai-capability-reference/skills/capability-scanner/src/SKILL.md)
- [src/references/GOVERNANCE.md](/Users/snap/Git/ai-capability-reference/skills/capability-scanner/src/references/GOVERNANCE.md)
- [src/references/SCAN_WORKFLOW.md](/Users/snap/Git/ai-capability-reference/skills/capability-scanner/src/references/SCAN_WORKFLOW.md)

## Architecture

```text
capability-scanner skill (portable, platform-agnostic)
  SKILL.md
  references/GOVERNANCE.md
  references/SCAN_WORKFLOW.md
        |
        v
Recurring Task (Perplexity Computer)
  schedule + task instructions + PAT path + logging path
        |
        v
GitHub Issues on snapsynapse/ai-capability-reference
```

## Runtime Files

These files live in the Perplexity Computer workspace, not in the skill bundle or repo.

| File | Path | Purpose |
|---|---|---|
| GitHub PAT | `cron_tracking/capability-scanner/github-token.txt` | Fine-grained token for issue creation |
| Scan log | `cron_tracking/capability-scanner/scan-log.md` | Append-only history of every scan |
| Fallback findings | `cron_tracking/capability-scanner/findings.md` | Created only when GitHub API is unavailable |

### GitHub PAT Details

| Property | Value |
|---|---|
| Token name | `perplexity-ai-capability-tracker` |
| Scope | `snapsynapse/ai-capability-reference` only |
| Permission | Issues — Read and write |
| Private repo access | None |
| Method | `curl` against GitHub REST API (not the Perplexity GitHub connector) |

## Common Operations

### Run a scan now

> Load the capability-scanner skill and run a scan now

### Assess a specific announcement

> Load the capability-scanner skill and assess [paste or describe the announcement]

### Change the scan frequency

> Change the AI Capability Reference Scanner to run [daily / weekly / every N days]

### Refresh the GitHub token

1. Go to [github.com/settings/tokens?type=beta](https://github.com/settings/tokens?type=beta)
2. Generate a new token:
   - Repository: `snapsynapse/ai-capability-reference` only
   - Permission: Issues — Read and write
   - Everything else: No access
3. Tell Perplexity Computer:

> Update the capability-scanner GitHub token to [new token]

### Update the skill when the repo changes

When the repo's governance docs change, update the canonical skill source and rebuild exports.

Relevant files:

- [SCOPE.md](design/SCOPE.md)
- [ONTOLOGY.md](design/ONTOLOGY.md)
- [CAPABILITY_TAXONOMY.md](design/CAPABILITY_TAXONOMY.md)
- [skills/capability-scanner/src](/Users/snap/Git/ai-capability-reference/skills/capability-scanner/src)

### Stop the scanner

> Delete the AI Capability Reference Scanner scheduled task

## Troubleshooting

### No issues created recently

1. Check `cron_tracking/capability-scanner/scan-log.md`
2. If recent entries show `0 candidates found`, the ecosystem was quiet
3. If no recent entries exist, ask Perplexity Computer to list scheduled tasks

### Scanner created a duplicate issue

The task searches open issues before creating, but keyword matching can miss near-duplicates. Close the duplicate on GitHub and refine the task definition if a pattern emerges.

### Issues seem misaligned with current repo direction

The skill's governance snapshot may be stale relative to the repo. Update the canonical skill source, then rebuild and re-upload the bundle.

### GitHub API errors

| HTTP Status | Meaning | Action |
|---|---|---|
| 401 | Token expired or revoked | Refresh the PAT |
| 403 | Token lacks permission | Recreate with correct scope |
| 404 | Repo path wrong or repo deleted | Verify repo exists and name is correct |
| 422 | Invalid issue body or missing label | Retry without labels or inspect the task definition |

### Skill not found at runtime

Re-upload the generated bundle from:

- [dist/perplexity/capability-scanner.zip](/Users/snap/Git/ai-capability-reference/skills/capability-scanner/dist/perplexity/capability-scanner.zip)

## Maintenance

### Monthly

- Check `scan-log.md` for consistent entries
- Review open `[Scanner]` issues on GitHub
- Verify GitHub PAT expiration and rotate before expiry

### When the Repo's Governance Docs Change

- Update the canonical skill source
- Rebuild exports with `node scripts/build-skill-bundles.js capability-scanner`
- Re-upload the Perplexity bundle if needed

## Design Decision

This file is separate from the skill bundle because it is a Perplexity Computer deployment document, not part of the portable editorial logic.
