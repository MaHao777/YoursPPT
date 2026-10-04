# Slide Fields and Markdown Editors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Require only each slide's topic, purpose and content; make details and transitions optional; provide live Markdown editing and simple formatting shortcuts for every authored text field.

**Architecture:** Keep the static offline app and existing sanitized Marked renderer. Normalize legacy summary/key into optional details, share an editor shell for text fields, and isolate selection transformations in a pure helper. Native date, numeric and material-search controls retain their specific purpose.

**Tech Stack:** Browser JavaScript, local Marked and DOMPurify, Node test runner, existing Playwright smoke scripts.

---

### 1. Fields, validation and handoff

- [x] Update `src/model.js` to validate only `title`, `purpose`, `content`; preserve all old summary/key values in optional `details` and existing references/notes.
- [x] Update `src/export.js` to export topic, purpose, content, details and transition as Markdown source, retaining optional visual, notes and source fields.
- [x] Update model/export regressions: a slide with the three required fields passes; optional blanks pass; whitespace required fields fail; legacy details survive normalize/duplicate/export.

### 2. Shared Markdown editor

- [x] Create `src/markdown-editor.js`: `markdownEdit(value, start, end, action)` returns `{ value, start, end }` or `null`. Implement list continuation and empty-item exit; ordered-list increment; unchecked task continuation; fenced-code protection; selection-aware formatting.
- [x] Add `tests/markdown-editor.test.cjs` to verify these transformations and selection positions.
- [x] Update `app.js` field rendering with a textarea, toolbar and live sanitized preview for every narrative field; keep date/duration/search controls specialized. Update only the edited preview on input, preserving focus and text selection.
- [x] Integrate toolbar and Ctrl/Cmd+B/I/K shortcuts plus Enter list behavior, with Shift+Enter and IME composition left to the browser. Load the helper from `index.html` and apply responsive editor styles in `styles.css`.

### 3. Consistent presentation and verification

- [x] Align outline completion, review display and style preview with topic/purpose/content/details; render authored Markdown safely in review.
- [x] Update `README.md` with fields, migration and shortcuts.
- [x] Run `node --test tests/*.test.cjs`; update and run `tests/browser-smoke.cjs` plus focused editor browser coverage for live preview, toolbar, Enter/empty exit, IME/Shift+Enter, persistence and optional blanks.
- [x] Inspect desktop/mobile screenshots and fix any overflow. Run the existing Agent browser smoke to verify generation eligibility remains consistent.

Implementation is authorized in this conversation and is proceeding in parallel; no separate execution approval is required.


## Verification evidence

- 83 Node tests passed across the existing model/export/visual-export, folder/agent-client/agents/bridge suites and 12 Markdown editing regressions.
- `tests/browser-smoke.cjs` passed, including an independent audit of 13,170 ZIP entries and all existing styles and material workflows.
- `tests/markdown-browser-smoke.cjs` passed: all 13 text editors, eight toolbar actions, Ctrl/Cmd shortcuts, list continuation/exit, IME and Shift+Enter, immediate backup, migration, per-slide isolation and 320/390/768/1440 px layouts.
- `tests/agent-browser-smoke.cjs` passed with the deterministic fixture Agent; no real model generation was requested or run.
- Independent Chrome checks confirmed undo restores formatting/list operations and updates saved content. Additional list-contained and indented-code fence regressions passed.
- Visual inspection found and resolved long-code overflow in review grid items and long-content overflow in the structure preview. Final desktop/mobile structure screenshots show both title and card summaries.
- Screenshots: `output/playwright/markdown-outline-1440.png`, `markdown-outline-390.png`, `markdown-structure-1440.png`, `markdown-structure-390.png`.
- Local Agent prompt in `server/bridge.cjs` now follows the same required/optional fields and Markdown interpretation as the exported Brief.
