import { EditorState, StateEffect, StateField, Transaction, Prec } from '@codemirror/state';
import { Decoration, EditorView, WidgetType, keymap, placeholder } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, insertNewline, indentWithTab, undo, redo } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { syntaxTree } from '@codemirror/language';

const Y = globalThis.YoursPPT = globalThis.YoursPPT || {};
const focusEffect = StateEffect.define();
const focusField = StateField.define({
  create: () => false,
  update(value, transaction) {
    for (const effect of transaction.effects) if (effect.is(focusEffect)) value = effect.value;
    return value;
  }
});

function editWidget(view, position) {
  view.dispatch({ selection: { anchor: Math.min(position, view.state.doc.length) }, scrollIntoView: true });
  view.focus();
}

class SourceWidget extends WidgetType {
  constructor(kind, source, position) { super(); this.kind = kind; this.source = source; this.position = position; }
  eq(other) { return other.kind === this.kind && other.source === this.source && other.position === this.position; }
  toDOM(view) {
    const element = document.createElement(this.kind === 'block' ? 'div' : 'span');
    element.className = this.kind === 'block' ? 'live-md-block-widget markdown-rendered' : `live-md-${this.kind}`;
    if (this.kind === 'block') {
      // The shared renderer escapes HTML, sanitizes links, and never fetches images.
      element.innerHTML = Y.renderMarkdown(this.source);
      element.setAttribute('aria-label', '点击编辑 Markdown 源码');
      element.title = '点击编辑';
    } else if (this.kind === 'image') {
      element.textContent = `[图片：${this.source}]`;
    } else if (this.kind === 'task') {
      element.textContent = /x/i.test(this.source) ? '☑' : '☐';
      element.setAttribute('aria-label', /x/i.test(this.source) ? '已完成任务' : '未完成任务');
    } else {
      element.textContent = /^[-+*]$/.test(this.source) ? '•' : this.source;
      element.setAttribute('aria-hidden', 'true');
    }
    element.addEventListener('mousedown', event => {
      if (event.button !== 0) return;
      event.preventDefault();
      editWidget(view, this.position);
    });
    element.addEventListener('click', event => {
      event.preventDefault();
      if (event.detail === 0) editWidget(view, this.position);
    });
    return element;
  }
  ignoreEvent() { return false; }
}

function liveDecorations(state) {
  const ranges = [];
  const lineClasses = new Map();
  const doc = state.doc;
  const focused = state.field(focusField);
  const active = (from, to) => focused && state.selection.ranges.some(range => range.from <= to && range.to >= from);
  const mark = (from, to, className) => { if (to > from) ranges.push(Decoration.mark({ class: className }).range(from, to)); };
  const hide = (from, to, widget, block = false) => {
    if (to > from) ranges.push(Decoration.replace({ widget, block }).range(from, to));
  };
  const lineClass = (position, className) => {
    const from = doc.lineAt(position).from;
    const classes = lineClasses.get(from) || new Set();
    classes.add(className);
    lineClasses.set(from, classes);
  };
  const eachLine = (from, to, className) => {
    const last = doc.lineAt(to).number;
    for (let number = doc.lineAt(from).number; number <= last; number += 1) lineClass(doc.line(number).from, className);
  };
  const children = node => {
    const result = [];
    for (let child = node.firstChild; child; child = child.nextSibling) result.push(child);
    return result;
  };
  const syntaxMark = (from, to, ownerFrom, ownerTo) => {
    if (active(ownerFrom, ownerTo)) mark(from, to, 'live-md-marker');
    else hide(from, to);
  };

  syntaxTree(state).iterate({ enter(reference) {
    const node = reference.node;
    const name = node.name;
    const from = node.from;
    const to = node.to;
    const heading = name.match(/^(?:ATX|Setext)Heading([1-6])$/);
    if (heading) {
      eachLine(from, to, `live-md-h${heading[1]}`);
      for (const child of children(node).filter(child => child.name === 'HeaderMark')) {
        if (name.startsWith('Setext') && !active(from, to)) {
          // A setext underline occupies a separate line; keep the heading's text editable.
          hide(doc.lineAt(child.from).from, child.to, undefined, true);
        } else {
          let end = child.to;
          if (child.from === from && doc.sliceString(end, end + 1) === ' ') end += 1;
          syntaxMark(child.from, end, from, to);
        }
      }
    } else if (name === 'StrongEmphasis' || name === 'Emphasis' || name === 'Strikethrough' || name === 'InlineCode') {
      const className = { StrongEmphasis: 'strong', Emphasis: 'em', Strikethrough: 'strike', InlineCode: 'code' }[name];
      mark(from, to, `live-md-${className}`);
      for (const child of children(node).filter(child => /^(EmphasisMark|StrikethroughMark|CodeMark)$/.test(child.name))) {
        syntaxMark(child.from, child.to, from, to);
      }
    } else if (name === 'Table' || name === 'HorizontalRule') {
      if (!active(from, to)) {
        hide(from, to, new SourceWidget('block', doc.sliceString(from, to), from + 1), true);
        return false;
      }
      eachLine(from, to, name === 'Table' ? 'live-md-table-source' : 'live-md-rule-source');
    } else if (name === 'Image') {
      if (!active(from, to)) {
        const source = doc.sliceString(from, to);
        const label = source.match(/^!\[([^\]]*)\]/)?.[1] || '图片';
        hide(from, to, new SourceWidget('image', label, from + 2));
        return false;
      }
      mark(from, to, 'live-md-image-source');
    } else if (name === 'Link') {
      const punctuation = children(node).filter(child => child.name === 'LinkMark');
      const opening = punctuation[0];
      const closing = punctuation.find(child => doc.sliceString(child.from, child.to) === ']');
      if (opening && closing) {
        mark(opening.to, closing.from, 'live-md-link');
        if (!active(from, to)) {
          hide(from, opening.to);
          hide(closing.from, to);
        } else {
          mark(from, opening.to, 'live-md-marker');
          mark(closing.from, to, 'live-md-marker');
        }
      } else mark(from, to, 'live-md-link');
    } else if (name === 'Blockquote') {
      eachLine(from, to, 'live-md-quote');
    } else if (name === 'QuoteMark') {
      const line = doc.lineAt(from);
      const end = doc.sliceString(to, to + 1) === ' ' ? to + 1 : to;
      syntaxMark(from, end, line.from, line.to);
    } else if (name === 'ListMark') {
      const line = doc.lineAt(from);
      lineClass(from, 'live-md-list-line');
      if (active(line.from, line.to)) mark(from, to, 'live-md-marker live-md-list-mark');
      else hide(from, to, new SourceWidget('list-mark', doc.sliceString(from, to), to));
    } else if (name === 'TaskMarker') {
      const line = doc.lineAt(from);
      if (!active(line.from, line.to)) hide(from, to, new SourceWidget('task', doc.sliceString(from, to), from + 1));
      else mark(from, to, 'live-md-marker');
    } else if (name === 'FencedCode' || name === 'CodeBlock') {
      eachLine(from, to, 'live-md-code-line');
      if (name === 'FencedCode') {
        const marks = children(node).filter(child => child.name === 'CodeMark');
        const opening = marks[0];
        const closing = marks.length > 1 ? marks[marks.length - 1] : null;
        if (!active(from, to) && opening) {
          const firstLine = doc.lineAt(opening.from);
          hide(firstLine.from, firstLine.to, undefined, true);
          if (closing) {
            const lastLine = doc.lineAt(closing.from);
            hide(lastLine.from, lastLine.to, undefined, true);
          }
        } else {
          if (opening) mark(opening.from, doc.lineAt(opening.from).to, 'live-md-marker');
          if (closing) mark(closing.from, closing.to, 'live-md-marker');
        }
      }
      // Code is literal: do not interpret Markdown-looking text within it.
      return false;
    }
  } });
  for (const [from, classes] of lineClasses) ranges.push(Decoration.line({ class: [...classes].join(' ') }).range(from));
  return Decoration.set(ranges, true);
}

const decorationField = StateField.define({
  create: liveDecorations,
  update(value, transaction) {
    if (transaction.docChanged || transaction.selection || transaction.effects.some(effect => effect.is(focusEffect)) || syntaxTree(transaction.startState) !== syntaxTree(transaction.state)) {
      return liveDecorations(transaction.state);
    }
    return value;
  },
  // Block replacements must be supplied by a state field, not a view plugin.
  provide: field => EditorView.decorations.from(field)
});

function applyMarkdownAction(view, action) {
  if (view.compositionStarted) return false;
  const selection = view.state.selection.main;
  const original = view.state.doc.toString();
  const edited = Y.markdownEdit(original, selection.from, selection.to, action);
  if (!edited) return false;
  // Preserve unchanged text so CodeMirror can map selections and compose undo steps.
  let from = 0;
  while (from < original.length && from < edited.value.length && original[from] === edited.value[from]) from += 1;
  let oldTo = original.length;
  let newTo = edited.value.length;
  while (oldTo > from && newTo > from && original[oldTo - 1] === edited.value[newTo - 1]) { oldTo -= 1; newTo -= 1; }
  view.dispatch({
    changes: { from, to: oldTo, insert: edited.value.slice(from, newTo) },
    selection: { anchor: edited.start, head: edited.end },
    scrollIntoView: true,
    annotations: Transaction.userEvent.of(action === 'enter' ? 'input.type' : 'input.format')
  });
  return true;
}

Y.mountMarkdownEditor = function mountMarkdownEditor(host, options = {}) {
  let controller;
  let invalid = Boolean(options.invalid);
  const attributes = {
    id: String(options.id || ''),
    role: 'textbox',
    'data-markdown': '',
    'aria-label': String(options.label || 'Markdown 编辑器'),
    'aria-multiline': 'true',
    'aria-required': String(Boolean(options.required)),
    'aria-invalid': String(invalid),
    spellcheck: 'false'
  };
  if (options.describedby) attributes['aria-describedby'] = String(options.describedby);
  const state = EditorState.create({
    doc: String(options.value ?? ''),
    extensions: [
      markdown({ base: markdownLanguage, addKeymap: false, completeHTMLTags: false, pasteURLAsLink: false }),
      history(),
      focusField,
      decorationField,
      EditorView.lineWrapping,
      placeholder(String(options.placeholder || '输入 Markdown…')),
      EditorView.contentAttributes.of(attributes),
      EditorView.theme({
        '&': { fontSize: 'inherit', background: 'transparent' },
        '&.cm-focused': { outline: 'none' },
        '.cm-scroller': { fontFamily: 'inherit', overflow: 'visible', lineHeight: '1.7' },
        '.cm-content': { minHeight: '3.5em', padding: '10px 0', overflowWrap: 'anywhere' },
        '.cm-line': { padding: '0 12px' },
        '.cm-placeholder': { color: '#8a8176' }
      }),
      Prec.highest(keymap.of([
        ...['Ctrl', 'Meta'].flatMap(modifier => [
          { key: `${modifier}-b`, run: view => applyMarkdownAction(view, 'bold') },
          { key: `${modifier}-i`, run: view => applyMarkdownAction(view, 'italic') },
          { key: `${modifier}-k`, run: view => applyMarkdownAction(view, 'link') },
          { key: `${modifier}-z`, run: undo, shift: redo },
          { key: `${modifier}-y`, run: redo }
        ]),
        { key: 'Enter', run: view => applyMarkdownAction(view, 'enter'), shift: insertNewline },
        indentWithTab,
        ...historyKeymap,
        ...defaultKeymap
      ])),
      EditorView.domEventHandlers({
        focus(event, view) { view.dispatch({ effects: focusEffect.of(true) }); },
        blur(event, view) { view.dispatch({ effects: focusEffect.of(false) }); },
        click(event) { if (event.target.closest?.('a')) event.preventDefault(); }
      }),
      EditorView.updateListener.of(update => {
        if (update.docChanged && controller) options.onChange?.(update.state.doc.toString(), controller);
      })
    ]
  });
  const view = new EditorView({ state, parent: host });
  const preserveComposition = event => {
    // Before the first composition mutation, CodeMirror's `composing` is still
    // false. Respect the native event as well so IME confirmation never reaches
    // list/formatting keymaps. Keep the browser's default composition behavior.
    if (event.isComposing || event.keyCode === 229 || (event.key === 'Enter' && view.compositionStarted)) event.stopImmediatePropagation();
  };
  view.contentDOM.addEventListener('keydown', preserveComposition, true);
  controller = {
    view,
    getValue: () => view.state.doc.toString(),
    focus: () => view.focus(),
    format(action) { const changed = applyMarkdownAction(view, action); view.focus(); return changed; },
    setInvalid(value) {
      invalid = Boolean(value);
      attributes['aria-invalid'] = String(invalid);
      view.contentDOM.setAttribute('aria-invalid', String(invalid));
      // This method may run inside onChange; avoid dispatching another transaction.
      const describedby = host.getAttribute('aria-describedby') || options.describedby;
      if (describedby) { attributes['aria-describedby'] = describedby; view.contentDOM.setAttribute('aria-describedby', describedby); }
      else { delete attributes['aria-describedby']; view.contentDOM.removeAttribute('aria-describedby'); }
    },
    destroy() {
      view.contentDOM.removeEventListener('keydown', preserveComposition, true);
      view.destroy();
    }
  };
  host.classList.add('live-markdown-host');
  return controller;
};
