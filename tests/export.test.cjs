'use strict';
// Run: node --test tests/export.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const zlib = require('node:zlib');
const { spawnSync } = require('node:child_process');
const { pathToFileURL, fileURLToPath } = require('node:url');
const Y = require('../src/export.js');
const workspace = path.resolve(__dirname, '..');
const { walk } = require('../scripts/build-skill-assets.cjs');

// Independent ZIP reader: validate central offsets, local headers, bytes and CRC.
function independentCRC(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
async function readZip(blob) {
  const bytes = Buffer.from(await blob.arrayBuffer());
  const end = bytes.length - 22;
  assert.equal(bytes.readUInt32LE(end), 0x06054b50);
  assert.equal(bytes.readUInt16LE(end + 4), 0);
  assert.equal(bytes.readUInt16LE(end + 6), 0);
  const count = bytes.readUInt16LE(end + 10), start = bytes.readUInt32LE(end + 16);
  assert.equal(bytes.readUInt16LE(end + 8), count);
  assert.equal(bytes.readUInt32LE(end + 12), end - start);
  const entries = new Map();
  let cursor = start, nextLocal = 0;
  for (let i = 0; i < count; i++) {
    assert.equal(bytes.readUInt32LE(cursor), 0x02014b50);
    const flag = bytes.readUInt16LE(cursor + 8), method = bytes.readUInt16LE(cursor + 10);
    const crc = bytes.readUInt32LE(cursor + 16), compressedSize = bytes.readUInt32LE(cursor + 20), size = bytes.readUInt32LE(cursor + 24);
    const nameSize = bytes.readUInt16LE(cursor + 28), extra = bytes.readUInt16LE(cursor + 30), comment = bytes.readUInt16LE(cursor + 32);
    const offset = bytes.readUInt32LE(cursor + 42);
    assert.equal(flag, 0x0800); assert.equal(offset, nextLocal);
    assert.equal(bytes.readUInt32LE(offset), 0x04034b50);
    assert.equal(bytes.readUInt16LE(offset + 6), flag);
    assert.equal(bytes.readUInt16LE(offset + 8), method);
    assert.equal(bytes.readUInt32LE(offset + 14), crc);
    assert.equal(bytes.readUInt32LE(offset + 18), compressedSize);
    assert.equal(bytes.readUInt32LE(offset + 22), size);
    assert.equal(bytes.readUInt16LE(offset + 26), nameSize);
    assert.equal(bytes.readUInt16LE(offset + 28), 0);
    const nameBytes = bytes.subarray(cursor + 46, cursor + 46 + nameSize);
    assert.deepEqual(bytes.subarray(offset + 30, offset + 30 + nameSize), nameBytes);
    const name = nameBytes.toString('utf8');
    assert(!entries.has(name));
    const compressed = bytes.subarray(offset + 30 + nameSize, offset + 30 + nameSize + compressedSize);
    const data = method === 8 ? zlib.inflateRawSync(compressed) : Buffer.from(compressed);
    assert.equal(data.length, size); assert.equal(independentCRC(data), crc);
    const date = bytes.readUInt16LE(cursor + 14), time = bytes.readUInt16LE(cursor + 12);
    assert(date >= 33); assert.equal(bytes.readUInt16LE(offset + 12), date); assert.equal(bytes.readUInt16LE(offset + 10), time);
    const isDirectory = !!(bytes.readUInt32LE(cursor + 38) & 0x10);
    assert.equal(isDirectory, name.endsWith('/'));
    if (isDirectory) { assert.equal(size, 0); assert.equal(method, 0); }
    entries.set(name, { data, method, compressed, crc, date, time });
    nextLocal = offset + 30 + nameSize + compressedSize;
    cursor += 46 + nameSize + extra + comment;
  }
  assert.equal(nextLocal, start); assert.equal(cursor, end);
  return entries;
}
function state(overrides = {}) {
  return {
    meta: { title: '研究报告 🛰️', date: '2026-09-28', presenter: '李明', audience: '科研同事', goal: '呈现证据', duration: '12 分钟' },
    slides: [{ id: 's1', title: '实验结果', purpose: '解释收益', key: '保留边界条件', transition: '接续方法', support: '提升 3%\n控制组一致', visual: '误差棒图', notes: '不要夸大', sourceIds: ['a'], sourceNotes: '原始数据见附件' }],
    style: 'swiss', palette: 'ikb', delivery: 'html', ...overrides
  };
}
function attachment(overrides = {}) {
  const file = new Blob(['真实证据\n零字节\0与 emoji 🛰️'], { type: 'text/plain' });
  return { id: 'a', name: '证据 [1] 🛰️.txt', relativePath: '研究/证据 [1] 🛰️.txt', type: 'text/plain', size: file.size, file, ...overrides };
}

test('ZIP stores Unicode strings, arbitrary binary, Blob and explicit directories with valid headers', async () => {
  const binary = new Uint8Array([0, 255, 128, 1, 13, 10]);
  const result = await readZip(await Y.createZip([
    { name: '根 🛰️/', data: '' }, { name: '根 🛰️/中文.txt', data: 'héllo 世界\0' },
    { name: '根 🛰️/二进制.bin', data: binary }, { name: '根 🛰️/Blob.txt', data: new Blob(['Blob内容']) }
  ]));
  assert.equal(result.get('根 🛰️/中文.txt').data.toString(), 'héllo 世界\0');
  assert.deepEqual(result.get('根 🛰️/二进制.bin').data, Buffer.from(binary));
  assert.equal(result.get('根 🛰️/Blob.txt').data.toString(), 'Blob内容');
  assert.equal(result.get('根 🛰️/中文.txt').date, 33);
  assert.equal(Y.zipCRC32(new TextEncoder().encode('123456789')), 0xcbf43926);
  assert(Y.createZip([{ name: 'sync.txt', data: 'sync' }]) instanceof Blob);
});

test('ZIP accepts caller raw DEFLATE unchanged, with correct CRC, size and DOS time', async () => {
  const raw = Buffer.from('中文 repeated '.repeat(100)), compressed = zlib.deflateRawSync(raw);
  const result = await readZip(Y.createZip([{ name: '压缩.txt', compressedData: compressed, uncompressedSize: raw.length,
    crc: independentCRC(raw), method: 8, date: new Date(2026, 8, 28, 13, 14, 35) }]));
  const entry = result.get('压缩.txt');
  assert.deepEqual(entry.compressed, compressed); assert.deepEqual(entry.data, raw);
  assert.equal(entry.time, (13 << 11) | (14 << 5) | 17);
  assert.equal(entry.date, (46 << 9) | (9 << 5) | 28);
});

test('ZIP rejects unsafe paths, Unicode/case duplicates and file/directory conflicts', () => {
  for (const name of ['../x', '/x', 'C:/x', 'a\\b', 'a//b', 'a/./b', 'a/../b', 'a\0b', 'a\nb', 'CON.txt', 'nul', 'a.', 'a ', '\ud800']) {
    assert.throws(() => Y.createZip([{ name, data: '' }]), /Unsafe ZIP path/);
  }
  for (const pair of [['a', 'a'], ['A', 'a'], ['é', 'e\u0301'], ['folder', 'folder/']]) {
    assert.throws(() => Y.createZip(pair.map(name => ({ name, data: '' }))), /Duplicate ZIP name/);
  }
  for (const names of [['a', 'a/b'], ['a/b', 'a']]) {
    assert.throws(() => Y.createZip(names.map(name => ({ name, data: '' }))), /file\/directory conflict/);
  }
});

test('ZIP32 fails before integer truncation and rejects inconsistent metadata', () => {
  const entry = { name: 'x', data: 'x' };
  for (const bad of [NaN, -1, 1.5, 0xffffffff, 0x100000000]) {
    assert.throws(() => Y.createZip([{ ...entry, uncompressedSize: bad }]), /ZIP32/);
  }
  assert.throws(() => Y.createZip(new Array(0xffff).fill(entry)), /entry count/);
  assert.throws(() => Y.createZip([{ name: 'x'.repeat(65536), data: '' }]), /filename length/);
  assert.throws(() => Y.createZip([{ name: '中文'.repeat(22000), data: '' }]), /filename length/);
  assert.throws(() => Y.createZip([{ ...entry, crc: 0 }]), /CRC mismatch/);
  assert.throws(() => Y.createZip([{ ...entry, uncompressedSize: 2 }]), /size mismatch/);
  assert.throws(() => Y.createZip([{ ...entry, method: 12 }]), /Unsupported/);
  assert.throws(() => Y.createZip([{ ...entry, method: 8 }]), /compressedData/);
  assert.throws(() => Y.createZip([{ name: 'x', compressedData: new Uint8Array([3, 0]), uncompressedSize: 0, method: 8 }]), /requires crc/);
  assert.throws(() => Y.createZip([{ name: 'x/', data: 'not empty' }]), /Directory/);
  assert.throws(() => Y.createZip([{ ...entry, date: '1970-01-01' }]), /DOS date/);
  assert.throws(() => Y.createZip([{ ...entry, date: 'invalid' }]), /DOS date/);
  // Both individually fit ZIP32; the archive's declared uncompressed size can be near the limit.
  const small = Y.createZip([{ name: 'x', compressedData: new Uint8Array([3, 0]), uncompressedSize: 0xfffffffe, crc: 0, method: 8 }]);
  assert(small instanceof Blob);
});

test('empty ZIP has an independently parseable zero-size central directory', async () => {
  assert.equal((await readZip(Y.createZip([]))).size, 0);
});

test('package contains one safe root, real attachments, all inputs and usable relative source links', async () => {
  const events = [], input = state();
  input.slides[0].notes = '```\n用户完整输入\n````';
  input.extraInput = { preserve: '额外输入' };
  const a = attachment(), result = await Y.buildPackage(input, [a], { skipSkills: true, onProgress: e => events.push(e) });
  const zip = await readZip(result.blob), roots = new Set([...zip.keys()].map(name => name.split('/')[0]));
  assert.deepEqual([...roots], ['研究报告 🛰️']);
  assert.equal(result.filename, '研究报告 🛰️.zip');
  const root = [...roots][0] + '/', brief = zip.get(root + 'brief.md').data.toString();
  const manifest = JSON.parse(zip.get(root + 'references/manifest.json').data);
  assert.equal(manifest[0].path, 'references/研究/证据 [1] 🛰️.txt');
  assert.deepEqual(zip.get(root + manifest[0].path).data, Buffer.from(await a.file.arrayBuffer()));
  for (const slideField of ['id', 'title', 'purpose', 'key', 'transition', 'support', 'visual', 'notes', 'sourceNotes']) {
    assert(brief.includes(input.slides[0][slideField]), slideField);
  }
  assert(brief.includes('额外输入')); assert(brief.includes('12 分钟')); assert(brief.includes('Agent 入口'));
  assert(!brief.includes('D:\\')); assert(!brief.includes('vendor/'));
  const links = [...brief.matchAll(/\]\(([^)]+)\)/gu)].map(match => decodeURIComponent(match[1]));
  for (const target of links) assert(zip.has(root + target), 'unresolved relative link: ' + target);
  const selection = JSON.parse(zip.get(root + 'style/selection.json').data);
  assert.equal(selection.style, 'swiss'); assert.equal(selection.palette, 'ikb'); assert(selection.skippedSkills);
  assert(brief.includes('未附')); assert(brief.includes('skipSkills=true'));
  assert.equal(events[0].percent, 0); assert.equal(events.at(-1).percent, 100);
  assert.equal(events.at(-1).phase, 'done');
  events.forEach((event, i) => { assert(event.message); if (i) assert(event.percent >= events[i - 1].percent); });
});

test('package sanitizes names, preserves nested directories and allocates collision-free paths', async () => {
  const names = ['manifest.json', 'MANIFEST.JSON', 'x', 'x/a.txt', 'CON.txt', 'folder\\报告.txt', 'folder/报告.txt', 'é.txt', 'e\u0301.txt', 'a?.txt', 'a*.txt'];
  const attachments = names.map((name, i) => attachment({ id: 'id-' + i, name, relativePath: name }));
  const result = await Y.buildPackage(state({ meta: { title: '../CON: 报告*' } }), attachments, { skipSkills: true });
  const zip = await readZip(result.blob), root = result.filename.slice(0, -4) + '/';
  const manifest = JSON.parse(zip.get(root + 'references/manifest.json').data);
  assert.equal(new Set(manifest.map(x => x.path.normalize('NFC').toLowerCase())).size, names.length);
  assert.equal(manifest[0].path, 'references/manifest-2.json');
  assert.equal(manifest[5].path, 'references/folder/报告.txt');
  assert.equal(manifest[6].path, 'references/folder/报告-2.txt');
  for (const item of manifest) assert(zip.has(root + item.path));
  for (const name of zip.keys()) assert(!name.split('/').includes('..'));
});

test('package reports missing input and unmapped sources, but never drops supplied source notes', async () => {
  const input = state({ meta: {}, style: 'invalid', delivery: 'invalid', palette: '', slides: [{ id: 's', sourceIds: ['missing'], sourceNotes: 'https://example.com/证据' }] });
  const result = await Y.buildPackage(input, [], { skipSkills: true }), zip = await readZip(result.blob);
  const brief = zip.get('yours-ppt/brief.md').data.toString();
  assert(brief.includes('无匹配：missing')); assert(brief.includes('https://example.com/证据'));
  assert(brief.includes('基本信息未提供：goal'));
  for (const field of ['title', 'purpose', 'content']) assert(brief.includes('第 1 页未提供：' + field));
  for (const field of ['details', 'transition', 'summary', 'visual', 'notes']) assert(!brief.includes('第 1 页未提供：' + field));
  const selection = JSON.parse(zip.get('yours-ppt/style/selection.json').data);
  assert.equal(selection.style, 'editorial'); assert.equal(selection.delivery, 'html');
  assert.equal(selection.requestedStyle, 'invalid');
});

test('package rejects unsafe relative paths and duplicate attachment IDs', async () => {
  for (const relativePath of ['../秘密', '/秘密', 'C:\\秘密', 'a/../b', 'a//b']) {
    await assert.rejects(Y.buildPackage(state(), [attachment({ relativePath })], { skipSkills: true }), /Unsafe attachment/);
  }
  await assert.rejects(Y.buildPackage(state(), [attachment(), attachment()], { skipSkills: true }), /Duplicate attachment ID/);
  await assert.rejects(Y.buildPackage(state(), [attachment({ file: null })], { skipSkills: true }), /Blob file/);
});

test('styles and getStyle can be added after script initialization', async () => {
  Y.STYLES = { swiss: { font: '未来字体', custom: '登记版式' } };
  Y.getStyle = s => ({ label: '动态风格', paletteDetails: { id: s.palette, accent: '#123456' } });
  try {
    const result = await Y.buildPackage(state(), [], { skipSkills: true });
    const zip = await readZip(result.blob), selection = JSON.parse(zip.get('研究报告 🛰️/style/selection.json').data);
    assert.equal(selection.definition.font, '未来字体'); assert.equal(selection.definition.custom, '登记版式');
    assert.equal(selection.definition.label, '动态风格'); assert.equal(selection.definition.paletteDetails.id, 'ikb');
  } finally { delete Y.STYLES; delete Y.getStyle; }
});

test('synchronous buildBrief matches exported brief exactly and never reads attachment bytes', async () => {
  const input = state(), files = [attachment({ size: 999 }), attachment({ id: 'b', relativePath: '研究/证据 [1] 🛰️.txt' })];
  const before = JSON.stringify(input);
  const preview = Y.buildBrief(input, files, { skipSkills: true });
  assert.equal(typeof preview, 'string');
  assert(preview.includes('声明大小与真实字节数不符'));
  const result = await Y.buildPackage(input, files, { skipSkills: true });
  assert.equal(preview, result.entries.find(e => e.name.endsWith('/brief.md')).data);
  assert.equal(JSON.stringify(input), before);
  const metadataOnly = attachment({ file: { size: 12, type: 'text/plain', arrayBuffer() { throw new Error('preview read bytes'); } } });
  assert.equal(typeof Y.buildBrief(input, [metadataOnly]), 'string');
});

test('palette selection works with STYLES alone and with the main app getStyle schema', async () => {
  Y.STYLES = { swiss: { name: '配色测试', palettes: [{ id: 'ikb', ink: '#111111', paper: '#eeeeee', accent: '#aabbcc' }, { id: 'lemon', ink: '#101010', paper: '#fafafa', accent: '#FFD500' }] } };
  try {
    const input = state({ palette: 'lemon' });
    let result = await Y.buildPackage(input, [], { skipSkills: true });
    let selection = JSON.parse(result.entries.find(e => e.name.endsWith('selection.json')).data);
    assert.equal(selection.colors.accent, '#FFD500'); assert.equal(selection.definition.accent, '#FFD500');
    assert(Y.buildBrief(input, []).includes('#FFD500'));
    Y.getStyle = s => {
      const style = Y.STYLES[s.style], palette = style.palettes.find(p => p.id === s.palette) || style.palettes[0];
      return { ...style, palette, colors: palette, delivery: s.delivery };
    };
    result = await Y.buildPackage(input, [], { skipSkills: true });
    selection = JSON.parse(result.entries.find(e => e.name.endsWith('selection.json')).data);
    assert.equal(selection.colors.accent, '#FFD500'); assert.equal(selection.resolvedPalette.id, 'lemon');
    assert.equal(Y.buildBrief(input, [], { skipSkills: true }), result.entries.find(e => e.name.endsWith('/brief.md')).data);
  } finally { delete Y.STYLES; delete Y.getStyle; }
});

test('all generated asset entries inflate byte-for-byte to complete upstream trees, including licenses', () => {
  for (const [key, asset, source] of [
    ['guizang', 'guizang.js', 'vendor/guizang-ppt-skill'],
    ['pptMaster', 'ppt-master.js', 'vendor/ppt-master-vendored/skills/ppt-master']
  ]) {
    const bundle = require('../assets/skills/' + asset), expected = walk(path.join(workspace, source));
    assert.equal(bundle.entries.length, expected.length);
    assert.deepEqual(bundle.entries.map(e => e.name), expected.map(e => e.name));
    assert.equal(bundle.stats.files, expected.filter(e => !e.directory).length);
    for (let i = 0; i < expected.length; i++) {
      const entry = bundle.entries[i], compressed = Buffer.from(entry.base64, 'base64');
      const raw = entry.method === 8 ? zlib.inflateRawSync(compressed) : compressed;
      assert.equal(raw.length, entry.size); assert.equal(independentCRC(raw), entry.crc);
      assert.deepEqual(raw, expected[i].directory ? Buffer.alloc(0) : fs.readFileSync(expected[i].absolute), key + ': ' + entry.name);
    }
    assert(bundle.entries.some(e => e.name === 'LICENSE'));
    if (key === 'pptMaster') {
      assert.equal(bundle.stats.files, 12953);
      for (const required of ['SPONSORS.md', 'SPONSORS_CN.md', 'scripts/attribution_guard.py']) assert(bundle.entries.some(e => e.name === required));
    }
  }
});

test('PPTX plus Guizang passes independent Python unzip, full-tree hashes and extracted attribution guard', async t => {
  const result = await Y.buildPackage(state({ delivery: 'pptx' }), [attachment()]);
  assert.equal(Y.buildBrief(state({ delivery: 'pptx' }), [attachment()]), result.entries.find(e => e.name.endsWith('/brief.md')).data);
  assert(result.entries.some(e => e.name.endsWith('/guizang-ppt-skill/SKILL.md')));
  assert(result.entries.some(e => e.name.endsWith('/ppt-master/SKILL.md')));
  const python = spawnSync('python', ['--version'], { encoding: 'utf8' });
  if (python.error || python.status !== 0) { t.skip('Python unavailable for independent unzip'); return; }
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'yoursppt-export-'));
  try {
    const zipPath = path.join(directory, 'package.zip');
    fs.writeFileSync(zipPath, Buffer.from(await result.blob.arrayBuffer()));
    const code = [
      'import sys, zipfile, pathlib, hashlib, subprocess, time',
      'archive, dest, workspace = sys.argv[1:]',
      'started = time.monotonic()',
      'print("phase: zip open", flush=True)',
      'with zipfile.ZipFile(archive) as z:',
      ' assert z.testzip() is None',
      ' print("phase: full ZIP CRC passed", flush=True)',
      ' names = z.namelist()',
      ' assert len({n.split("/")[0] for n in names}) == 1',
      ' assert all(i.flag_bits & 0x800 for i in z.infolist())',
      ' for local, source in [("guizang-ppt-skill", "vendor/guizang-ppt-skill"), ("ppt-master", "vendor/ppt-master-vendored/skills/ppt-master")]:',
      '  prefix = names[0].split("/")[0] + "/style/skills/" + local + "/"',
      '  for member in z.infolist():',
      '   if member.filename.startswith(prefix) and not member.is_dir():',
      '    original = pathlib.Path(workspace) / source / member.filename[len(prefix):]',
      '    assert hashlib.sha256(z.read(member)).digest() == hashlib.sha256(original.read_bytes()).digest(), member.filename',
      ' print("phase: full-tree decompression and hashes passed", flush=True)',
      // Extract actual protected distribution files for the unchanged guard.
      // Full assets were already independently decompressed and hashed above.
      ' protected = ["SKILL.md", "LICENSE", "SPONSORS.md", "SPONSORS_CN.md", "scripts/attribution_guard.py", "scripts/console_encoding.py", "scripts/project_manager.py", "scripts/project_management/cli.py", "scripts/svg_quality_checker.py", "scripts/svg_quality/cli.py", "scripts/svg_to_pptx.py", "scripts/svg_to_pptx/pptx_package/cli.py", "scripts/register_template.py", "scripts/template_preview_pptx.py"]',
      ' for relative in protected: z.extract(names[0].split("/")[0] + "/style/skills/ppt-master/" + relative, dest)',
      ' for name in names:',
      '  if "/references/" in name and not name.endswith("/"): z.extract(name, dest)',
      'root = pathlib.Path(dest) / names[0].split("/")[0]',
      'guard = root / "style/skills/ppt-master/scripts/attribution_guard.py"',
      'subprocess.run([sys.executable, "-B", str(guard)], check=True)',
      'print("independent unzip, full-tree hashes and attribution guard passed:", len(names), "entries in", round(time.monotonic()-started, 2), "s", flush=True)'
    ].join('\n');
    const check = spawnSync('python', ['-B', '-c', code, zipPath, path.join(directory, 'extracted'), workspace], { encoding: 'utf8', timeout: 60000 });
    assert.equal(check.status, 0, check.stdout + check.stderr + String(check.error || ''));
    t.diagnostic(check.stdout.trim());
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('classic browser scripts load skill assets via file:// script tags with no fetch or import', async () => {
  const loadedURLs = [], context = vm.createContext({ Blob, Uint8Array, Uint32Array, DataView, TextEncoder, URL, setTimeout, atob });
  context.window = context;
  context.document = {
    currentScript: { src: pathToFileURL(path.join(workspace, 'src/export.js')).href },
    createElement() { return { remove() {} }; },
    head: { appendChild(script) {
      loadedURLs.push(script.src);
      setTimeout(() => {
        try { vm.runInContext(fs.readFileSync(fileURLToPath(script.src), 'utf8'), context); script.onload(); }
        catch (error) { script.onerror(error); }
      }, 0);
    } }
  };
  vm.runInContext(fs.readFileSync(path.join(workspace, 'src/zip.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(workspace, 'src/export.js'), 'utf8'), context);
  const [a, b] = await Promise.all([context.YoursPPT.buildPackage(state(), [], {}), context.YoursPPT.buildPackage(state(), [], {})]);
  assert.equal(loadedURLs.length, 1);
  assert(loadedURLs[0].startsWith('file:///')); assert(loadedURLs[0].endsWith('/assets/skills/guizang.js'));
  assert(a.blob.size > 5000000); assert.equal(a.blob.size, b.blob.size);
});
