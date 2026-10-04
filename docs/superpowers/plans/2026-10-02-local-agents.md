# Local Agent Generation Implementation Plan

> **For agentic workers:** Use the parallel runtime, browser-client and bridge tasks below; implementation is authorized in this conversation.

**Goal:** Generate PPTX or HTML from the final review step using locally installed Codex or Claude Code.

**Architecture:** A Node.js loopback server serves the existing static app and an authenticated same-origin API. Each job snapshots the validated draft and original attachments, reuses the complete existing export pipeline, runs an allowlisted CLI in a new job directory, and exposes verified output files. Static file usage and manual export remain available.

**Tech Stack:** Node.js 22 built-ins, existing browser JavaScript, Node test runner, Playwright.

### 1. CLI runtime

- [x] Create `server/agents.cjs` for PATH/native/npm discovery, bounded version probes, stdin prompts, structured logs, cancellation and process-tree timeouts.
- [x] Use Codex workspace-write and Claude scoped tool permissions; retain the CLI's configured authentication and model. Never use permission-bypass flags or interpolate the brief into a shell command.
- [x] Add `tests/agents.test.cjs` with child-process fixtures for detection, stdin, nonzero and semantic errors, cancellation and timeout.

### 2. Local service and job packaging

- [x] Create `server/bridge.cjs` and `scripts/serve.cjs`. Bind `127.0.0.1`, check Host/Origin and a random API token, serve only application assets.
- [x] Implement session/discovery, staged raw attachment upload, start/status/cancel, file and complete-output ZIP download routes. Validate drafts and attachment limits before launching any CLI.
- [x] Reuse `buildPackage` including original skills. Expand trusted entries into a unique `output/agent-runs/<id>/workspace`, preserving bytes and path boundaries; save the ZIP for manual recovery.
- [x] Save outputs under `workspace/artifacts`. Report success only after a successful CLI exit and a nonempty valid-format file matching the selected delivery. Reject symlinks and unsafe download paths.
- [x] Add `tests/bridge.test.cjs` for a complete fake-agent HTTP run, upload integrity, validation, origin/token rejection, traversal, failure, cancellation, and actual output downloads.

### 3. Final-step interface

- [x] Create `src/agent.js`; integrate a focused card in `app.js`, load it in `index.html`, and add responsive styling.
- [x] Discover supported CLIs, snapshot input, upload actual attachments, start the job, poll logs and show downloadable results. Support cancel, retry, refresh recovery and connection failures.
- [x] Keep file-mode offline; show the startup command and preserve manual exports. Explain that generation uses the CLI account/network configuration.

### 4. Validation and documentation

- [x] Document `node scripts/serve.cjs`, output locations, login requirements, permission boundaries, and moving file-mode drafts to the HTTP origin in `README.md`.
- [x] Run `node --test tests/*.test.cjs` and browser smoke tests. Add a browser integration smoke with an injected fixture Agent; separately verify actual installed CLI discovery.
- [x] Review code and delivery assertions. Clearly distinguish simulated generation from any real model run.

## Follow-up: separate generation page

- [x] Add `generate` as step five in `app.js`; keep review/export in step four, mount the Agent controller only on step five, and derive counters and keyboard boundaries from the steps array.
- [x] Accept `generate` in draft normalization, preserve old review drafts, and adapt mobile navigation to five items.
- [x] Update existing model/browser checks for review-to-generation navigation, reload recovery and running jobs across both pages; update the workflow documentation.

Follow-up verification: 15 model/client tests passed; both browser smoke scripts passed with all five steps, including keyboard navigation and reload recovery on the separate generation page. Screenshot: `output/playwright/agent-generation-page.png`.

## Original integration verification evidence

- Existing model/export/folder/style regression: 26 tests passed; the first run also included 5 initial client tests, 31 total. Full offline Skill trees, ZIP hashes and attribution guard passed.
- Final Agent client/runtime/bridge suite: 43 tests passed, including cancellation, orphan-job recovery, malformed XML, path isolation, and semantic failures. An additional targeted run verified corrupted ZIP CRC rejection.
- Both browser acceptance scripts passed: original file-mode flow and real HTTP bridge with a fixture Agent. The latter covers attachments, escaped logs, reload recovery, download, cancel, failure and responsive layout.
- Actual discovery found Codex CLI 0.142.0 and Claude Code 2.1.284. A real Claude Code invocation created a valid minimal HTML file successfully.
- A full Skill-based Claude run created `presentation.html` and a companion JavaScript asset, but continued visual refinement beyond the test's 300-second limit. The bridge correctly marked it failed and preserved its directory. This does not confirm a completed full-style production run; the normal service limit is 30 minutes.
- PPTX was validated with an injected Agent and real OOXML output, not a live model generation. The default Python environment did not have `python-pptx` or `cairosvg`; downstream dependencies remain an environment requirement.
- The production local service was started at `http://127.0.0.1:4173` and verified with actual CLI discovery.
