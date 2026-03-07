# Contributing to AI Capability Reference

Thank you for helping keep this resource accurate! This guide explains how to contribute.

## Types of Contributions

### 1. Update Existing Information

The most common contribution - something changed:
- A feature became available on a new plan tier
- Pricing changed
- Platform support expanded
- A feature entered or exited beta

### 2. Add a New Feature

A platform released something new that should be tracked.

### 3. Add a New Platform

Want to add Grok, DeepSeek, Mistral, or another AI platform? Go for it!

### 4. Fix Errors

Found incorrect information? Please fix it!

## How to Contribute

### Step 1: Find the Right File

Platform data lives in `data/platforms/`:
- `chatgpt.md` - OpenAI ChatGPT
- `claude.md` - Anthropic Claude
- `perplexity.md` - Perplexity AI
- `gemini.md` - Google Gemini
- `copilot.md` - Microsoft Copilot

### Step 2: Make Your Changes

Follow the format in [data/_schema.md](data/_schema.md). Key points:

**For updating availability:**
```markdown
### Availability

| Plan | Available | Limits | Notes |
|------|-----------|--------|-------|
| Free | ❌ | — | Not available |
| Plus | ✅ | 40/month | Message limit |
```

Use these symbols:
- ✅ = Available
- ❌ = Not available
- 🔜 = Coming soon (announced)
- ⚠️ = Partial / with caveats

**For updating talking points:**
```markdown
### Talking Point

> "Write your presenter-ready sentence here. Use **bold** for key details like pricing or restrictions."
```

### Step 3: Add Sources

Every change needs a source. Add or update the Sources section:

```markdown
### Sources

- [Official announcement](https://example.com/blog/announcement)
- [Help documentation](https://help.example.com/article)
```

Acceptable sources:
- Official product pages, blogs, or announcements
- Official help/support documentation
- Official status pages
- Reputable tech news (for breaking changes)

**Not acceptable:** Reddit posts, tweets (unless from official accounts), personal blogs

### Step 4: Update `last_verified`

In the frontmatter, update the verification date:

```yaml
---
name: ChatGPT
last_verified: 2026-01-25  # Update this!
---
```

### Step 5: Test Locally

```bash
node scripts/build.js
open docs/index.html
```

Verify:
- Your feature appears correctly
- Availability badges show right
- Talking point displays properly
- No build errors

### Step 6: Submit a Pull Request

1. Fork and clone the repo
2. Create a branch: `git checkout -b update-chatgpt-agent-limits`
3. Make your changes
4. Commit with a clear message: `Update ChatGPT Agent Mode limits (Plus: 40→50/month)`
5. Push and open a PR

## Pull Request Guidelines

### PR Title Format

```
[Platform] Brief description

Examples:
[ChatGPT] Update Agent Mode limits
[Claude] Add Cowork Windows availability
[Perplexity] Fix Comet iOS status
[New] Add Grok platform
```

### PR Description

Include:
- What changed
- Link to official source
- Any context (when did this change happen?)

### Review Process

1. Maintainers will verify your source
2. We may ask for clarification
3. Once approved, we'll merge
4. GitHub Actions auto-rebuilds the site

## Adding a New Platform

1. Create `data/platforms/newplatform.md`
2. Follow the schema format exactly
3. Include at least the main features
4. Add the status page URL to the frontmatter
5. Run `node scripts/build.js` to verify

## Adding a New Feature

1. Find the platform file
2. Add a new section after the last `---`
3. Include all required fields:
   - Name (## heading)
   - Category and Status table
   - Availability by plan
   - Platforms
   - Regional notes
   - Talking point
   - Sources

## Code of Conduct

- Be accurate - verify before submitting
- Be helpful - good PRs include good sources
- Be patient - maintainers are volunteers
- Be respectful - we're all here to help

## Questions?

Open an issue with the `question` label or reach out to maintainers.

---

Thank you for contributing! 🎉
