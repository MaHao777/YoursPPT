# Appearance and Language Implementation Plan

> Execute the implementation inline in this chat, then verify the resulting browser flows.

**Goal:** Compact workflow headings, animate scrollbar visibility, improve Agent selection, and provide persistent light/dark themes and Chinese/English UI in tabbed settings.

**Architecture:** Keep browser preferences separate from draft and presentation styles. Add an interface translation catalog that preserves editable content, filenames, previews and raw Agent logs. Use shared CSS tokens for the workspace and a keyboard-accessible Agent picker backed by the existing selection state.

**Tech Stack:** Vanilla JavaScript, CSS, Node.js built-in tests, existing Playwright browser smoke scripts.

### Tasks

- [x] Remove the workflow subtitle and STEP label in app.js; reduce stage padding and heading spacing in styles.css.
- [x] Animate an inherited scrollbar color using a registered CSS custom property; preserve native scrolling and reduced-motion preferences.
- [x] Replace the visible native Agent dropdown with rounded trigger/options, selected and unavailable states, arrow/Enter/Escape navigation and click-away handling in src/agent.js.
- [x] Add src/preferences.js and src/i18n.js; validate stored values, default to Chinese/light, apply before first paint, and keep draft data independent.
- [x] Split index.html settings into accessible Appearance & Language, Files & Drafts, and Agent tabs. Preserve current folder, backup and import behavior.
- [x] Translate interface labels, placeholders, help and status messages; exclude user content and raw job output. Add README.en.md and cross-links in README.md.
- [x] Verify preference persistence, language switching without content changes, theme coverage, settings keyboard navigation, Agent choice and scrollbar interpolation in a deterministic browser fixture. Run existing unit/browser checks and inspect screenshots at desktop and narrow widths.

**Validation commands:** `node --test tests/*.test.cjs`, `node tests/preferences-browser-smoke.cjs <playwright-module>`, and the existing workspace/Agent/Markdown/browser smoke scripts with the same module path.

**Results:** 89 unit and archive tests passed. Workspace, Markdown, Agent, full browser export/import and preference browser checks passed. English UI audit covers all nine visual styles and their expanded principles, settings, help and validation. Screenshots verified desktop and mobile theme/Agent layouts. Preference checks preserve original text, filenames and file bytes and cover cross-tab updates and language switching during export.
