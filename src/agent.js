(function (root) {
  'use strict';
  const Y = root.YoursPPT = root.YoursPPT || {};
  const ACTIVE = new Set(['uploading', 'preparing', 'running']);
  const STATUS = { uploading: '正在上传素材', preparing: '正在准备制作资源', running: 'Agent 正在制作', completed: '生成完成', failed: '生成失败', cancelled: '已取消' };
  const SESSION_KEY = 'yoursppt:agent-job:v1';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function localService(location) {
    return !!location && ['http:', 'https:'].includes(location.protocol) && ['localhost', '127.0.0.1', '[::1]', '::1'].includes(location.hostname);
  }
  function createAgentClient(options = {}) {
    const location = options.location || root.location;
    const supported = localService(location), fetch = options.fetch || root.fetch?.bind(root);
    let token = null, sessionPromise;
    async function response(path, init = {}, retry = true) {
      if (!supported) throw new Error('请通过本机服务打开 YoursPPT。');
      if (path !== '/api/session' && !token) await session();
      const controller = new AbortController();
      const abort = () => controller.abort();
      if (init.signal?.aborted) abort();
      else init.signal?.addEventListener('abort', abort, { once: true });
      const timeout = setTimeout(() => controller.abort(), init.body instanceof Blob ? 120000 : 20000);
      let result;
      try {
        result = await fetch(path, { ...init, cache: 'no-store', credentials: 'same-origin', signal: controller.signal,
          headers: { ...(init.headers || {}), ...(path !== '/api/session' ? { 'X-YoursPPT-Token': token } : {}) } });
      } catch (error) { throw new Error(error.name === 'AbortError' ? '本机服务响应超时，请重连查看任务状态。' : '无法连接本机服务，请确认启动窗口仍在运行。'); }
      finally { clearTimeout(timeout); init.signal?.removeEventListener('abort', abort); }
      if (!result.ok) {
        if (retry && path !== '/api/session' && [401, 403].includes(result.status)) { token = null; await session(); return response(path, init, false); }
        let message = `本机服务返回 ${result.status}`;
        try { const body = await result.json(); message = body.error || body.message || message; } catch { /* Non-JSON errors still retain their status. */ }
        const error = new Error(String(message)); error.status = result.status; throw error;
      }
      return result;
    }
    async function session() {
      if (!sessionPromise) sessionPromise = response('/api/session').then(r => r.json()).then(data => {
        if (typeof data.token !== 'string' || !data.token) throw new Error('本机服务未返回有效会话，请重启服务。');
        token = data.token; return token;
      }).finally(() => { sessionPromise = null; });
      return sessionPromise;
    }
    const json = async (path, body, method = 'POST') => (await response(path, { method, headers: { 'Content-Type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) })).json();
    const jobPath = id => '/api/jobs/' + encodeURIComponent(id);
    return {
      supported, session,
      async discover() { const data = await (await response('/api/agents')).json(); if (!Array.isArray(data.agents)) throw new Error('本机 Agent 列表格式错误。'); return data.agents; },
      createJob: data => json('/api/jobs', data),
      async activeJob() { return (await (await response('/api/jobs/active')).json()).job; },
      async upload(id, index, blob, signal) { await response(jobPath(id) + '/attachments/' + index, { method: 'PUT', headers: { 'Content-Type': 'application/octet-stream' }, body: blob, signal }); },
      start: id => json(jobPath(id) + '/start'),
      async getJob(id) { return (await response(jobPath(id))).json(); },
      cancel: id => json(jobPath(id) + '/cancel'),
      async download(id, path) { return (await response(jobPath(id) + '/files?path=' + encodeURIComponent(path))).blob(); },
      async bundle(id) { return (await response(jobPath(id) + '/bundle')).blob(); }
    };
  }
  function createAgentPanel(options) {
    const client = options.client || createAgentClient();
    let container, agents = [], selected = '', connected = false, connecting = false, started = false;
    let job = null, rememberedId = '', busy = false, cancelling = false, cancelRequested = false, downloading = false, progress = '', error = '', timer, uploadController;
    try { rememberedId = root.sessionStorage.getItem(SESSION_KEY) || ''; } catch { /* Storage may be disabled. */ }
    const notify = options.notify || (() => {});
    function remember(id) { rememberedId = id; try { id ? root.sessionStorage.setItem(SESSION_KEY, id) : root.sessionStorage.removeItem(SESSION_KEY); } catch { /* The current run still works without persistence. */ } }
    function setJob(value) {
      if (!value || typeof value.id !== 'string' || !Object.hasOwn(STATUS, value.status)) throw new Error('本机服务返回了无效的任务状态。');
      job = { ...value, logs: Array.isArray(value.logs) ? value.logs : [], files: Array.isArray(value.files) ? value.files : [] };
      remember(job.id);
    }
    function active() { return busy || cancelling || (job && ACTIVE.has(job.status)) || (!job && !!rememberedId); }
    function enhanceChoice() {
      const select = container.querySelector('#agent-choice'); if (!select) return;
      select.hidden = true; select.tabIndex = -1;
      const picker = root.document.createElement('div'); picker.className = 'agent-picker';
      const choice = agents.find(agent => agent.id === selected);
      picker.innerHTML = `<button type="button" id="agent-choice-trigger" class="agent-choice-trigger" aria-haspopup="listbox" aria-expanded="false" aria-controls="agent-choice-options" ${select.disabled || !agents.length ? 'disabled' : ''}><span class="agent-avatar" aria-hidden="true">${escape(choice?.name?.[0] || 'A')}</span><span class="agent-choice-copy"><strong>${escape(choice?.name || '尚无可用 Agent')}</strong><small>${escape(choice?.version || (choice?.available ? '本机 Agent' : '未发现'))}</small></span><span class="agent-chevron" aria-hidden="true">⌄</span></button><div id="agent-choice-options" class="agent-choice-options" role="listbox" aria-label="制作 Agent" hidden>${agents.map(agent => `<button type="button" class="agent-choice-option" role="option" aria-selected="${agent.id === selected}" data-agent-id="${escape(agent.id)}" ${!agent.available ? 'disabled' : ''}><span class="agent-avatar" aria-hidden="true">${escape(agent.name[0])}</span><span class="agent-choice-copy"><strong>${escape(agent.name)}</strong><small>${escape(agent.available ? agent.version || '本机 Agent' : '未发现')}</small></span><span class="agent-option-check" aria-hidden="true">${agent.id === selected ? '✓' : ''}</span></button>`).join('')}</div>`;
      select.after(picker); container.querySelector('label[for="agent-choice"]').htmlFor = 'agent-choice-trigger';
      const trigger = picker.querySelector('.agent-choice-trigger'), list = picker.querySelector('[role="listbox"]');
      const choices = () => [...list.querySelectorAll('button:not(:disabled)')];
      const close = focus => { list.hidden = true; trigger.setAttribute('aria-expanded', 'false'); if (focus) trigger.focus(); };
      const open = last => {
        if (trigger.disabled) return;
        list.hidden = false; trigger.setAttribute('aria-expanded', 'true');
        const buttons = choices(); (last ? buttons.at(-1) : list.querySelector('[aria-selected="true"]:not(:disabled)') || buttons[0])?.focus();
      };
      trigger.onclick = event => { event.stopPropagation(); list.hidden ? open() : close(true); };
      list.onclick = event => {
        const option = event.target.closest('[data-agent-id]'); if (!option || option.disabled) return;
        event.stopPropagation(); selected = option.dataset.agentId; select.value = selected;
        render(); container.querySelector('#agent-choice-trigger')?.focus();
      };
      picker.onkeydown = event => {
        const buttons = choices(), index = buttons.indexOf(root.document.activeElement);
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); }
        else if (event.key === 'Tab') close(false);
        else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault(); event.stopPropagation();
          if (list.hidden) open(event.key === 'ArrowUp' || event.key === 'End');
          else buttons[event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowUp' ? -1 : 1) + buttons.length) % buttons.length]?.focus();
        }
      };
      Y.localize?.(picker);
    }
    root.document?.addEventListener('click', event => {
      const picker = container?.querySelector('.agent-picker'); if (!picker || picker.contains(event.target)) return;
      picker.querySelector('[role="listbox"]').hidden = true;
      picker.querySelector('.agent-choice-trigger').setAttribute('aria-expanded', 'false');
    });
    function render() {
      if (!container?.isConnected) return;
      const input = options.getInput(), invalid = options.issues(input.state, input.attachments).errors.length;
      const available = agents.filter(a => a.available), format = input.state.delivery === 'pptx' ? 'PPTX' : 'HTML';
      const status = error || progress || (job ? STATUS[job.status] : connecting ? '正在发现本机 Agent…' : connected ? available.length ? '选择 Agent 后即可开始制作。' : '尚未发现可用的 Agent。安装并登录 Claude Code 或 Codex 后刷新。' : '尚未连接本机服务。');
      const logScroll = container.querySelector('.agent-log');
      const followLog = !logScroll || logScroll.scrollHeight - logScroll.scrollTop - logScroll.clientHeight < 40;
      const previousScroll = logScroll?.scrollTop || 0;
      container.className = 'panel agent-panel';
      if (!client.supported) {
        container.innerHTML = '<div class="panel-head"><div><span class="eyebrow">LOCAL AGENT</span><h2>直接生成演示文件</h2></div></div><p>在本项目目录打开终端，运行下方命令，再打开终端显示的本机网址，即可发现并调用已安装的 Agent。</p><code class="agent-command">node scripts/serve.cjs</code><p class="field-hint">当前页面仍可离线准备内容、导出完整工作包。</p>';
        return;
      }
      container.innerHTML = `<div class="panel-head"><div><span class="eyebrow">LOCAL AGENT</span><h2>让本机 Agent 完成制作</h2></div><span class="agent-badge" data-state="${escape(job?.status || (connected ? 'ready' : 'offline'))}">${escape(job ? STATUS[job.status] : connected ? '已连接本机' : '未连接')}</span></div><p>使用电脑上已安装并登录的 Agent，按选定风格生成 ${format}。Agent 会按其自身配置连接模型服务。</p><div class="agent-controls"><div class="field"><label for="agent-choice">制作 Agent</label><select id="agent-choice" ${active() || connecting ? 'disabled' : ''}>${agents.length ? agents.map(a => `<option value="${escape(a.id)}" ${a.id === selected ? 'selected' : ''} ${!a.available ? 'disabled' : ''}>${escape(a.name)}${a.available ? a.version ? ' · ' + escape(a.version) : '' : ' · 未发现'}</option>`).join('') : '<option value="">尚无可用 Agent</option>'}</select></div><button class="btn secondary" data-agent-action="refresh" ${connecting ? 'disabled' : ''}>${connecting ? '正在连接…' : error || !connected ? '重连本机服务' : '刷新 Agent'}</button></div><div class="agent-actions"><button class="btn primary" data-agent-action="generate" ${active() || connecting || !connected || !available.some(a => a.id === selected) || invalid ? 'disabled' : ''}>${busy ? '正在提交…' : invalid ? '补齐信息后生成' : '开始生成 ' + format}</button>${active() ? `<button class="btn secondary" data-agent-action="cancel" ${!job || cancelling ? 'disabled' : ''}>${cancelling ? '正在取消…' : '取消生成'}</button>` : ''}</div><p class="agent-status${error ? ' agent-error' : ''}" role="status"></p><p class="field-hint">本次生成使用点击时的内容快照。你可以继续查看和编辑；修改后需重新生成。</p>${job ? '<div class="agent-job-detail"></div>' : ''}`;
      container.querySelector('.agent-status').textContent = status;
      enhanceChoice();
      const detail = container.querySelector('.agent-job-detail');
      if (detail) {
        detail.innerHTML = `<div class="agent-run-meta"><span>任务 ${escape(job.id)}</span>${job.directory ? '<span class="agent-directory"></span>' : ''}</div>${job.status === 'uploading' && !busy ? '<p class="field-hint">素材上传尚未完成。请取消此任务，再用当前完整内容重新生成。</p>' : ''}${job.error ? '<p class="agent-error agent-job-error"></p>' : ''}<details class="agent-log-details" ${ACTIVE.has(job.status) || job.status === 'failed' ? 'open' : ''}><summary>制作日志 · ${job.logs.length} 条</summary><pre class="agent-log" tabindex="0" aria-label="Agent 制作日志"></pre></details>${job.files.length ? `<div class="agent-results"><h3>生成的文件</h3><ul>${job.files.map((file, index) => `<li><span>${escape(file.name || file.path)}<small>${escape(formatSize(file.size))}</small></span><button class="text-btn" data-agent-action="download" data-file-index="${index}" ${downloading ? 'disabled' : ''}>下载 ↓</button></li>`).join('')}</ul><button class="btn secondary" data-agent-action="bundle" ${downloading ? 'disabled' : ''}>下载全部产物 ZIP ↓</button><p class="field-hint">HTML 演示含配套资源时，请下载 ZIP 并解压后打开。</p></div>` : ''}`;
        const log = detail.querySelector('.agent-log'); log.textContent = job.logs.join('\n') || '等待 Agent 输出…';
        log.scrollTop = followLog ? log.scrollHeight : previousScroll;
        if (job.directory) detail.querySelector('.agent-directory').textContent = '输出目录：' + job.directory;
        if (job.error) detail.querySelector('.agent-job-error').textContent = job.error;
        if (job.warning) {
          const warning = root.document.createElement('p'); warning.className = 'agent-warning';
          warning.textContent = job.warning; detail.prepend(warning);
        }
      }
    }
    function formatSize(bytes) { return Number.isFinite(bytes) ? bytes < 1024 ? bytes + ' B' : bytes < 1048576 ? (bytes / 1024).toFixed(1) + ' KB' : (bytes / 1048576).toFixed(1) + ' MB' : ''; }
    function schedule() { clearTimeout(timer); if (job && ACTIVE.has(job.status) && !busy && connected) timer = setTimeout(poll, 1500); }
    async function poll() {
      const id = rememberedId;
      if (!id || busy) return;
      try { const value = await client.getJob(id); if (id !== rememberedId) return; setJob(value); error = ''; connected = true; }
      catch (err) { if (id !== rememberedId) return; connected = false; error = '连接中断，任务状态尚未确认。' + err.message; }
      render(); schedule();
    }
    async function connect() {
      if (!client.supported || connecting) return;
      clearTimeout(timer); connecting = true; error = ''; render();
      try {
        await client.session(); agents = await client.discover();
        if (!agents.some(a => a.id === selected && a.available)) selected = agents.find(a => a.available)?.id || '';
        if (rememberedId && !busy) {
          try { setJob(await client.getJob(rememberedId)); }
          catch (err) { if (err.status !== 404) throw err; remember(''); job = null; error = '上次任务已不在本机服务中，可重新生成。'; }
        }
        if (!rememberedId && !busy) {
          const activeJob = await client.activeJob();
          if (activeJob) setJob(activeJob);
        }
        connected = true;
      } catch (err) { connected = false; error = (rememberedId ? '任务记录已保留，重连后可继续查看。' : '') + err.message; }
      finally { connecting = false; render(); schedule(); }
    }
    async function generate() {
      if (active() || !connected || connecting) return;
      const input = options.getInput();
      if (options.issues(input.state, input.attachments).errors.length) return notify('请先补齐必填信息与真实素材。');
      const snapshot = JSON.parse(JSON.stringify(input.state));
      const attachments = input.attachments.map(a => ({ ...a }));
      if (!agents.some(a => a.available && a.id === selected)) return;
      busy = true; cancelRequested = false; error = ''; progress = '正在创建生成任务…'; job = null; remember(''); clearTimeout(timer); render();
      uploadController = new AbortController();
      try {
        setJob(await client.createJob({ agentId: selected, state: snapshot, attachments: attachments.map(({ id, name, relativePath, type, size }) => ({ id, name, relativePath, type, size })) }));
        render();
        for (let index = 0; index < attachments.length; index++) {
          if (cancelRequested || !ACTIVE.has(job.status)) return;
          progress = `正在上传素材 ${index + 1} / ${attachments.length}：${attachments[index].name}`; render();
          await client.upload(job.id, index, attachments[index].file, uploadController.signal);
        }
        if (cancelRequested || !ACTIVE.has(job.status)) return;
        progress = '素材已就绪，正在启动 Agent…'; render();
        const startedJob = await client.start(job.id);
        if (!cancelRequested) setJob(startedJob);
      } catch (err) {
        if (!cancelRequested && job?.status !== 'cancelled') { error = '提交未确认完成，请重连查看任务状态。' + err.message; connected = false; }
      } finally { uploadController = null; busy = false; progress = ''; render(); schedule(); }
    }
    async function cancel() {
      if (!job || cancelling || !ACTIVE.has(job.status)) return;
      const id = job.id; cancelling = true; cancelRequested = true; error = ''; clearTimeout(timer); render();
      uploadController?.abort();
      try { setJob(await client.cancel(id)); progress = ''; connected = true; }
      catch (err) { error = '取消尚未确认，请重连查看任务状态。' + err.message; connected = false; }
      finally { cancelling = false; render(); schedule(); }
    }
    async function download(index, bundle) {
      if (!job || downloading) return;
      const file = job.files[index]; if (!bundle && !file) return;
      downloading = true; error = ''; render();
      try {
        const directory = options.prepareSave ? await options.prepareSave() : null;
        const blob = bundle ? await client.bundle(job.id) : await client.download(job.id, file.path);
        const filename = bundle ? `YoursPPT-${job.id}.zip` : (file.name || file.path.split('/').pop());
        if (options.saveResult) { await options.saveResult(blob, filename, directory); return; }
        const url = root.URL.createObjectURL(blob), link = root.document.createElement('a');
        link.href = url; link.download = filename;
        root.document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => root.URL.revokeObjectURL(url), 60000);
      } catch (err) { error = '下载失败：' + err.message; }
      finally { downloading = false; render(); }
    }
    return { mount(element) {
      container = element; if (!container) return;
      container.onclick = event => {
        const button = event.target.closest('[data-agent-action]'); if (!button) return;
        event.stopPropagation(); if (button.disabled) return;
        const action = button.dataset.agentAction;
        if (action === 'refresh') connect(); else if (action === 'generate') generate(); else if (action === 'cancel') cancel();
        else if (action === 'download') download(Number(button.dataset.fileIndex), false); else if (action === 'bundle') download(0, true);
      };
      container.onchange = event => { if (event.target.id === 'agent-choice') selected = event.target.value; };
      render(); if (!started && client.supported) { started = true; connect(); }
    } };
  }
  Object.assign(Y, { localAgentServiceSupported: localService, createAgentClient, createAgentPanel });
  if (typeof module !== 'undefined' && module.exports) module.exports = { localAgentServiceSupported: localService, createAgentClient, createAgentPanel };
})(typeof window !== 'undefined' ? window : globalThis);
