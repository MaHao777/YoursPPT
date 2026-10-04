'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
require('../src/model.js'); require('../src/styles.js'); require('../src/zip.js'); require('../src/draft.js'); require('../src/export.js'); require('../src/folder.js');
const Y = globalThis.YoursPPT;
test('unfinished ZIP draft restores exact Markdown, all pages, palette, position and original bytes', async () => {
  const state = Y.freshDraft(); state.step = state.resumeStep = 'outline';
  state.slides.push(Y.createSlide({ content: '## 实验\n\n| 甲 | 乙 |\n| --- | --- |\n| 1 | 2 |' })); state.activeSlide = 1;
  state.style = 'research'; state.palette = 'red-white'; state.slides[1].sourceIds = ['binary'];
  const raw = Uint8Array.from([0, 255, 34, 128]);
  const attachments = [{ id: 'binary', name: '证据.bin', relativePath: '资料/证据.bin', size: 4, lastModified: 42, file: new Blob([raw]) }];
  const result = await Y.buildDraftArchive(state, attachments), restored = await Y.readDraftFile(result.blob);
  assert.deepEqual(restored.state, state); assert.equal(restored.attachments[0].id, 'binary');
  assert.deepEqual(new Uint8Array(await restored.attachments[0].file.arrayBuffer()), raw);
  assert(Y.issues(restored.state, restored.attachments).errors.length);
  const workPackage = await Y.readDraftFile((await Y.buildPackage(state, attachments, { skipSkills: true })).blob);
  assert.deepEqual(workPackage.state, state);
  assert.deepEqual(new Uint8Array(await workPackage.attachments[0].file.arrayBuffer()), raw);
});
test('work package includes a readable unfinished draft with explicit missing files and matching academic colors', async () => {
  const state = Y.freshDraft(); state.style = 'research'; state.palette = 'blue-white';
  state.slides[0].sourceIds = ['missing'];
  const attachments = [{ id: 'missing', name: '待补.txt', size: 5, file: null }];
  await assert.rejects(Y.buildPackage(state, attachments, { skipSkills: true }), /Blob/);
  const result = await Y.buildPackage(state, attachments, { skipSkills: true, allowIncomplete: true });
  const restored = await Y.readDraftFile(result.blob);
  assert.deepEqual(restored.state, state); assert.equal(restored.attachments[0].file, null);
  assert.match(result.entries.find(e => e.name.endsWith('/brief.md')).data, /缺少真实文件/);
  assert.equal(JSON.parse(result.entries.find(e => e.name.endsWith('/style/selection.json')).data).colors.accent, '#1859a3');
});
test('legacy JSON draft remains readable with missing-file associations', async () => {
  const state = Y.exampleDraft(), attachments = [{ id: 'old', name: '旧文件', size: 8 }];
  state.slides[0].sourceIds = ['old'];
  const restored = await Y.readDraftFile(new Blob([JSON.stringify({ version: 2, state, attachments })]));
  assert.deepEqual(restored.state, state); assert.equal(restored.attachments[0].file, null);
});
test('corrupt, truncated, missing and unsafe draft inputs fail before replacing a draft', async () => {
  const result = await Y.buildDraftArchive(Y.freshDraft(), []);
  const raw = new Uint8Array(await result.blob.arrayBuffer());
  const broken = raw.slice(); broken[45] ^= 1;
  await assert.rejects(Y.readDraftFile(new Blob([broken])), /校验/);
  await assert.rejects(Y.readDraftFile(result.blob.slice(0, -1)), /不完整/);
  const unsafe = { version: 3, state: Y.freshDraft(), attachments: [{ id: 'bad', name: '坏', size: 1, path: 'references/../坏' }] };
  await assert.rejects(Y.readDraftFile(await Y.createZip([{ name: 'draft.json', data: JSON.stringify(unsafe) }])), /路径无效/);
  await assert.rejects(Y.readDraftFile(new Blob(['{"attachments":[]}'])), /基本信息/);
  unsafe.attachments[0].size = 101 * 1048576;
  await assert.rejects(Y.readDraftFile(new Blob([JSON.stringify(unsafe)])), /大小超过/);
  unsafe.attachments[0] = { id: 'lost', name: '丢失', size: 1, path: 'references/丢失' };
  await assert.rejects(Y.readDraftFile(await Y.createZip([{ name: 'draft.json', data: JSON.stringify(unsafe) }])), /缺失/);
  unsafe.attachments.push({ ...unsafe.attachments[0] });
  await assert.rejects(Y.readDraftFile(new Blob([JSON.stringify(unsafe)])), /重复/);
});
test('draft save preserves duplicate source filenames in distinct archive paths', async () => {
  const attachments = ['a', 'b'].map((id, i) => ({ id, name: '同名.txt', size: 1, file: new Blob([String(i)]) }));
  const restored = await Y.readDraftFile((await Y.buildDraftArchive(Y.freshDraft(), attachments)).blob);
  assert.deepEqual(await Promise.all(restored.attachments.map(a => a.file.text())), ['0', '1']);
});
test('file export creates unique names and propagates write failure', async () => {
  const entries = new Map([['草稿.zip', 'old'], ['草稿-2.zip', 'directory']]);
  const parent = { async getFileHandle(name, options = {}) {
    if (entries.get(name) === 'directory') throw Object.assign(new Error(), { name: 'TypeMismatchError' });
    if (!entries.has(name) && !options.create) throw Object.assign(new Error(), { name: 'NotFoundError' });
    return { async createWritable() { return { async write(blob) { entries.set(name, await blob.text()); }, async close() {}, async abort() {} }; } };
  } };
  assert.equal(await Y.saveExportFile(new Blob(['new']), '草稿.zip', parent), '草稿-3.zip');
  assert.equal(entries.get('草稿.zip'), 'old'); assert.equal(entries.get('草稿-3.zip'), 'new');
  await assert.rejects(Y.saveExportFile(new Blob(), '../unsafe', parent), /文件名/);
  let aborted = false;
  const failing = { async getFileHandle(name, options) {
    if (!options?.create) throw Object.assign(new Error(), { name: 'NotFoundError' });
    return { async createWritable() { return { async write() { throw new Error('Disk full'); }, async abort() { aborted = true; } }; } };
  } };
  await assert.rejects(Y.saveExportFile(new Blob(), 'fail.zip', failing), /Disk full/); assert(aborted);
});
