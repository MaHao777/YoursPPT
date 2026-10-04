'use strict';
// Install Playwright only for development, or pass an existing module path as argv[2].
const { chromium } = require(process.argv[2] || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');
const { setMarkdown, markdownValue, renderMarkdown } = require('./editor-browser-helpers.cjs');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'output/playwright');
fs.mkdirSync(output, { recursive: true });
const stateOf = page => page.evaluate(() => JSON.parse(localStorage.getItem('yoursppt:draft:v2')));
const saved = page => page.waitForFunction(() => document.querySelector('#save-status').textContent === '已保存在本机');
const go = (page, step) => page.locator(`.sidebar [data-go="${step}"]`).click();
const screenshot = (page, name) => page.screenshot({ path: path.join(output, name + '.png'), fullPage: true, animations: 'disabled' });
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce', acceptDownloads: true });
  const page = await context.newPage();
  const remoteRequests = []; page.on('request', request => { if (/^https?:/.test(request.url()) && !request.url().startsWith('http://127.0.0.1')) remoteRequests.push(request.url()); });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  try {
    // Actual double-click/file:// use, not only a local HTTP server.
    await page.goto(process.argv[3] || pathToFileURL(path.join(root, 'index.html')).href);
    await page.getByRole('button', { name: '新内容', exact: true }).waitFor();
    await screenshot(page, 'final-home');
    await page.getByRole('button', { name: '了解工作流', exact: true }).click();
    assert(await page.locator('#help-dialog').isVisible()); await page.getByRole('button', { name: '知道了', exact: true }).click();
    await page.locator('.home-cta [data-action=new]').click(); await page.locator('[data-action=next]').click();
    assert(await page.locator('#meta-title[aria-invalid=true]').count());
    await setMarkdown(page, 'meta-title', '测试汇报：逻辑与真实资料');
    await setMarkdown(page, 'meta-presenter', '测试汇报人'); await setMarkdown(page, 'meta-audience', '项目负责人');
    await setMarkdown(page, 'meta-goal', '明确下一阶段行动'); await page.locator('#meta-duration').fill('15');
    // Refresh immediately, inside the debounce window: text must survive.
    await page.reload(); await page.locator('[data-action=start]').click();
    assert.equal(await markdownValue(page, 'meta-title'), '测试汇报：逻辑与真实资料');
    await page.locator('[data-action=next]').click();
    await setMarkdown(page, 'slide-title', '先明确问题'); await setMarkdown(page, 'slide-purpose', '对齐问题定义');
    await setMarkdown(page, 'slide-details', '方案必须回应一个明确的问题。'); await setMarkdown(page, 'slide-content', '## 输入事实\n\n- **主要证据**\n- 待确认的约束\n\n| 项目 | 数值 |\n| --- | --- |\n| 甲 | 1 |\n\n> 引用段落\n\n```js\nconst answer = 42;\n```\n\n[出处](https://example.com)\n\n<script>window.markdownInjected = true</script>\n![远程图片](https://example.com/must-not-fetch.png)\n\n[危险](javascript:alert(1))');
    const liveContent = await renderMarkdown(page, 'slide-content');
    assert.equal(await page.locator('.markdown-preview').count(), 0);
    assert.equal(await liveContent.locator('.cm-content').count(), 1);
    assert.equal(await liveContent.locator('.live-md-h2').innerText(), '输入事实');
    assert.equal(await liveContent.locator('.live-md-strong').innerText(), '主要证据');
    assert.equal(await liveContent.locator('table').count(), 1);
    assert.equal(await liveContent.locator('.live-md-quote').count(), 1);
    assert.equal(await liveContent.locator('.live-md-code-line').filter({ hasText: 'const answer = 42;' }).count(), 1);
    assert.equal(await liveContent.locator('script, img[src], [href^="javascript:"]').count(), 0);
    assert.equal(await page.evaluate(() => window.markdownInjected), undefined);
    await page.getByText('视觉与讲稿要求', { exact: true }).click();
    await setMarkdown(page, 'slide-visual', '并列比较'); await setMarkdown(page, 'slide-notes', '讲稿保留限定条件与例子。');
    await page.getByRole('button', { name: '复制页面', exact: true }).click();
    await setMarkdown(page, 'slide-title', '再确定行动'); await setMarkdown(page, 'slide-transition', '问题明确后讨论行动。');
    let draft = await stateOf(page); assert.equal(new Set(draft.state.slides.map(s => s.id)).size, 2);
    const secondId = draft.state.slides[1].id;
    await page.getByRole('button', { name: '页面上移', exact: true }).click();
    draft = await stateOf(page); assert.equal(draft.state.slides[0].id, secondId);
    await page.getByRole('button', { name: '页面下移', exact: true }).click();
    await page.locator('[data-action=add-slide]').click();
    await page.locator('[data-action=next]').click();
    assert(await page.locator('#slide-title[aria-invalid=true]').count());
    await page.getByRole('button', { name: '删除页面', exact: true }).click();
    await page.locator('#confirm-cancel').click(); assert.equal(await page.locator('.outline-item').count(), 3);
    await page.getByRole('button', { name: '删除页面', exact: true }).click();
    await page.locator('#confirm-ok').click(); assert.equal(await page.locator('.outline-item').count(), 2);
    await screenshot(page, 'final-outline');
    await go(page, 'context');
    await page.locator('#file-input').setInputFiles([{ name: '中文证据.bin', mimeType: 'application/octet-stream', buffer: Buffer.from([0, 255, 34, 123]) }]);
    // Folder selection preserves the directory rather than asking for typed paths.
    await page.locator('#folder-input').setInputFiles(path.join(root, 'tests/fixtures'));
    assert.equal(await page.locator('.material').count(), 2);
    // Same metadata, different bytes: never silently discard an unrelated file.
    await page.locator('#file-input').setInputFiles([{ name: '中文证据.bin', mimeType: 'application/octet-stream', buffer: Buffer.from([1, 254, 35, 124]) }]);
    assert.equal(await page.locator('.material').count(), 3);
    // Native drag/drop event with an actual File.
    await page.locator('#dropzone').evaluate(el => {
      const data = new DataTransfer(); data.items.add(new File(['拖入的真实文件'], '拖拽资料.txt', { type: 'text/plain' }));
      el.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: data }));
    });
    assert.equal(await page.locator('.material').count(), 4);
    await saved(page); await page.reload(); await page.locator('[data-action=start]').click();
    assert.equal(await page.locator('h1').innerText(), '目标与引用');
    assert.equal(await page.locator('.material').count(), 4); assert.equal(await page.locator('.missing-file').count(), 0);
    await go(page, 'outline');
    await page.locator('[data-source]').first().check();
    await setMarkdown(page, 'slide-sourceNotes', '<script>不能执行</script> 出处：第 3 页');
    const beforeFolder = (await stateOf(page)).state.slides[1].sourceIds.slice();
    await page.locator('#source-folder-input').setInputFiles(path.join(root, 'tests/fixtures'));
    assert(await page.locator('#reference-dialog').isVisible());
    await page.locator('#folder-search').fill('不存在的文件');
    assert.equal(await page.locator('[data-folder-file]').count(), 0);
    await page.getByRole('button', { name: '取消', exact: true }).click();
    assert.deepEqual((await stateOf(page)).state.slides[1].sourceIds, beforeFolder);
    await page.locator('#source-folder-input').setInputFiles(path.join(root, 'tests/fixtures'));
    await page.locator('#folder-search').fill('证据');
    await page.locator('[data-folder-file]').check();
    await page.locator('[data-action=add-folder-references]').click();
    await page.waitForFunction(() => document.querySelector('#source-count').textContent === '已选择 2 份');
    assert.equal(await page.locator('#source-options input:checked').count(), 2);
    await page.locator('#source-search').fill('证据');
    assert.equal(await page.locator('[data-source]').count(), 3);
    await page.locator('#source-search').fill('不存在');
    assert.equal(await page.locator('[data-source]').count(), 0);
    await page.locator('#source-search').fill('');
    await screenshot(page, 'updated-outline-markdown');
    await go(page, 'style');
    assert.equal(await page.locator('[data-style]').count(), 9);
    for (const id of ['minimal', 'dark-tech', 'soft-rounded', 'memphis', 'elegant', 'vintage']) {
      await page.locator(`[data-style="${id}"]`).click();
      await saved(page);
      const selected = await stateOf(page);
      assert.equal(selected.state.style, id);
      assert.equal(await page.locator(`.slide-preview.${id}`).count(), 1);
      await screenshot(page, 'visual-' + id);
    }
    await page.reload(); await page.locator('[data-action=start]').click();
    assert.equal(await page.locator('[data-style=vintage]').getAttribute('aria-checked'), 'true');
    for (const [style, palette, expected] of [['swiss', 'lemon', '#FFD500'], ['editorial', 'forest', '#1a2e1f'], ['research', 'teal', '#26736a']]) {
      await page.locator(`[data-style=${style}]`).click(); await page.locator(`[data-palette=${palette}]`).click();
      if (style === 'swiss') {
        await page.locator(`[data-palette=${palette}]`).focus(); await page.keyboard.press('ArrowRight');
        assert.equal(await page.locator('[data-palette=lime]').getAttribute('aria-checked'), 'true');
        await page.keyboard.press('ArrowLeft');
      }
      assert.equal(await page.locator('.slide-preview').evaluate(el => el.style.getPropertyValue('--deck-accent')), expected);
      for (const mode of ['cover', 'content', 'structure']) {
        await page.locator(`[data-preview=${mode}]`).click();
        assert(await page.locator('.preview-heading').innerText());
      }
      await screenshot(page, 'final-' + style);
    }
    await page.locator('[data-style=swiss]').click(); await page.locator('[data-palette=lemon]').click();
    await page.locator('[data-preview=content]').click(); await page.locator('#preview-slide').selectOption('0');
    assert.equal(await page.locator('.preview-heading').innerText(), '先明确问题');
    await page.locator('#preview-slide').selectOption('1');
    await go(page, 'review');
    assert(await page.getByText('讲稿保留限定条件与例子。', { exact: true }).first().isVisible());
    assert(await page.getByText('并列比较', { exact: true }).first().isVisible());
    assert(await page.getByText('<script>不能执行</script> 出处：第 3 页', { exact: true }).isVisible());
    assert.equal(await page.locator('[data-action=export]').isEnabled(), true);
    await screenshot(page, 'final-review');
    await page.locator('.review-slide').first().locator('[data-go=outline]').click();
    assert.equal(await markdownValue(page, 'slide-title'), '先明确问题');
    await go(page, 'review');
    const downloadPromise = page.waitForEvent('download', { timeout: 120000 });
    await page.locator('[data-action=export]').click();
    const download = await downloadPromise, archive = path.join(output, 'browser-work-package.zip'); await download.saveAs(archive);
    const check = spawnSync('python', ['-B', '-c', [
      'import zipfile,json,sys',
      'with zipfile.ZipFile(sys.argv[1]) as z:',
      ' assert z.testzip() is None',
      ' root=z.namelist()[0]',
      ' assert len(z.namelist())>13000',
      ' m=json.loads(z.read(root+"references/manifest.json"))',
      ' assert len(m)==4 and len({i["path"] for i in m})==4',
      ' assert z.read(root+m[0]["path"])==bytes([0,255,34,123])',
      ' s=json.loads(z.read(root+"style/selection.json"))',
      ' assert s["colors"]["accent"]=="#FFD500"',
      ' assert len(s["skills"])==2',
      ' assert "讲稿保留限定条件" in z.read(root+"brief.md").decode("utf8")',
      ' assert "### 内容" in z.read(root+"brief.md").decode("utf8")',
      ' assert "### 细节（选填）" in z.read(root+"brief.md").decode("utf8")',
      ' assert "| 项目 | 数值 |" in z.read(root+"brief.md").decode("utf8")',
      ' print("Browser download independently verified:",len(z.namelist()),"entries")'
    ].join('\n'), archive], { encoding: 'utf8', timeout: 60000 });
    assert.equal(check.status, 0, check.stdout + check.stderr); console.log(check.stdout.trim());
    // Test the actual browser filesystem writer without a headless system picker:
    // the picker boundary returns an isolated origin-private native directory.
    const nativeFolderAvailable = await page.evaluate(async () => {
      try { await navigator.storage.getDirectory(); return true; } catch { return false; }
    });
    if (nativeFolderAvailable) {
      await go(page, 'style'); await page.locator('[data-delivery=html]').click();
      await page.evaluate(() => { window.showDirectoryPicker = () => navigator.storage.getDirectory(); });
      await go(page, 'review'); await page.locator('[data-action=export-folder]').click();
      await page.waitForFunction(() => document.querySelector('#export-status').textContent.includes('已完整保存'), null, { timeout: 60000 });
      const nativeCheck = await page.evaluate(async () => {
        const parent = await navigator.storage.getDirectory();
        const names = []; for await (const name of parent.keys()) names.push(name);
        if (names.length !== 1) throw new Error('Unexpected native output roots');
        const directory = await parent.getDirectoryHandle(names[0]);
        const read = async (dir, name) => (await dir.getFileHandle(name)).getFile();
        const brief = await (await read(directory, 'brief.md')).text();
        const refs = await directory.getDirectoryHandle('references');
        const manifest = JSON.parse(await (await read(refs, 'manifest.json')).text());
        const raw = new Uint8Array(await (await read(refs, manifest[0].path.slice('references/'.length))).arrayBuffer());
        const skills = await (await directory.getDirectoryHandle('style')).getDirectoryHandle('skills');
        const guizang = await skills.getDirectoryHandle('guizang-ppt-skill');
        const license = await (await read(guizang, 'LICENSE')).text();
        let count = 0; async function walk(dir) { for await (const handle of dir.values()) { if (handle.kind === 'directory') await walk(handle); else count++; } }
        await walk(directory);
        const incomplete = await directory.getFileHandle('INCOMPLETE.txt').then(() => true, () => false);
        // Only the fresh, test-owned OPFS child is removed.
        await parent.removeEntry(names[0], { recursive: true });
        return { count, raw: [...raw], hasBrief: brief.includes('讲稿保留限定条件'), license: license.includes('GNU AFFERO GENERAL PUBLIC LICENSE'), incomplete };
      });
      assert(nativeCheck.count > 40); assert.deepEqual(nativeCheck.raw, [0, 255, 34, 123]);
      assert(nativeCheck.hasBrief && nativeCheck.license && !nativeCheck.incomplete);
      console.log('Browser native folder writer verified:', nativeCheck.count, 'files; system picker boundary replaced with isolated OPFS.');
    }
    // Settings saves a complete unfinished ZIP draft, and old JSON still restores IDs.
    await page.locator('[data-action=settings]').click();
    const backupPromise = page.waitForEvent('download'); await page.locator('#settings-dialog [data-action=backup]').click();
    const backup = await backupPromise, backupPath = path.join(output, 'browser-draft.zip'); await backup.saveAs(backupPath);
    const backupData = await stateOf(page);
    await page.locator('[data-action=close-settings]').first().click();
    await page.locator('.sidebar [data-action=new]').click(); await page.locator('#confirm-ok').click();
    await page.locator('#import-input').setInputFiles(backupPath);
    await page.waitForFunction(() => document.querySelector('h1')?.textContent === '检查与导出');
    await go(page, 'context'); assert.equal(await page.locator('.material').count(), 4); assert.equal(await page.locator('.missing-file').count(), 0);
    // Imported legacy metadata keeps missing files visible but can still be exported as a draft.
    await page.locator('#import-input').setInputFiles({ name: 'legacy.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backupData)) });
    await page.locator('#confirm-ok').click();
    await go(page, 'review'); assert.equal(await page.locator('[data-action=export]').isEnabled(), true);
    await go(page, 'context'); assert.equal(await page.locator('.missing-file').count(), 4);
    await page.locator('#file-input').setInputFiles([{ name: '中文证据.bin', mimeType: 'application/octet-stream', buffer: Buffer.from([0, 255, 34, 123]) }]);
    assert.equal(await page.locator('.missing-file').count(), 3);
    draft = await stateOf(page); assert.equal(draft.attachments[0].id, backupData.attachments[0].id);
    // Check every step at common phone and tablet widths, including long review data.
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      for (const step of ['context', 'outline', 'style', 'review', 'generate']) {
        await go(page, step);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${step}: overflow at ${width}px`);
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await go(page, 'style'); await screenshot(page, 'final-mobile');
    assert.deepEqual(remoteRequests, []); assert.deepEqual(errors, []); console.log('Browser acceptance passed:', process.argv[3] || 'file://', 'edits, persistence, files, previews, ZIP, import and responsive layouts.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
