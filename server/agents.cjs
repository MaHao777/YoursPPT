'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { StringDecoder } = require('node:string_decoder');

const DEFINITIONS = Object.freeze([
  { id: 'codex', name: 'Codex', package: '@openai/codex', entry: ['bin', 'codex.js'] },
  { id: 'claude', name: 'Claude Code', package: '@anthropic-ai/claude-code', entry: ['cli.js'] }
]);
const LAUNCHERS = new WeakMap();
const MAX_LOG_CHARS = 128 * 1024;
const MAX_LINE_CHARS = 256 * 1024;
const VERSION_TIMEOUT_MS = 5000;

function createAgent(id, launch, version = '', command = launch.file) {
  const definition = DEFINITIONS.find(item => item.id === id);
  if (!definition) throw new Error('不支持的 Agent');
  const agent = Object.freeze({ id, name: definition.name, available: true, version, command });
  LAUNCHERS.set(agent, { file: launch.file, args: [...(launch.args || [])] });
  return agent;
}

function environmentValue(env, name) {
  const key = Object.keys(env).find(key => key.toLowerCase() === name.toLowerCase());
  return key ? env[key] : '';
}

function searchDirectories(env = process.env, home = os.homedir()) {
  const directories = environmentValue(env, 'PATH').split(path.delimiter);
  directories.push(path.join(home, '.local', 'bin'));
  if (process.platform === 'win32') {
    const appdata = environmentValue(env, 'APPDATA');
    if (appdata) directories.push(path.join(appdata, 'npm'));
    directories.push(path.join(home, 'AppData', 'Roaming', 'npm'));
  } else {
    directories.push(path.join(home, '.npm-global', 'bin'), path.join(home, '.npm', 'bin'), '/usr/local/bin');
  }
  directories.push(path.dirname(process.execPath));
  // Ignore empty/relative PATH entries: discovery must not execute a project file.
  return [...new Set(directories.map(dir => dir.trim().replace(/^"|"$/g, '')).filter(dir => path.isAbsolute(dir)))];
}

async function isFile(file) {
  try { return (await fs.stat(file)).isFile(); } catch { return false; }
}

async function resolveCandidate(definition, file) {
  if (!await isFile(file)) return null;
  if (process.platform !== 'win32') {
    try { await fs.access(file, require('node:fs').constants.X_OK); } catch { return null; }
    return { file, args: [] };
  }
  if (path.extname(file).toLowerCase() === '.exe') return { file, args: [] };
  // Never execute or parse .cmd/.ps1 shims. Only known package entry points run via Node.
  const packageDir = path.join(path.dirname(file), 'node_modules', ...definition.package.split('/'));
  try {
    const metadata = JSON.parse(await fs.readFile(path.join(packageDir, 'package.json'), 'utf8'));
    const entry = path.join(packageDir, ...definition.entry);
    if (metadata.name === definition.package && await isFile(entry)) return { file: process.execPath, args: [entry] };
  } catch { /* A broken shim is not a supported installation. */ }
  return null;
}

function terminateTree(child) {
  if (!child || !child.pid) return Promise.resolve();
  if (process.platform === 'win32') {
    return new Promise(resolve => {
      const systemRoot = environmentValue(process.env, 'SystemRoot') || 'C:\\Windows';
      const killer = spawn(path.join(systemRoot, 'System32', 'taskkill.exe'), ['/PID', String(child.pid), '/T', '/F'], {
        stdio: 'ignore', shell: false, windowsHide: true
      });
      let settled = false;
      const finish = (failed) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (failed) { try { child.kill('SIGKILL'); } catch { /* Already stopped. */ } }
        resolve();
      };
      const timer = setTimeout(() => { killer.kill(); finish(true); }, 4000);
      killer.once('error', () => finish(true));
      killer.once('close', code => finish(code !== 0));
    });
  }
  try { process.kill(-child.pid, 'SIGTERM'); } catch { try { child.kill('SIGTERM'); } catch { /* Already stopped. */ } }
  // A descendant can ignore TERM even if its parent exited. Always finish the group.
  return new Promise(resolve => setTimeout(() => {
    try { process.kill(-child.pid, 'SIGKILL'); } catch { /* Group already stopped. */ }
    resolve();
  }, 400));
}

function probeVersion(launch, timeoutMs = VERSION_TIMEOUT_MS) {
  return new Promise(resolve => {
    const child = spawn(launch.file, [...launch.args, '--version'], {
      stdio: ['ignore', 'pipe', 'pipe'], shell: false, windowsHide: true, detached: process.platform !== 'win32'
    });
    let output = '';
    let error = '';
    let timedOut = false;
    let stopping;
    const decoder = new StringDecoder('utf8');
    child.stdout.on('data', data => { output = (output + decoder.write(data)).slice(0, 8192); });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', data => { error = (error + data).slice(0, 8192); });
    child.once('error', err => { error = err.message; });
    const timer = setTimeout(() => { timedOut = true; stopping = terminateTree(child); }, timeoutMs);
    child.once('close', async code => {
      clearTimeout(timer);
      if (stopping) await stopping;
      output += decoder.end();
      if (timedOut) resolve({ error: '版本检测超时' });
      else if (code !== 0) resolve({ error: error.trim() || `版本检测退出码 ${code}` });
      else if (!output.trim()) resolve({ error: '版本检测没有返回版本信息' });
      else resolve({ version: output.trim().split(/\r?\n/)[0].slice(0, 200) });
    });
  });
}

async function discoverAgents(options = {}) {
  const directories = options.directories || searchDirectories(options.env, options.home);
  return Promise.all(DEFINITIONS.map(async definition => {
    const names = process.platform === 'win32'
      ? [`${definition.id}.exe`, `${definition.id}.cmd`, `${definition.id}.ps1`, definition.id]
      : [definition.id];
    const seen = new Set();
    let lastError = '';
    for (const directory of directories) {
      for (const name of names) {
        const command = path.join(directory, name);
        const launch = await resolveCandidate(definition, command);
        if (!launch) continue;
        const key = JSON.stringify(launch);
        if (seen.has(key)) continue;
        seen.add(key);
        const probe = await probeVersion(launch, options.versionTimeoutMs || VERSION_TIMEOUT_MS);
        if (probe.version) return createAgent(definition.id, launch, probe.version, command);
        lastError = probe.error;
      }
    }
    return { id: definition.id, name: definition.name, available: false, version: '', command: '', error: lastError || '未发现本机安装；请安装 CLI 并确保它位于 PATH 中。' };
  }));
}

function agentArguments(id) {
  if (id === 'codex') return [
    'exec', '--sandbox', 'workspace-write', '-c', 'approval_policy="never"',
    '--skip-git-repo-check', '--color', 'never', '--json', '-'
  ];
  if (id === 'claude') return [
    '-p', '--output-format', 'stream-json', '--verbose', '--permission-mode', 'acceptEdits',
    '--permission-prompts', 'none', '--allowedTools',
    'Read,Write,Edit,Glob,Grep,Bash(python *),Bash(python3 *),Bash(node *),PowerShell(python *),PowerShell(python3 *),PowerShell(node *)'
  ];
  throw new Error('不支持的 Agent');
}

function messageText(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(messageText).filter(Boolean).join('\n');
  if (!value || typeof value !== 'object') return '';
  return messageText(value.message || value.text || value.error || value.result);
}

function normalizeEvent(line) {
  let event;
  try { event = JSON.parse(line); } catch { return { text: line }; }
  if (!event || typeof event !== 'object') return { text: line };
  if (event.type === 'error' || event.type === 'turn.failed') {
    const error = messageText(event.error || event.message) || 'Agent 报告执行失败';
    return { text: error, error };
  }
  if (event.type === 'result') {
    const text = messageText(event.result || event.errors);
    if (event.is_error || String(event.subtype || '').startsWith('error')) {
      const error = messageText(event.errors) || text || 'Agent 报告执行失败';
      return { text: error, error };
    }
    if (Array.isArray(event.permission_denials) && event.permission_denials.length) {
      const names = [...new Set(event.permission_denials.map(item => item.tool_name || '工具'))].join('、');
      const warning = `部分工具操作未获授权：${names}。请查看制作日志与说明，确认受影响的步骤。`;
      return { text: [text, warning].filter(Boolean).join('\n'), warning };
    }
    return { text };
  }
  if (event.type === 'assistant') {
    const content = event.message && event.message.content;
    return { text: Array.isArray(content) ? content.map(block => block.type === 'tool_use' ? `[工具] ${block.name}` : (block.type === 'text' ? block.text : '')).filter(Boolean).join('\n') : '' };
  }
  if (event.type === 'user') {
    const content = event.message && event.message.content;
    return { text: Array.isArray(content) ? content.filter(block => block.type === 'tool_result' && block.is_error).map(block => `[工具错误] ${messageText(block.content)}`).join('\n') : '' };
  }
  if (event.type === 'system' && event.subtype === 'init') return { text: 'Agent 已启动。' };
  if (event.type === 'thread.started' || event.type === 'turn.started') return { text: event.type === 'thread.started' ? 'Agent 已启动。' : '正在生成…' };
  const item = event.item;
  if (item && event.type === 'item.started' && item.type === 'command_execution') return { text: `[执行] ${item.command || ''}` };
  if (item && event.type === 'item.completed') {
    if (item.type === 'agent_message') return { text: item.text || '' };
    if (item.type === 'command_execution') return { text: item.aggregated_output || '' };
    if (item.type === 'file_change') return { text: (item.changes || []).map(change => `[文件] ${change.path}`).join('\n') };
    if (item.type === 'error') { const error = messageText(item.message) || 'Agent 报告执行失败'; return { text: error, error }; }
  }
  return { text: '' };
}

function runAgent({ agent, cwd, prompt, onLog = () => {}, timeoutMs = 20 * 60 * 1000 }) {
  const launch = agent && LAUNCHERS.get(agent);
  if (!launch || !agent.available) throw new Error('必须使用本机发现的可用 Agent。');
  if (typeof cwd !== 'string' || !path.isAbsolute(cwd)) throw new Error('Agent 工作目录必须是绝对路径。');
  if (typeof prompt !== 'string') throw new Error('Agent 提示词必须是文本。');
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('Agent 超时时间必须大于零。');
  const child = spawn(launch.file, [...launch.args, ...agentArguments(agent.id)], {
    cwd, stdio: ['pipe', 'pipe', 'pipe'], shell: false, windowsHide: true, detached: process.platform !== 'win32'
  });
  let logChars = 0;
  let truncationSent = false;
  let semanticError = '';
  let warning = '';
  let spawnError = '';
  let stderrTail = '';
  let stopReason = '';
  let stopPromise;
  let finished = false;
  let timer;
  let settle;
  const completion = new Promise(resolve => { settle = resolve; });

  function log(text) {
    if (!text) return;
    text = text.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
    const remaining = MAX_LOG_CHARS - logChars;
    if (remaining > 0) {
      const output = text.slice(0, remaining);
      logChars += output.length;
      try { onLog(output); } catch { /* A disconnected log consumer cannot break cleanup. */ }
    }
    if (text.length > remaining && !truncationSent) {
      truncationSent = true;
      try { onLog('后续日志已截断；任务继续执行。'); } catch { /* See above. */ }
    }
  }

  function attachOutput(stream, isStderr) {
    const decoder = new StringDecoder('utf8');
    let buffer = '';
    let discarding = false;
    function line(text) {
      if (!text.trim()) return;
      if (isStderr) { stderrTail = (stderrTail + '\n' + text).slice(-8192); log(text); }
      else {
        const event = normalizeEvent(text);
        if (event.error) semanticError = event.error.slice(0, 8192);
        if (event.warning) warning = event.warning.slice(0, 8192);
        log(event.text);
      }
    }
    function ingest(text) {
      if (discarding) {
        const newline = text.indexOf('\n');
        if (newline < 0) return;
        text = text.slice(newline + 1);
        discarding = false;
      }
      buffer += text;
      let end;
      while ((end = buffer.indexOf('\n')) >= 0) {
        if (end > MAX_LINE_CHARS) {
          semanticError = 'Agent 单条输出超过上限，无法确认执行结果。';
          log(semanticError);
        } else line(buffer.slice(0, end).replace(/\r$/, ''));
        buffer = buffer.slice(end + 1);
      }
      if (buffer.length > MAX_LINE_CHARS) {
        semanticError = 'Agent 单条输出超过上限，无法确认执行结果。';
        log(semanticError);
        buffer = '';
        discarding = true;
      }
    }
    stream.on('data', data => ingest(decoder.write(data)));
    stream.once('end', () => { ingest(decoder.end()); if (buffer && !discarding) line(buffer); });
  }
  attachOutput(child.stdout, false);
  attachOutput(child.stderr, true);
  child.once('error', error => { spawnError = error.message; });
  child.stdin.on('error', error => { if (error.code !== 'EPIPE') spawnError = error.message; });
  child.once('close', async (code, signal) => {
    clearTimeout(timer);
    if (stopPromise) await stopPromise;
    const error = stopReason || spawnError || semanticError || (code !== 0 ? stderrTail.trim() || `Agent 退出码 ${code}${signal ? ` (${signal})` : ''}` : '');
    finished = true;
    settle({ code, ...(signal ? { signal } : {}), ...(error ? { error } : {}), ...(warning ? { warning } : {}) });
  });

  async function stop(reason) {
    if (finished) return completion;
    if (!stopPromise) {
      stopReason = reason;
      log(reason);
      stopPromise = terminateTree(child);
    }
    await stopPromise;
    return completion;
  }
  timer = setTimeout(() => { void stop(`执行超时（${Math.ceil(timeoutMs / 1000)} 秒），已停止 Agent。`); }, timeoutMs);
  child.stdin.end(prompt, 'utf8');
  return { completion, cancel: () => stop('任务已取消，已停止 Agent。') };
}

module.exports = { discoverAgents, runAgent, _internals: { createAgent, agentArguments, normalizeEvent, searchDirectories, probeVersion, MAX_LOG_CHARS } };
