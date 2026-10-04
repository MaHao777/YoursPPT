'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
require('../src/model.js');
require('../src/styles.js');
const Y = globalThis.YoursPPT;
test('duplicating a slide preserves content without reusing IDs or source arrays', () => {
  const a = Y.createSlide({ title: '标题', key: '结论', sourceIds: ['one'] });
  const b = Y.createSlide(a);
  assert.notEqual(a.id, b.id); assert.equal(a.title, b.title);
  b.sourceIds.push('two'); assert.deepEqual(a.sourceIds, ['one']);
});
test('normalization repairs duplicate IDs, invalid enums, fractional indexes and malformed fields', () => {
  const draft = Y.freshDraft();
  draft.slides = [{ id: 'same', title: '<script>内容</script>', sourceIds: 3 }, { id: 'same' }];
  draft.activeSlide = 0.9; draft.style = 'bad'; draft.delivery = 'bad';
  const normalized = Y.normalizeDraft(draft);
  assert.equal(new Set(normalized.slides.map(s => s.id)).size, 2);
  assert.equal(normalized.activeSlide, 0); assert.equal(normalized.style, 'swiss');
  assert.equal(normalized.delivery, 'pptx'); assert.deepEqual(normalized.slides[0].sourceIds, []);
  assert.equal(normalized.slides[0].title, '<script>内容</script>');
  assert.throws(() => Y.normalizeDraft({ version: 1 }));
});
test('required logic, real calendar dates and missing source files block export; suggestions do not', () => {
  const state = Y.exampleDraft();
  assert.equal(Y.issues(state).errors.length, 0);
  state.meta.date = '2026-02-30';
  assert(Y.issues(state).errors.some(e => e.field === 'date'));
  state.meta.date = '2028-02-29'; assert.equal(Y.issues(state).errors.length, 0);
  state.slides[1].transition = ''; assert(Y.issues(state).suggestions.length);
  state.slides[0].sourceIds = ['missing'];
  assert(Y.issues(state).errors.some(e => e.step === 'outline'));
  assert.equal(Y.issues(state, [{ id: 'missing', file: new Blob(['data']) }]).errors.length, 0);
  state.slides[1].purpose = ''; assert(Y.issues(state).errors.some(e => e.slide === 1 && e.field === 'purpose'));
});
test('every style resolves its actual palettes independently of output format', () => {
  for (const style of Object.values(Y.STYLES)) for (const palette of style.palettes) {
    const resolved = Y.getStyle({ style: style.id, palette: palette.id, delivery: 'pptx' });
    assert.equal(resolved.colors.paper, palette.paper); assert.equal(resolved.palette.id, palette.id);
  }
  assert.equal(Y.getStyle({ style: 'swiss', palette: 'lemon' }).colors.accent, '#FFD500');
});
test('drafts resume the last step, invalid duration is actionable, and missing known files differ from stale IDs', () => {
  const state = Y.exampleDraft(); state.resumeStep = 'style';
  assert.equal(Y.normalizeDraft(state).resumeStep, 'style');
  for (const step of ['review', 'generate']) {
    state.step = step; state.resumeStep = step;
    const restored = Y.normalizeDraft(state);
    assert.equal(restored.step, step); assert.equal(restored.resumeStep, step);
  }
  state.meta.duration = '-2'; assert(Y.issues(state).errors.some(e => e.field === 'duration'));
  state.meta.duration = '0.5'; assert.equal(Y.issues(state).errors.length, 0);
  state.slides[0].sourceIds = ['old'];
  assert(Y.issues(state, [{ id: 'old', file: null, name: '资料' }]).errors.some(e => e.step === 'context'));
});

test('legacy slide content migrates without losing text, and retired materials navigation resumes context', () => {
  const draft = Y.exampleDraft();
  draft.slides = [{ title: '旧页', purpose: '目的', key: '旧概括', support: '## 旧内容\n\n- 事实', transition: '承接', sourceNotes: '第 8 页', sourceIds: ['old'] }];
  draft.step = 'materials'; draft.resumeStep = 'materials';
  const restored = Y.normalizeDraft(draft);
  assert.equal(restored.step, 'context'); assert.equal(restored.resumeStep, 'context');
  assert.equal(restored.slides[0].details, '旧概括'); assert.equal(restored.slides[0].content, '## 旧内容\n\n- 事实');
  assert.equal(restored.slides[0].sourceNotes, '第 8 页'); assert.deepEqual(restored.slides[0].sourceIds, ['old']);
  assert.equal(Y.createSlide({ content: '', support: 'obsolete' }).content, '');
  const copy = Y.createSlide(restored.slides[0]);
  assert.equal(copy.content, restored.slides[0].content); assert.equal(copy.details, '旧概括'); assert.notEqual(copy.id, restored.slides[0].id);
});

test('details migration preserves distinct coexisting Markdown fields and is stable on reload', () => {
  const draft = Y.exampleDraft();
  draft.slides = [{ title: '主题', purpose: '目的', content: '- 内容', details: '**补充**\n', summary: '## 旧概括', key: '> 更早的结论', visual: '配图', notes: '备注' }];
  const restored = Y.normalizeDraft(draft);
  assert.equal(restored.slides[0].details, '**补充**\n\n\n## 旧概括\n\n> 更早的结论');
  assert.equal(restored.slides[0].visual, '配图'); assert.equal(restored.slides[0].notes, '备注');
  assert.deepEqual(Y.normalizeDraft(restored), restored);
  assert.equal(Y.createSlide({ details: '相同', summary: '相同', key: '相同' }).details, '相同');
  assert.equal(Y.createSlide({ details: '', summary: '保留旧概括' }).details, '保留旧概括');
  assert.equal(Object.hasOwn(restored.slides[0], 'summary'), false);
  assert.equal(Object.hasOwn(restored.slides[0], 'key'), false);
});

test('only theme, purpose and content are required per slide; optional fields may be empty', () => {
  const draft = Y.exampleDraft();
  draft.slides = [Y.createSlide({ title: '**主题**', purpose: '- 目的', content: '## 内容', details: '', transition: '' })];
  assert.equal(Y.issues(draft).errors.length, 0);
  for (const field of ['title', 'purpose', 'content']) {
    const incomplete = Y.normalizeDraft(draft);
    incomplete.slides[0][field] = ' \n\t';
    assert.deepEqual(Y.issues(incomplete).errors.map(e => [e.slide, e.field]), [[0, field]]);
  }
});

test('every visual choice survives draft normalization and exports its own rules and source paths', async () => {
  require('../src/export.js');
  for (const style of Object.values(Y.STYLES)) {
    const draft = Y.exampleDraft(); draft.style = style.id; draft.palette = style.palettes.at(-1).id; draft.delivery = 'html';
    draft.slides[0].content = '## 完整 Markdown\n\n| 项目 | 数量 |\n| --- | --- |\n| 证据 | 2 |\n\n````\n```嵌套```\n````';
    const restored = Y.normalizeDraft(draft);
    assert.equal(restored.style, style.id); assert.equal(restored.palette, draft.palette);
    const result = await Y.buildPackage(restored, [], { skipSkills: true });
    const selection = JSON.parse(result.entries.find(e => e.name.endsWith('selection.json')).data);
    assert.equal(selection.style, style.id); assert.deepEqual(selection.definition.rules, style.rules);
    assert.equal(selection.colors.paper, style.palettes.at(-1).paper);
    const brief = result.entries.find(e => e.name.endsWith('/brief.md')).data;
    assert(brief.includes('### 主题') && brief.includes('### 目的') && brief.includes('### 内容') && brief.includes('### 细节（选填）') && brief.includes('### 承接关系（选填）') && brief.includes('### 引用内容'));
    assert(brief.includes(draft.slides[0].content));
    if (style.visualReference) {
      assert.equal(selection.skills[0].id, 'pptMaster');
      const relative = style.resourcePath.replace('style/skills/ppt-master/', '');
      assert(require('node:fs').existsSync(require('node:path').join(__dirname, '../vendor/ppt-master-vendored/skills/ppt-master', relative)));
      assert(result.entries.find(e => e.name.endsWith('/guide.md')).data.includes(relative));
    }
  }
});

test('export preserves all Markdown fields verbatim and reports only required slide gaps', () => {
  require('../src/export.js');
  const draft = Y.exampleDraft();
  const markdown = { title: '**主题**\n第二行', purpose: '- **目的**\n- 第二条', content: '```md\n# 原文\n```', details: '> 补充\n\n| 项 | 值 |\n| --- | --- |\n| a | b |', transition: '1. 上一页\n2. 本页', visual: '`配图要求`', notes: '**备注**', sourceNotes: '[出处](https://example.com)' };
  draft.slides = [Y.createSlide(markdown)];
  const brief = Y.buildBrief(draft, [], { skipSkills: true });
  for (const raw of Object.values(markdown)) assert(brief.includes(raw));
  const gaps = brief.split('## 输入缺口与待确认')[1].split('## 完整输入记录')[0];
  assert(!gaps.includes('第 1 页未提供：'));
  draft.slides = [Y.createSlide({ title: '主题', purpose: '目的', content: '- 内容' })];
  const optionalBlankBrief = Y.buildBrief(draft, [], { skipSkills: true });
  assert(!optionalBlankBrief.includes('第 1 页未提供：'));
  draft.slides[0].content = '';
  assert(Y.buildBrief(draft, []).includes('第 1 页未提供：content'));
  draft.slides = [{ title: '主题', purpose: '目的', support: '- 原内容', details: '**新细节**', summary: '> 旧概括', key: '旧结论' }];
  const legacyBrief = Y.buildBrief(draft, [], { skipSkills: true });
  assert(legacyBrief.includes('**新细节**\n\n> 旧概括\n\n旧结论'));
  assert(legacyBrief.includes('- 原内容'));
});
