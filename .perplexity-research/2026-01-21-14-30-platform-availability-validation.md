# Platform Availability Validation Report

**Query:** Validate platform availability across all AI platforms (Windows, macOS, Linux, iOS, Android, web, terminal, API)
**Model:** sonar-pro
**Date:** 2026-01-21 14:30
**Cost:** ~$0.13 (6 queries)

---

## Summary of Findings

### Claude (Anthropic)

| Platform | Current Data | Research Finding | Discrepancy? |
|----------|-------------|------------------|--------------|
| Windows | ✅ | ✅ Desktop app available | ✓ Match |
| macOS | ✅ | ✅ Desktop app available | ✓ Match |
| Linux | ❌ | ✅ **Desktop app now available** | ⚠️ **UPDATE NEEDED** |
| iOS | ✅ | ✅ Native app | ✓ Match |
| Android | ✅ | ✅ Native app | ✓ Match |
| web | ✅ | ✅ claude.ai | ✓ Match |
| terminal | ✅ | ✅ Claude Code CLI | ✓ Match |
| API | ✅ | ✅ Anthropic API | ✓ Match |

**Key Finding:** Claude Desktop now supports Linux (Claude Code integration for coding/debugging in git worktrees).

---

### ChatGPT (OpenAI)

| Platform | Current Data | Research Finding | Discrepancy? |
|----------|-------------|------------------|--------------|
| Windows | ✅ | ✅ Desktop app (paid users) | ✓ Match |
| macOS | ✅ | ✅ Desktop app | ✓ Match |
| Linux | ❌ | ❌ No native app | ✓ Match |
| iOS | ✅ | ✅ Native app | ✓ Match |
| Android | ✅ | ✅ Native app | ✓ Match |
| web | ✅ | ✅ chatgpt.com | ✓ Match |
| terminal | ❌ | ❌ No CLI | ✓ Match |
| API | ✅ | ✅ OpenAI API | ✓ Match |

**Note:** Voice on macOS desktop app retired January 15, 2026. WhatsApp integration ended January 15, 2026.

---

### Google Gemini

| Platform | Current Data | Research Finding | Discrepancy? |
|----------|-------------|------------------|--------------|
| Windows | ✅ | ✅ Via Google Labs/PWA | ✓ Match |
| macOS | ✅ | ⚠️ **No native app, web only** | ⚠️ **CHECK NEEDED** |
| Linux | ❌ | ❌ Web only | ✓ Match |
| iOS | ✅ | ✅ Native app | ✓ Match |
| Android | ✅ | ✅ Native app | ✓ Match |
| web | ✅ | ✅ gemini.google.com | ✓ Match |
| terminal | ❌ | ❌ No CLI | ✓ Match |
| API | ✅ | ✅ Google AI API | ✓ Match |

**Key Finding:** Windows has a desktop app via Google Labs. macOS has no native app - only web/Chrome. "Gemini in Chrome" rolling out.

---

### Microsoft Copilot

| Platform | Current Data | Research Finding | Discrepancy? |
|----------|-------------|------------------|--------------|
| Windows | ✅ | ✅ Native app, pre-installed on Win11 | ✓ Match |
| macOS | ✅ | ✅ "Copilot for Mac" via App Store | ✓ Match |
| Linux | ❌ | ❌ No native app | ✓ Match |
| iOS | ✅ | ✅ Native app | ✓ Match |
| Android | ✅ | ✅ Native app | ✓ Match |
| web | ✅ | ✅ copilot.microsoft.com | ✓ Match |
| terminal | ❌ | ❌ No CLI | ✓ Match |
| API | ❌ | ❌ No public API | ✓ Match |

**Note:** WhatsApp/third-party messaging support ended January 15, 2026.

---

### Grok (xAI)

| Platform | Current Data | Research Finding | Discrepancy? |
|----------|-------------|------------------|--------------|
| Windows | ✅ | ⚠️ **No official app, third-party only** | ⚠️ **CHECK NEEDED** |
| macOS | ✅ | ⚠️ **No official app, third-party only** | ⚠️ **CHECK NEEDED** |
| Linux | ❌ | ❌ No app | ✓ Match |
| iOS | ✅ | ✅ Official app | ✓ Match |
| Android | ✅ | ✅ Official app | ✓ Match |
| web | ✅ | ✅ grok.com | ✓ Match |
| terminal | ❌ | ❌ No CLI | ✓ Match |
| API | ✅ | ✅ xAI API | ✓ Match |

**Key Finding:** Grok has NO official Windows/macOS desktop apps. The current data showing ✅ may be incorrect - only third-party wrappers exist.

---

### Perplexity

| Platform | Current Data | Research Finding | Discrepancy? |
|----------|-------------|------------------|--------------|
| Windows | ✅ | ✅ Comet browser | ✓ Match |
| macOS | ✅ | ✅ Comet browser | ✓ Match |
| Linux | ❌ | ✅ **Comet browser available on Linux** | ⚠️ **UPDATE NEEDED** |
| iOS | ✅ | ✅ Native app (redesigned iPad app Jan 2026) | ✓ Match |
| Android | ✅ | ✅ Native app + Comet for Android | ✓ Match |
| web | ✅ | ✅ perplexity.ai | ✓ Match |
| terminal | ❌ | ❌ No CLI | ✓ Match |
| API | ✅ | ✅ Perplexity API | ✓ Match |

**Key Finding:** Comet browser is available on Linux! Current data shows ❌ but should be ✅.

---

## Recommended Updates

### High Priority (Data is incorrect)

1. **Claude - Linux**: Change from ❌ to ✅ - Claude Desktop now supports Linux
2. **Perplexity - Linux**: Change from ❌ to ✅ - Comet browser available on Linux
3. **Grok - Windows/macOS**: Consider changing from ✅ to ⚠️ or ❌ - No official apps exist, only third-party wrappers

### Medium Priority (Clarification needed)

4. **Gemini - macOS**: Currently ✅ but there's no native macOS app - only web/PWA. May want to clarify or mark as ⚠️

---

## Citations

### Claude
- https://claude.com/download
- https://blog.getbind.co/claude-code-is-now-available-on-the-claude-desktop-app/
- https://support.claude.com/en/articles/10065433-installing-claude-desktop

### ChatGPT
- https://help.openai.com/en/articles/6825453-chatgpt-release-notes
- https://apps.microsoft.com/detail/9nt1r1c2hh7j

### Google Gemini
- https://gemini.google/release-notes/
- https://gemini.google/overview/gemini-in-chrome/
- https://ai.google.dev/gemini-api/docs/deprecations

### Microsoft Copilot
- https://www.microsoft.com/en-us/microsoft-copilot/for-individuals/get-copilot
- https://www.microsoft.com/en-us/microsoft-365-copilot/download-copilot-app

### Grok
- https://x.ai/grok
- https://grok.com

### Perplexity
- https://www.perplexity.ai/comet/
- https://www.perplexity.ai/help-center/en/articles/11172798-getting-started-with-comet
