'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
require('../src/markdown-editor.js');
const edit = globalThis.YoursPPT.markdownEdit;
const atEnd = (value, action = 'enter') => edit(value, value.length, value.length, action);
const selection = result => result.value.slice(result.start, result.end);

test('Enter continues unordered, numbered, and task lists while preserving indentation', () => {
  for (const marker of ['-', '*', '+']) assert.equal(atEnd(`  ${marker} 内容`).value, `  ${marker} 内容\n  ${marker} `);
  assert.equal(atEnd('9. 第九项').value, '9. 第九项\n10. ');
  assert.equal(atEnd('\t42) 项目').value, '\t42) 项目\n\t43) ');
  assert.equal(atEnd('99999999999999999999. 项目').value, '99999999999999999999. 项目\n100000000000000000000. ');
  for (const checked of ['x', 'X', ' ']) assert.equal(atEnd(`- [${checked}] 任务`).value, `- [${checked}] 任务\n- [ ] `);
  assert.equal(atEnd('  2. [x] 任务').value, '  2. [x] 任务\n  3. [ ] ');
});

test('Enter exits empty list items, preserves nesting indentation, and otherwise leaves default handling', () => {
  for (const value of ['- ', '*   ', '+ ', '2. ', '- [ ] ', '- [x] ', '- [ ]', '- [x]']) assert.equal(atEnd(value).value, '');
  assert.deepEqual(atEnd('- 第一项\n  - '), { value: '- 第一项\n  ', start: 8, end: 8 });
  assert.equal(edit('- \n下一行', 2, 2, 'enter').value, '\n下一行');
  assert.equal(atEnd('普通文字'), null);
  assert.equal(atEnd('-'), null);
  assert.equal(edit('- 内容', 1, 1, 'enter'), null);
});

test('Enter splits at the caret, replaces a selection, and keeps following lines intact', () => {
  assert.deepEqual(edit('- 苹果香蕉\n- 下一项', 4, 4, 'enter'), { value: '- 苹果\n- 香蕉\n- 下一项', start: 7, end: 7 });
  assert.equal(edit('- 苹果和香蕉', 4, 5, 'enter').value, '- 苹果\n- 香蕉');
  assert.equal(edit('- 苹果\n忽略\n香蕉', 4, 8, 'enter').value, '- 苹果\n- 香蕉');
});

test('Enter never continues lists inside backtick or tilde fenced code', () => {
  for (const fence of ['```', '~~~~']) assert.equal(atEnd(`${fence}text\n- 内容`), null);
  assert.equal(atEnd('````\n```\n- 内容'), null);
  assert.equal(atEnd('```\n~~~\n- 内容'), null);
  assert.equal(atEnd('```\n```fake\n- 内容'), null);
  assert.equal(atEnd('  ```js\n  - 内容'), null);
  assert.equal(atEnd('```\n- 代码\n```\n- 内容').value, '```\n- 代码\n```\n- 内容\n- ');
  assert.equal(atEnd('~~~~\n- 代码\n~~~~~\n- 内容').value, '~~~~\n- 代码\n~~~~~\n- 内容\n- ');
});

test('list-contained fences suppress continuation until their closing fence or list dedent', () => {
  for (const value of ['- ```js\n  - value', '1. ```js\n   - value', '- 外层\n  - ~~~\n    - value']) {
    assert.equal(atEnd(value), null);
  }
  const closed = '1. ```js\n   - value\n   ```\n2. 内容';
  assert.equal(atEnd(closed).value, closed + '\n3. ');
  const dedented = '1. ```js\n   - value\n- 内容';
  assert.equal(atEnd(dedented).value, dedented + '\n- ');
  const previousDedent = '- ```\n  - value\n退出列表\n\n- 内容';
  assert.equal(atEnd(previousDedent).value, previousDedent + '\n- ');
  assert.equal(atEnd('- 外层\n  ```\n  - value'), null);
});

test('four-space indented code does not open or close a top-level fence', () => {
  for (const indent of ['    ', '\t']) {
    const value = indent + '```\n\n- item';
    assert.equal(atEnd(value).value, value + '\n- ');
  }
  assert.equal(atEnd('```\n    ```\n- 仍在代码内'), null);
  assert.equal(atEnd('   ```\n- 仍在代码内'), null);
});

test('inline formatting wraps selected Unicode and toggles both inner and complete selections', () => {
  for (const [action, mark] of [['bold', '**'], ['italic', '*'], ['code', '`']]) {
    const applied = edit('前你好🌟后', 1, 5, action);
    assert.equal(applied.value, `前${mark}你好🌟${mark}后`);
    assert.equal(selection(applied), '你好🌟');
    assert.equal(edit(applied.value, applied.start, applied.end, action).value, '前你好🌟后');
    assert.equal(edit(applied.value, 1, applied.value.length - 1, action).value, '前你好🌟后');
    const inserted = atEnd('文字', action);
    assert(selection(inserted).length > 0);
    assert.equal(inserted.value.slice(0, 2), '文字');
  }
});

test('links select their label, insert an editable URL, and toggle existing links', () => {
  const linked = edit('前中文链接后', 1, 5, 'link');
  assert.equal(linked.value, '前[中文链接](https://)后');
  assert.equal(selection(linked), '中文链接');
  assert.equal(edit(linked.value, linked.start, linked.end, 'link').value, '前中文链接后');
  assert.equal(edit('[标签](https://example.com)', 0, 25, 'link').value, '标签');
  assert.equal(selection(atEnd('', 'link')), '链接文字');
});

test('italic formatting combines with bold and toggles independently', () => {
  const result = edit('**文字**', 2, 4, 'italic');
  assert.equal(result.value, '***文字***');
  assert.equal(selection(result), '文字');
  assert.equal(edit(result.value, result.start, result.end, 'italic').value, '**文字**');
  assert.equal(edit('**文字**', 0, 6, 'italic').value, '***文字***');
});

test('heading works on the current line, changes existing levels, and toggles level two', () => {
  assert.equal(edit('第一行\n标题\n最后', 5, 5, 'heading').value, '第一行\n## 标题\n最后');
  assert.equal(atEnd('  ### 标题', 'heading').value, '  ## 标题');
  assert.equal(atEnd('  ## 标题', 'heading').value, '  标题');
  assert.deepEqual(atEnd('', 'heading'), { value: '## ', start: 3, end: 3 });
  assert.deepEqual(edit('\n最后一行', 0, 0, 'heading'), { value: '## \n最后一行', start: 3, end: 3 });
});

test('list and quote toolbar actions operate on multiple lines and preserve blank lines and indentation', () => {
  const value = '甲\n  乙\n\n丙';
  for (const [action, expected] of [
    ['unordered', '- 甲\n  - 乙\n\n- 丙'],
    ['ordered', '1. 甲\n  2. 乙\n\n3. 丙'],
    ['quote', '> 甲\n  > 乙\n\n> 丙']
  ]) {
    const result = edit(value, 0, value.length, action);
    assert.equal(result.value, expected);
    assert.equal(edit(result.value, result.start, result.end, action).value, value);
  }
  assert.equal(edit('* 甲\n2. 乙', 0, 9, 'unordered').value, '- 甲\n- 乙');
  assert.equal(edit('- 甲\n+ 乙', 0, 9, 'ordered').value, '1. 甲\n2. 乙');
  assert.equal(edit('甲\n乙', 0, 2, 'unordered').value, '- 甲\n乙');
});

test('range inputs are clamped and normalized, unknown actions do not alter text', () => {
  assert.deepEqual(edit('文本', -100, 100, 'bold'), { value: '**文本**', start: 2, end: 4 });
  assert.deepEqual(edit('文本', 2, 0, 'bold'), { value: '**文本**', start: 2, end: 4 });
  assert.equal(edit(null, 0, 0, 'unknown'), null);
  for (const action of ['bold', 'italic', 'code', 'link', 'heading', 'ordered', 'unordered', 'quote']) {
    for (const value of ['', '\n', '🌟你好\n\n  文字']) {
      const result = edit(value, Infinity, -Infinity, action);
      assert(result.start >= 0 && result.end >= result.start && result.end <= result.value.length);
    }
  }
});
