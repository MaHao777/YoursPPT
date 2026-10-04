'use strict';
const { chromium } = require(process.argv[2] || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const { createBridge } = require('../server/bridge.cjs');
const { setMarkdown, markdownValue } = require('./editor-browser-helpers.cjs');
const output = path.resolve(__dirname, '../output/playwright');
(async () => {
  const bridge = createBridge({ discoverAgents: async () => [
    { id: 'codex', name: 'Codex', available: true, version: 'fixture 1.0' },
    { id: 'claude', name: 'Claude Code', available: true, version: 'fixture 2.0' },
    { id: 'offline', name: 'Unavailable Agent', available: false }
  ] });
  await new Promise(resolve => bridge.server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const chinese = [];
  async function audit(name) {
    chinese.push({ page: name, texts: await page.evaluate(() => {
      const result = [], walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const el = node.parentElement;
        if (/[\u4e00-\u9fff]/.test(node.textContent) && el.checkVisibility() && !el.closest('[translate=no],.cm-editor,.markdown-body,.outline-title,.review-data dd,.file-info,.file-icon,.source-option>span,.slide-preview,.package-tree,.markdown-details pre,.draft-strip strong,.agent-log')) result.push(node.textContent.trim());
      }
      return [...new Set(result)];
    }) });
  }
  try {
    await fs.mkdir(output, { recursive: true });
    await page.goto('http://127.0.0.1:' + bridge.server.address().port);
    await page.locator('.home-cta').waitFor();
    assert.equal(await page.locator('html').getAttribute('lang'), 'zh-CN');
    await page.locator('[data-action=settings]').click();
    await page.locator('[data-theme-choice=dark]').click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await page.locator('#interface-language').selectOption('en');
    await page.waitForFunction(() => document.querySelector('#settings-title').textContent === 'Settings');
    assert.equal(await page.locator('[data-settings-tab=appearance]').innerText(), 'Appearance & language');
    await page.screenshot({ path: path.join(output, 'settings-dark-en.png') });
    await audit('settings');
    await page.locator('[data-settings-tab=appearance]').press('ArrowRight');
    assert(await page.locator('#settings-files').isVisible());
    await audit('files');
    await page.locator('[data-settings-tab=files]').press('ArrowRight');
    assert(await page.locator('#settings-agent').isVisible());
    await audit('agent-settings');
    await page.locator('[data-action=close-settings]').first().click();
    await page.reload(); await page.locator('.home-cta').waitFor();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    await audit('home');
    await page.locator('.topbar [data-action=help]').click(); await audit('help');
    await page.locator('[data-action=close-help]').first().click();
    await page.locator('.home-cta [data-action=new]').click();
    assert.equal(await page.locator('.stage-head').locator('p,.step-label').count(), 0);
    assert.equal(await page.locator('.stage-head h1').innerText(), 'Goals & references');
    await setMarkdown(page, 'meta-title', '汇报主题');
    await setMarkdown(page, 'meta-audience', '暗色主题');
    await page.locator('#file-input').setInputFiles({ name: '设置', mimeType: 'application/octet-stream', buffer: Buffer.from([0, 255, 17, 99]) });
    assert.equal(await page.locator('.file-info strong').innerText(), '设置');
    assert.equal(await page.locator('.file-icon').innerText(), '设置');
    const before = await markdownValue(page, 'meta-title');
    await audit('context');
    await page.locator('[data-editor-help=meta-title]').click(); await audit('markdown-help');
    await page.locator('[data-action=close-markdown-help]').first().click();
    await page.screenshot({ path: path.join(output, 'workspace-dark-en.png') });
    await page.locator('[data-action=settings]').click();
    await page.locator('[data-settings-tab=appearance]').click();
    await page.locator('#interface-language').selectOption('zh-CN');
    await page.locator('[data-theme-choice=light]').click();
    await page.locator('[data-action=close-settings]').first().click();
    assert.equal(await markdownValue(page, 'meta-title'), before);
    assert.equal(await markdownValue(page, 'meta-audience'), '暗色主题');
    assert.equal(await page.locator('.file-info strong').innerText(), '设置');
    assert.deepEqual(await page.evaluate(async () => [...new Uint8Array(await (await YoursPPT.loadDraft()).attachments[0].file.arrayBuffer())]), [0, 255, 17, 99]);
    assert.equal(await page.locator('.stage-head h1').innerText(), '目标与引用');
    await page.screenshot({ path: path.join(output, 'workspace-light-zh.png') });
    // Scroll color must interpolate during both transitions, including repeated scroll.
    await page.locator('.stage-body').evaluate(el => el.scrollTop = 200);
    await page.waitForFunction(() => document.querySelector('.stage-body').classList.contains('is-scrolling'));
    await page.waitForTimeout(210);
    const active = await page.locator('.stage-body').evaluate(el => getComputedStyle(el).getPropertyValue('--scroll-thumb-color'));
    await page.waitForFunction(() => !document.querySelector('.stage-body').classList.contains('is-scrolling'));
    await page.waitForTimeout(70);
    const middle = await page.locator('.stage-body').evaluate(el => getComputedStyle(el).getPropertyValue('--scroll-thumb-color'));
    assert.notEqual(middle, active); assert.notEqual(middle.trim(), 'rgba(0, 0, 0, 0)');
    await page.waitForTimeout(300);
    assert.equal((await page.locator('.stage-body').evaluate(el => getComputedStyle(el).getPropertyValue('--scroll-thumb-color'))).trim(), 'rgba(0, 0, 0, 0)');
    await page.locator('[data-action=settings]').click();
    await page.locator('#interface-language').selectOption('en');
    await page.locator('[data-theme-choice=dark]').click();
    await page.locator('[data-action=close-settings]').first().click();
    for (const step of ['outline', 'style', 'review', 'generate']) {
      await page.locator(`.sidebar [data-go=${step}]`).click();
      await audit(step);
      if (step === 'style') {
        for (const id of await page.locator('[data-style]').evaluateAll(buttons => buttons.map(b => b.dataset.style))) {
          await page.locator(`[data-style="${id}"]`).click();
          await page.locator('.style-description summary').click();
          assert.equal(await page.locator('.palette').first().evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(34, 38, 45)');
          assert.equal(await page.locator('.delivery-choice').first().evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(34, 38, 45)');
          await audit('style-' + id);
          if (id === 'research') await page.screenshot({ path: path.join(output, 'style-dark-en.png') });
        }
      }
      if (step === 'review') {
        await page.screenshot({ path: path.join(output, 'review-dark-en.png') });
        assert.equal(await page.locator('.metric').first().evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(34, 38, 45)');
        // Language changes may replace the review DOM while export is pending.
        await page.evaluate(() => {
          const original = YoursPPT.buildPackage;
          YoursPPT.buildPackage = async () => new Promise(resolve => {
            window.finishPreferenceExport = () => { YoursPPT.buildPackage = original; resolve({ blob: new Blob(['fixture']), filename: 'preferences-fixture.zip' }); };
          });
        });
        await page.locator('[data-action=export]').click();
        await page.waitForFunction(() => typeof finishPreferenceExport === 'function');
        await page.locator('[data-action=settings]').click();
        await page.locator('#interface-language').selectOption('zh-CN');
        await page.locator('#interface-language').selectOption('en');
        await page.locator('[data-action=close-settings]').first().click();
        await page.evaluate(() => finishPreferenceExport());
        await page.waitForFunction(() => !document.querySelector('[data-action=export]').disabled);
      }
    }
    await page.waitForFunction(() => !document.querySelector('#agent-choice-trigger')?.disabled);
    await page.locator('#agent-choice-trigger').click();
    await page.screenshot({ path: path.join(output, 'agent-picker-dark.png') });
    await page.locator('[data-agent-id=claude]').click();
    assert.equal(await page.locator('#agent-choice').inputValue(), 'claude');
    await page.locator('#agent-choice-trigger').press('ArrowDown');
    await page.locator('[data-agent-id=claude]').press('Home');
    await page.locator('[data-agent-id=codex]').press('Enter');
    assert.equal(await page.locator('#agent-choice').inputValue(), 'codex');
    await page.locator('#agent-choice-trigger').press('ArrowDown');
    await page.locator('[data-agent-id=codex]').press('Escape');
    assert.equal(await page.locator('#agent-choice-trigger').getAttribute('aria-expanded'), 'false');
    // Changes in another tab apply without reloading or rewriting the draft.
    const other = await page.context().newPage();
    await other.goto(page.url()); await other.locator('.home-cta').waitFor();
    await other.evaluate(() => YoursPPT.setPreferences({ theme: 'light' }));
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
    await other.close();
    await page.locator('[data-action=settings]').click();
    await page.locator('[data-theme-choice=dark]').click();
    await page.locator('[data-action=close-settings]').first().click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('[data-action=settings]').click();
    await page.screenshot({ path: path.join(output, 'settings-mobile.png') });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.locator('#settings-dialog').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
    await fs.writeFile(path.join(output, 'english-ui-audit.json'), JSON.stringify(chinese, null, 2));
    assert.deepEqual(chinese.filter(entry => entry.texts.length), [], 'English interface has no untranslated visible labels');
    assert.deepEqual(errors, []);
    console.log('Preference persistence, content preservation, settings tabs, animated scrollbars and Agent selection passed.');
  } finally { await browser.close(); await bridge.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
