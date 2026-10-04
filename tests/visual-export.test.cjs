'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
require('../src/model.js');
require('../src/styles.js');
require('../src/export.js');
const Y = globalThis.YoursPPT;

test('new visual style HTML ZIP carries original visual reference, exact content and selected source bytes', async () => {
  const draft = Y.exampleDraft();
  Object.assign(draft, { style: 'dark-tech', palette: 'violet', delivery: 'html' });
  Object.assign(draft.slides[0], { content: '## 具体内容\n\n- **引用证据**\n\n| 组别 | 值 |\n| --- | --- |\n| 甲 | 2 |', sourceIds: ['evidence'], sourceNotes: '原始报告第 8 页，采用表 2' });
  const file = new Blob([new Uint8Array([0, 255, 34, 128])]);
  const result = await Y.buildPackage(draft, [{ id: 'evidence', name: '证据.bin', relativePath: '原始资料/证据.bin', file, size: file.size }]);
  const output = path.resolve(__dirname, '../output/playwright');
  fs.mkdirSync(output, { recursive: true });
  const archive = path.join(output, 'new-visual-html.zip');
  fs.writeFileSync(archive, Buffer.from(await result.blob.arrayBuffer()));
  const check = spawnSync('python', ['-B', '-c', [
    'import zipfile,json,pathlib,sys',
    'with zipfile.ZipFile(sys.argv[1]) as z:',
    ' assert z.testzip() is None',
    ' root=z.namelist()[0]',
    ' s=json.loads(z.read(root+"style/selection.json"))',
    ' assert s["style"]=="dark-tech" and s["delivery"]=="html"',
    ' assert s["colors"]["accent"]=="#c2a1ff"',
    ' assert [x["id"] for x in s["skills"]]==["pptMaster"]',
    ' reference="style/skills/ppt-master/references/visual-styles/dark-tech.md"',
    ' assert z.read(root+reference)==pathlib.Path(sys.argv[2]).read_bytes()',
    ' guide=z.read(root+"style/guide.md").decode("utf8")',
    ' assert "skills/ppt-master/references/visual-styles/dark-tech.md" in guide',
    ' brief=z.read(root+"brief.md").decode("utf8")',
    ' assert "| 组别 | 值 |" in brief and "原始报告第 8 页，采用表 2" in brief',
    ' manifest=json.loads(z.read(root+"references/manifest.json"))',
    ' assert manifest[0]["id"]=="evidence"',
    ' assert z.read(root+manifest[0]["path"])==bytes([0,255,34,128])',
    ' print("New visual HTML ZIP independently verified:",len(z.namelist()),"entries")'
  ].join('\n'), archive, path.resolve(__dirname, '../vendor/ppt-master-vendored/skills/ppt-master/references/visual-styles/dark-tech.md')], { encoding: 'utf8', timeout: 60000 });
  assert.equal(check.status, 0, check.stdout + check.stderr);
  console.log(check.stdout.trim());
});
