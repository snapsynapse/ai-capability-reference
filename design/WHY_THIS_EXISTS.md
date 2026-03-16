# Why This Exists: The Information Gap Between AI Benchmarks and AI Products

Status: Published draft
Last updated: 2026-03-15

This document explains the problem this project was built to solve and why nothing else solves it. It's written for developers who might want to build something similar in their own domain, or who want to understand why a structured knowledge base with no database, no framework, and a weekly AI verification cascade exists at all.

---

## The origin story in one paragraph

A person preparing to teach a class about AI tools realized they couldn't confidently answer a basic question: "What can your AI subscription actually do?" Not in the abstract — concretely. On your plan, on your device, right now. The information existed in theory, scattered across pricing pages, blog posts, changelogs, and Twitter threads. But nowhere was it consolidated, structured, and kept current. So they built this.

---

## The gap

The AI ecosystem has a measurement problem. It measures the wrong layer.

### What's well-measured: models

The industry has converged on benchmarks as the standard way to evaluate AI. There are leaderboards for everything: GPQA Diamond for reasoning, SWE-Bench for coding, AIME for math, MMLU for general knowledge. Resources like Artificial Analysis track 295+ models by intelligence score, speed, latency, and price. WhatLLM.org updates weekly. Vellum, LLM-Stats, and a dozen others rank models across standardized tests.

This infrastructure is mature, structured, and increasingly machine-readable. If you want to know how GPT-5 performs on graduate-level physics questions compared to Claude 4.5 Sonnet, the data exists.

### What's poorly measured: products

But consumers don't buy models. They buy ChatGPT Plus ($20/mo), Claude Pro ($20/mo), Google AI Pro ($19.99/mo), or Copilot Pro ($20/mo). These products bundle different capabilities, gate them to different tiers, surface them on different platforms, and change the packaging frequently — sometimes without announcement.

The questions that matter to actual users look nothing like benchmark queries:

- "Can I use voice mode on the free plan?"
- "Does Claude support file uploads on mobile?"
- "Which AI tools let me generate images without paying?"
- "I'm on ChatGPT Plus — can I use the agent features, or is that Team only?"
- "My students have the free tier of three different AI tools — what can they all actually do?"

No leaderboard answers these. No structured database answers these. No API answers these. As of March 2026, the answer to "is there a machine-readable cross-vendor database of AI product capabilities by plan tier?" is no.

### Why the gap persists

This isn't an oversight. It's a structural problem with several reinforcing causes:

**Vendor pricing pages are designed to convert, not to inform.** Google's AI pricing page describes tier differences with relative terms — "more," "higher," "highest" — instead of concrete limits. One feature might specify "128K tokens" for Plus but "1 million" for Pro, while everything else uses vague language. This is standard practice across the industry. Pricing pages are sales funnels, not documentation.

**Feature information is fragmented across surfaces.** To understand what Claude Pro actually includes, you might need to check the pricing page, the product docs, the changelog, a blog post, and a social media announcement. There is no single source of truth — and this is true for every major vendor.

**The model-product mapping is non-obvious and unstable.** Gemini the model supports code execution. Gemini the website does not always expose it. The same underlying model behaves differently depending on which product harness it's wrapped in. Ethan Mollick, one of the most influential voices in AI education (414,000+ Substack subscribers), calls this out explicitly: "what the same model can do depends on what harness it's in." This distinction confuses experts. It completely loses non-technical users.

**Usage limits hide behind euphemism.** "Higher limits" doesn't mean anything. "Priority access" doesn't mean anything. "More messages" doesn't tell you how many. Vendors have financial incentives to be vague about caps, because specific numbers invite direct comparison.

**The pace of change destroys static content.** AI products ship feature changes weekly or daily. Blog posts and review articles are written once, maybe refreshed quarterly. Mollick himself warns readers that "version numbers may change in the coming weeks" when publishing his own guides. The majority of AI comparison content on the web at any given time is materially inaccurate — not because it was wrong when written, but because the products changed and the content didn't.

---

## What exists instead

Here's what a person looking for this information actually finds today:

### Benchmark leaderboards (plentiful, wrong layer)

Artificial Analysis, WhatLLM, Vellum, LLM-Stats, and others provide excellent model-level data. None of them track product features. None tell you whether voice mode is on the free plan or what file types a particular product can process. They answer "which model is smarter?" not "what can I do with my subscription?"

### Comparison blog posts (plentiful, immediately stale)

Search for "ChatGPT vs Claude 2026" and you'll find dozens of articles from Ideas2IT, Pluralsight, dev.to, and similar publishers. They typically include a specifications table (context window, training cutoff, pricing) and some qualitative commentary. They are static snapshots that begin decaying the moment they're published. Most don't track plan-tier feature availability at all.

### AI tool directories (broad, shallow)

There's An AI For That catalogs thousands of AI tools with basic metadata — pricing tier indicators, categories, ratings. It's a discovery tool, not a comparison tool. There are no feature matrices, no plan-tier breakdowns, no structured export, no verification dates.

### Expert newsletters (authoritative, unstructured)

Mollick's One Useful Thing is the closest thing to an authoritative guide for non-technical users. His practical advice often amounts to "pick one of the three systems, pay the $20, and select the advanced model" — which is honest acknowledgment that the comparison landscape is too chaotic to navigate systematically. It's one person's informed opinion, updated when he gets to it, in prose form.

### Vendor documentation (authoritative, siloed)

Each vendor documents their own products. Some do it better than others. None document their competitors. A user comparing three products must visit three different documentation sites with three different structures, then manually reconcile the differences. This is the task this project automates.

---

## What's actually needed

The gap is specific enough to describe precisely:

1. **Cross-vendor capability data in one place.** Not scattered across vendor sites that each use different terminology and structure.

2. **Plan-tier granularity.** Not "ChatGPT can generate images" but "ChatGPT can generate images on Plus, Team, and Enterprise via DALL-E and Sora, with different rate limits per tier. Free users cannot."

3. **Platform/surface specificity.** Not "Claude supports voice" but "Claude supports voice on iOS and Android, not on web or desktop."

4. **Plain-English capability framing.** Not organized by vendor feature names ("Artifacts," "Canvas," "Gems") but by what a user wants to do: generate images, search the web, upload files, have a voice conversation.

5. **Freshness metadata.** Not "this is current" but "this was verified on March 12 against official sources and confirmed by three independent AI models."

6. **Machine-readability.** Not just a website but a structured data export that agents, scripts, and downstream tools can consume without scraping HTML.

7. **Active maintenance at the pace of the domain.** Not a quarterly content refresh but continuous verification against a fast-moving reality.

No single existing resource provides more than one or two of these. Most provide zero.

---

## Why this can't be solved with a normal website

A reasonable developer's instinct is: "This is just a comparison website. Build a table, keep it updated, done." That approach fails for reasons that are structural, not procedural.

### The vocabulary problem

Vendors don't use the same words for the same things. OpenAI calls it "Advanced Voice Mode." Google calls it "Gemini Live." Anthropic calls it "Voice." These all refer to the same underlying capability: having a spoken conversation with the AI. But a simple comparison table organized by vendor feature names forces the user to already know the mapping — which is the thing they're trying to learn.

This project solves it with an ontology: 18 vendor-neutral capabilities ("speak back in real time," "search the web," "generate images") that vendor features map to. The capability is the stable concept. The vendor names are unstable labels on implementations of that concept.

### The staleness problem

A hand-maintained comparison table is accurate on the day it's published and progressively less accurate every day after. The only sustainable approach for a fast-moving domain is automated verification. This project runs a weekly multi-model AI cascade that checks every tracked feature against external reality, flags discrepancies, and creates work items for human review. The data doesn't just sit there — it actively resists its own decay.

### The trust problem

A comparison website that says "ChatGPT Search is available on Free" is making an unsourced claim. This project attaches three dates to every feature: when it launched, when it was last verified against official sources, and when someone last checked it (even if nothing changed). The verification cascade provides a provenance chain: which models were consulted, what they reported, whether they agreed. Trust is earned through transparency about process, not assertions of authority.

### The contribution problem

A normal website requires a contributor to understand the CMS, the schema, the deployment pipeline, and probably a framework. This project requires them to edit a markdown file and open a PR. The friction difference is the difference between "theoretically open to contributions" and "actually receives them."

### The machine-readability problem

A website serves humans. Agents, scripts, and integrations need structured data. This project generates both from the same source: HTML pages for humans, JSON API endpoints for machines, with the same canonical data underneath. Building this as a website-first project would mean either maintaining two data sources or bolting on an API after the fact. Building it as data-first means the website is just one view.

---

## The audience this serves

This project was built for a specific set of people who share a common frustration:

### Educators and facilitators

The original use case. A person standing in front of a room full of people with different AI subscriptions, on different devices, trying to run a hands-on exercise. They need to know — quickly, accurately — what each participant can actually do. "Open your AI tool and try the voice feature" doesn't work if half the room is on free plans where voice isn't available. This project provides the lookup table that makes inclusive instruction possible.

### Individuals comparing their options

Someone paying $20/month for ChatGPT Plus who wonders whether Claude Pro or Google AI Pro would be a better fit. Today, answering that question requires visiting three pricing pages that use different terminology, different structure, and different levels of specificity. This project normalizes all of it into the same framework.

### Teams making procurement decisions

A small team that needs to decide which AI tool to standardize on, given their budget and platform requirements. The comparison view and plan entitlements data were built for this exact workflow.

### AI agents and downstream tools

A growing use case: agents that need to know what capabilities are available on which platforms. The JSON API exists so that tools can answer questions like "which AI products support web search on the free tier?" without scraping a website.

### Developers building in this space

People who want structured, current data about the AI product landscape for their own projects. The API is MIT-licensed and designed to be consumed.

---

## Why this isn't a business

This is an unfunded side project. There is no revenue model and likely never will be. This is a deliberate choice, not a limitation.

The moment this becomes a business, it acquires incentives that conflict with its purpose. A business needs vendor relationships, which compromise neutrality. A business needs growth, which pushes toward covering more products at lower accuracy. A business needs revenue, which means either paywalling the data (defeating the purpose) or accepting vendor sponsorship (compromising trust).

The project's value is measured in time saved and confusion reduced. Its sustainability model is low maintenance burden: zero dependencies to keep current, markdown files anyone can edit, automated verification that catches drift before a human needs to. It's designed to be cheap to maintain, not profitable to operate.

---

## The bet this project makes

Every project makes implicit bets about what will and won't change. This one is explicit:

**Bet 1: Vendor product packaging will keep changing.** Feature names, plan tiers, pricing, platform availability — all of this will continue to shift quarterly or faster. This is why the ontology separates stable concepts (capabilities) from unstable ones (implementations). The capability "search the web" will be relevant for years. The implementation "ChatGPT Search" might be renamed next quarter.

**Bet 2: Benchmarks will remain insufficient for consumer decisions.** Knowing that GPT-4o scores 88% on GPQA Diamond does not help someone decide whether to upgrade from ChatGPT Free to Plus. Different information is needed for different decisions. Benchmarks serve the model-selection decision. This project serves the product-selection decision.

**Bet 3: AI can verify factual claims about AI products.** The multi-model verification cascade is a bet that four models from different vendors, with different training data and different incentive structures, produce a useful signal when they agree. Not a perfect signal — that's why humans review everything — but a useful one. This bet has held up in practice: correlated hallucination across four independent models about the same factual claim is rare.

**Bet 4: Plain text outlasts infrastructure.** Frameworks go out of style. Databases require hosting. APIs require upkeep. Markdown files require a text editor. This project bets that the simplest possible storage format is the most durable one — and that durability matters more than sophistication for a knowledge base that needs to be maintainable by one person, indefinitely.

**Bet 5: The gap won't be filled by vendors.** No vendor has an incentive to make cross-vendor comparison easy. Their pricing pages are designed to convert, not to inform. A neutral, structured, continuously-verified comparison resource has to come from outside the vendor ecosystem — or it doesn't come at all.

---

## What this looks like if it works

If these bets pay off, the project becomes the missing layer between AI benchmarks and AI users: a structured, verified, machine-readable, plain-English answer to "what can I actually do with this tool?"

Not the authoritative answer. Not the only answer. Just a reliable, transparent, continuously-maintained one — built in the open, kept honest by a process that's visible in every commit, and designed to last longer than the tools it tracks.

---

*This document describes the project's reason for existing as of March 2026. The gap it describes may narrow over time. If it does, that's a good outcome — the project will have been unnecessary, which is better than needed and absent.*
