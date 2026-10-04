'use strict';
const { chromium } = require(process.argv[2] || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { setMarkdown, markdownValue } = require('./editor-browser-helpers.cjs');
const output = path.resolve(__dirname, '../output/playwright'); fs.mkdirSync(output, { recursive: true });
const go = (page, step) => page.locator(`.sidebar [data-go=${step}]`).click();
const scroll = (page, selector) => page.locator(selector).evaluate(el => el.scrollTop);
const wheel = async (page, selector, delta) => { const box = await page.locator(selector).boundingBox(); await page.mouse.move(box.x + box.width - 20, box.y + 40); await page.mouse.wheel(0, delta); };
const fixedRects = page => page.evaluate(() => ['.topbar', '.sidebar', '.stage-head', '.stage-footer'].map(s => { const r = document.querySelector(s).getBoundingClientRect(); return [r.x, r.y, r.height]; }));
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, acceptDownloads: true });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(process.argv[3] || 'http://127.0.0.1:4173');
    assert.equal(await page.locator('.home-cta button').count(), 3);
    await page.getByRole('button', { name: '读取草稿', exact: true }).click();
    assert(await page.locator('#settings-dialog').isVisible());
    await page.locator('[data-action=close-settings]').first().click();
    await page.getByRole('button', { name: '新内容', exact: true }).click();
    const initial = await fixedRects(page);
    await wheel(page, '.stage-body', 900);
    await page.waitForFunction(() => document.querySelector('.stage-body').scrollTop > 0);
    assert.deepEqual(await fixedRects(page), initial); assert.equal(await page.evaluate(() => window.scrollY), 0);
    await setMarkdown(page, 'meta-title', '未完成的学术汇报');
    await page.locator('#file-input').setInputFiles({ name: '真实素材.bin', mimeType: 'application/octet-stream', buffer: Buffer.from([0, 255, 34, 128]) });
    // Import 45 unfinished pages so both sides can be scrolled with real wheel input.
    const fixture = await page.evaluate(() => {
      const draft = JSON.parse(localStorage.getItem('yoursppt:draft:v2'));
      draft.state.slides = Array.from({ length: 45 }, (_, i) => window.YoursPPT.createSlide({ title: `第 ${i + 1} 页`, content: i ? '' : '## 需要保留的未完成内容' }));
      draft.state.slides[0].sourceIds = [draft.attachments[0].id]; draft.state.step = draft.state.resumeStep = 'outline';
      return draft;
    });
    // Preserve the actual file through a draft ZIP rather than legacy metadata JSON.
    const payload = await page.evaluate(async fixture => {
      const saved = await window.YoursPPT.loadDraft(); fixture.attachments[0].file = saved.attachments[0].file;
      return [...new Uint8Array(await (await window.YoursPPT.buildDraftArchive(fixture.state, fixture.attachments)).blob.arrayBuffer())];
    }, fixture);
    await page.locator('#import-input').setInputFiles({ name: 'unfinished.zip', mimeType: 'application/zip', buffer: Buffer.from(payload) });
    await page.locator('#confirm-ok').click(); await page.locator('.outline-item').nth(44).waitFor();
    const outlineRects = await fixedRects(page);
    await page.waitForFunction(() => document.querySelector('.slide-list').classList.contains('scroll-fade-bottom'));
    assert.equal(await page.locator('.slide-list').evaluate(el => el.classList.contains('scroll-fade-top')), false);
    const scrollbar = await page.locator('.slide-list').evaluate(el => ({
      width: getComputedStyle(el, '::-webkit-scrollbar').width,
      arrows: getComputedStyle(el, '::-webkit-scrollbar-button').display,
      track: getComputedStyle(el, '::-webkit-scrollbar-track').backgroundColor,
      thumb: getComputedStyle(el, '::-webkit-scrollbar-thumb').backgroundColor
    }));
    assert.equal(scrollbar.width, '5px'); assert.equal(scrollbar.arrows, 'none');
    assert.equal(scrollbar.track, 'rgba(0, 0, 0, 0)'); assert.equal(scrollbar.thumb, 'rgba(0, 0, 0, 0)');
    await wheel(page, '.slide-list', 900);
    await page.waitForFunction(() => document.querySelector('.slide-list').scrollTop > 0);
    assert(await page.locator('.slide-list').evaluate(el => el.classList.contains('is-scrolling')));
    assert.notEqual(await page.locator('.slide-list').evaluate(el => getComputedStyle(el, '::-webkit-scrollbar-thumb').backgroundColor), 'rgba(0, 0, 0, 0)');
    await page.waitForFunction(() => !document.querySelector('.slide-list').classList.contains('is-scrolling'));
    assert.equal(await page.locator('.slide-list').evaluate(el => getComputedStyle(el, '::-webkit-scrollbar-thumb').backgroundColor), 'rgba(0, 0, 0, 0)');
    assert(await page.locator('.slide-list').evaluate(el => el.classList.contains('scroll-fade-top') && el.classList.contains('scroll-fade-bottom')));
    assert.match(await page.locator('.slide-list').evaluate(el => getComputedStyle(el).maskImage), /linear-gradient/);
    await page.locator('.slide-list').evaluate(el => { el.scrollTop = el.scrollHeight; });
    await page.waitForFunction(() => !document.querySelector('.slide-list').classList.contains('scroll-fade-bottom'));
    assert(await page.locator('.slide-list').evaluate(el => el.classList.contains('scroll-fade-top')));
    await page.locator('.slide-list').evaluate(el => { el.scrollTop = 900; });
    await page.waitForFunction(() => document.querySelector('.slide-list').classList.contains('scroll-fade-bottom'));
    assert.equal(await scroll(page, '.editor-panel'), 0);
    const leftTop = await scroll(page, '.slide-list');
    await wheel(page, '.editor-panel', 700);
    await page.waitForFunction(() => document.querySelector('.editor-panel').scrollTop > 0);
    assert(await page.locator('.editor-panel').evaluate(el => el.classList.contains('scroll-fade-top')));
    assert.equal(await scroll(page, '.slide-list'), leftTop); assert.equal(await scroll(page, '.stage-body'), 0);
    assert.deepEqual(await fixedRects(page), outlineRects);
    await page.screenshot({ path: path.join(output, 'workspace-independent-scroll.png') });
    assert.equal(await page.locator('.markdown-toolbar').count(), 0);
    await page.locator('[data-editor-help=slide-content]').click(); assert.match(await page.locator('#markdown-dialog').innerText(), /Markdown.*\n/);
    await page.locator('#markdown-dialog [data-action=close-markdown-help]').first().click();
    await page.locator('.editor-panel').evaluate(el => { el.scrollTop = 0; });
    await page.waitForFunction(() => !document.querySelector('.editor-panel').classList.contains('scroll-fade-top'));
    await page.screenshot({ path: path.join(output, 'quiet-editor.png') });
    await setMarkdown(page, 'slide-content', Array.from({ length: 80 }, (_, i) => `第 ${i + 1} 行内容`).join('\n'));
    await page.locator('[data-editor-id=slide-content] .cm-scroller').evaluate(el => { el.scrollTop = 250; });
    await page.waitForFunction(() => document.querySelector('[data-editor-id=slide-content] .cm-scroller').classList.contains('scroll-fade-top'));
    await setMarkdown(page, 'slide-content', fixture.state.slides[0].content);
    await page.locator('[data-action=help]').click(); assert(!(await page.locator('#help-dialog').innerText()).includes('Markdown'));
    await page.locator('[data-action=close-help]').first().click();
    await go(page, 'style'); await page.locator('[data-style=research]').click();
    assert((await page.locator('#deck-preview').boundingBox()).width > 500, 'preview retains its full content column');
    await wheel(page, '.style-choices', 500);
    await page.waitForFunction(() => document.querySelector('.style-choices').scrollTop > 0);
    assert.equal(await scroll(page, '.preview-area'), 0);
    assert.equal(await page.locator('[data-palette]').count(), 5);
    for (const [id, accent] of [['red-white', '#a51c30'], ['blue-white', '#1859a3'], ['purple-white', '#72508d']]) {
      await page.locator(`[data-palette=${id}]`).click();
      assert.equal(await page.locator('.slide-preview').evaluate(el => el.style.getPropertyValue('--deck-accent')), accent);
    }
    await page.locator('[data-palette=red-white]').click();
    const choicesTop = await scroll(page, '.style-choices');
    await page.locator('.style-description summary').click();
    await wheel(page, '.preview-area', 500);
    await page.waitForFunction(() => document.querySelector('.preview-area').scrollTop > 0);
    assert.equal(await scroll(page, '.style-choices'), choicesTop);
    const previewTop = await scroll(page, '.preview-area');
    await page.locator('[data-palette=red-white]').click();
    assert.equal(await scroll(page, '.style-choices'), choicesTop);
    // The selected color re-render keeps the preview scroll within its current range.
    assert((await scroll(page, '.preview-area')) <= previewTop);
    await page.locator('.preview-area').evaluate(el => { el.scrollTop = 0; });
    await page.screenshot({ path: path.join(output, 'workspace-academic-red.png') });
    await page.locator('[data-action=settings]').click();
    // Native filesystem implementation; only the user picker is replaced by OPFS.
    await page.evaluate(() => { window.showDirectoryPicker = async () => (await navigator.storage.getDirectory()).getDirectoryHandle('workspace-smoke', { create: true }); });
    await page.locator('[data-action=choose-export-directory]').click();
    await page.waitForFunction(() => document.querySelector('#export-location').textContent.includes('workspace-smoke'));
    await page.screenshot({ path: path.join(output, 'workspace-settings.png') });
    for (let i = 0; i < 2; i++) {
      await page.locator('#settings-dialog [data-action=backup]').click();
      await page.waitForFunction(() => document.querySelector('#settings-status').textContent.startsWith('已保存到'));
    }
    const files = await page.evaluate(async () => {
      const directory = await (await navigator.storage.getDirectory()).getDirectoryHandle('workspace-smoke');
      const names = []; for await (const name of directory.keys()) names.push(name);
      const file = await (await directory.getFileHandle(names[0])).getFile(), restored = await window.YoursPPT.readDraftFile(file);
      return { names, title: restored.state.meta.title, pages: restored.state.slides.length, content: restored.state.slides[0].content, bytes: [...new Uint8Array(await restored.attachments[0].file.arrayBuffer())] };
    });
    assert.equal(files.names.length, 2); assert.equal(files.pages, 45); assert.equal(files.title, fixture.state.meta.title);
    assert.equal(files.content, fixture.state.slides[0].content); assert.deepEqual(files.bytes, [0, 255, 34, 128]);
    await page.reload(); await page.locator('[data-action=settings]').click();
    assert.match(await page.locator('#export-location').innerText(), /workspace-smoke/);
    await page.locator('[data-action=reset-export-directory]').click();
    await page.waitForFunction(() => document.querySelector('#export-location').textContent.includes('浏览器默认'));
    const downloadPromise = page.waitForEvent('download'); await page.locator('#settings-dialog [data-action=backup]').click();
    const downloaded = await downloadPromise; await downloaded.saveAs(path.join(output, 'workspace-unfinished-draft.zip'));
    await page.locator('[data-action=close-settings]').first().click(); await page.locator('[data-action=start]').click();
    await go(page, 'review'); assert(await page.locator('[data-action=export]').isEnabled());
    await go(page, 'generate'); assert(await page.locator('[data-agent-action=generate]').isDisabled());
    await go(page, 'outline'); assert.equal(await markdownValue(page, 'slide-content'), fixture.state.slides[0].content);
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      for (const step of ['context', 'outline', 'style', 'review', 'generate']) {
        await go(page, step);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${step} overflow at ${width}`);
        assert(await page.locator('.stage-footer').isVisible());
      }
    }
    await page.setViewportSize({ width: 390, height: 844 }); await go(page, 'outline');
    await page.screenshot({ path: path.join(output, 'workspace-mobile-outline.png') });
    assert.deepEqual(errors, []);
    console.log('Workspace acceptance passed: fixed frames, independent wheel scrolling, academic colors, incomplete draft bytes, directory persistence and collision handling, ZIP downloads and responsive steps.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
