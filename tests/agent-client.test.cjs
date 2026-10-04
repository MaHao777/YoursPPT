'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createAgentClient, localAgentServiceSupported } = require('../src/agent.js');
const location = { protocol: 'http:', hostname: '127.0.0.1' };
const reply = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });

test('file pages and remote sites never probe a local service', async () => {
  for (const location of [{ protocol: 'file:', hostname: '' }, { protocol: 'https:', hostname: 'example.com' }, { protocol: 'http:', hostname: 'localhost.evil.com' }]) {
    let called = false;
    const client = createAgentClient({ location, fetch: async () => { called = true; } });
    assert.equal(client.supported, false);
    await assert.rejects(client.discover(), /本机服务/);
    assert.equal(called, false);
  }
  assert.equal(localAgentServiceSupported(location), true);
  assert.equal(localAgentServiceSupported({ protocol: 'http:', hostname: '[::1]' }), true);
});

test('generation sends a content snapshot and raw attachment bytes with the session token', async () => {
  const calls = [], bytes = Uint8Array.from([0, 255, 17, 13, 10]);
  const client = createAgentClient({ location, fetch: async (path, init) => {
    calls.push({ path, init });
    if (path === '/api/session') return reply({ token: 'local-token' });
    assert.equal(init.headers['X-YoursPPT-Token'], 'local-token');
    if (path === '/api/agents') return reply({ agents: [{ id: 'codex', available: true }] });
    if (path.endsWith('/attachments/0')) { assert.deepEqual(new Uint8Array(await init.body.arrayBuffer()), bytes); return reply({ ok: true }); }
    return reply({ id: 'job-1', status: 'uploading', logs: [], files: [] });
  } });
  assert.deepEqual(await client.discover(), [{ id: 'codex', available: true }]);
  const state = { meta: { title: '中文汇报' }, delivery: 'html' };
  const job = await client.createJob({ agentId: 'codex', state, attachments: [{ id: 'a', name: '素材.bin', size: bytes.length }] });
  await client.upload(job.id, 0, new Blob([bytes]));
  await client.start(job.id);
  assert.equal(calls.filter(c => c.path === '/api/session').length, 1);
  assert.deepEqual(JSON.parse(calls.find(c => c.path === '/api/jobs').init.body).state, state);
  assert.equal(calls.at(-1).path, '/api/jobs/job-1/start');
});

test('authentication refresh retries a rejected request once and preserves server errors', async () => {
  let sessions = 0, attempts = 0;
  const client = createAgentClient({ location, fetch: async (path, init) => {
    if (path === '/api/session') return reply({ token: 'token-' + ++sessions });
    attempts++;
    if (attempts === 1) return reply({ error: 'expired' }, 403);
    assert.equal(init.headers['X-YoursPPT-Token'], 'token-2');
    return reply({ error: '任务不存在' }, 404);
  } });
  await assert.rejects(client.getJob('gone'), error => error.status === 404 && error.message === '任务不存在');
  assert.equal(sessions, 2); assert.equal(attempts, 2);
});

test('download is authenticated and encodes the complete artifact path', async () => {
  const calls = [];
  const client = createAgentClient({ location, fetch: async (path, init) => {
    calls.push(path);
    if (path === '/api/session') return reply({ token: 'download-token' });
    assert.equal(init.headers['X-YoursPPT-Token'], 'download-token');
    return new Response('real-file');
  } });
  const path = '演示/assets/data #1.html';
  assert.equal(await (await client.download('job-1', path)).text(), 'real-file');
  assert.equal(calls.at(-1), '/api/jobs/job-1/files?path=' + encodeURIComponent(path));
  await client.bundle('job-1'); assert.equal(calls.at(-1), '/api/jobs/job-1/bundle');
});

test('network failures are reported as unknown connectivity, never as a completed or failed job', async () => {
  const client = createAgentClient({ location, fetch: async path => {
    if (path === '/api/session') return reply({ token: 'token' });
    throw new TypeError('network down');
  } });
  await assert.rejects(client.getJob('job-1'), /无法连接本机服务/);
});

test('cancellation aborts an in-flight raw upload immediately', async () => {
  let started;
  const uploading = new Promise(resolve => { started = resolve; });
  const client = createAgentClient({ location, fetch: async (path, init) => {
    if (path === '/api/session') return reply({ token: 'token' });
    return new Promise((resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(new DOMException('cancelled', 'AbortError')), { once: true });
      started();
    });
  } });
  const controller = new AbortController();
  const result = client.upload('job-1', 0, new Blob(['data']), controller.signal);
  const rejected = assert.rejects(result, /本机服务/);
  await uploading; controller.abort(); await rejected;
});

test('a missing browser job ID can recover the service active job', async () => {
  const client = createAgentClient({ location, fetch: async path => {
    if (path === '/api/session') return reply({ token: 'token' });
    assert.equal(path, '/api/jobs/active');
    return reply({ job: { id: 'recover', status: 'uploading' } });
  } });
  assert.deepEqual(await client.activeJob(), { id: 'recover', status: 'uploading' });
});
