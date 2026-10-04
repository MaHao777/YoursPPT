# Inline Markdown Live Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replace all split Markdown input/preview fields with one editable surface that renders Markdown in place, similar to Obsidian Live Preview.

**Architecture:** Use a locally bundled CodeMirror 6 editor and Markdown syntax decorations. Keep Markdown source as the canonical draft/export value. Show formatting in the editable document; reveal syntax around the active selection and use clickable inline block widgets for tables. Retain existing required fields, safe rendering, shortcuts and synchronous draft backup.

**Tech Stack:** CodeMirror 6, existing Marked/DOMPurify and selection helpers, esbuild for the checked-in offline bundle, Node and Playwright tests.

---

### Editor engine and offline distribution

- [x] Create a reproducible, version-locked bundle and preserve licenses under `assets/lib/`.
- [x] Implement `Y.mountMarkdownEditor(host, options)` returning `view`, `getValue`, `focus`, `format`, `setInvalid`, `destroy`.
- [x] Decorate Markdown headings, emphasis, lists, links, quotes and code in place. Reveal syntax where the user edits; render table blocks safely and allow clicking back into their source.
- [x] Use CodeMirror selection, history and composition support; retain list continuation and formatting shortcuts without rewriting the editable DOM on every input.

### Application integration

- [x] Replace the split editor shell in `app.js`; mount after rendering, destroy before replacing the workspace, and preserve labels/validation focus.
- [x] On every document change update the corresponding field and run the existing immediate-backup path. Never wait for blur to save.
- [x] Replace textarea event handling with controller actions and keep the existing toolbar and specialized date/number/search controls.
- [x] Add cohesive single-surface editor styles, including visible focus, placeholders and mobile layouts. Load the offline bundle in `index.html`.

### Regression and delivery

- [x] Adapt browser helpers to CodeMirror and remove split-pane assertions.
- [x] Exercise real typing, moving the caret through rendered content, formatting, undo/redo, IME, lists, tables, safe rendering, multi-field isolation, reload and old drafts.
- [x] Run existing export/browser and Agent smoke tests, inspect desktop/mobile screenshots, and update the README to describe in-place editing.

Implementation is authorized and proceeds in this conversation without a separate approval step.

### Verification completed (2026-10-04)

- JavaScript syntax checks and all 12 Markdown editing helper tests passed.
- `tests/browser-smoke.cjs` passed the complete offline workflow, responsive layouts, backups/imports and ZIP export audit (13,170 entries).
- `tests/markdown-browser-smoke.cjs` passed 13 single-surface fields, real keyboard/mouse editing, formatting shortcuts, undo/redo, lists, table source editing, draft persistence and legacy migration.
- Chinese input was verified using Chromium IME composition and confirmation events; confirmation Enter leaves composition untouched, and subsequent ordinary Enter continues lists.
- `tests/agent-browser-smoke.cjs` passed the fixture Agent workflow, navigation, uploads, logs, reload, downloads, cancellation and failure handling.
- Desktop/mobile screenshots were inspected at 1440, 768, 390 and 320 px; no page overflow, split preview or remote requests were found.
- The offline editor bundle and 20 dependency license notices rebuild reproducibly; README documentation is updated.