(function (root) {
  'use strict';
  const Y = root.YoursPPT = root.YoursPPT || {};

  function replace(value, from, to, text, start, end = start) {
    return { value: value.slice(0, from) + text + value.slice(to), start, end };
  }

  function insideFence(value, position) {
    let fence = null;
    const listIndents = [];
    // Measure tabs as indentation columns without changing the edited source.
    const normalizeIndent = line => line.replace(/^[ \t]+/, whitespace => {
      let width = 0;
      for (const character of whitespace) width += character === '\t' ? 4 - width % 4 : 1;
      return ' '.repeat(width);
    });
    const lines = value.slice(0, position).split('\n').map(normalizeIndent);
    for (const line of lines.slice(0, -1)) {
      const indent = line.length - line.trimStart().length;
      if (fence) {
        // A list's code block ends when a nonblank line leaves that list.
        if (fence.indent && line.trim() && indent < fence.indent) fence = null;
        else {
          const closing = line.slice(fence.indent).match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/);
          if (closing && closing[1][0] === fence.mark && closing[1].length >= fence.size) fence = null;
          continue;
        }
      }
      if (!line.trim()) continue;
      while (listIndents.length && indent < listIndents.at(-1)) listIndents.pop();
      let base = listIndents.at(-1) || 0;
      let content = line.slice(base);
      const item = content.match(/^( {0,3})([-+*]|\d+[.)])( +)(.*)$/);
      if (item) {
        base += item[1].length + item[2].length + item[3].length;
        listIndents.push(base);
        content = item[4];
      }
      const opening = content.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
      if (opening && (opening[1][0] !== '`' || !opening[2].includes('`'))) {
        fence = { mark: opening[1][0], size: opening[1].length, indent: base };
      }
    }
    const current = lines.at(-1);
    if (fence?.indent && current.trim() && current.length - current.trimStart().length < fence.indent) return false;
    return Boolean(fence);
  }

  function enter(value, start, end) {
    if (insideFence(value, start)) return null;
    const remaining = value.slice(0, start) + value.slice(end);
    const lineStart = remaining.slice(0, start).lastIndexOf('\n') + 1;
    const nextLine = remaining.indexOf('\n', start);
    const lineEnd = nextLine === -1 ? remaining.length : nextLine;
    const line = remaining.slice(lineStart, lineEnd);
    const match = line.match(/^([ \t]*)([-+*]|\d+[.)])([ \t]+)(?:\[([ xX])\]([ \t]+|$))?(.*)$/);
    if (!match) return null;
    const prefixLength = line.length - match[6].length;
    if (start - lineStart < prefixLength) return null;
    if (!match[6].trim()) {
      return replace(remaining, lineStart, lineEnd, match[1], lineStart + match[1].length);
    }
    const ordered = match[2].match(/^(\d+)([.)])$/);
    const marker = ordered ? `${BigInt(ordered[1]) + 1n}${ordered[2]}` : match[2];
    const prefix = match[1] + marker + match[3] + (match[4] === undefined ? '' : '[ ]' + (match[5] || ' '));
    const text = '\n' + prefix;
    return replace(remaining, start, start, text, start + text.length);
  }

  function inline(value, start, end, mark, placeholder) {
    const selected = value.slice(start, end);
    const italicOutside = mark !== '*' || (value.slice(0, start).match(/\*+$/)?.[0].length % 2 === 1 && value.slice(end).match(/^\*+/)?.[0].length % 2 === 1);
    if (italicOutside && start >= mark.length && value.slice(start - mark.length, start) === mark && value.slice(end, end + mark.length) === mark) {
      return replace(value, start - mark.length, end + mark.length, selected, start - mark.length, end - mark.length);
    }
    const italicInside = mark !== '*' || (selected.match(/^\*+/)?.[0].length % 2 === 1 && selected.match(/\*+$/)?.[0].length % 2 === 1);
    if (italicInside && selected.length >= mark.length * 2 && selected.startsWith(mark) && selected.endsWith(mark)) {
      const text = selected.slice(mark.length, -mark.length);
      return replace(value, start, end, text, start, start + text.length);
    }
    const text = selected || placeholder;
    return replace(value, start, end, mark + text + mark, start + mark.length, start + mark.length + text.length);
  }

  function link(value, start, end) {
    const selected = value.slice(start, end);
    const following = value.slice(end).match(/^\]\([^\n)]*\)/);
    if (start > 0 && value[start - 1] === '[' && following) {
      return replace(value, start - 1, end + following[0].length, selected, start - 1, end - 1);
    }
    const existing = selected.match(/^\[([^\n]*)\]\([^\n)]*\)$/);
    if (existing) return replace(value, start, end, existing[1], start, start + existing[1].length);
    const label = selected || '链接文字';
    return replace(value, start, end, `[${label}](https://)`, start + 1, start + 1 + label.length);
  }

  function block(value, start, end, action) {
    const from = value.slice(0, start).lastIndexOf('\n') + 1;
    // A selection ending at the next line's beginning does not include that line.
    const last = end > start && value[end - 1] === '\n' ? end - 1 : end;
    const newline = value.indexOf('\n', last);
    const to = newline === -1 ? value.length : newline;
    const lines = value.slice(from, to).split('\n');
    const patterns = {
      heading: /^([ \t]*)(#{1,6}[ \t]+)?(.*)$/,
      unordered: /^([ \t]*)(?:([-+*]|\d+[.)])[ \t]+)?(.*)$/,
      ordered: /^([ \t]*)(?:([-+*]|\d+[.)])[ \t]+)?(.*)$/,
      quote: /^([ \t]*)(> ?)?(.*)$/
    };
    const parts = lines.map(line => line.match(patterns[action]));
    const included = lines.map(line => Boolean(line.trim()) || lines.length === 1);
    const hasMarker = part => action === 'heading' ? /^##[ \t]+$/.test(part[2] || '')
      : action === 'unordered' ? /^[-+*]$/.test(part[2] || '')
        : action === 'ordered' ? /^\d+[.)]$/.test(part[2] || '') : Boolean(part[2]);
    const remove = parts.every((part, index) => !included[index] || hasMarker(part));
    let number = 0;
    let firstPrefixLength = 0;
    const updated = parts.map((part, index) => {
      if (!included[index]) return lines[index];
      number += 1;
      const marker = remove ? '' : ({ heading: '## ', unordered: '- ', ordered: `${number}. `, quote: '> ' })[action];
      const prefix = part[1] + marker;
      if (index === 0) firstPrefixLength = prefix.length;
      return prefix + part[3];
    });
    const text = updated.join('\n');
    if (start !== end) return replace(value, from, to, text, from, from + text.length);
    const delta = updated[0].length - lines[0].length;
    const caret = from + Math.max(firstPrefixLength, start - from + delta);
    return replace(value, from, to, text, caret);
  }

  // All offsets use the same UTF-16 indexing as textarea.selectionStart/End.
  Y.markdownEdit = function (value, selectionStart, selectionEnd, action) {
    value = String(value ?? '');
    const offset = position => Math.max(0, Math.min(value.length, Math.trunc(Number(position) || 0)));
    const left = offset(selectionStart);
    const right = offset(selectionEnd);
    const start = Math.min(left, right);
    const end = Math.max(left, right);
    if (action === 'enter') return enter(value, start, end);
    if (action === 'bold') return inline(value, start, end, '**', '粗体文字');
    if (action === 'italic') return inline(value, start, end, '*', '斜体文字');
    if (action === 'code') return inline(value, start, end, '`', '代码');
    if (action === 'link') return link(value, start, end);
    if (['heading', 'unordered', 'ordered', 'quote'].includes(action)) return block(value, start, end, action);
    return null;
  };
})(globalThis);
