# Capability Pressure Test

Status: Draft 1  
Last updated: 2026-03-07

This document checks whether the draft capability taxonomy can coexist with the current 70-feature dataset without forcing unnatural schema decisions too early.

## Current Dataset Snapshot

Current feature count by platform:

- ChatGPT: 12
- Claude: 9
- Microsoft Copilot: 7
- Gemini: 14
- Grok: 8
- Local/Open Models: 10
- Perplexity: 10

Current feature count by existing `Category`:

- `other`: 17
- `coding`: 8
- `agents`: 6
- `integrations`: 6
- `research`: 6
- `voice`: 5
- `image-gen`: 5
- `local-files`: 4
- `browser`: 3
- `search`: 3
- `video-gen`: 3
- `vision`: 2
- `cloud-files`: 2

The category distribution confirms that coexistence is feasible, but the existing category system is not a clean substitute for a capability taxonomy.

## High-Confidence Capability Areas

These parts of the draft taxonomy already fit the current feature set well.

### Real-time voice

Clear current implementations:

- ChatGPT Advanced Voice Mode
- Copilot Voice
- Gemini Live
- Grok Voice Mode
- Perplexity Voice Mode

This area strongly supports splitting listening and speaking into separate capabilities even if they are often implemented together.

### Visual understanding

Clear current implementations:

- Claude Vision
- Copilot Vision
- Gemini Project Astra

This is a stable user-facing concept and should remain capability-first.

### Image and video generation

Clear current implementations:

- DALL-E Image Generation
- Imagen
- Aurora
- Designer
- Sora
- Veo
- Grok Imagine

These are already intuitive user-facing capabilities and map well.

### Research, search, and action-taking

Clear current implementations:

- ChatGPT Search
- ChatGPT Deep Research
- ChatGPT Agent Mode
- Claude Cowork Mode
- Gemini Deep Research
- Perplexity Pro Search
- Perplexity Agent Mode
- Comet Browser
- DeepSearch

These need many-to-many mapping, but they are editorially strong.

### Projects, files, and persistent work

Clear current implementations:

- ChatGPT Projects
- Claude Projects
- Perplexity Collections
- Gemini in Workspace
- Copilot in Office Apps
- NotebookLM
- Memory

This is another strong area for capability-first navigation.

## Areas That Need Careful Modeling

These are not blockers, but they are the places where schema pressure is most likely.

### 1. Model access is not the same as a user capability

Features that fit awkwardly into a capability taxonomy:

- GPT-4 Access
- Gemini Advanced
- Grok Chat
- Model Selection
- Llama 3.3
- Llama 4
- DeepSeek-V3 / DeepSeek-R1
- Mistral Large / Mistral Nemo
- Mistral Small 3
- Qwen 2.5
- Qwen 3

These mostly describe:

- access to stronger base models
- access to more choice
- quality or reasoning differences
- local/open model availability

Recommendation:

- Treat these primarily as implementation or constraint records for now.
- Do not rush to create a top-level capability like "use good models."
- Revisit only if a stable user-facing question emerges, such as "Can I choose which model I use?"

### 2. Reasoning depth may be a modifier, not a primary capability

Potentially awkward features:

- Claude Extended Thinking
- Grok Think Mode

These feel more like quality or depth modifiers on existing capabilities than standalone capabilities.

Recommendation:

- Model them as capability enhancers or constraints before modeling them as first-class capability pages.

### 3. Workspace/build tools often span multiple capabilities

Examples:

- Claude Artifacts
- Gemini Canvas
- ChatGPT Canvas
- AI Studio
- Claude Code
- Grok Studio

These are best understood as workspaces or implementation shells that support:

- document creation
- code work
- iterative editing
- reusable context

Recommendation:

- Map them to multiple capabilities.
- Avoid making "canvas" or "studio" a capability category.

### 4. Browser-like products mix surface and behavior

Examples:

- Atlas Browser
- Comet Browser
- Copilot Vision

These combine:

- interface surface
- search/research behavior
- action-taking
- visual context

Recommendation:

- Treat browser products as implementations.
- Map them into capabilities like `search-the-web`, `take-actions-and-run-tools`, and `see-images-and-screens`.
- Keep surface-specific information in constraints.

## Draft Outcome

The current taxonomy appears viable for coexistence.

What the pressure test suggests:

- The capability-first direction is compatible with the current dataset.
- The old feature-first site can remain operational during migration.
- The biggest unresolved question is how to represent model access and reasoning quality without turning marketing terms into top-level capabilities.

## Explicit Risks To Call Out Later

These should be surfaced again if they start affecting implementation choices:

- If model-brand pages begin dominating the capability-first IA, the editorial model is drifting backward toward feature-first.
- If reasoning modes become top-level categories too early, the taxonomy may become vendor-shaped.
- If surfaces like browser, desktop, and API are treated as peer categories with user-intent capabilities, the IA will get muddy.

## Recommendation

Proceed with coexistence.

The next concrete step should be adding a thin capability mapping layer while keeping the current feature records and current dashboard untouched.
