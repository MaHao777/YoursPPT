# PPT Workflow Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a zero-dependency browser workflow that captures PPT briefing logic and exports a structured Markdown brief for a downstream PPT Agent.

**Architecture:** A single-page static app owns a typed form model in browser JavaScript. The model is rendered into a live Markdown preview and downloaded as a deterministic `.md` file; slide entries are repeatable and validated before export. A local `references/` area documents the two requested upstream style repositories without coupling the first prototype to their runtime.

**Tech Stack:** HTML5, CSS3, vanilla JavaScript, browser File API and Blob download; no build step or third-party runtime.

---

### Task 1: Create the app shell and visual system

**Files:**
- Create: `index.html`
- Create: `styles.css`
- Create: `app.js`

- [ ] **Step 1: Add semantic page structure**

Create a two-column workspace with a header, project metadata form, slide outline editor, style selector, reference paths field, Markdown preview, and export action. Every input must have a visible label and stable `id` used by `app.js`.

- [ ] **Step 2: Add the visual system**

Implement a restrained editorial/Swiss layout: warm off-white canvas, dark ink text, red accent, thin borders, generous spacing, responsive single-column fallback under 900px, visible focus states, and compact status badges. Keep all colors and spacing in CSS custom properties.

- [ ] **Step 3: Add initial client-side state and render loop**

Define the state shape `{ title, date, presenter, audience, references, style, slides }`, seed one slide, and render the preview whenever any form or slide field changes. Keep DOM updates scoped to the preview and slide list.

- [ ] **Step 4: Open the static app and smoke-test the shell**

Run `Start-Process .\index.html` and verify the form, empty-state behavior, and responsive layout in a browser.

### Task 2: Implement repeatable slide planning and validation

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `styles.css`

- [ ] **Step 1: Add slide-card controls**

Each slide card must expose slide number, purpose, title, key message, supporting points, visual/data needs, speaker notes, and source paths. Add buttons to append, duplicate, and remove slides while keeping at least one slide.

- [ ] **Step 2: Add explicit logic prompts**

Show helper text that asks for “这一页听众应该记住什么” and “它如何承接上一页”, making the user supply the logic chain instead of allowing the generator to infer it.

- [ ] **Step 3: Add validation**

Require briefing title, date, presenter, audience, and every slide’s title, purpose, and key message. Mark invalid fields inline, update a summary counter, and disable export until valid.

- [ ] **Step 4: Verify interactions manually**

Test adding, duplicating, deleting, editing, and validation recovery. Confirm slide numbers renumber after deletion and no user-entered text is lost during rerender.

### Task 3: Define and export the Markdown contract

**Files:**
- Modify: `app.js`
- Create: `README.md`
- Create: `examples/sample-brief.md`

- [ ] **Step 1: Implement deterministic Markdown serialization**

Serialize frontmatter-like metadata plus a `## Slide N` section for each slide. Include all user-entered logic fields, image/data references, selected style, and an explicit downstream-agent instruction: preserve the narrative chain, flag contradictions, and ask before inventing facts.

- [ ] **Step 2: Normalize user input safely**

Trim line endings, escape Markdown headings where necessary, preserve bullets and paths, and omit empty optional sections. Generate a filename from the title with a safe fallback and append `.md`.

- [ ] **Step 3: Add preview and download actions**

Render the exact serialized Markdown in a read-only preview, provide “复制 Markdown” and “导出 Markdown” buttons, show success/error status, and use `URL.createObjectURL(new Blob(...))` for download.

- [ ] **Step 4: Document the contract**

Explain the workflow, field semantics, browser usage, Markdown schema, and example handoff in `README.md`. Add `examples/sample-brief.md` as a realistic reference output.

### Task 4: Add requested style-reference documentation

**Files:**
- Create: `references/README.md`
- Create: `references/guizang-ppt-skill.md`
- Create: `references/ppt-master.md`

- [ ] **Step 1: Record upstream repositories and usage boundaries**

Document the two GitHub URLs, what visual or native-PPT concerns each informs, and the rule that downstream agents should use them as references rather than blindly merging incompatible logic.

- [ ] **Step 2: Connect style choices to references**

Make each selectable style include a short rationale and a reference key in the exported Markdown so an agent can distinguish editorial/Swiss guidance from native PowerPoint implementation guidance.

### Task 5: Run acceptance checks and polish

**Files:**
- Modify: `README.md`
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `app.js`

- [ ] **Step 1: Run syntax checks**

Run `node --check app.js` and confirm exit code 0.

- [ ] **Step 2: Run an export acceptance check**

Use the browser to fill a two-slide brief, copy or download it, and verify metadata, slide order, paths, style key, and agent constraints are present.

- [ ] **Step 3: Check accessibility and responsive behavior**

Verify keyboard navigation, visible focus, button labels, required-field messaging, and usable layout at desktop and narrow viewport widths.

- [ ] **Step 4: Review the final file list**

Run `rg --files` and confirm the repository contains only the intended app, docs, example, and reference files; report any remaining limitation such as the repositories not being vendored yet.
