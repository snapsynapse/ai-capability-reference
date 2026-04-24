---
name: Claude
vendor: Anthropic
logo: https://cdn.simpleicons.org/anthropic
status_page: https://status.anthropic.com
pricing_page: https://claude.ai/pricing
last_verified: 2026-04-14
---

## Pricing

| Plan | Price | Notes |
|------|-------|-------|
| Free | $0 | Sonnet 4.6, usage caps |
| Pro | $20/mo | 5x free usage, Opus access |
| Max 5x | $100/mo | 20x Pro usage, extended thinking |
| Max 20x | $200/mo | Unlimited standard, highest limits |
| Team | $25/user/mo | Pro features + collaboration |
| Enterprise | Custom | SSO, advanced security |

---

## Artifacts

| Property | Value |
|----------|-------|
| Category | local-files |
| Status | ga |
| Gating | free |
| URL | https://support.anthropic.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them |
| Launched | 2024-06-20T12:00Z |
| Verified | 2026-04-06|
| Checked | 2026-04-24|

### Availability

| Plan | Available | Limits | Notes |
|------|-----------|--------|-------|
| Free | ✅ | Standard | Full access |
| Pro | ✅ | Standard | Full access |
| Max 5x | ✅ | Standard | Full access |
| Max 20x | ✅ | Standard | Full access |

### Platforms

| Platform | Available | Notes |
|----------|-----------|-------|
| Windows | ✅ | Desktop app |
| macOS | ✅ | Desktop app |
| Linux | ✅ | Desktop app |
| iOS | ✅ | Mobile app |
| Android | ✅ | Mobile app |
| Chrome | ❌ |  |
| web | ✅ | Best experience |
| terminal | ❌ |  |
| API | ❌ | Web/app feature only |

### Regional

Available globally.

### Talking Point

> "Artifacts are Claude's way of creating standalone content—code, documents, diagrams—in a separate panel. **Available on all plans including free.**"

### Sources

- [Artifacts Documentation](https://support.anthropic.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them)

### Changelog

| Date | Change |
|------|--------|
| 2026-03-07T12:00Z | [Verified] Gating corrected from paid to free — free users have full access; data was internally inconsistent |
| 2024-06-20T12:00Z | Initial entry |

---

## Claude Code

| Property | Value |
|----------|-------|
| Category | coding |
| Status | ga |
| Gating | paid |
| URL | https://code.claude.com/docs/en/features-overview |
| Launched | 2025-02-24T12:00Z |
| Verified | 2026-03-22|
| Checked | 2026-04-24|

### Availability

| Plan | Available | Limits | Notes |
|------|-----------|--------|-------|
| Free | ❌ | — | Not available |
| Pro | ✅ | Usage-based | Standard limits |
| Max 5x | ✅ | Higher | Extended limits |
| Max 20x | ✅ | Highest | Extended limits |
| Team | ✅ | Usage-based | |
| Enterprise | ✅ | Custom | |

### Platforms

| Platform | Available | Notes |
|----------|-----------|-------|
| Windows | ✅ | Terminal + VS Code extension |
| macOS | ✅ | Terminal + VS Code extension + Xcode (via Agent SDK) |
| Linux | ✅ | Terminal + VS Code extension |
| iOS | ❌ | Not available |
| Android | ❌ | Not available |
| Chrome | ❌ |  |
| web | ❌ | Terminal/IDE-based only |
| terminal | ✅ | Primary interface |
| API | ✅ | Anthropic API |

### Regional

Available globally via CLI and VS Code extension (Windows, macOS, Linux).

### Talking Point

> "Claude Code is Anthropic's agentic coding tool. It requires **Pro subscription at minimum—that's $20/month**. Available as a terminal CLI and a **native VS Code extension** (out of beta), plus Xcode integration via the Claude Agent SDK. No JetBrains plugin yet, but JetBrains AI Assistant integrates Claude models."

### Sources

- [Claude Code Documentation](https://code.claude.com/docs/en/features-overview)
- [VS Code Extension Guide](https://www.claudelog.com/faqs/how-to-use-claude-code-with-vs-code/)
- [Apple Xcode + Claude Agent SDK](https://www.anthropic.com/news/apple-xcode-claude-agent-sdk)

### Changelog

| Date | Change |
|------|--------|
| 2026-02-17T12:00Z | [Verified] VS Code extension (out of beta) added to platforms; Xcode via Agent SDK noted; URL updated to code.claude.com; talking point updated |
| 2025-02-24T12:00Z | Initial entry |

---

## Connectors

| Property | Value |
|----------|-------|
| Category | integrations |
| Status | ga |
| Gating | free |
| URL | https://claude.ai/directory |
| Launched | 2025-05-01T12:00Z |
| Verified | 2026-04-08|
| Checked | 2026-04-24|

### Availability

| Plan | Available | Limits | Notes |
|------|-----------|--------|-------|
| Free | ✅ | Standard | Full remote MCP connectors |
| Pro | ✅ | Full | All remote connectors |
| Max 5x | ✅ | Full | All remote connectors |
| Max 20x | ✅ | Full | All remote connectors |
| Team | ✅ | Full | Shared connectors |
| Enterprise | ✅ | Full | Google Drive Cataloging exclusive |

### Platforms

| Platform | Available | Notes |
|----------|-----------|-------|
| Windows | ✅ | Desktop app |
| macOS | ✅ | Desktop app |
| Linux | ✅ | Desktop app |
| iOS | ⚠️ | Use only (setup on desktop) |
| Android | ⚠️ | Use only (setup on desktop) |
| Chrome | ❌ |  |
| web | ✅ | claude.ai |
| terminal | ✅ | Via Claude Code |
| API | ✅ | MCP Connector |

### Regional

Available globally where Claude is available.

### Talking Point

> "Connectors let Claude access 75+ services—Google Drive, Notion, Slack, Stripe, and more. **Now free on all plans** including full remote MCP connectors. Deep Connectors (Google Drive, Gmail, DocuSign, FactSet) and a plugin marketplace available. Custom connectors via MCP server URLs available. Browse available connectors at claude.ai/directory."

### Sources

- [Claude Integrations](https://claude.ai/blog/integrations)
- [Connectors Directory](https://claude.ai/directory)
- [Setting Up Integrations](https://support.anthropic.com/en/articles/10168395-setting-up-claude-integrations)

### Changelog

| Date | Change |
|------|--------|
| 2026-04-08T12:00Z | [Verified] Gating changed from paid to free — Free plan now has full remote MCP connector access (not just desktop extensions + GitHub) |
| 2026-03-21T12:00Z | [Verified] Deep Connectors added (Google Drive, Gmail, DocuSign, FactSet); plugin marketplace launched; custom MCP connectors on paid plans |
| 2026-03-04T12:00Z | [Verified] Fixed broken URL: support.claude.com → support.anthropic.com |
| 2025-07-14T12:00Z | Connectors Directory launched |
| 2025-06-03T12:00Z | Expanded to Pro plan |
| 2025-05-01T12:00Z | Initial entry |

---

## Cowork Mode

| Property | Value |
|----------|-------|
| Category | agents |
| Status | preview |
| Gating | paid |
| URL | https://support.claude.com/en/articles/13345190-getting-started-with-cowork |
| Launched | 2026-01-12T12:00Z |
| Verified | 2026-04-07|
| Checked | 2026-04-17|

### Availability

| Plan | Available | Limits | Notes |
|------|-----------|--------|-------|
| Free | ❌ | — | Not available |
| Pro | ✅ | Standard | Research preview |
| Max 5x | ✅ | Subject to Max limits | Research preview |
| Max 20x | ✅ | Subject to Max limits | Research preview |
| Team | ✅ | Standard | Research preview |
| Enterprise | ✅ | Custom | Research preview |

### Platforms

| Platform | Available | Notes |
|----------|-----------|-------|
| Windows | ✅ | Claude Desktop app (x64 only, arm64 not supported) |
| macOS | ✅ | Claude Desktop app required |
| Linux | ❌ |  |
| iOS | ❌ | Not available |
| Android | ❌ | Not available |
| Chrome | ❌ |  |
| web | ❌ | Desktop app only |
| terminal | ❌ |  |
| API | ❌ | Desktop feature only |

### Regional

Available globally where Claude is available; requires Claude Desktop app (macOS or Windows x64).

### Talking Point

> "Cowork is Claude's background agent—**it launched January 2026 and expanded to all paid plans in February**. It's available on Pro ($20/mo) and above, on macOS and Windows desktop. It's still a research preview but already useful for delegating multi-step tasks."

### Sources

- [Getting Started with Cowork](https://support.claude.com/en/articles/13345190-getting-started-with-cowork)
- [TechCrunch Coverage](https://techcrunch.com/2026/01/12/anthropics-new-cowork-tool-offers-claude-code-without-the-code/)

### Changelog

| Date | Change |
|------|--------|
| 2026-02-17T12:00Z | [Verified] Expanded to all paid plans (Pro, Team, Enterprise); Windows x64 support added |
| 2026-01-12T12:00Z | Initial entry |

---

## Extended Thinking

| Property | Value |
|----------|-------|
| Category | other |
| Status | ga |
| Gating | free |
| URL | https://platform.claude.com/docs/en/docs/build-with-claude/extended-thinking |
| Launched | 2025-02-24T12:00Z |
| Verified | 2026-04-08|
| Checked | 2026-04-17|

### Availability

| Plan | Available | Limits | Notes |
|------|-----------|--------|-------|
| Free | ⚠️ | Limited | Available with usage restrictions |
| Pro | ✅ | Full | Full access, no restrictions |
| Max 5x | ✅ | Full | Adaptive thinking with effort levels |
| Max 20x | ✅ | Full | Adaptive thinking with effort levels |

### Platforms

| Platform | Available | Notes |
|----------|-----------|-------|
| Windows | ✅ |  |
| macOS | ✅ |  |
| Linux | ✅ |  |
| iOS | ✅ |  |
| Android | ✅ |  |
| Chrome | ❌ |  |
| web | ✅ |  |
| terminal | ❌ |  |
| API | ✅ | Anthropic API |

### Regional

Available globally.

### Talking Point

> "Extended Thinking lets Claude reason through complex problems step-by-step. With Opus 4.6, **adaptive thinking** is now the recommended mode—Claude decides when deeper reasoning is needed, with four effort levels (low/medium/high/max). Manual thinking mode is deprecated on Opus 4.6. **Now available on all plans including free** (with usage limits); Pro and above get full unrestricted access."

### Sources

- [Extended Thinking Documentation](https://platform.claude.com/docs/en/docs/build-with-claude/extended-thinking)
- [Claude Opus 4.6 Announcement](https://www.anthropic.com/news/claude-opus-4-6)

### Changelog

| Date | Change |
|------|--------|
| 2026-04-08T12:00Z | [Verified] Gating changed from paid to free — Free plan now has limited Extended Thinking access; Pro upgraded from limited to full access |
| 2026-02-17T12:00Z | [Verified] Adaptive thinking introduced with Opus 4.6; effort levels (low/medium/high/max) added; manual mode deprecated on Opus 4.6; URL updated to platform.claude.com |
| 2025-02-24T12:00Z | Initial entry |

---

## MCP (Model Context Protocol)

| Property | Value |
|----------|-------|
| Category | integrations |
| Status | ga |
| Gating | free |
| URL | https://www.anthropic.com/news/model-context-protocol |
| Launched | 2024-11-25T12:00Z |
| Verified | 2026-03-22|
| Checked | 2026-04-24|

### Availability

| Plan | Available | Limits | Notes |
|------|-----------|--------|-------|
| Free | ✅ | Standard | Full access |
| Pro | ✅ | Standard | Full access |
| Max 5x | ✅ | Standard | Full access |
| Max 20x | ✅ | Standard | Full access |
| Team | ✅ | Standard | Full access |
| Enterprise | ✅ | Custom | Advanced deployment options |

### Platforms

| Platform | Available | Notes |
|----------|-----------|-------|
| Windows | ✅ | Claude Desktop app |
| macOS | ✅ | Claude Desktop app |
| Linux | ✅ | Claude Desktop app |
| iOS | ❌ | Desktop only |
| Android | ❌ | Desktop only |
| Chrome | ❌ |  |
| web | ❌ | Desktop app only |
| terminal | ✅ | Via Claude Code |
| API | ✅ | Anthropic API |

### Regional

Available globally where Claude is available.

### Talking Point

> "MCP is an open standard for connecting Claude to external tools and data sources—databases, file systems, APIs. **Available on all plans including free** via the Claude Desktop app."

### Sources

- [Introducing Model Context Protocol](https://www.anthropic.com/news/model-context-protocol)
- [MCP Documentation](https://docs.claude.com/en/docs/mcp)

### Changelog

| Date | Change |
|------|--------|
| 2024-11-25T12:00Z | Initial entry |

---

## Projects

| Property | Value |
|----------|-------|
| Category | local-files |
| Status | ga |
| Gating | free |
| URL | https://support.anthropic.com/en/articles/9517075-what-are-projects |
| Launched | 2024-06-25T12:00Z |
| Verified | 2026-03-23|
| Checked | 2026-04-17|

### Availability

| Plan | Available | Limits | Notes |
|------|-----------|--------|-------|
| Free | ✅ | Standard | Full access (added Feb 2026) |
| Pro | ✅ | Standard | Full access |
| Max 5x | ✅ | Extended | Higher limits |
| Max 20x | ✅ | Extended | Higher limits |
| Team | ✅ | Standard | Shared projects |
| Enterprise | ✅ | Custom | SSO, admin controls |

### Platforms

| Platform | Available | Notes |
|----------|-----------|-------|
| Windows | ✅ | Desktop app |
| macOS | ✅ | Desktop app |
| Linux | ✅ | Desktop app |
| iOS | ⚠️ | View only |
| Android | ⚠️ | View only |
| Chrome | ❌ |  |
| web | ✅ | claude.ai |
| terminal | ❌ |  |
| API | ✅ | Anthropic API |

### Regional

Available globally.

### Talking Point

> "Projects let you organize conversations and documents into workspaces with persistent context. **Now available on all plans including free** as of February 2026."

### Sources

- [Projects Documentation](https://support.anthropic.com/en/articles/9517075-what-are-projects)

### Changelog

| Date | Change |
|------|--------|
| 2026-03-23T12:00Z | [Verified] Added missing Enterprise row to availability table (SSO, admin controls, custom limits) |
| 2026-02-28T12:00Z | [Verified] Free tier access added as part of Anthropic's February 2026 free tier expansion; gating changed from paid to free |
| 2024-06-25T12:00Z | Initial entry |

---

## Skills

| Property | Value |
|----------|-------|
| Category | agents |
| Status | ga |
| Gating | paid |
| URL | https://www.anthropic.com/news/skills |
| Launched | 2025-10-16T12:00Z |
| Verified | 2026-04-03|
| Checked | 2026-04-17|

### Availability

| Plan | Available | Limits | Notes |
|------|-----------|--------|-------|
| Free | ⚠️ | Limited | Prebuilt skills only; custom skills not available |
| Pro | ✅ | Standard | Full access |
| Max 5x | ✅ | Extended | Higher limits |
| Max 20x | ✅ | Extended | Higher limits |
| Team | ✅ | Standard | Shared skills |
| Enterprise | ✅ | Custom | |

### Platforms

| Platform | Available | Notes |
|----------|-----------|-------|
| Windows | ✅ | Desktop app |
| macOS | ✅ | Desktop app |
| Linux | ✅ | Desktop app |
| iOS | ✅ | Mobile app |
| Android | ✅ | Mobile app |
| Chrome | ❌ |  |
| web | ✅ | claude.ai |
| terminal | ✅ | Via Claude Code |
| API | ✅ | Anthropic API |

### Regional

Available globally where Claude is available.

### Talking Point

> "Skills are modular folders of instructions and resources that Claude can load on demand to perform specialized tasks—like creating Office documents or running workflows. **Prebuilt skills are available on all plans including free** (added Feb 2026 with Sonnet 4.6). **Custom skills require Pro and above.**"

### Notes

**Prebuilt vs Custom Skills:**
- **Prebuilt Skills**: Created and maintained by Anthropic (Excel, Word, PowerPoint, PDF creation). Activate automatically when relevant. Available on all plans including free.
- **Custom Skills**: User-created skills uploaded as ZIP files. Private to individual accounts; Team/Enterprise can provision org-wide. Require Pro, Max, Team, or Enterprise plans.

### Sources

- [Introducing Skills](https://www.anthropic.com/news/skills)
- [Skills Documentation](https://docs.anthropic.com/en/docs/skills)
- [Claude Sonnet 4.6 Announcement](https://www.anthropic.com/news/claude-sonnet-4-6)

### Changelog

| Date | Change |
|------|--------|
| 2026-03-07T12:00Z | [Verified] Free tier now includes prebuilt skills (confirmed in Sonnet 4.6 announcement); talking point corrected to match availability table |
| 2025-10-16T12:00Z | Initial entry |

---

## Vision (Image Understanding)

| Property | Value |
|----------|-------|
| Category | vision |
| Status | ga |
| Gating | free |
| URL | https://docs.anthropic.com/en/docs/build-with-claude/vision |
| Launched | 2024-03-04T12:00Z |
| Verified | 2026-03-22|
| Checked | 2026-04-24|

### Availability

| Plan | Available | Limits | Notes |
|------|-----------|--------|-------|
| Free | ✅ | Standard | Full access |
| Pro | ✅ | Standard | Full access |
| Max 5x | ✅ | Standard | Full access |
| Max 20x | ✅ | Standard | Full access |

### Platforms

| Platform | Available | Notes |
|----------|-----------|-------|
| Windows | ✅ | Drag and drop |
| macOS | ✅ | Drag and drop |
| Linux | ✅ | Drag and drop |
| iOS | ✅ | Camera + gallery |
| Android | ✅ | Camera + gallery |
| Chrome | ❌ |  |
| web | ✅ | Upload images |
| terminal | ❌ |  |
| API | ✅ | Anthropic API |

### Regional

Available globally.

### Talking Point

> "Claude can analyze images you upload—documents, screenshots, diagrams. **Available on all plans including free.**"

### Sources

- [Vision Documentation](https://docs.anthropic.com/en/docs/build-with-claude/vision)

### Changelog

| Date | Change |
|------|--------|
| 2026-03-15T12:00Z | [Verified] Corrected gating from paid to free — availability table and external sources confirm free-tier access |
| 2024-03-04T12:00Z | Initial entry |

---

## Memory

| Property | Value |
|----------|-------|
| Category | other |
| Status | ga |
| Gating | free |
| URL | https://support.anthropic.com/en/articles/10166267-how-does-memory-work |
| Launched | 2025-10-01T12:00Z |
| Verified | 2026-03-19|
| Checked | 2026-04-17|

### Availability

| Plan | Available | Limits | Notes |
|------|-----------|--------|-------|
| Free | ✅ | Standard | Free on all plans since March 2026 |
| Pro | ✅ | Standard | Full access |
| Max 5x | ✅ | Standard | Full access |
| Max 20x | ✅ | Standard | Full access |
| Team | ✅ | Standard | Full access |
| Enterprise | ✅ | Custom | Admin controls |

### Platforms

| Platform | Available | Notes |
|----------|-----------|-------|
| Windows | ✅ | Desktop app |
| macOS | ✅ | Desktop app |
| Linux | ✅ | Desktop app |
| iOS | ✅ | Mobile app |
| Android | ✅ | Mobile app |
| Chrome | ❌ |  |
| web | ✅ | claude.ai |
| terminal | ❌ |  |
| API | ✅ | Memory Tool (type: memory_20250818) for developers |

### Regional

Available globally where Claude is available. May be off by default in some regions (opt-in).

### Talking Point

> "Memory lets Claude remember your preferences and context across conversations—corrections, working style, recurring topics. **Free on all plans** since March 2026. Enable it in Settings → Capabilities → Memory. You can also import memories from other AI tools using the memory import tool."

### Sources

- [Claude Memory Guide](https://aiadopters.club/p/set-up-my-claude-memory)
- [API Memory Tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool)

### Changelog

| Date | Change |
|------|--------|
| 2026-03-21T12:00Z | [Verified] API Memory Tool now available for developers (type: memory_20250818); 3-layer architecture: Chat Memory, CLAUDE.md, API Memory Tool |
| 2026-03-07T12:00Z | Initial entry |
| 2026-03-02T12:00Z | Free on all plans; memory import tool launched |
| 2025-10-01T12:00Z | Memory feature launched (paid plans only) |

---

## Chat

| Property | Value |
|----------|-------|
| Category | other |
| Status   | ga |
| Gating   | free |
| URL      | https://claude.ai |
| Launched | 2023-07-11T12:00Z |
| Verified | 2026-03-20|
| Checked  | 2026-04-14 |

### Availability

| Plan | Available | Limits | Notes |
|------|-----------|--------|-------|
| Free | ✅ | Usage caps | Sonnet 4.6 with daily usage limits |
| Pro | ✅ | 5× free | Opus access, higher limits |
| Max 5x | ✅ | Higher | Extended thinking, 20× Pro usage |
| Max 20x | ✅ | Highest | Unlimited standard, highest limits |
| Team | ✅ | Full | Pro features + collaboration tools |
| Enterprise | ✅ | Custom | SSO, advanced security, admin controls |

### Platforms

| Platform | Available | Notes |
|----------|-----------|-------|
| Windows  | ✅ | Desktop app |
| macOS    | ✅ | Desktop app |
| Linux    | ✅ | Desktop app |
| iOS      | ✅ | Claude iOS app |
| Android  | ✅ | Claude Android app |
| Chrome   | ❌ | |
| web      | ✅ | claude.ai |
| terminal | ❌ | |
| API      | ✅ | Anthropic API |

### Regional

Available globally. Some features may be restricted in certain regions.

### Talking Point

> "Claude's core text conversation is **available on all plans including free** at claude.ai, with apps for macOS, iOS, and Android plus desktop clients. The free tier includes Claude Sonnet 4.6 with usage caps; Pro and higher unlock Opus access and significantly higher limits."

### Sources

- [Claude](https://claude.ai)
- [Anthropic Pricing](https://www.anthropic.com/pricing)

### Changelog

| Date | Change |
|------|--------|
| 2026-03-07T12:00Z | Initial entry |
| 2023-07-11T12:00Z | Claude 2 and claude.ai public launch |
