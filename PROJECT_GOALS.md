# Project Goals

This document captures the intent, philosophy, and direction of AI Feature Tracker. It exists to help humans and LLMs collaborate on this project with a shared understanding of what we're building and why.

Other docs cover the **how**: [README.md](README.md) (overview), [CONTRIBUTING.md](CONTRIBUTING.md) (workflow), [VERIFICATION.md](VERIFICATION.md) (automated checking), [data/_schema.md](data/_schema.md) (data format). This document covers the **why**.

---

## Origin

This project was built by a single person preparing to teach a class called "AI for Learning & Development." The core pain point: students show up with different AI subscriptions, on different platforms, and nobody — including the instructor — can confidently answer "what do you actually have access to right now?"

This information should be easy to find. It isn't. Vendor pricing pages are optimized for conversion, not clarity. Feature names are marketing constructs. Availability changes constantly. The result is that people trying to *use* AI tools spend unreasonable time just figuring out what they can and can't do.

The project started as a personal reference and became a public dashboard after nobody could point to anything else that already solved this problem.

## Who this is for

People trying to use AI tools. Specifically:

- **Educators and facilitators** who need to know what their students/participants can access
- **Individuals** trying to understand what they're paying for (or what they'd get if they upgraded)
- **Teams** evaluating which AI tools fit their budget and platform constraints
- **Anyone** tired of parsing marketing pages to find a straight answer

This is not aimed at developers building on AI APIs (though the data may be useful to them). The primary audience is people who interact with AI through consumer-facing products.

## Core philosophy

### Useful truth over marketing truth

Vendors describe their products in terms designed to sell. This project describes them in terms designed to be *useful*. That means:

- If a feature is "available" but rate-limited to the point of being impractical, we say so
- If something is technically in "beta" but works reliably, we note that too
- Limits, caveats, and regional restrictions are first-class information, not footnotes

### Accuracy over completeness

It's better to have 7 well-maintained platforms than 20 stale ones. It's better to say "we haven't verified this recently" (via the Checked/Verified date system) than to present outdated information as current.

### Low barriers to contribution

The entire data layer is markdown files. No database, no build dependencies beyond Node.js, no framework to learn. A contributor can fix an error with a single-file PR.

## The information model

The project describes AI tools at three levels of abstraction. All three layers are about *the AI tools themselves* — what they can do, how they're packaged, and what people believe about them.

### Perceptions (what people believe an AI tool can do)

The outermost layer. Common beliefs, misconceptions, and FAQ-shaped questions *about the tools*. "I heard ChatGPT can browse the web now — can it?" or "Is Claude free?" or "Gemini can't handle long documents, right?" Some of these are true, some were true six months ago, and some were never true. This layer meets people where they are — at the level of what they've heard — and routes them to accurate information about what the AI can actually do.

### Capabilities (what an AI tool can actually do)

The middle layer. What the tool is genuinely able to do, described in platform-neutral terms. "Analyze uploaded PDFs," "generate images from text prompts," "execute code in a sandbox," "search the web for current information." These are the underlying abilities that exist across platforms under different names. This layer is organized by what the AI can do, not what any vendor calls it.

### Features (how a vendor packages and gates an AI's capabilities)

The innermost layer and the current data model. Named product features — "Artifacts," "Canvas," "Deep Research," "Custom GPTs" — with per-plan availability, platform support, status, and sourced verification dates. This is vendor-specific: it reflects how each company names, bundles, and restricts access to the underlying capabilities.

### How they relate

The layers stack: perceptions are often about capabilities, capabilities are delivered through features, and features are what the data tracks today. A single capability like "analyze uploaded documents" might surface as perceptions ("Claude is better at long documents"), map to a capability ("PDF/document analysis"), and be tracked as features across platforms ("Vision" on ChatGPT, "File uploads" on Claude, "Document understanding" on Gemini — each with different plan availability and limits).

The features layer exists today. The capabilities and perceptions layers are aspirational and will likely evolve through experimentation.

## Scope

### Current platform criteria

The initial set of 7 platforms was chosen pragmatically: the tools discussed in the class being taught, plus some open-weight models the maintainer uses. There is no formal inclusion/exclusion rubric yet.

Platforms tracked: ChatGPT (OpenAI), Claude (Anthropic), Copilot (Microsoft), Gemini (Google), Perplexity, Grok (xAI), Local Models (Llama, Mistral, DeepSeek, Qwen, Codestral).

### What we track

Consumer-facing AI product capabilities, with emphasis on:

- Which subscription tier unlocks access
- Which operating systems and surfaces are supported
- What limits and caveats apply
- Current release status (GA, beta, preview, deprecated)
- When information was last verified and by whom

### What we don't track

- API-only capabilities (unless they have a consumer-facing interface)
- Enterprise/custom pricing (tracked only as "org-only" gating)
- Model benchmarks or quality comparisons
- Developer tools and SDKs (with the exception of tools like Claude Code that blur the line)

## The feature vs. capability tension

This is an acknowledged design challenge. Some tracked items are clearly product features (e.g., "Custom GPTs," "Artifacts"). Others are closer to capabilities (e.g., "Vision," "Voice Mode"). The data schema uses a `Category` field to group features by capability type (vision, voice, coding, agents, etc.), which partially bridges this gap.

There is no clean answer yet. The current approach is:

1. Track what vendors name and ship (features), since that's what users encounter
2. Use categories to group by underlying capability
3. Move toward a capabilities layer that maps user intent to features across platforms

Contributions that improve the mapping between user intent and vendor features are especially welcome.

## Sustainability

This is an unfunded side project. There is no revenue model and likely never will be. Its value is measured in time saved and confusion reduced for the people who use it.

The aspiration is for it to become community-maintained. Realistically, it currently depends on a single maintainer. The verification cascade, staleness checks, and low-friction contribution model are all designed to reduce the maintenance burden and make community contribution viable — but the project is honest about where it stands.

## Multi-LLM collaboration model

This project is designed to be worked on by multiple AI coding assistants, not just one. The approach mirrors the bias-prevention logic in the verification cascade:

- **Claude (Anthropic)** should not be the sole author of Claude/Anthropic feature data
- **Codex or ChatGPT (OpenAI)** should not be the sole author of ChatGPT/OpenAI feature data
- And so on for each vendor's AI assistant and their own platform's data

In practice, this means:

- Any LLM can work on project infrastructure, build scripts, the dashboard UI, documentation, and cross-platform features
- For vendor-specific feature data, prefer having a *different* vendor's LLM do the work, or flag it for human review
- The human maintainer is the tiebreaker and final reviewer for all changes

This is the same principle as the verification cascade's skip rules, applied to development instead of fact-checking.

### Working with this project as an LLM

If you're an AI assistant picking up this project:

1. Read this document and [CONTRIBUTING.md](CONTRIBUTING.md) first
2. Check [data/_schema.md](data/_schema.md) for the data format
3. The build is `node scripts/build.js` — run it to validate your changes produce working HTML
4. Be skeptical of your own knowledge about AI platform features — things change fast. Prefer sourced information over training data
5. If you're editing feature data for your own vendor, say so explicitly in the commit message or PR description so the human reviewer knows to double-check

## Roadmap thinking

The ROADMAP.md file contains a parking lot of ideas, not a committed plan. The actual near-term priorities are:

1. **Keep the current data accurate** — this is always the top priority
2. **Explore the perceptions/capabilities/features layering** — this is the most interesting design question
3. **Reduce maintainer burden** — anything that makes it easier for others to contribute or for automation to stay current

Everything else is secondary to those three.

---

*This document was written collaboratively by the project maintainer and Claude (Anthropic) in February 2026. It should be updated as the project's direction evolves.*
