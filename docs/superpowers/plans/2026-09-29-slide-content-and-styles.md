# Slide Content and Styles Implementation Plan

> **For agentic workers:** Execute this plan task-by-task in the current session.

**Goal:** Provide complete per-slide AI context, import references at the beginning, and expand offline style choices.

**Architecture:** Keep the static offline application and existing version-2 storage contract. Migrate legacy key/support into summary/content on read. Share one attachment library between the first step and per-slide selection; preserve stable IDs and original bytes. Vendor Markdown rendering locally and pass selected style resources through the existing export pipeline.

**Tech Stack:** Plain JavaScript, CSS, Marked, DOMPurify, Node test runner, existing Playwright acceptance script.

### Task 1: Content model and Markdown
- [x] Modify `src/model.js`: migrate legacy fields, validate summary/content, redirect old materials steps to context.
- [x] Add `src/markdown.js` and local licensed libraries in `assets/lib/`; render headings, lists, tables, quotes, code and links safely without automatic external requests.
- [x] Modify `app.js` and `src/export.js`: editor preview, review and Brief carry all five content categories; preserve raw Markdown in export.
- [x] Verify legacy migration, duplication, required fields and Markdown rendering/export.

### Task 2: Shared reference library
- [x] Modify `app.js`: merge materials into context and remove the standalone navigation step.
- [x] Add per-slide source filtering, file import and a searchable folder selection dialog; add only selected files and associate them with the initiating slide.
- [x] Preserve deduplication, restoration, size limits, unlinking and binary persistence.
- [x] Verify initial import, per-slide selection, folder filtering, cancel, restoration and export mappings.

### Task 3: Style catalog
- [x] Modify `src/styles.js`: add six distinct styles with two palettes each, typography, layouts, rules and PPT Master visual reference IDs.
- [x] Modify model normalization and exporter resolution to accept registered styles and attach the matching resource family for either output format.
- [x] Modify CSS and preview to distinguish the styles and maintain mobile layout.
- [x] Verify every style survives save/import and exports its own colors, rules and visual reference path.

### Task 4: Acceptance
- [x] Update `README.md` and existing tests to the four-step workflow.
- [x] Run model, folder and export tests directly with Node (8 + 2 + 15 passing); independently verify the new visual HTML ZIP (1 passing).
- [x] Run `node tests/browser-smoke.cjs <available-playwright-module>` and inspect screenshots at desktop and mobile widths.
