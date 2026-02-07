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

The project describes AI tools at three levels of abstraction. All three layers are about *the AI tools themselves* — how they perceive, what they can do, and how vendors package access.

### Perceptions (how an AI tool perceives its inputs)

The foundational layer. AI systems take in information through distinct perceptual modalities — and these work very differently from human perception, in ways that matter for practical use.

**Text** is the native modality for current LLMs. Input is tokenized into subword units and mapped to vector embeddings, then processed through attention mechanisms. This is what the architecture was designed for — the lowest-friction pathway.

**Images** require a separate perceptual engine. A vision encoder (typically a Vision Transformer) splits images into patches, creates embeddings for each patch, and projects them into the same representation space as text. It's architecturally a different pathway. This is an important inversion from human experience: for humans, visual perception is the low-effort, high-bandwidth channel we evolved for. For LLMs, text is native and vision is translated *into* that space.

**Audio** varies by model. Some systems process audio natively with a dedicated encoder. Others transcribe speech-to-text first — meaning the AI's "perception" of your voice is actually a lossy translation step before reasoning even begins.

Why this matters for users: the perceptual mode shapes what the AI does well. An AI that "sees" an image by converting patches to vectors will have different strengths and failure modes than a human looking at the same image. Understanding this helps people work with AI tools more effectively — not by anthropomorphizing them, but by building an accurate mental model of how the tool processes what you give it.

This layer is aspirational. The goal is to describe each platform's perceptual modalities honestly — what input types it handles, through what mechanisms, and with what practical implications.

### Capabilities (what an AI tool can actually do)

The middle layer. Given its perceptual modalities, what can the tool do? "Analyze uploaded PDFs," "generate images from text prompts," "execute code in a sandbox," "search the web for current information." These are underlying abilities that exist across platforms under different names. This layer is organized by what the AI can do, not what any vendor calls it.

A capability like "document analysis" depends on the perceptions layer (can the model perceive PDFs? through OCR, native parsing, or vision?) and feeds into the features layer (which vendor products expose this capability, under what names, on which plans?).

### Features (how a vendor packages and gates an AI's capabilities)

The outermost layer and the current data model. Named product features — "Artifacts," "Canvas," "Deep Research," "Custom GPTs" — with per-plan availability, platform support, status, and sourced verification dates. This is vendor-specific: it reflects how each company names, bundles, and restricts access to the underlying capabilities.

### How they relate

The layers build from inside out: perceptions (how the AI takes in information) enable capabilities (what it can do with that information), which are packaged into features (how vendors name, bundle, and gate access).

A single thread might look like: a model's vision encoder can process image patches (perception) → this enables it to analyze uploaded documents (capability) → which surfaces as "Vision" on ChatGPT, "File uploads" on Claude, "Document understanding" on Gemini (features) — each with different plan availability, limits, and platform support.

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

## Tool Check: "What AI do I have?"

### The problem

Day 1 of a 3-day AI class, and nobody knows exactly what they can do with the tools they have. Some students have a paid ChatGPT subscription. Some have whatever their company provisioned. Some have a personal Claude account they use on the side. By day 3, the class is building agents — and the uncertainty about who can do what is still hobbling the delivery.

A handout would go stale. A web experience built on the project's existing data stays current.

### The goal

A 2-minute web experience, assigned as homework between day 1 and day 2, that tells a person: "Here's what your AI tool can do on your plan, and here are the things you should know about before we get to agents."

After those 2 minutes, the question should be settled for at least the remaining 3 days of class.

### Typical user profile

Most students arrive with 1 approved tool (corporate-provisioned) and possibly 1 unapproved tool they use to work around it. So the flow needs to handle 1-2 tools, not 5.

### Approach: plan discrimination via observable features

The existing availability grid already tracks which features are available on which plans. Some features naturally **discriminate** between plan tiers — their presence or absence tells you what tier someone is on.

The flow:

1. **Which tool(s) do you use?** — pick from tracked platforms (~10 sec)
2. **Per tool, 2-3 observable yes/no checks** — "Can you see X in your interface?" These are chosen because they differ between plan tiers (~30 sec per tool)
3. **Result: "Here's what you should have access to"** — a filtered view of the availability grid for their identified plan, plus a "try this to verify" prompt for key capabilities (~30 sec to review)

### The corporate policy caveat

Corporate/enterprise admins can restrict features beyond what the commercial plan includes. This is unsolvable from outside. The experience should:

- Identify what the plan *should* include (the commercial baseline)
- Be upfront that org policies may further restrict access
- Include 1-2 quick verification prompts ("try uploading an image — does it work?") so users can confirm the high-value capabilities

### Data requirements

The existing schema covers plan-level availability. The Tool Check needs small additions:

| New data | What it is | Where it lives |
|---|---|---|
| **Discriminating features** | Features where availability differs between adjacent plan tiers, suitable for yes/no identification | Derivable from existing availability tables, but marking the best discriminators explicitly is valuable |
| **Observable indicators** | How a user can visually check for a feature without using it ("look for X in the menu") | New data, per-platform, small set |
| **Verification prompts** | A quick "try this" action to confirm a capability works | New data, per-capability, small set |

### Architecture fit

This should be a page on the existing static site (`docs/tool-check.html`), generated by the same build process. No backend, no accounts, no data collection. The decision tree logic runs client-side against the same data the dashboard already renders.

### Timeline

Target: testable in 1 week, teaching with it 10 days from now. This is a collaboration between Claude and Codex, with the maintainer reviewing.

## Roadmap thinking

The ROADMAP.md file contains a parking lot of ideas, not a committed plan. The actual near-term priorities are:

1. **Keep the current data accurate** — this is always the top priority
2. **Explore the perceptions/capabilities/features layering** — this is the most interesting design question
3. **Reduce maintainer burden** — anything that makes it easier for others to contribute or for automation to stay current

Everything else is secondary to those three.

---

*This document was written collaboratively by the project maintainer and Claude (Anthropic) in February 2026. It should be updated as the project's direction evolves.*
