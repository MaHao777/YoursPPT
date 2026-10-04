'use strict';
// Run: node --test tests/bridge.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const zlib = require('node:zlib');
require('../src/model.js');
require('../src/styles.js');
const Y = require('../src/export.js');
const { createBridge } = require('../server/bridge.cjs');
const { isPptx } = require('../server/artifacts.cjs');

const root = path.resolve(__dirname, '..');
const terminal = new Set(['completed', 'failed', 'cancelled']);
const agent = { id: 'codex', name: 'Codex', available: true, command: 'fixture', version: '1' };
const html = Buffer.from('<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>结果</title></head><body><main>真实附件 🛰️</main></body></html>');

function draft(delivery = 'html') {
  return { ...Y.exampleDraft(), delivery, style: 'swiss', palette: 'ikb' };
}

// Read ZIP central-directory records independently of the production writer.
function unzip(bytes) {
  const end = bytes.length - 22;
  assert.equal(bytes.readUInt32LE(end), 0x06054b50, 'ZIP end record');
  let cursor = bytes.readUInt32LE(end + 16);
  const count = bytes.readUInt16LE(end + 10), entries = new Map();
  for (let i = 0; i < count; i++) {
    assert.equal(bytes.readUInt32LE(cursor), 0x02014b50, 'ZIP central header');
    const method = bytes.readUInt16LE(cursor + 10), size = bytes.readUInt32LE(cursor + 20);
    const rawSize = bytes.readUInt32LE(cursor + 24), nameSize = bytes.readUInt16LE(cursor + 28);
    const extra = bytes.readUInt16LE(cursor + 30), comment = bytes.readUInt16LE(cursor + 32);
    const offset = bytes.readUInt32LE(cursor + 42);
    const name = bytes.subarray(cursor + 46, cursor + 46 + nameSize).toString('utf8');
    assert.equal(bytes.readUInt32LE(offset), 0x04034b50, 'ZIP local header');
    const start = offset + 30 + bytes.readUInt16LE(offset + 26) + bytes.readUInt16LE(offset + 28);
    const compressed = bytes.subarray(start, start + size);
    assert([0, 8].includes(method), 'supported compression');
    const data = method === 8 ? zlib.inflateRawSync(compressed) : compressed;
    assert.equal(data.length, rawSize);
    assert(!entries.has(name), 'unique ZIP entry');
    entries.set(name, data);
    cursor += 46 + nameSize + extra + comment;
  }
  assert.equal(cursor, end);
  return entries;
}

function request(base, pathname, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(base);
    const req = http.request({ hostname: url.hostname, port: url.port, path: pathname, method, headers }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const bytes = Buffer.concat(chunks), text = bytes.toString('utf8');
        let json;
        try { json = JSON.parse(text); } catch { /* Binary and static responses are expected. */ }
        resolve({ status: res.statusCode, headers: res.headers, bytes, text, json });
      });
      res.on('error', reject);
    });
    req.setTimeout(10000, () => req.destroy(new Error('HTTP fixture request timed out')));
    req.on('error', reject);
    req.end(body);
  });
}

function success(response) {
  assert(response.status >= 200 && response.status < 300, `${response.status}: ${response.text}`);
  return response.json;
}

function rejected(response) {
  assert(response.status >= 400 && response.status < 500, `${response.status}: ${response.text}`);
}

function fixtureRunner(action = async ({ cwd }) => {
  await fs.mkdir(path.join(cwd, 'artifacts'), { recursive: true });
  await fs.writeFile(path.join(cwd, 'artifacts', 'presentation.html'), html);
  return { code: 0 };
}) {
  return args => ({
    completion: Promise.resolve().then(() => action(args)),
    cancel: async () => {}
  });
}

async function harness(t, options = {}) {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'yoursppt-bridge-test-'));
  const bridge = createBridge({ root, outputRoot: path.join(temporary, 'runs'),
    discoverAgents: async () => [agent], runAgent: fixtureRunner(),
    buildPackage: (state, attachments) => Y.buildPackage(state, attachments, { skipSkills: true }), ...options });
  t.after(async () => {
    await bridge.close();
    await fs.rm(temporary, { recursive: true, force: true });
  });
  await new Promise((resolve, reject) => {
    bridge.server.once('error', reject);
    bridge.server.listen(0, '127.0.0.1', resolve);
  });
  const base = `http://127.0.0.1:${bridge.server.address().port}`;
  const session = success(await request(base, '/api/session'));
  assert.equal(typeof session.token, 'string');
  assert(session.token.length >= 32, 'unguessable session token');
  const api = (pathname, options = {}) => {
    const { json, body, headers, ...rest } = options;
    return request(base, pathname, { ...rest, body: json === undefined ? body : JSON.stringify(json),
      headers: { 'X-YoursPPT-Token': session.token, ...(json === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers } });
  };
  const create = async (state = draft(), attachments = []) => success(await api('/api/jobs', {
    method: 'POST', json: { agentId: 'codex', state, attachments }
  }));
  const start = id => api(`/api/jobs/${id}/start`, { method: 'POST' });
  const waitFor = async (id, predicate = job => terminal.has(job.status)) => {
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      const job = success(await api(`/api/jobs/${id}`));
      if (predicate(job)) return job;
      await new Promise(resolve => setTimeout(resolve, 15));
    }
    assert.fail('job did not reach the expected state');
  };
  return { base, api, create, start, waitFor, temporary };
}

function outputPath(file) {
  return typeof file === 'string' ? file : file.path || file.name;
}

test('an authenticated tab can recover and cancel a staged job without its original response', async t => {
  const h = await harness(t);
  assert.equal(success(await h.api('/api/jobs/active')).job, null);
  const job = await h.create();
  assert.equal(success(await h.api('/api/jobs/active')).job.id, job.id);
  success(await h.api(`/api/jobs/${job.id}/cancel`, { method: 'POST' }));
  assert.equal(success(await h.api('/api/jobs/active')).job, null);
  const retry = await h.create();
  assert.notEqual(retry.id, job.id);
});

test('authenticated HTML job preserves all skill entries and attachment bytes, then downloads output and ZIP', async t => {
  const source = Buffer.from([0, 255, 128, 1, 13, 10, 65]);
  const metadata = { id: 'evidence', name: '证据.bin', relativePath: '实验/证据.bin', type: 'application/octet-stream', size: source.length };
  const state = draft(); state.slides[0].sourceIds = [metadata.id];
  let execution;
  const h = await harness(t, { buildPackage: Y.buildPackage, runAgent: fixtureRunner(async args => {
    execution = args;
    assert.equal(args.agent.id, 'codex');
    assert.equal(typeof args.prompt, 'string');
    assert(args.prompt.includes('brief.md'));
    const brief = await fs.readFile(path.join(args.cwd, 'brief.md'), 'utf8');
    assert(brief.includes(state.slides[0].content));
    assert.deepEqual(await fs.readFile(path.join(args.cwd, 'references', '实验', '证据.bin')), source);
    const selection = JSON.parse(await fs.readFile(path.join(args.cwd, 'style', 'selection.json'), 'utf8'));
    assert.equal(selection.delivery, 'html');
    assert.equal(selection.style, 'swiss');
    assert.equal(selection.skippedSkills, false);
    const bundle = require('../assets/skills/guizang.js');
    for (const entry of bundle.entries) {
      const filename = path.join(args.cwd, 'style', 'skills', 'guizang-ppt-skill', ...entry.name.split('/'));
      if (entry.name.endsWith('/')) {
        assert((await fs.stat(filename)).isDirectory(), entry.name);
        continue;
      }
      const compressed = Buffer.from(entry.base64, 'base64');
      const expected = entry.method === 8 ? zlib.inflateRawSync(compressed) : compressed;
      assert.deepEqual(await fs.readFile(filename), expected, entry.name);
    }
    args.onLog('fixture generation complete');
    await fs.mkdir(path.join(args.cwd, 'artifacts', 'assets'), { recursive: true });
    await fs.writeFile(path.join(args.cwd, 'artifacts', 'presentation.html'), html);
    await fs.copyFile(path.join(args.cwd, 'references', '实验', '证据.bin'), path.join(args.cwd, 'artifacts', 'assets', 'evidence.bin'));
    return { code: 0 };
  }) });
  assert.deepEqual(success(await h.api('/api/agents')).agents.map(item => item.id), ['codex']);
  const job = await h.create(state, [metadata]);
  assert.equal(job.status, 'uploading');
  rejected(await h.start(job.id));
  success(await h.api(`/api/jobs/${job.id}/attachments/0`, { method: 'PUT', body: source }));
  success(await h.start(job.id));
  const completed = await h.waitFor(job.id);
  assert.equal(completed.status, 'completed', JSON.stringify(completed));
  assert(execution);
  assert.equal(completed.delivery, 'html');
  assert.equal(completed.files.length, 1);
  const download = await h.api(`/api/jobs/${job.id}/files?path=${encodeURIComponent(outputPath(completed.files[0]))}`);
  success(download);
  assert.deepEqual(download.bytes, html);
  const archive = await h.api(`/api/jobs/${job.id}/bundle`);
  success(archive);
  const entries = unzip(archive.bytes);
  assert([...entries].some(([name, bytes]) => name.endsWith('presentation.html') && bytes.equals(html)));
  assert.deepEqual(entries.get('assets/evidence.bin'), source, 'result ZIP includes the original bytes of ancillary assets');
  const workPackage = unzip(await fs.readFile(path.join(completed.directory, 'work-package.zip')));
  assert([...workPackage].some(([name, bytes]) => name.endsWith('/references/实验/证据.bin') && bytes.equals(source)));
});

test('session and API reject hostile origins, wrong Host and missing or incorrect tokens', async t => {
  const h = await harness(t);
  rejected(await request(h.base, '/api/agents'));
  rejected(await h.api('/api/agents', { headers: { 'X-YoursPPT-Token': 'incorrect' } }));
  for (const origin of ['https://attacker.example', 'null', 'http://127.0.0.1:1']) {
    rejected(await request(h.base, '/api/session', { headers: { Origin: origin } }));
    rejected(await h.api('/api/agents', { headers: { Origin: origin } }));
  }
  rejected(await request(h.base, '/api/session', { headers: { Host: 'attacker.example' } }));
  rejected(await h.api('/api/agents', { headers: { Host: 'attacker.example' } }));
  success(await h.api('/api/agents', { headers: { Origin: h.base } }));
  success(await h.api('/api/agents')); // Non-browser clients still require the token.
  for (const pathname of ['/server/bridge.cjs', '/tests/bridge.test.cjs', '/.git/config', '/output/agent-runs/private']) {
    rejected(await request(h.base, pathname));
  }
});

test('PPTX job succeeds only with an OOXML presentation archive and downloads it unchanged', async t => {
  const xml = 'http://schemas.openxmlformats.org/';
  const pptx = Buffer.from(await Y.createZip([
    { name: '[Content_Types].xml', data: `<?xml version="1.0"?><Types xmlns="${xml}package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>` },
    { name: '_rels/.rels', data: `<?xml version="1.0"?><Relationships xmlns="${xml}package/2006/relationships"><Relationship Id="rId1" Type="${xml}officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>` },
    { name: 'ppt/presentation.xml', data: `<?xml version="1.0"?><p:presentation xmlns:p="${xml}presentationml/2006/main" xmlns:r="${xml}officeDocument/2006/relationships"><p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst><p:sldSz cx="12192000" cy="6858000"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>` },
    { name: 'ppt/_rels/presentation.xml.rels', data: `<?xml version="1.0"?><Relationships xmlns="${xml}package/2006/relationships"><Relationship Id="rId1" Type="${xml}officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/></Relationships>` },
    { name: 'ppt/slides/slide1.xml', data: `<?xml version="1.0"?><p:sld xmlns:p="${xml}presentationml/2006/main" xmlns:a="${xml}drawingml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>` }
  ]).arrayBuffer());
  const h = await harness(t, { runAgent: fixtureRunner(async ({ cwd }) => {
    await fs.mkdir(path.join(cwd, 'artifacts'), { recursive: true });
    await fs.writeFile(path.join(cwd, 'artifacts', 'presentation.pptx'), pptx);
    return { code: 0 };
  }) });
  const job = await h.create(draft('pptx'));
  success(await h.start(job.id));
  const completed = await h.waitFor(job.id);
  assert.equal(completed.status, 'completed', JSON.stringify(completed));
  assert.equal(completed.delivery, 'pptx');
  assert.equal(completed.files.length, 1);
  const download = await h.api(`/api/jobs/${job.id}/files?path=${encodeURIComponent(outputPath(completed.files[0]))}`);
  success(download);
  assert.deepEqual(download.bytes, pptx);
  assert(unzip(download.bytes).has('ppt/presentation.xml'));
  const corrupted = Buffer.from(pptx), position = corrupted.indexOf('12192000');
  assert(position >= 0); corrupted[position] = '2'.charCodeAt(0);
  assert.equal(isPptx(corrupted), false, 'well-formed XML with stale ZIP CRC is still corrupt');
});

test('job creation rejects invalid drafts, agents, attachment metadata, unsafe paths and declared size limits', async t => {
  const h = await harness(t);
  const create = overrides => h.api('/api/jobs', { method: 'POST', json: { agentId: 'codex', state: draft(), attachments: [], ...overrides } });
  rejected(await create({ agentId: 'unavailable-or-arbitrary-command' }));
  rejected(await create({ state: { version: 1 } }));
  const invalid = draft(); invalid.slides[0].content = '';
  rejected(await create({ state: invalid }));
  const stale = draft(); stale.slides[0].sourceIds = ['absent'];
  rejected(await create({ state: stale }));
  const metadata = { id: 'a', name: 'a.bin', relativePath: 'a.bin', type: 'application/octet-stream', size: 1 };
  for (const relativePath of ['../private', 'folder/../../private', '/private', 'C:\\private']) {
    rejected(await create({ attachments: [{ ...metadata, relativePath }] }));
  }
  for (const size of [-1, 0.5, 100 * 1024 * 1024 + 1]) {
    rejected(await create({ attachments: [{ ...metadata, size }] }));
  }
  rejected(await create({ attachments: [metadata, metadata] }));
  rejected(await create({ attachments: Array.from({ length: 4 }, (_, i) => ({ ...metadata, id: `a${i}`, name: `${i}.bin`, relativePath: `${i}.bin`, size: 100 * 1024 * 1024 })) }));
  rejected(await h.api('/api/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{ invalid json' }));
  rejected(await h.api('/api/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ padding: 'x'.repeat(16 * 1024 * 1024) }) }));
});

test('raw uploads enforce attachment index and exact declared byte size', async t => {
  const h = await harness(t);
  const metadata = { id: 'a', name: 'a.bin', relativePath: 'a.bin', type: 'application/octet-stream', size: 2 };
  const job = await h.create(draft(), [metadata]);
  rejected(await h.api(`/api/jobs/${job.id}/attachments/1`, { method: 'PUT', body: Buffer.from('ab') }));
  rejected(await h.api(`/api/jobs/${job.id}/attachments/0`, { method: 'PUT', body: Buffer.from('a') }));
  rejected(await h.api(`/api/jobs/${job.id}/attachments/0`, { method: 'PUT', body: Buffer.from('abc') }));
  rejected(await h.start(job.id));
  success(await h.api(`/api/jobs/${job.id}/attachments/0`, { method: 'PUT', body: Buffer.from('ab') }));
  success(await h.start(job.id));
  const completed = await h.waitFor(job.id);
  assert.equal(completed.status, 'completed', JSON.stringify(completed));
  rejected(await h.api(`/api/jobs/${job.id}/attachments/0`, { method: 'PUT', body: Buffer.from('xx') }));
});

test('duplicate concurrent starts launch at most one agent; running cancellation reaches cancelled', async t => {
  let calls = 0, cancels = 0, settle;
  const h = await harness(t, { runAgent: () => {
    calls++;
    return { completion: new Promise(resolve => { settle = resolve; }), cancel: async () => {
      cancels++; settle({ code: null, signal: 'SIGTERM' });
    } };
  } });
  const job = await h.create();
  const starts = await Promise.all([h.start(job.id), h.start(job.id)]);
  assert.equal(starts.filter(result => result.status >= 200 && result.status < 300).length, 1);
  assert.equal(starts.filter(result => result.status >= 400 && result.status < 500).length, 1);
  await h.waitFor(job.id, current => current.status === 'running');
  assert.equal(calls, 1);
  success(await h.api(`/api/jobs/${job.id}/cancel`, { method: 'POST' }));
  assert.equal((await h.waitFor(job.id)).status, 'cancelled');
  assert.equal(cancels, 1);
  rejected(await h.start(job.id));
});

test('cancelling a staged job never starts an agent', async t => {
  let calls = 0;
  const h = await harness(t, { runAgent: () => { calls++; throw new Error('must not run'); } });
  const job = await h.create(draft(), [{ id: 'a', name: 'a', relativePath: 'a', size: 1 }]);
  success(await h.api(`/api/jobs/${job.id}/cancel`, { method: 'POST' }));
  assert.equal((await h.waitFor(job.id)).status, 'cancelled');
  rejected(await h.start(job.id));
  assert.equal(calls, 0);
});

test('zero exit alone cannot pass without a nonempty valid file of the selected delivery', async t => {
  for (const scenario of [
    { name: 'absent', delivery: 'html' },
    { name: 'empty', delivery: 'html', filename: 'presentation.html', data: Buffer.alloc(0) },
    { name: 'wrong-extension', delivery: 'html', filename: 'presentation.txt', data: html },
    { name: 'not-html', delivery: 'html', filename: 'presentation.html', data: Buffer.from('model refused to generate slides') },
    { name: 'not-pptx', delivery: 'pptx', filename: 'presentation.pptx', data: Buffer.from('PK invalid archive') },
    { name: 'wrong-delivery', delivery: 'pptx', filename: 'presentation.html', data: html }
  ]) await t.test(scenario.name, async st => {
    const h = await harness(st, { runAgent: fixtureRunner(async ({ cwd }) => {
      if (scenario.filename) {
        await fs.mkdir(path.join(cwd, 'artifacts'), { recursive: true });
        await fs.writeFile(path.join(cwd, 'artifacts', scenario.filename), scenario.data);
      }
      return { code: 0 };
    }) });
    const job = await h.create(draft(scenario.delivery));
    success(await h.start(job.id));
    const failed = await h.waitFor(job.id);
    assert.equal(failed.status, 'failed', JSON.stringify(failed));
    assert(failed.error, 'failure explains missing or invalid delivery');
  });
});

test('agent nonzero exit and process-start errors fail even if output exists', async t => {
  for (const scenario of ['nonzero', 'start-error']) await t.test(scenario, async st => {
    const h = await harness(st, { runAgent: scenario === 'start-error' ? () => { throw new Error('fixture startup failed'); } : fixtureRunner(async ({ cwd }) => {
      await fs.mkdir(path.join(cwd, 'artifacts'), { recursive: true });
      await fs.writeFile(path.join(cwd, 'artifacts', 'presentation.html'), html);
      return { code: 7 };
    }) });
    const job = await h.create();
    success(await h.start(job.id));
    assert.equal((await h.waitFor(job.id)).status, 'failed');
  });
});

test('PPTX files with required ZIP entries still fail when OOXML is malformed or has the wrong root', async t => {
  const xml = 'http://schemas.openxmlformats.org/';
  const validEntries = [
    { name: '[Content_Types].xml', data: `<Types xmlns="${xml}package/2006/content-types"/>` },
    { name: '_rels/.rels', data: `<Relationships xmlns="${xml}package/2006/relationships"/>` },
    { name: 'ppt/presentation.xml', data: `<p:presentation xmlns:p="${xml}presentationml/2006/main"/>` },
    { name: 'ppt/_rels/presentation.xml.rels', data: `<Relationships xmlns="${xml}package/2006/relationships"/>` },
    { name: 'ppt/slides/slide1.xml', data: `<p:sld xmlns:p="${xml}presentationml/2006/main"/>` }
  ];
  for (const [name, malformed] of [
    ['truncated-xml', '<'],
    ['wrong-root', `<p:unexpected xmlns:p="${xml}presentationml/2006/main"/>`],
    ['mismatched-closing-tag', `<p:presentation xmlns:p="${xml}presentationml/2006/main"><p:broken></p:presentation>`]
  ]) await t.test(name, async st => {
    const bytes = Buffer.from(await Y.createZip(validEntries.map(entry => entry.name === 'ppt/presentation.xml' ? { ...entry, data: malformed } : entry)).arrayBuffer());
    const h = await harness(st, { runAgent: fixtureRunner(async ({ cwd }) => {
      await fs.mkdir(path.join(cwd, 'artifacts'), { recursive: true });
      await fs.writeFile(path.join(cwd, 'artifacts', 'presentation.pptx'), bytes);
      return { code: 0 };
    }) });
    const job = await h.create(draft('pptx'));
    success(await h.start(job.id));
    const failed = await h.waitFor(job.id);
    assert.equal(failed.status, 'failed', JSON.stringify(failed));
    assert(failed.error);
  });
});

test('downloads reject traversal, private workspace files and cross-job paths', async t => {
  const h = await harness(t);
  const first = await h.create();
  success(await h.start(first.id));
  const complete = await h.waitFor(first.id);
  assert.equal(complete.status, 'completed');
  const second = await h.create();
  for (const filename of ['../brief.md', '..\\brief.md', '/etc/passwd', 'C:\\Windows\\win.ini', 'brief.md', `../../${second.id}/workspace/brief.md`, 'artifacts/../brief.md']) {
    rejected(await h.api(`/api/jobs/${first.id}/files?path=${encodeURIComponent(filename)}`));
  }
  rejected(await h.api('/api/jobs/not-a-job'));
  rejected(await h.api(`/api/jobs/${second.id}/files?path=${encodeURIComponent(outputPath(complete.files[0]))}`));
});

test('directory symlinks cannot leak external files through listings, downloads or bundles', async t => {
  let symlinkCreated = false;
  const secret = Buffer.from('private sibling file - must not be served');
  const h = await harness(t, { runAgent: fixtureRunner(async ({ cwd }) => {
    const outside = path.resolve(cwd, '..', '..', 'outside-secret');
    await fs.mkdir(outside, { recursive: true });
    await fs.writeFile(path.join(outside, 'private.html'), secret);
    await fs.mkdir(path.join(cwd, 'artifacts'), { recursive: true });
    await fs.writeFile(path.join(cwd, 'artifacts', 'presentation.html'), html);
    try {
      await fs.symlink(outside, path.join(cwd, 'artifacts', 'external'), process.platform === 'win32' ? 'junction' : 'dir');
      symlinkCreated = true;
    } catch (error) {
      if (!['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) throw error;
    }
    return { code: 0 };
  }) });
  const job = await h.create();
  success(await h.start(job.id));
  const result = await h.waitFor(job.id);
  if (!symlinkCreated) { t.skip('OS does not permit symlink/junction fixture creation'); return; }
  assert(['completed', 'failed'].includes(result.status));
  assert(!result.files.some(file => outputPath(file).includes('external')));
  rejected(await h.api(`/api/jobs/${job.id}/files?path=artifacts%2Fexternal%2Fprivate.html`));
  const archive = await h.api(`/api/jobs/${job.id}/bundle`);
  if (archive.status >= 200 && archive.status < 300) {
    assert(![...unzip(archive.bytes)].some(([name, data]) => name.includes('external') || data.equals(secret)));
  } else rejected(archive);
});
