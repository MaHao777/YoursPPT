'use strict';
// Deterministic UI integration; the fixture Agent never calls a model service.
const { chromium } = require(process.argv[2] || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { createBridge } = require('../server/bridge.cjs');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'output/playwright');
const html = '<!doctype html><html><head><meta charset="utf-8"><title>测试结果</title></head><body>Agent 浏览器验收</body></html>';
(async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'yoursppt-browser-agent-'));
  let available = true, pending, cancelCount = 0, starts = 0, discoveries = 0;
  const bridge = createBridge({ root, outputRoot: path.join(temporary, 'runs'),
    discoverAgents: async () => { discoveries++; return [{ id: 'claude', name: 'Claude Code', available, version: 'fixture', command: 'test-only' }]; },
    runAgent: args => {
      starts++;
      args.onLog('<img src=x onerror="window.agentInjected=true"> 测试日志');
      let resolve;
      const completion = new Promise(done => { resolve = done; });
      pending = { args, resolve };
      return { completion, cancel: async () => { cancelCount++; resolve({ code: null, signal: 'SIGTERM' }); } };
    }
  });
  await new Promise(resolve => bridge.server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + bridge.server.address().port;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(base);
    await page.locator('.home-cta [data-action=new]').waitFor();
    await page.evaluate(async () => {
      const Y = window.YoursPPT, state = Y.exampleDraft();
      state.delivery = 'html'; state.step = 'review'; state.resumeStep = 'review';
      const file = new File([new Uint8Array([0, 255, 42, 17])], '证据.bin', { type: 'application/octet-stream' });
      const attachments = [{ id: 'browser-fixture', name: file.name, relativePath: '原始素材/证据.bin', type: file.type, size: file.size, file }];
      state.slides[0].sourceIds = [attachments[0].id];
      await Y.saveDraft(state, attachments);
    });
    await page.reload(); await page.locator('[data-action=start]').click();
    const card = page.locator('#agent-panel');
    assert.equal(await page.locator('.stage-head h1').innerText(), '检查与导出');
    assert.equal(await page.locator('.step-label').innerText(), 'STEP 04 / 05');
    assert.equal(await page.locator('.sidebar .step').count(), 5);
    assert.equal(await card.count(), 0, 'review must not mount the Agent UI');
    assert.equal(discoveries, 0, 'review must not discover Agents');
    assert.equal(await page.locator('[data-action=export]').count(), 1);
    await page.locator('.stage-footer [data-action=next]').click();
    assert.equal(await page.locator('.stage-head h1').innerText(), 'Agent 生成');
    assert.equal(await page.locator('.step-label').innerText(), 'STEP 05 / 05');
    assert.equal(await page.locator('[data-action=export]').count(), 0);
    await page.waitForFunction(() => !document.querySelector('[data-agent-action=generate]')?.disabled);
    assert.equal(await card.locator('#agent-choice').inputValue(), 'claude');
    await card.locator('[data-agent-action=generate]').click();
    await card.locator('.agent-badge[data-state=running]').waitFor();
    assert.equal(starts, 1);
    assert.equal(await page.evaluate(() => window.agentInjected), undefined);
    assert(await card.locator('.agent-log').innerText().then(text => text.includes('<img')));
    const manifest = JSON.parse(await fs.readFile(path.join(pending.args.cwd, 'references/manifest.json'), 'utf8'));
    assert.deepEqual(await fs.readFile(path.join(pending.args.cwd, manifest[0].path)), Buffer.from([0, 255, 42, 17]));
    // Reload and leave/re-enter the generation page while the real HTTP job remains active.
    await page.reload(); await page.locator('[data-action=start]').click();
    assert.equal(await page.locator('.stage-head h1').innerText(), 'Agent 生成');
    await card.locator('.agent-badge[data-state=running]').waitFor();
    await page.keyboard.press('Alt+ArrowLeft');
    assert.equal(await page.locator('.stage-head h1').innerText(), '检查与导出');
    assert.equal(await card.count(), 0);
    await page.keyboard.press('Alt+ArrowRight');
    assert.equal(await page.locator('.stage-head h1').innerText(), 'Agent 生成');
    await page.locator('.sidebar [data-go=outline]').click();
    await page.locator('.sidebar [data-go=review]').click();
    assert.equal(await card.count(), 0);
    await page.locator('.sidebar [data-go=generate]').click();
    assert.equal(await card.locator('[data-agent-action=generate]').isDisabled(), true);
    await fs.writeFile(path.join(pending.args.cwd, 'artifacts/presentation.html'), html);
    pending.resolve({ code: 0 });
    await card.locator('.agent-badge[data-state=completed]').waitFor();
    const downloaded = page.waitForEvent('download');
    await card.locator('[data-agent-action=download]').click();
    const file = await downloaded;
    assert.equal(await fs.readFile(await file.path(), 'utf8'), html);
    const zipped = page.waitForEvent('download');
    await card.locator('[data-agent-action=bundle]').click();
    const zip = await zipped;
    assert.equal((await fs.readFile(await zip.path())).readUInt32LE(0), 0x04034b50);
    await fs.mkdir(output, { recursive: true });
    await card.screenshot({ path: path.join(output, 'agent-completed.png') });
    await page.screenshot({ path: path.join(output, 'agent-generation-page.png'), fullPage: true });
    await card.locator('[data-agent-action=generate]').click();
    await card.locator('.agent-badge[data-state=running]').waitFor();
    await card.locator('[data-agent-action=cancel]').click();
    await card.locator('.agent-badge[data-state=cancelled]').waitFor();
    assert.equal(cancelCount, 1);
    // The runtime may exit zero yet omit output: UI must report failure.
    await card.locator('[data-agent-action=generate]').click();
    await card.locator('.agent-badge[data-state=running]').waitFor();
    pending.resolve({ code: 0 });
    await card.locator('.agent-badge[data-state=failed]').waitFor();
    assert.match(await card.locator('.agent-job-error').innerText(), /未生成有效/);
    available = false;
    await card.locator('[data-agent-action=refresh]').click();
    await page.waitForFunction(() => document.querySelector('#agent-choice option')?.disabled);
    assert.equal(await card.locator('[data-agent-action=generate]').isDisabled(), true);
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'overflow at ' + width);
    }
    assert.deepEqual(errors, []);
    console.log('Agent browser acceptance passed: separate fifth page, navigation, discovery, real upload, escaped logs, reload recovery, downloads, cancel, failure and mobile layouts.');
  } finally {
    await browser.close(); await bridge.close();
    // Only remove the test-owned directory created by mkdtemp.
    if (path.dirname(temporary) !== path.resolve(os.tmpdir()) || !path.basename(temporary).startsWith('yoursppt-browser-agent-')) throw new Error('Unsafe cleanup path');
    await fs.rm(temporary, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
