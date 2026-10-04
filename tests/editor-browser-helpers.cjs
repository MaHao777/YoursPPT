'use strict';

// Source-document helpers keep setup independent of CodeMirror's viewport DOM.
// Acceptance cases still use real keyboard/mouse interaction for user behavior.
const setMarkdown = async (page, id, text, anchor = text.length) => {
  await page.locator(`#${id}`).waitFor();
  await page.evaluate(({ id, text, anchor }) => {
    const editor = window.YoursPPT.getMarkdownEditor(id);
    if (!editor) throw new Error(`Missing Markdown editor: ${id}`);
    editor.view.dispatch({
      changes: { from: 0, to: editor.view.state.doc.length, insert: text },
      selection: { anchor }
    });
  }, { id, text, anchor });
};

const markdownValue = (page, id) => page.evaluate(id => window.YoursPPT.getMarkdownEditor(id).getValue(), id);

const selectMarkdown = async (page, id, from = 0, to) => {
  await page.locator(`#${id}`).focus();
  await page.evaluate(({ id, from, to }) => {
    const editor = window.YoursPPT.getMarkdownEditor(id);
    editor.view.dispatch({ selection: { anchor: from, head: to ?? editor.view.state.doc.length }, scrollIntoView: true });
    editor.focus();
  }, { id, from, to });
};

const selectionOf = (page, id) => page.evaluate(id => {
  const editor = window.YoursPPT.getMarkdownEditor(id);
  const selection = editor.view.state.selection.main;
  return [selection.from, selection.to, editor.view.hasFocus];
}, id);

const editorHost = (page, id) => page.locator(`[data-editor-id="${id}"]`);

// Moving focus off the editor asks live preview to hide inactive syntax.
const renderMarkdown = async (page, id) => {
  await page.locator('.topbar [data-action=settings]').focus();
  await page.waitForTimeout(40);
  return editorHost(page, id);
};

module.exports = { setMarkdown, markdownValue, selectMarkdown, selectionOf, editorHost, renderMarkdown };
