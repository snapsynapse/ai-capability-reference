# Pattern Research: Naming What We Built

**Status:** Active research — not a declaration yet
**Purpose:** Collect prior art, references, and open questions so this investigation can continue across sessions, tools, and people
**Last updated:** 2026-03-16

---

## The Pattern in One Paragraph

A knowledge base where plain text files (markdown/YAML) are the canonical data store, AI models verify and maintain accuracy through scheduled multi-model cascades, a zero-dependency build script generates multiple output formats (HTML site, JSON API, MCP endpoints, SEO bridge pages) from the same source, and Git provides the entire collaboration and workflow layer. The system actively resists its own decay. No framework, no database, no package dependencies.

---

## What to Search For

Use these queries across Perplexity, Google Scholar, Semantic Scholar, and general search to find prior art we may have missed.

### High-priority queries (most likely to surface new references)

- `"knowledge as code"` — Does this phrase exist? Who uses it? In what context?
- `"self-healing documentation" OR "self-correcting documentation"` — Any papers or posts?
- `"anti-entropy" AND (documentation OR knowledge OR content)` — Has anyone bridged this distributed systems concept to content?
- `"continuous verification" AND (documentation OR knowledge base)` — Not software verification — content verification
- `"multi-model verification" OR "LLM ensemble verification" OR "panel of LLM evaluators"` — Academic work on cross-checking with multiple models
- `"ontology-driven" AND "static site"` — Has anyone generated sites from formal ontologies?
- `"GitOps" AND (content OR documentation OR knowledge)` — GitOps beyond infrastructure
- `"docs as code" AND (AI OR verification OR "large language model")` — The next evolution of docs-as-code
- `"file over app" AND (reference OR knowledge base OR maintained)` — Extensions beyond personal notes
- `"plain text knowledge graph" OR "markdown knowledge graph"` — Plain text as graph structure
- `"zero dependency" AND (web OR site OR generator) AND philosophy` — Who advocates this and why?

### Longer-form queries for AI research tools

- "What academic papers describe using multiple AI models to verify factual accuracy of a knowledge base?"
- "Has anyone applied GitOps principles to content management rather than infrastructure?"
- "What is the history of the 'docs as code' movement and has it evolved to include AI verification?"
- "Are there examples of static site generators that produce both human-readable and machine-readable API outputs from the same source files?"
- "What frameworks exist for fighting documentation decay or knowledge rot?"

---

## Known Prior Art (Confirmed)

### Plain text as canonical store
- **Steph Ango, "File Over App"** (2023) — https://stephango.com/file-over-app — "If you want to create digital artifacts that last, they must be files you can control, in formats that are easy to retrieve and read." Focuses on personal notes; hasn't been extended to maintained reference systems.
- **Derek Sivers, "Write plain text files"** — https://sive.rs/plaintext — "You will outlive these companies. Your writing should outlive you."
- **Tom Preston-Werner** — Created Jekyll (2008), wrote "Blogging Like a Hacker." Pioneered the plain-text-in-Git-to-website pipeline.

### Git as collaboration and workflow layer
- **Docs-as-Code movement** (~2010-2015) — Popularized by Write the Docs community, Eric Holscher (Read the Docs), Anne Gentle (*Docs Like Code*, 2017), Andrew Etter (*Modern Technical Writing*, 2016). Canonical resource: https://www.writethedocs.org/guide/docs-as-code/
- **Riona MacNamara** (Google) — 2015 Write the Docs talk on docs-as-code at Google scale.
- **GitOps** — Coined by Weaveworks (2017), popularized by Kelsey Hightower. Git as single source of truth, declarative state, automated reconciliation. Applied to infrastructure; not formally extended to content.
- **GitLab Handbook** — ~2000+ pages, all managed via Git merge requests. The most prominent example of Git-managed knowledge at scale.

### Self-maintaining documentation
- **Cyrille Martraire, *Living Documentation*** (Addison-Wesley, 2019) — Documentation should evolve at the same pace as code through automation. Key framing: information becomes "missing, obsolete, or misleading over time." **Limitation:** His framework generates docs FROM code (annotations, BDD). Does not address AI verification of standalone knowledge bases.

### Multi-model verification (academic foundations)
- **Zheng et al., "Judging LLM-as-a-Judge"** (NeurIPS 2023) — https://arxiv.org/abs/2306.05685 — GPT-4 achieves >80% agreement with human preferences as a judge. Identified position bias, verbosity bias, self-enhancement bias.
- **Verga et al., "PoLL: Panel of LLM Evaluators"** (2024) — https://arxiv.org/abs/2404.18796 — Multiple smaller models as a jury outperform a single large judge with less intra-model bias. 7x cheaper. **Most directly relevant to our multi-model cascade design.**
- **Du et al., "Improving Factuality through Multiagent Debate"** (2023) — https://arxiv.org/abs/2305.14325 — Multiple LLM instances debate across rounds to reduce hallucinations. "Society of minds" approach.
- **Chern et al., "FacTool"** (2023) — https://arxiv.org/abs/2307.13528 — Framework for detecting factual errors in LLM-generated text across QA, code, math, scientific literature.
- **Huang & Zhou, "LLMs Cannot Self-Correct Reasoning Yet"** (ICLR 2024) — https://arxiv.org/abs/2310.01798 — LLMs struggle to self-correct without external feedback. **Validates why we need multi-model cascades rather than single-model self-checking.**

### Wiki and garden philosophy
- **Ward Cunningham** — Created the first wiki (1995). Design principles: Open, Incremental, Organic, Universal, Convergent.
- **Cunningham, Federated Wiki** (2011+) — Pages fork between wiki instances. Knowledge is not centrally controlled but emergently maintained.
- **Mike Caulfield, "The Garden and the Stream"** (2015) — https://hapgood.us/2015/10/17/the-garden-and-the-stream-a-technopastoral/ — Distinguishes "garden" (networked, iterative knowledge) from "stream" (chronological social media).
- **Digital Gardens movement** — Maggie Appleton's history: https://maggieappleton.com/garden-history — Mark Bernstein (1998), Caulfield (2015), Tom Critchlow, Joel Hooks (~2018-2020).

### Zero-dependency and minimal computing
- **Permacomputing** — https://permacomputing.net/ — Resilient, minimal-dependency software inspired by permaculture.
- **100 Rabbits** — Nomadic developers building minimal, portable, offline-capable tools.
- **Chris Ferdinandi, "The Lean Web"** — https://gomakethings.com/the-lean-web/ — Vanilla HTML/CSS/JS advocacy.
- **Jeff Atwood, "The Best Code is No Code at All"** — Code is a liability; less is better.

### AI-scale content verification (practical)
- **Simon Willison, VERDAD project** (2024) — https://simonwillison.net/2024/Nov/7/project-verdad/ — Uses Gemini to analyze ~1000 hours/day of Spanish-language radio for misinformation. AI fact-checking at scale.
- **Simon Willison, Datasette** — Structured data publishing from SQLite as both HTML and JSON API. Related pattern of single-source multi-output.

---

## What Appears to Be Novel

These specific applications and combinations did not surface in research. They may exist and we haven't found them yet — that's what this document is for.

1. **"Knowledge as Code" as a named pattern** — The "-as-code" lineage (infrastructure, policy, docs, everything) is well-established, but "knowledge-as-code" does not appear to be coined or claimed.

2. **AI verification cascades applied to documentation** — Multi-model verification exists in academic literature, but applying it as a scheduled process to maintain a knowledge base's factual accuracy appears to be new.

3. **Multi-format output from plain text** — Generating HTML site + JSON API + MCP endpoints + SEO bridge pages from the same markdown files. Individual pieces exist (Hugo can output JSON, Datasette serves HTML+API) but the full combination from zero-dependency plain text is not established.

4. **Ontology-driven static site generation** — Using a formal ontology (vendor-neutral concepts mapped to vendor-specific implementations) to drive site structure. Academic work exists on ontology generation FROM text, but not ontology-driven site generation.

5. **The full roll-up** — All of the above in a single system with zero dependencies. The individual ingredients have prior art. The recipe appears to be new.

---

## Candidate Names

| Name | Audience | Strengths | Risks |
|---|---|---|---|
| **Knowledge-as-Code** | Developers, DevOps | Extends familiar "-as-code" lineage; immediately communicable | May already exist in some niche we haven't found |
| **Anti-entropy knowledge base** | Engineers, academics | Technically precise; borrows well-understood distributed systems concept | Opaque to non-technical audience |
| **Self-healing knowledge base** | General, business | Accessible; foregrounds the key differentiator | Sounds like marketing |
| **GitOps for Knowledge** | DevOps, platform eng | Leverages known concept; the mapping is tight | "GitOps" carries infrastructure baggage |
| **AI-tended garden** | Writers, designers | Poetic; extends digital garden metaphor | May undersell the rigor |
| **Living Corpus** | Academic, publishing | Extends "living documentation" | Vague about the mechanism |

**Working hypothesis:** "Knowledge-as-Code" for the pattern, "self-healing" for the verification layer. These may change with further research.

---

## Open Questions

- [ ] Has anyone in the knowledge management or library science field described AI-maintained taxonomies?
- [ ] Has the semantic web community (OWL, SKOS, RDF) explored generating static sites from ontologies?
- [ ] Are there any conference talks (Strange Loop, Write the Docs, KGC) that describe this combination?
- [ ] Has Martraire or anyone in the Living Documentation community discussed extending the concept to AI verification?
- [ ] Is there prior art in the journalism/fact-checking community for scheduled automated verification of published claims?
- [ ] Has the MCP (Model Context Protocol) community produced any examples of MCP endpoints generated from static files rather than live databases?

---

## Where to Continue This Research

**Academic search:**
- Google Scholar: https://scholar.google.com
- Semantic Scholar: https://www.semanticscholar.org
- arXiv: https://arxiv.org (cs.CL, cs.AI, cs.IR sections)

**Community/practitioner search:**
- Write the Docs: https://www.writethedocs.org
- IndieWeb: https://indieweb.org
- Permacomputing: https://permacomputing.net
- OASIS/W3C standards: SKOS, OWL, DITA

**People to investigate further:**
- Cyrille Martraire (Living Documentation)
- Simon Willison (AI + data publishing)
- Steph Ango (file-over-app philosophy)
- Maggie Appleton (digital gardens, knowledge design)
- Ward Cunningham (wiki, federated knowledge)
- Kelsey Hightower (GitOps evangelism)
- Linus Lee (Monocle, notation.app — personal knowledge tools)

---

## Format Decision (Not Yet Made)

What does the declaration eventually become? These are not mutually exclusive — they're a funnel from low-effort to high-effort, and each one feeds the next.

| # | Format | Audience | Effort | Reach | Status |
|---|---|---|---|---|---|
| 1 | **Markdown doc in this repo** | Developers studying the approach | Low | Low — only people who find the repo | [ ] |
| 2 | **Pattern page on the site itself** | Site visitors, AI consumers | Low | Medium — meta: the description is an instance of the pattern | [x] `docs/pattern.html` |
| 3 | **GitHub Discussion thread** | OSS contributors, adjacent builders | Low | Medium — invites contribution, surfaces similar work | [x] [discussions/284](https://github.com/snapsynapse/ai-capability-reference/discussions/284) |
| 4 | **Social post (LinkedIn / X)** | Broad dev community | Low | High — discovery layer, ephemeral but shareable | [ ] |
| 5 | **Blog post** | Broader dev community | Medium | High — shareable, searchable, permanent | [ ] |
| 6 | **Short video / demo walkthrough** | Visual learners, non-readers | Medium | High — YouTube + social clips travel far | [ ] |
| 7 | **Awesome-list / pattern catalog entries** | People browsing adjacent topics | Low | Medium — passive discovery in existing collections | [ ] |
| 8 | **Conference talk** | Practitioners | High | Medium — time-bound but recorded | [ ] |
| 9 | **White paper / case study** | Technical decision-makers | High | Medium — credibility signal | [ ] |
| 10 | **Short paper (workshop/arxiv)** | Academic community | High | High — citable, permanent | [ ] |

### Recommended sequence

The repo + a blog post + one social post covers 80% of the reach for 20% of the effort.

- **The blog post** does the framing and naming
- **The repo** does the convincing (it's forkable, readable, real)
- **The social post** does the discovery
- **The pattern page on the site** is meta in the best way — the description of the pattern is itself an instance of the pattern
- **The GitHub Discussion** invites people who've done similar work to self-identify
- Everything else is follow-on if there's demand

### What makes this different from most announcements

The actual differentiator of this pattern is that it's simple enough to fork and try. The people most likely to care are practitioners frustrated with dependency hell, stale docs, or overengineered knowledge systems. They don't read white papers. They read blog posts, click through to the repo, and decide in 90 seconds whether to star it.

Get the research right first. Then start at #1 and work down.
