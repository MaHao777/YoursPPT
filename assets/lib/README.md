# Offline Markdown libraries

- Marked 15.0.12: https://github.com/markedjs/marked (MIT, `marked-LICENSE.md`).
- DOMPurify 3.4.16: https://github.com/cure53/DOMPurify (Apache-2.0 OR MPL-2.0, `DOMPurify-LICENSE`).
- CodeMirror 6 and its Markdown parser: `live-markdown-editor.bundle.js`, built from `src/live-markdown-editor.js`. Exact dependency versions are locked in `scripts/editor-build/package-lock.json`; all bundled dependency license texts are preserved in `live-editor-LICENSES.txt`.

Fixed releases downloaded from jsDelivr / upstream GitHub. These scripts load locally; no CDN is contacted by the application. Raw HTML is displayed as text, image syntax displays its description, and the rendered result is sanitized before insertion.

The single-surface editor bundle is generated locally with `npm --prefix scripts/editor-build ci --ignore-scripts` followed by `npm --prefix scripts/editor-build run build`. The build script emits the browser IIFE and verifies that every bundled package has a preserved license. The application needs no package installation or network access at runtime.
