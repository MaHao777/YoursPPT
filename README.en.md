# YoursPPT

[简体中文](README.md) · **English**

Think first, then build. YoursPPT is a local presentation workspace that organizes your slide logic, original files and visual requirements into a complete work package. In the final step, it can run your local Codex or Claude Code to generate a PPTX or HTML presentation.

You decide the ideas and arguments. The application does not invent facts or evidence.

## Getting started

Use Node.js 22 or newer. From the project directory, run:

```powershell
node scripts/serve.cjs
```

Open the [local workspace](http://127.0.0.1:4173) in desktop Chrome or Edge. The server needs no npm installation and listens only on `127.0.0.1`. If the port is in use, set `YOURSPPT_PORT` before starting.

You can also open `index.html` directly to prepare content and export work packages offline. A browser file page cannot launch local programs. File pages and the local server have separate browser storage: save a draft ZIP in Settings before switching, then import it in the new workspace to restore text and original files. Older JSON drafts remain supported but require reselecting files. Keep `src/`, `styles.css`, `app.js` and `assets/` alongside `index.html`.

The home page offers New presentation, Open draft and Explore the workflow. An existing local draft can be resumed. The top bar and navigation stay fixed while content scrolls. Workflow headers contain only a compact bold title. Slide lists and editors, and style lists and previews, scroll independently; small screens place the lists above their content. Thin scrollbar thumbs fade in during scrolling and fade out afterwards, without arrows or tracks. Content edges fade when more content lies beyond them. Reduced-motion preferences disable scrollbar animation.

1. **Goals & references:** Enter the title, date, presenter and audience. Import files or folders, or drop original files. Directory structure and original bytes are preserved.
2. **Slide outline:** Each slide requires a title, purpose and content. Details and transitions are optional. Text fields use Markdown with a single live-preview editor: markup appears near the cursor and formatted text returns when you move away. Tables render inline and can be clicked to edit their source. Review pages render Markdown too. Dates, duration and file search use dedicated controls. Select references from the shared library or search a folder from the current slide. Visual direction and speaking notes are optional.
3. **Visual style:** Choose from nine styles and 26 palettes: Editorial, Swiss grid, Research briefing, Minimal monochrome, Dark technology, Soft pastels, Bold color, Elegant gold & black and Vintage paper. Research briefing includes five palettes. Each style previews its typography, composition, graphics and colors. PPTX / HTML is selected independently.
4. **Review & export:** Review slide content and references, export a complete work package, then continue to Agent generation.
5. **Agent generation:** Select a discovered local Agent with the rounded picker. Generate PPTX or HTML, view logs, cancel a job and download results. Missing required information or original files prevents generation. Drafts and unfinished work packages can still be exported; `brief.md` lists missing information.

## Appearance, language and settings

Settings has three pages. Click a tab or use the arrow keys to navigate.

- **Appearance & language:** Select a light or dark workspace and Simplified Chinese or English. The default is light with Chinese. Preferences are saved in the current browser and persist after reload.
- **Files & drafts:** Choose an export folder, save a draft ZIP, import a draft or resume your local draft. Open draft on the home page opens this tab directly.
- **Agent:** Read local Agent setup guidance and open the generation page. The picker supports mouse selection, arrow keys, Home / End, Enter and Escape.

Changing the interface language preserves presentation text, file names, original files and raw Agent logs. It does not rewrite exported content. The workspace theme is independent of presentation style and palette.

## Using a local Agent

- Discovers **Codex CLI** and **Claude Code** in PATH and common user installation locations, including Windows npm installations. Only Agents with a successful version probe can be selected. Discovery does not verify login or quota; complete CLI login and initial setup in your terminal first.
- Uses the Agent’s existing account, model and network configuration. No API key is collected in the UI. Generation may send your brief and selected files to the Agent’s model service and consume account quota.
- Each run preserves the content snapshot taken when you click, original files and complete Skills. You can keep editing; changes require a new run. The service runs one job at a time. Reloading the same tab can restore job progress; existing files remain on disk after a service restart.
- Job directory: `output/agent-runs/<job ID>/`. `work-package.zip` contains the inputs; `workspace/` is the production directory; final files are in `workspace/artifacts/`. `prompt.txt` and `job.json` preserve the entry prompt and final status. Old jobs are not overwritten and files are not deleted automatically.
- Codex uses `workspace-write`. Claude Code uses edit permissions and a limited Python / Node tool allowlist. Adapters do not add flags that bypass all approvals. Missing dependencies or permissions, expired login, and execution timeouts are reported as failures. Optional rejected operations remain visible in logs and production notes.
- A job completes only after a successful CLI exit and valid, nonempty files matching the selected delivery format. Format checks do not verify content or visual quality; inspect the result. Download all results as ZIP for HTML with supporting resources, then extract before opening.
- The local service verifies request origins and session tokens. It is intended for local use, rather than public or multi-user hosting. Generated HTML is downloaded as a file and does not execute within the application’s origin.

Adapter references: [Codex noninteractive mode](https://learn.chatgpt.com/docs/non-interactive-mode) and [Claude Code headless usage](https://code.claude.com/docs/en/headless). Additional Agents should use controlled adapters instead of accepting arbitrary browser commands.

Previews illustrate visual direction; they are not the final presentation or a guarantee of pixel-perfect reproduction. Palettes are application presets. Additional styles include original PPT Master visual references. Elegant gold & black is an application style inspired by Editorial principles. Visual choices preserve your argument’s order.

Legacy slide summaries and conclusions migrate into optional details; supporting points migrate into content. The retired reference-files step redirects to the first step. The editor uses a local CodeMirror 6 bundle. Review and table rendering use bundled Marked and DOMPurify. Raw HTML is displayed as text; image syntax displays descriptions without fetching external images.

## Markdown editing

- Edit and view formatting in the same area. Headings, lists and emphasis render as you type. Click text to continue editing or a table to edit its source.
- The subtle Markdown button opens a dedicated syntax and shortcut guide. Use Markdown directly or keyboard shortcuts.
- Enter continues unordered, numbered and task lists. Empty list items exit on Enter; Shift + Enter inserts a line break. Code fences retain ordinary line breaks.
- Ctrl / ⌘ + B applies bold, Ctrl / ⌘ + I italic and Ctrl / ⌘ + K inserts a link. Chinese input-method confirmation does not trigger list continuation.
- Ctrl / ⌘ + Z undoes; Ctrl / ⌘ + Shift + Z redoes.
- Markdown source is saved immediately and preserved verbatim in work packages. Empty details and transitions do not block export or generation.

## Complete work packages

Download a ZIP and hand off the entire extracted folder. Settings can select an export folder for draft ZIPs, work-package ZIPs and Agent results. Folder handles are saved in this browser and may require renewed permission after reopening. Duplicate names are numbered. Failed permissions are reported; reselect the folder or use browser downloads. Browsers supporting File System Access and raw DEFLATE decompression also offer Save as folder, creating a unique child folder without overwriting existing content.

```text
presentation-title/
├─ draft.json                 Recoverable draft, position and file associations
├─ brief.md                   Full content, slide logic, gaps and Agent instructions
├─ references/
│  ├─ manifest.json           Stable IDs, original names and relative paths
│  └─ …                       Original file bytes
└─ style/
   ├─ selection.json          Style, exact colors, layouts and delivery format
   ├─ guide.md                Requirements and complete Skill entry points
   └─ skills/
      ├─ guizang-ppt-skill/    Complete snapshot when required by the style
      └─ ppt-master/          Included for PPTX, research and additional visual styles
```

Guizang styles with PPTX include both Skills. Complete PPT Master resources are about 53 MB compressed and contain 12,953 files. Folder export writes thousands of files and is usually slower than ZIP download; keep the page open.

Failed folder exports retain `INCOMPLETE.txt`. Do not hand such a folder to an Agent; export again. Browsers without folder selection can download ZIPs.

Suggested Agent prompt:

> Read brief.md and style/guide.md in the work package and follow the included Skills. Preserve my slide logic, identify missing information, then generate the requested presentation format.

Packages do not depend on absolute local `vendor/` paths. Production software, Python / Node dependencies, models and network services must still be supplied by the downstream Agent’s environment.

## Drafts and privacy

- Text is backed up immediately in browser local storage. Text and original files are automatically saved in IndexedDB and restored after reload.
- Files & drafts provides save, import and resume actions. Draft ZIPs preserve unfinished slides, active position, style and original files without requiring complete fields. Imports validate file size, ZIP structure and CRC; corrupt files do not replace your draft.
- Work-package ZIPs also include `draft.json` and can be imported. Missing files remain flagged while associations are retained. Older JSON drafts require reselecting files.
- Clearing browser data, switching browsers, private windows and quota restrictions can cause local data loss. Save important drafts as ZIPs or export work packages.
- Limits: 100 MB per file, 300 MB total, 200 slides. Duplicate files are checked by bytes. Files with identical names but different content are retained; export handles Unicode names and path collisions.
- Offline preparation and export do not upload files or automatically contact third parties. Local Agent generation sends the package to this computer’s service, then the CLI calls its configured model. Upstream links open external repositories; downstream Skill network behavior is managed by the Agent.
- Alt + left / right switches steps. Returning to earlier steps preserves your input.

## Project structure and development

```text
index.html / styles.css / app.js   UI, appearance and interaction
src/model.js                      Draft schema, validation and example
src/storage.js                    Storage, binary recovery and folder handles
src/preferences.js                Theme, language and cross-tab synchronization
src/i18n.js                       UI translations and content protection
src/draft.js                      Draft ZIP and work-package import
src/scroll.js                     Scrollbar transitions and content-edge fades
src/styles.js                     Presentation styles, colors and sources
src/markdown.js                   Local Markdown rendering and sanitization
src/markdown-editor.js            Formatting and list continuation helpers
src/live-markdown-editor.js       CodeMirror live-preview source
scripts/editor-build/            Locked editor dependencies and bundle build
assets/lib/                       Offline libraries and original licenses
src/zip.js / export.js / folder.js ZIP, brief and folder delivery
src/agent.js                      Local Agent client and generation UI
server/                          Discovery, execution, API and artifact checks
scripts/serve.cjs                 Local workspace server entry point
assets/skills/                    Precompressed offline Skill resources
scripts/build-skill-assets.cjs    Resource builder from upstream snapshots
tests/                           Unit, export, folder and browser checks
vendor/                          Complete original upstream snapshots
```

Runtime libraries are bundled locally; no online build or npm install is needed. After editing the CodeMirror source, run `npm --prefix scripts/editor-build ci --ignore-scripts` and `npm --prefix scripts/editor-build run build` to update the bundle and license record. Development tests use Node.js 22+ and Python 3. Browser checks require Playwright and local Chrome. Folder tests verify unique names and incomplete markers. Native browser writing checks use an isolated OPFS folder on localhost instead of a real system folder picker.

```powershell
node --test tests/*.test.cjs
node tests/workspace-browser-smoke.cjs
node tests/browser-smoke.cjs
node tests/markdown-browser-smoke.cjs
node tests/agent-browser-smoke.cjs
node tests/preferences-browser-smoke.cjs
```

Pass a Playwright module path as the second argument if it is installed outside this project. Screenshots and download checks are stored in `output/playwright/`.

After updating upstream snapshots, rebuild offline resources:

```powershell
node scripts/build-skill-assets.cjs
```

The builder retains complete trees, directories, licenses, source records, sponsorship notices and attribution guards, excluding Git internals and caches. Tests independently extract ZIPs and verify original hashes, UTF-8 names, CRC, relative paths and guards.

## Upstream projects and licenses

- [Guizang PPT Skill](https://github.com/op7418/guizang-ppt-skill): snapshot includes AGPL-3.0.
- [PPT Master](https://github.com/hugohe3/ppt-master): snapshot includes MIT.

Original licenses, copyright notices and attribution guards are retained. Fonts, images and other third-party assets may have separate terms. Before an open-source release, choose a license for YoursPPT’s own code and review redistributed resources. See [vendor/README.md](vendor/README.md).
