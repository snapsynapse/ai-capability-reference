# AI Feature Tracker

**Community-maintained tracker of AI feature availability across subscription tiers.**

🔗 **[View the Dashboard](https://snapsynapse.github.io/ai-feature-tracker)**

---

## What is this?

A single source of truth for answering questions like:
- "Is ChatGPT Agent Mode available on the $8/mo plan?" (No, Plus or higher)
- "Can I use Claude Cowork on Windows?" (Not yet, macOS only)
- "Which local models can I run on my hardware?" (Depends on VRAM)

Built for fellow AI facilitators, educators, designers, and anyone who needs accurate, current information about AI tool availability.

## Platforms Covered

| Platform | Vendor | Features Tracked |
|----------|--------|------------------|
| **ChatGPT** | OpenAI | Agent Mode, Custom GPTs, Voice, Atlas, DALL-E, Deep Research, Codex |
| **Claude** | Anthropic | Code, Cowork, Projects, Artifacts, Extended Thinking, Vision |
| **Copilot** | Microsoft | Office Integration, Designer, Vision, Voice |
| **Gemini** | Google | Advanced, NotebookLM, AI Studio, Deep Research, Gems, Workspace, Imagen, Live |
| **Perplexity** | Perplexity AI | Comet, Agent Mode, Pro Search, Focus, Collections, Voice |
| **Grok** | xAI | Chat, Aurora (images), DeepSearch, Think Mode, Voice |
| **Local Models** | Various | Llama, Mistral, DeepSeek, Qwen, Codestral |

## Features

- **Plan-by-plan availability** — See exactly which tier unlocks each feature
- **Platform support** — Windows, macOS, Linux, iOS, Android, web, terminal, API
- **Talking points** — Ready-to-use sentences for presentations (click to copy)
- **Category filtering** — Voice, Coding, Research, Agents, and more
- **Price tier filtering** — Find features at your budget
- **Provider toggles** — Focus on specific platforms
- **Dark/light mode** — Toggle for your preference
- **Permalinks** — Link directly to any feature with shareable URLs
- **Shareable URLs** — Filter state preserved in URL parameters
- **Community maintained** — Submit PRs to keep it current

## Accessibility

This site is designed to meet WCAG 2.1 AA standards:

- **Keyboard navigation** — Full keyboard support with ↑/↓/j/k to navigate cards, Enter to copy, Tab to move between interactive elements
- **Skip link** — "Skip to main content" link for screen reader users (visible on focus)
- **Focus indicators** — Clear 2px accent-colored outlines on all interactive elements
- **Color contrast** — Minimum 4.5:1 contrast ratio for all text in both light and dark modes
- **Reduced motion** — Animations and transitions disabled when `prefers-reduced-motion` is enabled
- **Touch targets** — Minimum 44px touch targets on mobile for easier tapping
- **ARIA attributes** — Live regions announce filter count changes, decorative images marked with `aria-hidden`
- **Semantic HTML** — Proper heading hierarchy, landmark regions, and button/link semantics

## How to Contribute

Found outdated info? Want to add a feature? See [CONTRIBUTING.md](CONTRIBUTING.md).

Quick version:
1. Edit the relevant file in `data/platforms/`
2. Include a source link
3. Submit a PR

## Automated Verification

This project includes an automated feature verification system that uses multiple AI models to cross-reference all feature data.

### What gets verified

- **Pricing tiers** — Which subscription plans have access
- **Platform availability** — Windows, macOS, Linux, iOS, Android, web, terminal, API
- **Status** — GA, Beta, Preview, Deprecated
- **Gating** — Free, Paid, Invite-only, Org-only
- **Regional availability** — Global vs region-restricted features
- **URLs** — Feature page links are valid and accessible

### How it works

1. **Multi-model cascade** — Queries Gemini, Perplexity, Grok (X/Twitter), and Claude
2. **Bias prevention** — Skips same-provider models (e.g., won't ask Gemini about Google features)
3. **Consensus required** — Needs 3 models to confirm a change before flagging
4. **Auto-changelog** — Confirmed changes are logged to each feature's changelog
5. **Human review** — Creates issues/PRs for review, never auto-merges

### Running verification

```bash
# Verify all features
node scripts/verify-features.js

# Verify a specific platform
node scripts/verify-features.js --platform claude

# Check only stale features (>30 days since last check)
node scripts/verify-features.js --stale-only

# Dry run (no issues created)
node scripts/verify-features.js --dry-run
```

### Link checking

Two link checkers serve different purposes:

**CI checker** (`check-links.js`) — runs in GitHub Actions weekly. Uses HTTP requests, so sites with Cloudflare/bot protection show as "bot-blocked" (not reported as broken). Good for catching real 404s and server errors.

```bash
node scripts/check-links.js              # Check all links
node scripts/check-links.js --broken-only # Show only broken links
```

**Browser checker** (`check-links-browser.js`) — runs locally through a real Chrome browser via [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/). Bypasses all bot protection, captures page titles for content verification, and shows redirects. Zero external dependencies.

```bash
# Terminal 1: Start Chrome with remote debugging
# (--user-data-dir avoids conflicts with your normal browser session)

# macOS (Chrome)
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-link-check

# macOS (Brave, Edge, or any Chromium browser also works)

# Linux
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-link-check

# Terminal 2: Run the checker
node scripts/check-links-browser.js                # All platforms
node scripts/check-links-browser.js -p claude       # One platform
node scripts/check-links-browser.js --help          # All options
```

Requires API keys (verification only): `GEMINI_API_KEY`, `PERPLEXITY_API_KEY`, `XAI_API_KEY`, `ANTHROPIC_API_KEY`

See [VERIFICATION.md](VERIFICATION.md) for full documentation.

## Local Development

```bash
# Clone the repo
git clone https://github.com/snapsynapse/ai-feature-tracker.git
cd ai-feature-tracker

# Build the dashboard
node scripts/build.js

# Open it
open docs/index.html
```

## Data Format

Platform data is stored in simple markdown files. Example:

```markdown
## Feature Name

| Property | Value |
|----------|-------|
| Category | agent |
| Status | ga |

### Availability

| Plan | Available | Limits | Notes |
|------|-----------|--------|-------|
| Free | ❌ | — | Not available |
| Plus | ✅ | 40/month | Message limit |

### Talking Point

> "Your presenter-ready sentence with **key details bolded**."

### Sources

- [Official docs](https://example.com)
```

See [data/_schema.md](data/_schema.md) for the full specification.

## Deployment

The site auto-deploys via GitHub Actions when changes are pushed to `main`.

### How it works

1. **Build job** (`.github/workflows/build.yml`)
   - Runs `node scripts/build.js` to regenerate `docs/index.html` and `docs/about.html`
   - If output changed, commits it back to `main` with `[skip ci]` to prevent loops
   - Runs on both pushes and PRs (PRs only validate the build, no commit)

2. **Deploy job** (same workflow)
   - Uploads `docs/` folder to GitHub Pages
   - Only runs on pushes to `main`, not PRs

3. **FTP deploy** (`.github/workflows/deploy-ftp.yml`)
   - Parallel deployment to snapsynapse.com via locked ftp
   - Requires `FTP_HOST`, `FTP_USER`, `FTP_PASS` secrets

### GitHub Pages setup

To enable GitHub Pages on a fork:

1. Go to **Settings → Pages**
2. Under "Build and deployment", select **GitHub Actions**
3. The workflow will deploy to `https://<username>.github.io/ai-feature-tracker/`

### Manual build

```bash
node scripts/build.js
```

Output files:
- `docs/index.html` — Main dashboard
- `docs/about.html` — About page (generated from README.md)

## License

MIT - see [LICENSE](LICENSE)

## Credits

Created by [SnapSynapse](https://snapsynapse.com) for the AI training community.
With help from Claude Code, of course.

---

**Found an error?** [Open an issue](https://github.com/snapsynapse/ai-feature-tracker/issues) or submit a PR!
