'use strict';
// Offline app acceptance: source helpers set fixtures; behavior uses real keyboard/mouse.
const { chromium } = require(process.argv[2] || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { setMarkdown, markdownValue, selectMarkdown, selectionOf, editorHost, renderMarkdown } = require('./editor-browser-helpers.cjs');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'output/playwright');
fs.mkdirSync(output, { recursive: true });
const go = (page, step) => page.locator(`.sidebar [data-go="${step}"]`).click();
const draftOf = page => page.evaluate(() => JSON.parse(localStorage.getItem('yoursppt:draft:v2')));
const screenshot = (page, name) => page.screenshot({ path: path.join(output, name + '.png'), fullPage: true, animations: 'disabled' });
const value = page => markdownValue(page, 'slide-content');
const set = (page, text, anchor) => setMarkdown(page, 'slide-content', text, anchor);
const select = (page, from, to) => selectMarkdown(page, 'slide-content', from, to);

const checkMarkdownFields = async (page, ids) => {
  for (const id of ids) {
    const input = page.locator(`#${id}`), host = editorHost(page, id);
    assert.equal(await input.getAttribute('contenteditable'), 'true', `${id}: editable rendered document`);
    assert.equal(await host.locator('.cm-content').count(), 1, `${id}: one editing surface`);
    assert.equal(await host.locator('textarea, .markdown-preview').count(), 0, `${id}: no split source/preview`);
    assert.equal(await page.locator(`[data-editor-help="${id}"]`).count(), 1, `${id}: Markdown help entry`);
    assert.equal(await page.locator('.markdown-toolbar').count(), 0, `${id}: no formatting toolbar`);
    const label = `实时渲染 ${id}`;
    await setMarkdown(page, id, `**${label}**\n\n- *一个要点*`);
    await selectMarkdown(page, id, 3, 3);
    assert.equal((await selectionOf(page, id))[2], true, `${id}: edit keeps focus`);
    await renderMarkdown(page, id);
    assert.equal(await host.locator('.live-md-strong').innerText(), label, `${id}: bold inside editor`);
    assert.equal(await host.locator('.live-md-em').innerText(), '一个要点', `${id}: italic inside editor`);
    assert.equal(await host.locator('.live-md-list-mark').count(), 1, `${id}: rendered list marker`);
    assert(!(await input.innerText()).includes('**'), `${id}: inactive syntax is hidden`);
    await setMarkdown(page, id, '<script>window.editorInjected = true</script>\n\n<img src="https://example.com/forbidden-raw.png" onerror="window.editorInjected = true">\n\n![远程图片](https://example.com/forbidden-markdown.png)\n\n[危险](javascript:alert(1))');
    await renderMarkdown(page, id);
    assert.equal(await host.locator('script, img[src], iframe, [onerror], [href^="javascript:"]').count(), 0, `${id}: inert untrusted Markdown`);
    assert.equal(await page.evaluate(() => window.editorInjected), undefined, `${id}: HTML cannot execute`);
    await setMarkdown(page, id, `**${label}**\n\n- *一个要点*`);
  }
};

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true });
  const page = await context.newPage();
  const errors = [], remoteRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/^https?:/.test(request.url()) && !request.url().startsWith('http://127.0.0.1')) remoteRequests.push(request.url()); });
  try {
    await page.goto(process.argv[3] || pathToFileURL(path.join(root, 'index.html')).href);
    await page.locator('.home-cta [data-action=new]').click();
    await page.getByText('补充要求', { exact: true }).click();
    await checkMarkdownFields(page, ['meta-title', 'meta-presenter', 'meta-audience', 'meta-goal', 'meta-constraints']);
    assert.equal(await page.locator('#meta-date').getAttribute('type'), 'date');
    assert.equal(await page.locator('#meta-duration').evaluate(el => el.tagName), 'INPUT');
    await setMarkdown(page, 'meta-title', '**Markdown 汇报**');
    await setMarkdown(page, 'meta-presenter', '测试团队');
    await setMarkdown(page, 'meta-audience', '项目负责人');
    await screenshot(page, 'markdown-context-desktop');
    await page.locator('[data-action=next]').click();
    await page.locator('[data-action=next]').click();
    for (const id of ['slide-title', 'slide-purpose', 'slide-content']) {
      assert.equal(await page.locator(`#${id}`).getAttribute('aria-invalid'), 'true', `${id}: required`);
    }
    for (const id of ['slide-details', 'slide-transition']) {
      assert.notEqual(await page.locator(`#${id}`).getAttribute('aria-invalid'), 'true', `${id}: optional`);
      assert.equal(await markdownValue(page, id), '');
    }
    await page.getByText('视觉与讲稿要求', { exact: true }).click();
    await checkMarkdownFields(page, ['slide-title', 'slide-purpose', 'slide-content', 'slide-details', 'slide-transition', 'slide-sourceNotes', 'slide-visual', 'slide-notes']);
    assert.equal(await page.locator('#source-search').getAttribute('type'), 'search');
    assert.equal(await page.locator('.markdown-preview').count(), 0, 'no companion preview in the form');

    const content = page.locator('#slide-content'), host = editorHost(page, 'slide-content');
    // Type into the same contenteditable surface that renders the document.
    await set(page, ''); await content.click();
    await page.keyboard.type('## Live heading');
    await page.keyboard.press('Enter'); await page.keyboard.press('Enter');
    await page.keyboard.type('**Visible bold**');
    await page.keyboard.press('Enter'); await page.keyboard.press('Enter');
    await page.keyboard.type('- First item'); await page.keyboard.press('Enter');
    await page.keyboard.type('Second item');
    assert.equal(await value(page), '## Live heading\n\n**Visible bold**\n\n- First item\n- Second item');
    assert.equal(await host.locator('.live-md-h2').innerText(), 'Live heading', 'heading renders while another line is edited');
    assert.equal(await host.locator('.live-md-strong').innerText(), 'Visible bold', 'bold renders while another line is edited');
    assert.equal(await host.locator('.live-md-strong').evaluate(el => Number(getComputedStyle(el).fontWeight) >= 600), true);
    await renderMarkdown(page, 'slide-content');
    assert(!(await content.innerText()).includes('**'), 'inactive formatting syntax is hidden');
    // Click rendered text directly, without a mode switch or second input surface.
    await host.locator('.live-md-strong').click();
    assert.equal((await selectionOf(page, 'slide-content'))[2], true, 'clicking rendered text focuses the editor');
    assert((await content.innerText()).includes('**'), 'active node exposes editable syntax');
    await page.keyboard.insertText(' changed');
    assert((await value(page)).includes(' changed'), 'rendered text accepts direct edits');
    await page.keyboard.press('Control+z'); assert(!(await value(page)).includes(' changed'), 'direct edit undo');
    await page.keyboard.press('Control+y'); assert((await value(page)).includes(' changed'), 'direct edit redo');

    await page.locator('[data-editor-help="slide-content"]').click();
    assert(await page.locator('#markdown-dialog').isVisible());
    assert.match(await page.locator('#markdown-dialog').innerText(), /基本语法/);
    await page.keyboard.press('Escape'); assert(!(await page.locator('#markdown-dialog').isVisible()));
    for (const [key, expected] of [['Control+b', '**键盘格式**'], ['Control+i', '*键盘格式*'], ['Control+k', '[键盘格式](https://)'], ['Meta+b', '**键盘格式**'], ['Meta+i', '*键盘格式*'], ['Meta+k', '[键盘格式](https://)']]) {
      await set(page, '键盘格式'); await select(page); await page.keyboard.press(key);
      assert.equal(await value(page), expected, key);
    }
    await set(page, '撤销格式'); await select(page); await page.keyboard.press('Control+b');
    await page.keyboard.press('Control+z'); assert.equal(await value(page), '撤销格式', 'format undo is independent');
    await page.keyboard.press('Control+y'); assert.equal(await value(page), '**撤销格式**', 'format redo');
    await set(page, '前后'); await select(page, 1, 1); await page.keyboard.insertText('中');
    assert.equal(await value(page), '前中后');
    assert.deepEqual(await selectionOf(page, 'slide-content'), [2, 2, true], 'decorations preserve caret');
    for (const [initial, expected] of [['- 第一项', '- 第一项\n- '], ['* 第一项', '* 第一项\n* '], ['3. 第三项', '3. 第三项\n4. '], ['- [x] 已完成', '- [x] 已完成\n- [ ] ']]) {
      await set(page, initial); await select(page, initial.length, initial.length); await page.keyboard.press('Enter');
      assert.equal(await value(page), expected, `continue ${initial}`);
      await page.keyboard.press('Enter'); assert.equal(await value(page), initial + '\n', `exit empty item after ${initial}`);
    }
    await set(page, '- 普通换行'); await select(page, 6, 6); await page.keyboard.press('Shift+Enter');
    assert.equal(await value(page), '- 普通换行\n', 'Shift+Enter does not continue a list');
    await set(page, '- 中文输入'); await select(page, 6, 6);
    const ime = await content.evaluate(el => {
      el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }));
      const event = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 229, bubbles: true, cancelable: true, isComposing: true });
      el.dispatchEvent(event);
      el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '输入' }));
      return { prevented: event.defaultPrevented, value: window.YoursPPT.getMarkdownEditor('slide-content').getValue() };
    });
    assert.deepEqual(ime, { prevented: false, value: '- 中文输入' }, 'IME confirmation is not a list shortcut');
    // Chromium composition input exercises real beforeinput/input and DOM reconciliation.
    await set(page, '- '); await select(page, 2, 2);
    const inputSession = await context.newCDPSession(page);
    await inputSession.send('Input.imeSetComposition', { text: '中文', selectionStart: 2, selectionEnd: 2 });
    assert.equal(await value(page), '- 中文', 'composing text stays at the caret');
    await inputSession.send('Input.insertText', { text: '中文输入' });
    assert.equal(await value(page), '- 中文输入', 'Chinese composition commits without duplication');
    await page.keyboard.press('Enter');
    assert.equal(await value(page), '- 中文输入\n- ', 'ordinary Enter works after composition ends');
    await inputSession.detach();

    const tableSource = '前面的文字\n\n| 项目 | 数值 |\n| --- | --- |\n| A | 1 |\n\n后面的文字';
    await set(page, tableSource); await renderMarkdown(page, 'slide-content');
    assert.equal(await host.locator('table').count(), 1, 'table renders inside the editor');
    await host.locator('table td').first().click();
    assert.equal((await selectionOf(page, 'slide-content'))[2], true, 'table click focuses editor');
    assert((await content.innerText()).includes('| 项目 | 数值 |'), 'table click reveals its editable source');
    const tableValue = tableSource.indexOf('| A |') + 2;
    await select(page, tableValue, tableValue + 1); await page.keyboard.insertText('已修改');
    await renderMarkdown(page, 'slide-content');
    assert.equal(await host.locator('table td').first().innerText(), '已修改', 'edited table rerenders in place');

    await setMarkdown(page, 'slide-title', '**第一页主题**');
    await setMarkdown(page, 'slide-purpose', '对齐 **目标**');
    await set(page, '## 第一页内容\n\n- 一个有依据的结论');
    await setMarkdown(page, 'slide-details', ''); await setMarkdown(page, 'slide-transition', '');
    assert.equal(await page.locator('.outline-item.active i.complete').count(), 1);
    await go(page, 'review');
    assert.equal(await page.locator('[data-action=export]').isEnabled(), true, 'blank optional fields allow export');
    assert.equal(await page.locator('.review-slide-heading [aria-label="主题"] strong').innerText(), '第一页主题');
    await go(page, 'outline'); await page.locator('[data-action=add-slide]').click();
    await setMarkdown(page, 'slide-title', '第二页主题'); await setMarkdown(page, 'slide-purpose', '决定行动');
    await set(page, '第二页独立内容'); await select(page); await page.keyboard.press('Control+b');
    // Immediate refresh must retain the original Markdown, including shortcut edits.
    await page.reload(); await page.locator('[data-action=start]').click();
    assert.equal(await value(page), '**第二页独立内容**');
    await renderMarkdown(page, 'slide-content');
    assert.equal(await host.locator('.live-md-strong').innerText(), '第二页独立内容');
    await page.locator('.outline-item').first().click();
    assert.equal(await markdownValue(page, 'slide-title'), '**第一页主题**');
    assert.equal(await value(page), '## 第一页内容\n\n- 一个有依据的结论');
    assert.equal(await host.locator('.live-md-h2').innerText(), '第一页内容');
    await page.locator('.outline-item').nth(1).click();
    assert.equal(await value(page), '**第二页独立内容**', 'slides retain independent state');
    await go(page, 'review');
    assert.equal(await page.locator('[data-action=export]').isEnabled(), true, 'second slide transition is optional');
    await screenshot(page, 'markdown-review-desktop');
    const backup = await draftOf(page);
    delete backup.state.slides[0].details;
    backup.state.slides[0].summary = '**历史概括**'; backup.state.slides[0].key = '历史核心判断';
    await page.locator('#import-input').setInputFiles({ name: 'legacy-draft.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
    await page.locator('#confirm-ok').click(); await page.locator('#confirm-dialog').waitFor({ state: 'hidden' });
    await go(page, 'outline'); await page.locator('.outline-item').first().click();
    assert.equal(await markdownValue(page, 'slide-details'), '**历史概括**\n\n历史核心判断');
    assert.equal(await editorHost(page, 'slide-details').locator('.live-md-strong').innerText(), '历史概括');
    await set(page, '## 响应式排版\n\n- **可阅读的内容**\n- 在内容中直接编辑\n\n[很长的链接](https://example.com/' + 'a'.repeat(160) + ')\n\n```\n' + 'wide-code-'.repeat(30) + '\n```');
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const step of ['context', 'outline', 'review']) {
        await go(page, step);
        for (const details of await page.locator('details.advanced').all()) await details.evaluate(el => { el.open = true; });
        const overflow = await page.evaluate(() => {
          if (document.documentElement.scrollWidth <= innerWidth) return [];
          return [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1).slice(-12).map(el => ({ tag: el.tagName, class: el.className, width: Math.round(el.getBoundingClientRect().width), right: Math.round(el.getBoundingClientRect().right) }));
        });
        if (overflow.length) await screenshot(page, `markdown-overflow-${step}-${width}`);
        assert.deepEqual(overflow, [], `${step}: overflow at ${width}px`);
      }
      await go(page, 'outline'); await screenshot(page, `markdown-outline-${width}`);
    }
    assert.deepEqual(errors, [], 'no browser errors');
    assert.deepEqual(remoteRequests, [], 'Markdown never fetches remote assets');
    console.log('Markdown browser acceptance passed: 13 single-surface editors, real typing/click editing, Markdown help/keyboard/undo/IME, editable tables, raw Markdown persistence, required/optional validation, migration and responsive layouts.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
