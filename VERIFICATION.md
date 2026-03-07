# Automated Feature Verification System

This document describes the automated system for verifying feature data across all tracked AI platforms, including pricing tiers, platform availability, status, gating, regional availability, and URLs.

## Overview

The verification system uses a **multi-model AI cascade** to cross-reference feature data against multiple independent sources. This approach ensures high-confidence verification while avoiding provider bias.

### Key Principles

1. **Consensus-based** - Requires 3 independent AI models to confirm a change before flagging
2. **Bias-resistant** - Never asks a provider to verify their own features
3. **Cost-efficient** - Stops early if no changes detected
4. **Human-in-the-loop** - Creates PRs/issues for review, never auto-merges

## The Verification Cascade

### Model Order

The system queries AI models in this order:

| Order | Model | Provider | Search Capability |
|-------|-------|----------|-------------------|
| 1 | Gemini Flash | Google | Web search |
| 2 | Perplexity | Perplexity AI | Native web search |
| 3 | Grok | xAI | X/Twitter search only |
| 4 | Claude | Anthropic | Web search |

### Skip Rules (Bias Prevention)

When verifying a feature, the system skips the model from the same provider:

| Verifying Platform | Skip Model |
|-------------------|------------|
| Gemini (Google) | Gemini Flash |
| Perplexity | Perplexity |
| Grok (xAI) | Grok |
| Claude (Anthropic) | Claude |
| ChatGPT (OpenAI) | *(none - no OpenAI model in cascade)* |
| Copilot (Microsoft) | *(none - no Microsoft model in cascade)* |
| Local Models | *(none)* |

### Cascade Logic

```
For each feature to verify:

1. BUILD CASCADE
   └─ Remove same-provider model from list

2. QUERY FIRST MODEL
   ├─ Ask about: pricing tiers, surfaces, status, gating, regional, URL, recent changes
   └─ Compare response to stored data

3. EVALUATE RESULT
   ├─ NEGATIVE (no change) → STOP, update Checked date
   └─ POSITIVE (change detected) → confirmations = 1, continue

4. QUERY SUBSEQUENT MODELS
   ├─ POSITIVE (agrees) → confirmations++
   ├─ NEGATIVE (disagrees) → CONTRADICTION → flag for manual review
   └─ DIFFERENT VALUE → CONTRADICTION → flag for manual review

5. STOP WHEN
   ├─ 3 models confirm same change → CONFIRMED, create PR
   ├─ Contradiction detected → create Issue for manual review
   └─ Cascade exhausted → create Issue as "unconfirmed"
```

### Result Definitions

| Result | Meaning | Action |
|--------|---------|--------|
| **Positive** | Model detected a change from stored data | Continue cascade |
| **Negative** | Model confirms data matches (no change) | Stop cascade, data is current |
| **Contradiction** | Models disagree with each other | Flag for manual review |

## What Gets Verified

For each feature, the system verifies:

| Field | Description | Example |
|-------|-------------|---------|
| **Pricing Tiers** | Which plans have access | Free ❌, Plus ✅, Pro ✅ |
| **Surfaces** | Platform availability | Windows, macOS, iOS, Android, web, API |
| **Status** | Release status | GA, Beta, Preview, Deprecated |
| **Gating** | Access type | Free, Paid, Invite, Org-only |
| **Limits** | Usage restrictions | "40/month", "Unlimited" |
| **Regional** | Geographic availability | "US only", "Global", "Not available in EU" |
| **URL** | Official feature page | Valid and accessible URL |

### Query Template

Each model receives a query like:

```
For [Platform]'s "[Feature Name]" feature, please verify the current:

1. Pricing tier availability:
   - Which subscription plans have access? (e.g., Free, Plus, Pro, Team, Enterprise)
   - What are the usage limits per tier?

2. Platform/surface availability:
   - Available on: Windows, macOS, Linux, iOS, Android, web, terminal, API?

3. Current status:
   - Is it GA (generally available), Beta, Preview, or Deprecated?

4. Access gating:
   - Is it free, paid-only, invite-only, or org-only?

5. Regional availability:
   - Is this feature available globally or restricted to certain regions?
   - Any country-specific limitations?

6. Official URL:
   - What is the official product/feature page URL?
   - Is it still active and accessible?

7. Recent changes:
   - Any announcements or changes in the last 30 days?

Please cite official sources where possible.
```

## Triggering Verification

### Manual Trigger

```bash
# Verify all features across all platforms
node scripts/verify-features.js

# Verify a specific platform
node scripts/verify-features.js --platform claude

# Verify a specific feature
node scripts/verify-features.js --platform chatgpt --feature "Agent Mode"

# Dry run (no PRs/issues created)
node scripts/verify-features.js --dry-run
```

### Scheduled (GitHub Actions)

The workflow runs automatically:
- **Weekly** (Sundays at 00:00 UTC) - Full verification of all features
- **Manual** - Trigger via GitHub Actions "Run workflow" button

### Staleness Check

A lightweight check runs daily to identify features with `Checked` date > 7 days old:

```bash
node scripts/verify-features.js --stale-only
```

This creates an issue listing stale features without running the full cascade.

## Output

### When Changes Confirmed (3+ positives)

Creates a **Pull Request** with:
- Updated markdown files in `data/platforms/`
- Summary of changes in PR description
- Model responses as evidence
- Links to sources cited by models

### When Contradiction Detected

Creates an **Issue** with:
- Label: `verification-conflict`
- All model responses for comparison
- Request for manual review
- Links to official pricing/docs pages

### When Cascade Exhausted

Creates an **Issue** with:
- Label: `verification-inconclusive`
- Available model responses
- Request for manual verification

### When No Changes

- Updates `Checked` date in feature's Property table (auto-committed)
- Updates `Verified` date in feature's Property table (auto-committed)
- No PR or Issue created (silent success)

## Automatic Changelog Updates

When changes are **confirmed** (3 models agree), the system automatically adds entries to each affected feature's `### Changelog` section.

### Changelog Entry Format

```markdown
### Changelog

| Date | Change |
|------|--------|
| 2026-01-29T12:00Z | [Verified] pricing: Free tier now available; status: Changed from Beta to GA |
```

### How It Works

1. When the cascade confirms a change, all proposed changes are combined into a single entry
2. The entry is prefixed with `[Verified]` to distinguish AI-verified changes from manual edits
3. If no changelog section exists, one is created automatically before the Sources section
4. New entries are added at the top of the table (most recent first)

## Date Update Behavior

The verification system automatically manages two date fields per feature:

| Date Field | When Updated | Requires PR? |
|------------|--------------|--------------|
| **Checked** | Every time a feature is verified, regardless of outcome | No (auto-committed) |
| **Verified** | Only when verification confirms NO changes | No (auto-committed) |

### Automatic Updates (No PR)

- **Checked**: Updated to today's date whenever verification runs, even if changes are detected or the result is inconclusive. This tracks "when was this last looked at?"
- **Verified**: Updated to today's date ONLY when the cascade confirms the stored data is accurate (NO_CHANGE result). This tracks "when was this last confirmed correct?"

### Manual Updates (Via PR)

When changes are **confirmed** (3 models agree on a change):
- The `Verified` date should be updated as part of the PR that implements the changes
- This ensures `Verified` only reflects dates when data was known to be accurate

### Example Timeline

```
Jan 1:  Feature verified, no change → Checked=Jan 1, Verified=Jan 1
Jan 8:  Feature verified, change detected → Checked=Jan 8, Verified=Jan 1 (unchanged)
Jan 10: PR merged with fix → Checked=Jan 10, Verified=Jan 10 (updated in PR)
Jan 15: Feature verified, no change → Checked=Jan 15, Verified=Jan 15
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google AI Studio API key |
| `PERPLEXITY_API_KEY` | Yes | Perplexity API key |
| `XAI_API_KEY` | Yes | xAI API key for Grok |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key |
| `GITHUB_TOKEN` | For CI | Auto-provided in GitHub Actions |

### Config File

Optional `scripts/verification.config.json`:

```json
{
  "schedule": {
    "full_verification": "weekly",
    "staleness_check": "daily",
    "staleness_threshold_days": 30
  },
  "cascade": {
    "required_confirmations": 3,
    "models": ["gemini", "perplexity", "grok", "claude"]
  },
  "output": {
    "create_pr": true,
    "create_issues": true,
    "update_checked_dates": true
  },
  "rate_limits": {
    "delay_between_queries_ms": 1000,
    "max_features_per_run": 100
  }
}
```

## File Structure

```
scripts/
├── verify-features.js       # Main entry point / orchestrator
├── check-links.js           # Dead link checker CLI
└── lib/
    ├── cascade.js          # Cascade logic and flow control
    ├── ai-clients.js       # API wrappers for each AI model
    ├── parser.js           # Parse markdown data files
    ├── file-updater.js     # Update dates and changelogs in markdown files
    ├── link-checker.js     # URL extraction utilities for platform/feature/source links
    ├── link-schema.js      # Canonical link check result contract (categories + validation)
    ├── link-engine.js      # Retry/classify engine with 403 soft-block policy
    └── reporter.js         # Generate PRs, issues, reports

.github/
├── workflows/
│   ├── verify-features.yml  # Scheduled + manual verification workflow
│   └── check-links.yml      # Scheduled + manual link checking workflow
└── ISSUE_TEMPLATE/
    ├── verification_conflict.md
    └── verification_inconclusive.md
```

## Link Checker

A separate link checking system validates all URLs in the feature data (pricing pages, feature URLs, source links).

### Running Link Checker

```bash
# Check all links
node scripts/check-links.js

# Check specific platform
node scripts/check-links.js --platform claude

# Show only broken links
node scripts/check-links.js --broken-only

# Verbose output
node scripts/check-links.js --verbose
```

Current category model used by `check-links.js`:

- `ok`
- `broken`
- `soft-blocked` (informational, not auto-broken)
- `rate-limited` (informational)
- `timeout`
- `needs-manual-review`

### Scheduled Runs

The link checker runs weekly on **Saturdays at 00:00 UTC** (the day before feature verification on Sundays). If actionable problems are found (broken links/timeouts), an issue is automatically created with the affected URLs.

## How Grok (X/Twitter) Helps

While other models search the web, Grok searches X/Twitter. This is valuable because:

1. **Early announcements** - Companies often tweet about changes before updating docs
2. **Official accounts** - @OpenAI, @AnthropicAI, @GoogleAI, @xaboratory, @peraboratoryai
3. **Real-time data** - Catches very recent changes
4. **Community signals** - User reports of changes or issues

Example Grok query:
```
Search X/Twitter for recent posts from @AnthropicAI about Claude Projects
pricing or availability changes in the last 30 days.
```

## Example Verification Run

```
$ node scripts/verify-features.js --platform claude --feature "Projects"

🔍 Verifying: Claude → Projects

Building cascade: [Gemini, Perplexity, Grok] (Claude skipped - same provider)

[1/3] Querying Gemini Flash...
      Response: "Claude Projects available on Pro ($20/mo) and Team.
                 Free tier has read-only access as of Jan 2026."
      Stored:   "Pro ✅, Team ✅, Free ❌"
      Result:   POSITIVE (change detected: Free tier now has limited access)
      Confirmations: 1

[2/3] Querying Perplexity...
      Response: "According to claude.ai/pricing, Projects are available on
                 Pro and Team plans. Free users can view shared projects
                 but not create their own."
      Result:   POSITIVE (confirms change)
      Confirmations: 2

[3/3] Querying Grok (X/Twitter)...
      Response: "@AnthropicAI tweeted on Jan 15: 'Projects now viewable
                 by Free users! Create your own on Pro or Team.'"
      Result:   POSITIVE (confirms change with source)
      Confirmations: 3

✅ CHANGE CONFIRMED (3/3 models agree)

Creating PR with changes:
  - data/platforms/claude.md
    - Projects: Free tier → ⚠️ (read-only)
    - Added changelog entry
    - Updated Verified date

PR created: #47 "Update Claude Projects free tier availability"
```

## Limitations

1. **API costs** - Each verification run consumes API credits across 4 providers
2. **Rate limits** - Models have rate limits; large verification runs are throttled
3. **Search accuracy** - AI search can hallucinate; that's why we require 3 confirmations
4. **X/Twitter scope** - Grok only searches X, may miss announcements on other platforms
5. **Regional differences** - Models may not catch region-specific availability

## Troubleshooting

### "API key not configured"
Ensure all required environment variables are set. For local runs:
```bash
export GEMINI_API_KEY="your-key"
export PERPLEXITY_API_KEY="your-key"
export XAI_API_KEY="your-key"
export ANTHROPIC_API_KEY="your-key"
```

### "Rate limit exceeded"
Increase `delay_between_queries_ms` in config or wait and retry.

### "Cascade exhausted with no consensus"
This means models disagreed or were inconclusive. Review the created issue manually.

### "Model returned empty response"
Check API key validity and quota. The system will skip failed models and continue.

## Contributing

To improve the verification system:

1. **Better prompts** - Edit query templates in `scripts/lib/ai-clients.js`
2. **New models** - Add to cascade in `scripts/lib/cascade.js`
3. **Output formats** - Modify `scripts/lib/reporter.js`

See [CONTRIBUTING.md](CONTRIBUTING.md) for general contribution guidelines.
