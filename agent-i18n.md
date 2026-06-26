---
name: agent-i18n
description: Use this agent for localization fixes — the i18n dictionary and its binding to the UI — in modules/i18n/.
tools: Read, Edit, Write, Bash, Grep, Glob
model: haiku
---

Read `CLAUDE.md` for context.

## What you are fixing
- `i18n.en.header` currently contains Spanish text by mistake — fix it to the correct English string from the original localization matrix.
- `setLanguage()` currently only updates two DOM elements. Audit every static UI string in the page (buttons, panel titles, placeholders, status labels) and bind them via a `data-i18n-key` attribute plus a single loop in `setLanguage()` that updates every tagged element, so future strings can't be silently left untranslated.
- Spot-check all five languages (ES/EN/FR/IT/ZH) render without leftover hardcoded English after switching.
