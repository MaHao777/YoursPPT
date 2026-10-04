'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { discoverAgents, runAgent, _internals } = require('../server/agents.cjs');

function fixture(t, source, id = 'codex') {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'yoursppt-agent-'));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  const script = path.join(cwd, 'fixture.cjs');
  fs.writeFileSync(script, source);
  return { cwd, agent: _internals.createAgent(id, { file: process.execPath, args: [script] }, 'fixture') };
}

test('discovery returns unavailable entries without invoking a shell', async (t) => {
  const { cwd } = fixture(t, '');
  const agents = await discoverAgents({ directories: [cwd] });
  assert.deepEqual(agents.map(({ id, available }) => ({ id, available })), [
    { id: 'codex', available: false }, { id: 'claude', available: false }
  ]);
  assert.match(agents[0].error, /未发现/);
});

test('discovery resolves a known npm shim to Node and probes only --version', async (t) => {
  const { cwd } = fixture(t, '');
  const packageDir = path.join(cwd, 'node_modules', '@openai', 'codex');
  fs.mkdirSync(path.join(packageDir, 'bin'), { recursive: true });
  fs.writeFileSync(path.join(packageDir, 'package.json'), JSON.stringify({ name: '@openai/codex' }));
  fs.writeFileSync(path.join(packageDir, 'bin', 'codex.js'), "if (process.argv[2] !== '--version') process.exit(3); console.log('codex-cli 99.0.0');");
  if (process.platform === 'win32') {
    fs.writeFileSync(path.join(cwd, 'codex.cmd'), '@echo THIS SHIM MUST NOT EXECUTE');
  } else {
    fs.writeFileSync(path.join(cwd, 'codex'), `#!${process.execPath}\nconsole.log('codex-cli 99.0.0');`);
    fs.chmodSync(path.join(cwd, 'codex'), 0o755);
  }
  const agents = await discoverAgents({ directories: [cwd] });
  assert.equal(agents[0].available, true);
  assert.equal(agents[0].version, 'codex-cli 99.0.0');
  assert.equal(agents[1].available, false);
  assert.equal(JSON.stringify(agents).includes('args'), false);
});

test('runAgent sends shell metacharacters and Chinese literally through stdin', async (t) => {
  const { cwd, agent } = fixture(t, `let input=''; process.stdin.setEncoding('utf8'); process.stdin.on('data', c => input += c); process.stdin.on('end', () => {
    require('node:fs').writeFileSync('input.json', JSON.stringify({ input, args: process.argv.slice(2), cwd: process.cwd() }));
    console.log(JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: '生成完成' } }));
  });`);
  const logs = [];
  const prompt = '中文 PPT；$(not-a-command) ` literal & | ; " \n下一行';
  const result = await runAgent({ agent, cwd, prompt, onLog: s => logs.push(s) }).completion;
  assert.equal(result.code, 0);
  assert.equal(result.error, undefined);
  const saved = JSON.parse(fs.readFileSync(path.join(cwd, 'input.json'), 'utf8'));
  assert.equal(saved.input, prompt);
  assert.equal(saved.cwd, cwd);
  assert(saved.args.includes('workspace-write'));
  assert(saved.args.includes('approval_policy="never"'));
  assert.equal(saved.args.at(-1), '-');
  assert(!saved.args.join(' ').includes(prompt));
  assert(!saved.args.join(' ').includes('bypass'));
  assert(logs.join('').includes('生成完成'));
});

test('Claude uses noninteractive scoped permissions and respects existing model/auth', async (t) => {
  const { cwd, agent } = fixture(t, `process.stdin.resume(); process.stdin.on('end', () => {
    require('node:fs').writeFileSync('args.json', JSON.stringify(process.argv.slice(2)));
    console.log(JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: '完成' }));
  });`, 'claude');
  const result = await runAgent({ agent, cwd, prompt: 'hello' }).completion;
  assert.equal(result.error, undefined);
  const args = JSON.parse(fs.readFileSync(path.join(cwd, 'args.json'), 'utf8'));
  assert(args.includes('acceptEdits'));
  assert(args.includes('--permission-prompts'));
  assert(args.includes('none'));
  assert.match(args[args.indexOf('--allowedTools') + 1], /Bash\(python \*\)/);
  assert(!args.includes('--model'));
  assert(!args.some(a => /bypass|dangerously/.test(a)));
});

test('structured failures are errors even when the process exits zero', async (t) => {
  for (const [id, event, expected] of [
    ['codex', { type: 'error', message: 'authentication required' }, /authentication required/],
    ['codex', { type: 'turn.failed', error: { message: 'quota exhausted' } }, /quota exhausted/],
    ['claude', { type: 'result', is_error: true, errors: ['Please login first'] }, /Please login first/]
  ]) {
    const { cwd, agent } = fixture(t, `process.stdin.resume(); process.stdin.on('end', () => console.log(${JSON.stringify(JSON.stringify(event))}));`, id);
    const result = await runAgent({ agent, cwd, prompt: 'hello' }).completion;
    assert.equal(result.code, 0);
    assert.match(result.error, expected);
  }
});

test('a successful run preserves optional permission denials as a visible warning', async (t) => {
  const event = { type: 'result', is_error: false, result: 'created presentation.html', permission_denials: [{ tool_name: 'Bash' }] };
  const { cwd, agent } = fixture(t, `process.stdin.resume(); process.stdin.on('end', () => console.log(${JSON.stringify(JSON.stringify(event))}));`, 'claude');
  const logs = [];
  const result = await runAgent({ agent, cwd, prompt: 'hello', onLog: text => logs.push(text) }).completion;
  assert.equal(result.code, 0); assert.equal(result.error, undefined);
  assert.match(result.warning, /未获授权.*Bash/);
  assert(logs.some(text => text.includes('未获授权')));
});

test('nonzero exit reports stderr and startup failure settles completion', async (t) => {
  const { cwd, agent } = fixture(t, "process.stdin.resume(); process.stdin.on('end', () => { console.error('not logged in'); process.exitCode = 7; });");
  const result = await runAgent({ agent, cwd, prompt: 'hello' }).completion;
  assert.equal(result.code, 7);
  assert.match(result.error, /not logged in/);
  const missing = _internals.createAgent('codex', { file: path.join(cwd, 'missing-executable'), args: [] }, 'fixture');
  const failed = await runAgent({ agent: missing, cwd, prompt: 'hello' }).completion;
  assert.match(failed.error, /ENOENT|找不到/);
});

test('UTF-8 survives split bytes and log delivery is bounded while errors are still parsed', async (t) => {
  const { cwd, agent } = fixture(t, `process.stdin.resume(); process.stdin.on('end', () => {
    const bytes = Buffer.from('完整中文日志\\n');
    process.stdout.write(bytes.subarray(0, 1));
    setTimeout(() => {
      process.stdout.write(bytes.subarray(1));
      for (let i = 0; i < 10000; i++) console.log('x'.repeat(100));
      console.log(JSON.stringify({ type: 'error', message: 'late semantic failure' }));
    }, 10);
  });`);
  const logs = [];
  const result = await runAgent({ agent, cwd, prompt: '', onLog: s => logs.push(s) }).completion;
  assert(logs.join('').includes('完整中文日志'));
  assert(!logs.join('').includes('\uFFFD'));
  assert(logs.join('').length <= _internals.MAX_LOG_CHARS + 100);
  assert.match(result.error, /late semantic failure/);
});

test('a throwing log subscriber cannot leave a child running', async (t) => {
  const { cwd, agent } = fixture(t, "process.stdin.resume(); process.stdin.on('end', () => console.log('hello')); ");
  const result = await runAgent({ agent, cwd, prompt: 'hello', onLog: () => { throw new Error('UI gone'); } }).completion;
  assert.equal(result.code, 0);
});

test('timeout terminates the process and cancel is idempotent', async (t) => {
  const { cwd, agent } = fixture(t, "process.stdin.resume(); setInterval(() => {}, 1000);");
  const run = runAgent({ agent, cwd, prompt: 'hello', timeoutMs: 150 });
  const result = await run.completion;
  assert.match(result.error, /超时/);
  await run.cancel();
  await run.cancel();
});

test('cancellation terminates descendants as well as the main process', async (t) => {
  const { cwd, agent } = fixture(t, `const child = require('node:child_process').spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore', windowsHide: true });
    console.log('CHILD:' + child.pid); process.stdin.resume(); setInterval(() => {}, 1000);`);
  let ready;
  const childReady = new Promise(resolve => { ready = resolve; });
  const run = runAgent({ agent, cwd, prompt: 'hello', onLog: line => { const m = line.match(/CHILD:(\d+)/); if (m) ready(Number(m[1])); } });
  const pid = await Promise.race([childReady, new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error('Child not ready')), 5000); timer.unref(); })]);
  await run.cancel();
  const result = await run.completion;
  assert.match(result.error, /取消/);
  let alive = true;
  for (let i = 0; i < 30 && alive; i++) {
    try { process.kill(pid, 0); } catch { alive = false; }
    if (alive) await new Promise(resolve => setTimeout(resolve, 50));
  }
  assert.equal(alive, false, 'grandchild remains alive');
});

test('an object supplied by a request cannot become an executable', () => {
  assert.throws(() => runAgent({ agent: { id: 'codex', available: true, command: process.execPath }, cwd: os.tmpdir(), prompt: 'hello' }), /发现/);
});
