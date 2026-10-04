(() => {
  'use strict';
  const Y = window.YoursPPT;
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const steps = ['context', 'outline', 'style', 'review', 'generate'];
  const names = { context: '目标与引用', outline: '逐页逻辑', materials: '参考素材', style: '视觉风格', review: '检查与导出', generate: 'Agent 生成' };
  const subtitles = { context: '确定听众与目的，并导入整场汇报可引用的内容。', outline: '主题、目的和内容为必填；细节与承接关系选填。直接在文字中编辑。', materials: '带上真实文件，让每一条证据都能被找到。', style: '选择适合内容的视觉语言，制作细节由工作包统一传递。', review: '检查完整思路与引用，也可导出工作包；确认后进入 Agent 生成。', generate: '选择本机 Agent 开始制作，在这里查看进度并下载演示文件。' };
  let state = Y.freshDraft(), attachments = [], hasDraft = false, validation = false;
  let preview = 'cover', savingTimer, toastTimer, saveChain = Promise.resolve(), exporting = false;
  let storageWarned = false, saveRevision = 0, exportDirectory = null, draftBusy = false;
  let renderedStep = null, renderedSlideId = null;
  let folderCandidates = [], folderSelected = new Set(), folderSlideId = null, fileImportChain = Promise.resolve();
  const markdownEditors = new Map();
  Y.getMarkdownEditor = id => markdownEditors.get(id);
  const agentPanel = Y.createAgentPanel({ getInput: () => ({ state, attachments }), issues: Y.issues, notify: message => toast(message),
    prepareSave: authorizedDirectory, saveResult: async (blob, filename, directory) => toast(await saveOutput(blob, filename, directory)) });
  const size = bytes => bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
  function toast(message) {
    const el = $('#toast'); el.textContent = message; el.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.hidden = true, 5000);
  }
  function saveStatus(message, status = '') {
    const el = $('#save-status'); el.textContent = message; el.dataset.status = status;
  }
  function save(immediate = false) {
    hasDraft = true; clearTimeout(savingTimer); saveStatus('正在保存…', 'saving');
    const textSaved = Y.saveTextBackup(state, attachments);
    const revision = ++saveRevision;
    const persist = () => {
      const snapshot = JSON.parse(JSON.stringify(state)), files = attachments.map(a => ({ ...a }));
      saveChain = saveChain.then(() => Y.saveDraft(snapshot, files, { skipTextBackup: textSaved })).then(result => {
        if (revision !== saveRevision) return;
        saveStatus(result.full ? '已保存在本机' : result.textSaved ? '文字已保存 · 请备份素材' : '保存受限 · 请备份', result.full ? 'saved' : 'warning');
        if (!result.full && !storageWarned) { storageWarned = true; toast('浏览器限制了本地保存。请导出工作包保留素材，并备份草稿。'); }
      }).catch(() => saveStatus('保存失败 · 请备份', 'warning'));
    };
    if (immediate) persist(); else savingTimer = setTimeout(persist, 350);
  }
  function confirm(title, description, label = '确认') {
    const dialog = $('#confirm-dialog'); $('#confirm-title').textContent = title;
    $('#confirm-description').textContent = description; $('#confirm-ok').textContent = label;
    return new Promise(resolve => {
      const finish = result => { dialog.close(); dialog.oncancel = null; $('#confirm-ok').onclick = null; $('#confirm-cancel').onclick = null; resolve(result); };
      $('#confirm-ok').onclick = () => finish(true); $('#confirm-cancel').onclick = () => finish(false);
      dialog.oncancel = event => { event.preventDefault(); finish(false); }; dialog.showModal();
    });
  }
  function meaningfulDraft() {
    return Object.entries(state.meta).some(([key, value]) => key !== 'date' && value.trim()) || attachments.length > 0 || state.slides.length > 1 || state.slides.some(s => Object.entries(s).some(([key, value]) => key !== 'id' && (Array.isArray(value) ? value.length : value.trim())));
  }
  function home() {
    return `<main id="content" class="home"><div class="home-top"><div><span class="home-label">THINK FIRST. PRESENT BETTER.</span><h1>好汇报，<br>从想清楚开始<span>。</span></h1><p class="home-description">你的思考，值得被好好呈现。<br>梳理逐页逻辑，选好素材与风格，<br>准备好内容，让本机 Agent 接手制作。</p><div class="home-cta"><button class="btn primary" data-action="new">新内容 <span aria-hidden="true">↗</span></button><button class="btn secondary" data-action="read-draft">读取草稿</button><button class="btn secondary" data-action="help">了解工作流</button></div><p class="home-sub">本地准备内容 · 按需调用 Agent</p></div><div class="home-art" aria-label="汇报视觉示意"><div class="hero-deck"><div class="deck-meta"><span>YOUR IDEAS,<br>WELL PRESENTED.</span><span>01 — 03</span></div><h2>让思考<br>有形。</h2><div class="deck-strokes" aria-hidden="true"><i></i><i></i><i></i></div><div class="deck-bottom"><span>YoursPPT</span><span>从逻辑到表达 ↗</span></div></div><span class="art-caption">CONTENT FIRST / DESIGN FOLLOWS</span></div></div><div class="home-divider"></div><div class="home-path"><div><span>01 / THINK</span><h3>先讲清楚</h3><p>明确听众与目标，确定每页的结论、支持和承接。</p></div><div><span>02 / PREPARE</span><h3>再准备好</h3><p>整理真实素材，选择风格，即时看到版式与配色。</p></div><div><span>03 / HAND OFF</span><h3>最后生成演示</h3><p>调用本机 Agent 制作，或导出完整工作包。</p></div></div>${hasDraft ? `<div class="draft-strip"><span>本机草稿：<strong>${esc(state.meta.title || '未命名汇报')}</strong> · ${state.slides.length} 页 · ${attachments.length} 份素材</span><button class="text-btn" data-action="start">继续我的汇报 ↗</button></div>` : ''}<div class="home-footer"><span>你负责逻辑，Agent 负责呈现。</span><div><button class="text-btn" data-action="example">试用示例</button></div></div></main>`;
  }
  function sidebar() {
    const current = steps.indexOf(state.step);
    return `<aside class="sidebar"><span class="eyebrow">YOUR PRESENTATION</span><nav class="steps" aria-label="准备步骤">${steps.map((step, i) => `<button class="step ${i === current ? 'current' : i < current ? 'done' : ''}" data-go="${step}" ${i === current ? 'aria-current="step"' : ''}><span class="step-number">${String(i + 1).padStart(2, '0')}</span><span>${names[step]}</span></button>`).join('')}</nav><div class="side-notes"><span class="eyebrow">保持清晰</span><p>一页一个主要任务。<br>不确定的事实先标记，<br>不让排版代替思考。</p></div><div class="side-actions"><button class="text-btn" data-action="new">新建汇报 ＋</button></div></aside>`;
  }
  function field(key, label, hint, options = {}) {
    const value = options.slide ? state.slides[state.activeSlide][key] : state.meta[key];
    const id = `${options.slide ? 'slide' : 'meta'}-${key}`;
    const error = validation && Y.issues(state, attachments).errors.find(e => e.field === key && e.step === state.step && (!options.slide || e.slide === state.activeSlide));
    const markdown = !options.type && key !== 'duration';
    const attributes = `${options.slide ? 'data-slide' : 'data-meta'}="${key}" ${options.required ? 'aria-required="true"' : ''} ${error ? 'aria-invalid="true"' : ''} aria-describedby="${id}-hint${error ? ` ${id}-error` : ''}"`;
    const input = markdown ? `<div class="live-markdown-host${key === 'content' ? ' live-markdown-content' : ''}" data-editor-id="${id}" data-editor-label="${esc(label)}" data-placeholder="${esc(options.placeholder || '')}" ${attributes}></div>` : `<input id="${id}" type="${options.type || 'text'}" ${attributes} value="${esc(value)}" placeholder="${esc(options.placeholder || '')}" ${key === 'duration' ? 'inputmode="decimal"' : ''}>`;
    const editor = markdown ? `<div class="markdown-editor-shell"><button type="button" class="markdown-help-button" data-action="markdown-help" data-editor-help="${id}" aria-label="${label}：Markdown 语法与快捷键" aria-haspopup="dialog">Markdown</button>${input}</div>` : input;
    return `<div class="field ${markdown ? 'markdown-field' : ''} ${options.wide ? 'wide' : ''} ${error ? 'has-error' : ''}"><label for="${id}" ${markdown ? `data-editor-label="${id}"` : ''}>${label} <span class="${options.required ? 'required' : 'optional'}">${options.required ? '*' : '选填'}</span></label>${editor}<p class="field-hint" id="${id}-hint">${hint || ''}</p>${error ? `<p class="field-error" id="${id}-error">${esc(error.message)}</p>` : ''}</div>`;
  }
  function context() {
    return `<section class="panel"><div class="panel-head"><h2>这一次，你要讲什么？</h2><span>带 * 的项目为必填</span></div><div class="field-grid">${field('title', '汇报主题', '', { required: true, wide: true, placeholder: '例如：项目阶段复盘与下一步计划' })}${field('date', '汇报日期', '', { required: true, type: 'date' })}${field('presenter', '汇报人', '', { required: true, placeholder: '姓名 / 团队' })}${field('audience', '听众', '他们已知道什么？最关心什么？', { required: true, wide: true, placeholder: '例如：项目负责人，需要判断是否继续投入' })}${field('goal', '希望听众带走什么', '理解一个观点、支持一项决定，或采取一个行动。', { area: true, wide: true, placeholder: '用一句话描述这次汇报希望达成的结果' })}${field('duration', '预计时长（分钟）', '帮助 Agent 控制信息密度与讲稿长度。', { placeholder: '例如：15' })}</div><details class="advanced"><summary>补充要求</summary><div class="field-grid">${field('constraints', '必须保留 / 避免的内容', '', { area: true, wide: true, placeholder: '如：数据截至日期、敏感内容、术语、语言或模板要求' })}</div></details></section><div class="context-aside"><span>一个小提示</span><p>主题说的是“讲什么”，目标说的是“为什么讲”。把这两件事分开，后面的内容就更容易取舍。</p></div>${materials()}`;
  }
  function sourceOptions(query = '') {
    const slide = state.slides[state.activeSlide], search = query.trim().toLocaleLowerCase();
    const available = attachments.filter(a => (a.relativePath || a.name).toLocaleLowerCase().includes(search));
    return available.map(a => `<label class="source-option"><input type="checkbox" data-source="${esc(a.id)}" ${slide.sourceIds.includes(a.id) ? 'checked' : ''}><span>${esc(a.relativePath || a.name)}${!a.file ? '（需要重选）' : ''}</span></label>`).join('') + slide.sourceIds.filter(id => !attachments.some(a => a.id === id)).map(id => `<span class="source-option missing-file">无法识别的关联 ${esc(id)} <button class="text-btn" data-unlink-source="${esc(id)}">移除关联</button></span>`).join('') || '<p class="field-hint">没有匹配的可引用文件。可从本页添加，或回到第一步导入。</p>';
  }
  function outline() {
    return `<div class="outline-layout"><aside class="slide-list" aria-label="汇报页面"><span class="eyebrow">${state.slides.length} PAGES</span>${state.slides.map((s, i) => `<button class="outline-item ${i === state.activeSlide ? 'active' : ''}" data-slide-index="${i}" ${i === state.activeSlide ? 'aria-current="true"' : ''}><span class="outline-no">${String(i + 1).padStart(2, '0')}</span><span class="outline-title">${esc(s.title || '未命名页面')}</span><i class="${s.title.trim() && s.purpose.trim() && s.content.trim() ? 'complete' : ''}" aria-label="${s.title.trim() && s.purpose.trim() && s.content.trim() ? '必填内容已填写' : '内容待填写'}"></i></button>`).join('')}<button class="outline-add" data-action="add-slide">＋ 添加一页</button></aside><section class="panel editor-panel"><div class="slide-toolbar"><div><span class="eyebrow">PAGE ${String(state.activeSlide + 1).padStart(2, '0')}</span><h2>把这一页的逻辑讲清楚</h2></div><div><button class="square-btn" data-action="move-up" aria-label="页面上移" title="上移" ${state.activeSlide === 0 ? 'disabled' : ''}>↑</button><button class="square-btn" data-action="move-down" aria-label="页面下移" title="下移" ${state.activeSlide === state.slides.length - 1 ? 'disabled' : ''}>↓</button><button class="square-btn" data-action="duplicate" aria-label="复制页面" title="复制">⧉</button><button class="square-btn danger" data-action="delete-slide" aria-label="删除页面" title="删除" ${state.slides.length === 1 ? 'disabled' : ''}>×</button></div></div><div class="field-grid">${field('title', '主题', '', { slide: true, required: true, wide: true, placeholder: '这一页要讲什么？' })}${field('purpose', '目的', '这一页在整场汇报中承担什么任务？', { slide: true, required: true, wide: true, placeholder: '例如：解释瓶颈，为下一页方案建立依据' })}${field('content', '内容', '用事实、证据和解释支撑这一页的主题。', { slide: true, required: true, wide: true, area: true, rows: 9, placeholder: '写下本页核心内容、事实或证据，以及需要说明的限定条件。' })}${field('details', '细节', '补充数据、例子、限定条件或其他需要保留的信息。', { slide: true, wide: true, area: true, rows: 3, placeholder: '可选填本页需要展开的细节' })}${field('transition', '承接关系', state.activeSlide ? '如何承接上一页？如何引向下一页？' : '可说明开场与下一页的关系。', { slide: true, wide: true, area: true, rows: 2, placeholder: '写下前后页面之间的逻辑关系' })}</div><section class="reference-panel"><div class="panel-head"><h2>引用内容</h2><span id="source-count">已选择 ${state.slides[state.activeSlide].sourceIds.length} 份</span></div><label for="source-search" class="field-hint">可引用内容 · 搜索素材库</label><input id="source-search" type="search" placeholder="按文件名或路径搜索"><div id="source-options" class="source-options">${sourceOptions()}</div><div class="reference-actions"><button class="btn secondary" data-action="pick-files">添加文件并引用</button><button class="btn secondary" data-action="search-folder">从文件夹搜索添加</button><button class="text-btn" data-go="context">管理素材库 ↗</button></div><input id="file-input" type="file" multiple hidden><input id="source-folder-input" type="file" webkitdirectory multiple hidden><div class="field-grid">${field('sourceNotes', '引用说明', '填写引用片段、链接、出处或页码，说明文件中哪部分应被采用。', { slide: true, area: true, wide: true })}</div></section><details class="advanced"><summary>视觉与讲稿要求</summary><div class="field-grid">${field('visual', '视觉表达', '', { slide: true, area: true, wide: true, placeholder: '如：对比图、方法流程、原始证据图；也可让 Agent 决定版式' })}${field('notes', '讲稿备注', '', { slide: true, area: true, wide: true, placeholder: '屏幕之外需要说明的例子、限制与讲述重点' })}</div></details><div class="editor-navigation"><button class="text-btn" data-action="previous-slide" ${state.activeSlide === 0 ? 'disabled' : ''}>← 上一页</button><span>${state.activeSlide + 1} / ${state.slides.length}</span><button class="text-btn" data-action="next-slide" ${state.activeSlide === state.slides.length - 1 ? 'disabled' : ''}>下一页 →</button></div></section></div>`;
  }
  function renderFolderResults() {
    const query = $('#folder-search').value.trim().toLocaleLowerCase();
    const matches = folderCandidates.map((file, index) => ({ file, index })).filter(({ file }) => (file.webkitRelativePath || file.name).toLocaleLowerCase().includes(query));
    $('#folder-results').innerHTML = matches.slice(0, 200).map(({ file, index }) => `<label class="source-option"><input type="checkbox" data-folder-file="${index}" ${folderSelected.has(index) ? 'checked' : ''}><span>${esc(file.webkitRelativePath || file.name)} <small>${size(file.size)}</small></span></label>`).join('') || '<p class="field-hint">没有匹配的文件。</p>';
    $('#folder-selection-status').textContent = `找到 ${matches.length} 份 · 已选 ${folderSelected.size} 份${matches.length > 200 ? ' · 显示前 200 份，请缩小搜索范围' : ''}`;
    $('[data-action="add-folder-references"]').disabled = !folderSelected.size;
  }
  function closeReferenceDialog() {
    $('#reference-dialog').close(); folderCandidates = []; folderSelected.clear(); folderSlideId = null;
  }
  function materials() {
    return `<section class="panel"><div class="panel-head"><h2>导入可引用内容</h2><span>可跳过</span></div><div class="dropzone" id="dropzone"><span class="upload-icon" aria-hidden="true">↥</span><h3>拖入参考文件</h3><p>图片、文档、表格或已有 PPT，保留原文件。</p><div class="upload-buttons"><button class="btn primary" data-action="pick-files">选择文件</button><button class="btn secondary" data-action="pick-folder">选择文件夹</button></div><small>每个文件最多 100 MB，总计最多 300 MB · 文件仅保存在本机</small></div><input id="file-input" type="file" multiple hidden><input id="folder-input" type="file" webkitdirectory multiple hidden><div class="materials-head"><h3>已添加 <span>${attachments.length}</span></h3><span>${size(attachments.reduce((sum, a) => sum + a.size, 0))}</span></div>${attachments.length ? attachments.map(a => `<div class="material ${!a.file ? 'missing-file' : ''}"><span class="file-icon">${esc((a.name.split('.').pop() || 'FILE').slice(0, 5).toUpperCase())}</span><div class="file-info"><strong>${esc(a.name)}</strong><span>${esc(a.relativePath || a.name)} · ${size(a.size)}${!a.file ? ' · 文件未恢复，请重新选择' : ''}</span><small>${state.slides.filter(s => s.sourceIds.includes(a.id)).length ? `已关联 ${state.slides.filter(s => s.sourceIds.includes(a.id)).length} 页` : '尚未关联页面'}</small></div><button class="square-btn danger" data-remove-file="${esc(a.id)}" aria-label="移除 ${esc(a.name)}">×</button></div>`).join('') : '<div class="empty-state">资料无需一次备齐。可以先完成逻辑，之后再回来补充。</div>'}</section><div class="context-aside"><span>怎样用好素材</span><p>这里导入的文件会出现在每页的“引用内容”中，可按需勾选。每页也能从文件夹搜索并添加文件。选择文件夹会保留内部目录；同名文件会在导出时自动区分。</p></div>`;
  }
  function deckPreview() {
    const style = Y.getStyle(state), p = style.palette;
    const title = state.meta.title || '让思考，成为一场好汇报';
    const slide = state.slides[state.activeSlide] || state.slides[0];
    const heading = preview === 'cover' ? title : slide.title || '一个观点，需要清楚的支撑';
    const css = `--deck-paper:${p.paper};--deck-ink:${p.ink};--deck-tint:${p.tint};--deck-accent:${p.accent || p.ink};--deck-on:${p.accentOn || p.paper};--deck-secondary:${p.secondary || p.tint}`;
    let body;
    if (preview === 'cover') body = `<div class="preview-body ${preview === 'cover' ? 'cover-' + state.style : ''}"><span class="preview-kicker">${state.style === 'research' ? 'RESEARCH / BRIEFING' : state.style === 'editorial' ? 'IDEAS WORTH SHARING' : 'A CLEAR POINT OF VIEW'}</span><div class="preview-heading markdown-body">${Y.renderMarkdown(heading)}</div><div class="markdown-body preview-goal">${Y.renderMarkdown(state.meta.goal || '先理清内容，再让表达有自己的秩序。')}</div>${state.style === 'swiss' ? '<span class="cover-block" aria-hidden="true">↗</span>' : '<span class="visual-motif" aria-hidden="true"></span>'}</div>`;
    else if (preview === 'content') body = `<div class="preview-body"><span class="preview-kicker">${String(state.activeSlide + 1).padStart(2, '0')} / ${state.style === 'research' ? 'FINDING & EVIDENCE' : 'THE KEY IDEA'}</span><div class="preview-heading markdown-body">${Y.renderMarkdown(heading)}</div><div class="preview-list"><div class="markdown-body">${Y.renderMarkdown(slide.details || slide.purpose || '让听众记住一个有依据的判断。')}</div><div><div class="markdown-body">${Y.renderMarkdown(slide.content || '- 用事实与证据支持结论\n- 让下一页自然发生')}</div></div></div></div>`;
    else body = `<div class="preview-body"><span class="preview-kicker">STRUCTURE / AT A GLANCE</span><div class="preview-heading markdown-body">${Y.renderMarkdown(slide.title || '从目的，到清楚的表达')}</div><div class="preview-flow">${['主题', '目的', '内容'].map((name, i) => `<div><span>0${i + 1}</span><h3>${name}</h3><div class="markdown-body">${Y.renderMarkdown([slide.title || '这一页要讲什么', slide.purpose || '说明这页为什么存在', slide.content || '- 用事实与证据支持结论'][i])}</div></div>`).join('')}</div></div>`;
    return `<div class="slide-preview ${state.style}" style="${css}"><div class="preview-chrome"><span>${esc(state.meta.presenter || 'YOUR NAME')}</span><span>${esc(state.meta.date)}</span></div>${body}<div class="preview-foot"><span>${esc(state.meta.audience || 'YOUR AUDIENCE')}</span><span>${preview === 'cover' ? '01' : String(state.activeSlide + 1).padStart(2, '0')} / ${String(state.slides.length).padStart(2, '0')}</span></div></div>`;
  }
  function stylePage() {
    const style = Y.getStyle(state);
    return `<div class="style-layout"><div class="style-choices" role="radiogroup" aria-label="PPT 风格">${Object.values(Y.STYLES).map(s => `<button class="style-choice ${s.id === state.style ? 'selected' : ''}" data-style="${s.id}" role="radio" aria-checked="${s.id === state.style}"><div class="style-mini mini-${s.id}" style="--mini-paper:${s.palettes[0].paper};--mini-ink:${s.palettes[0].ink};--mini-accent:${s.palettes[0].accent || s.palettes[0].ink};--mini-tint:${s.palettes[0].tint}"><span>让思考<br>有形。</span><i></i></div><div class="style-name"><strong>${s.name}</strong><span class="radio-dot"></span></div><small>${s.tag}</small></button>`).join('')}</div><section class="preview-area"><div class="preview-toolbar"><span class="eyebrow">LIVE PREVIEW</span><span>版式示意 · 非最终成稿</span></div><div id="deck-preview">${deckPreview()}</div><div class="preview-navigation"><div class="preview-tabs" role="tablist" aria-label="预览页面类型">${[['cover', '封面'], ['content', '内容页'], ['structure', '结构页']].map(([key, label]) => `<button role="tab" aria-selected="${preview === key}" class="${preview === key ? 'active' : ''}" data-preview="${key}">${label}</button>`).join('')}</div><select id="preview-slide" aria-label="预览哪一页内容" ${preview === 'cover' ? 'disabled' : ''}>${state.slides.map((s, i) => `<option value="${i}" ${state.activeSlide === i ? 'selected' : ''}>第 ${i + 1} 页 · ${esc(s.title || '未命名')}</option>`).join('')}</select></div><div class="style-controls"><div class="palette-row"><span>主题色</span><div role="radiogroup" aria-label="主题配色">${style.palettes.map(p => `<button class="palette ${p.id === style.palette.id ? 'selected' : ''}" data-palette="${p.id}" role="radio" aria-checked="${p.id === style.palette.id}" title="${p.name}"><i style="background:${p.accent || p.ink}"></i><span>${p.name}</span></button>`).join('')}</div></div><div class="style-description"><p>${style.description}</p><small>${esc(style.note || '视觉规范来自 Guizang PPT Skill；完整原始规范与资源随工作包导出。')}</small><details><summary>查看制作原则与来源</summary><ul>${style.rules.map(r => `<li>${esc(r)}</li>`).join('')}</ul><a href="${style.source}" target="_blank" rel="noopener noreferrer">查看上游仓库 ↗</a></details></div></div><section class="panel delivery-controls"><div><h2>最终交付形式</h2><p>格式与视觉风格独立。选择 PPTX 时会同时附上原生制作工具。</p></div><div role="radiogroup" aria-label="交付形式">${[['pptx', 'PowerPoint', '可编辑 .pptx'], ['html', 'HTML 演示', '浏览器播放']].map(([id, name, help]) => `<button class="delivery-choice ${state.delivery === id ? 'selected' : ''}" data-delivery="${id}" role="radio" aria-checked="${state.delivery === id}"><span class="radio-dot"></span><div><strong>${name}</strong><small>${help}</small></div></button>`).join('')}</div></section></section></div>`;
  }
  function dataRow(label, value, full = false) { return `<div class="${full ? 'full' : ''}"><dt>${label}</dt><dd>${esc(value || '未填写')}</dd></div>`; }
  function markdownRow(label, value) { return `<div class="full"><dt>${label}</dt><dd class="markdown-body">${value?.trim() ? Y.renderMarkdown(value) : '未填写'}</dd></div>`; }
  function editLink(step, slide, label = '修改 ↗', field = '') { return `<button class="text-btn" data-go="${step}" ${slide != null ? `data-target-slide="${slide}"` : ''} ${field ? `data-focus="${field}"` : ''}>${label}</button>`; }
  function review() {
    const { errors, suggestions } = Y.issues(state, attachments), style = Y.getStyle(state);
    const sourceMap = new Map(attachments.map(a => [a.id, a.name]));
    let md = '';
    try { if (Y.buildBrief) md = Y.buildBrief(state, attachments); } catch { md = '素材恢复后可查看完整 Markdown。'; }
    return `<div class="review-summary"><div class="metric"><strong>${state.slides.length}<small>页</small></strong><span>内容已整理</span></div><div class="metric"><strong>${attachments.length}<small>份</small></strong><span>参考素材</span></div><div class="metric"><strong>${errors.length ? `${errors.length}<small>项</small>` : '已就绪'}</strong><span>${errors.length ? '需要补齐' : '必填信息完整'}</span></div></div>${errors.length ? `<section class="panel"><div class="panel-head"><h2>先补齐这些信息</h2></div><ul class="issue-list">${errors.map(e => `<li><span>${esc(e.message)}</span>${editLink(e.step, e.slide, '去补充 ↗', e.field)}</li>`).join('')}</ul></section>` : ''}<section class="panel review-section"><div class="panel-head"><h2>汇报目标</h2>${editLink('context')}</div><dl class="review-data">${markdownRow('汇报主题', state.meta.title)}${dataRow('汇报日期', state.meta.date)}${markdownRow('汇报人', state.meta.presenter)}${markdownRow('听众', state.meta.audience)}${markdownRow('希望听众带走什么', state.meta.goal)}${dataRow('预计时长', state.meta.duration ? `${state.meta.duration} 分钟` : '')}${markdownRow('补充要求', state.meta.constraints)}</dl></section><section class="panel review-section"><div class="panel-head"><h2>逐页内容</h2><span>顺着读一遍，检查论证与承接</span></div>${state.slides.map((s, i) => `<article class="review-slide"><div class="review-slide-head"><div class="review-slide-heading"><span>${String(i + 1).padStart(2, '0')}</span><div class="markdown-body" aria-label="主题">${Y.renderMarkdown(s.title || '未命名页面')}</div></div>${editLink('outline', i)}</div><dl class="review-data">${markdownRow('目的', s.purpose)}${markdownRow('内容', s.content)}${markdownRow('细节（选填）', s.details)}${markdownRow('承接关系（选填）', s.transition)}${markdownRow('视觉表达', s.visual)}${markdownRow('讲稿备注', s.notes)}${dataRow('引用文件', s.sourceIds.map(id => sourceMap.get(id) || '缺失的素材').join('、'), true)}${markdownRow('引用说明', s.sourceNotes)}</dl></article>`).join('')}</section><section class="panel review-section"><div class="panel-head"><h2>素材与风格</h2>${editLink('style')}</div><dl class="review-data">${dataRow('视觉风格', `${style.name} / ${style.palette.name}`)}${dataRow('交付形式', state.delivery === 'pptx' ? '原生可编辑 PowerPoint (.pptx)' : 'HTML 浏览器演示')}${dataRow('参考文件', attachments.map(a => `${a.relativePath || a.name}${!a.file ? '（需重新选择）' : ''}`).join('\n') || '未提供', true)}</dl>${editLink('context', null, '管理素材 ↗')}</section>${suggestions.length ? `<details class="panel suggestions"><summary>还有 ${suggestions.length} 个可优化点 · 不影响导出</summary><ul class="issue-list">${suggestions.map(e => `<li><span>${esc(e.message)}</span>${editLink(e.step, e.slide, '检查 ↗', e.field)}</li>`).join('')}</ul></details>` : ''}<section class="package-card"><div><span class="eyebrow">READY FOR YOUR AGENT</span><h2>一个文件夹，完成交接。</h2><p>工作包保留你的完整输入、真实素材与原始 Skill。<br>未完成的草稿也可导出，缺口会记录在 brief.md。</p><button class="btn primary" data-action="export" ${exporting ? 'disabled' : ''}>导出完整工作包 ↓</button><p id="export-status" role="status" class="field-hint">${errors.length ? '可以导出未完成的工作包；生成演示前请补齐信息。' : '首次导出会加载本地制作资源，请稍候。'}</p></div><pre class="package-tree">${esc(Y.safePath(state.meta.title || '我的汇报'))}/
├─ draft.json       可继续编辑的草稿
├─ brief.md         完整内容与 Agent 入口
├─ references/      真实文件与素材清单
└─ style/           风格、预设与完整 Skill</pre></section>${md ? `<details class="panel markdown-details"><summary>查看导出的 Markdown 内容</summary><pre>${esc(md)}</pre></details>` : ''}<div class="handoff"><span>给 Agent 的一句话</span><p>阅读工作包内的 brief.md 和 style/guide.md，遵循所附 Skill；保留我的逐页逻辑，先确认缺口，再生成指定格式的演示。</p><button class="text-btn" data-action="copy-handoff">复制提示词 ↗</button></div>`;
  }
  function generate() {
    const style = Y.getStyle(state), { errors } = Y.issues(state, attachments);
    return `<section class="panel"><div class="panel-head"><h2>本次演示</h2>${editLink('review', null, '返回检查 ↗')}</div><dl class="review-data">${markdownRow('汇报主题', state.meta.title)}${dataRow('页面与素材', `${state.slides.length} 页 · ${attachments.length} 份素材`)}${dataRow('视觉风格', `${style.name} / ${style.palette.name}`)}${dataRow('交付形式', state.delivery === 'pptx' ? 'PowerPoint (.pptx)' : 'HTML 浏览器演示')}</dl>${errors.length ? `<p class="field-hint">还有 ${errors.length} 项信息需要补齐，请返回第 4 步检查后再开始生成。</p>` : ''}</section><section id="agent-panel" aria-label="本机 Agent 生成"></section>`;
  }
  function render(focus = false) {
    const scrolls = {};
    for (const selector of ['.stage-body', '.slide-list', '.editor-panel', '.style-choices', '.preview-area']) {
      const el = $(selector); if (el) scrolls[selector] = [el.scrollTop, el.scrollLeft];
    }
    const sameStep = renderedStep === state.step, sameSlide = renderedSlideId === state.slides[state.activeSlide]?.id;
    for (const editor of markdownEditors.values()) editor.destroy();
    markdownEditors.clear();
    if (state.step === 'welcome') $('#workspace').innerHTML = home();
    else {
      const index = steps.indexOf(state.step), contents = { context, outline, style: stylePage, review, generate };
      const nextLabel = state.step === 'style' ? '检查内容' : state.step === 'review' ? '进入 Agent 生成' : '下一步';
      const footerActions = `${index < steps.length - 1 ? `<button class="btn primary" data-action="next">${nextLabel} →</button>` : ''}`;
      $('#workspace').innerHTML = `<div class="work-layout">${sidebar()}<main id="content" class="stage ${['outline', 'style'].includes(state.step) ? 'stage-split' : ''}"><header class="stage-head"><span class="step-label">STEP ${String(index + 1).padStart(2, '0')} / ${String(steps.length).padStart(2, '0')}</span><h1 tabindex="-1">${names[state.step]}</h1><p>${subtitles[state.step]}</p></header><div class="stage-body">${contents[state.step]()}</div><footer class="stage-footer"><button class="text-btn" data-action="back">← ${index ? '上一步' : '返回首页'}</button><span>${index + 1} / ${steps.length}</span><div class="footer-buttons">${footerActions}</div></footer></main></div>`;
      if (state.step === 'generate') agentPanel.mount($('#agent-panel'));
      if (state.step === 'review' && Y.canSaveFolder()) {
        const button = document.createElement('button');
        button.className = 'btn secondary folder-export'; button.dataset.action = 'export-folder';
        button.textContent = '直接保存文件夹 ↗'; button.disabled = exporting;
        $('[data-action="export"]').after(button);
      }
      if (state.step === 'review' && !Y.issues(state, attachments).errors.length) {
        $('#export-status').textContent = state.delivery === 'pptx' || Y.getStyle(state).family === 'pptMaster' ? '完整制作资源约 53–59 MB（不含你的素材）。保存文件夹需写入上万个资源文件，ZIP 导出更快。' : '首次导出会加载本地制作资源，请稍候。';
      }
    }
    mountMarkdownEditors();
    if (!focus && sameStep) for (const [selector, [top, left]] of Object.entries(scrolls)) {
      const el = $(selector); if (el && (selector !== '.editor-panel' || sameSlide)) { el.scrollTop = top; el.scrollLeft = left; }
    }
    if (!sameSlide) $('.outline-item.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    renderedStep = state.step; renderedSlideId = state.slides[state.activeSlide]?.id;
    if (focus) $('.stage-head h1')?.focus({ preventScroll: true });
    Y.refreshScrollSurfaces();
  }
  function mountMarkdownEditors() {
    document.querySelectorAll('[data-editor-id]').forEach(host => {
      const id = host.dataset.editorId, slide = host.dataset.slide != null;
      const key = slide ? host.dataset.slide : host.dataset.meta;
      const record = slide ? state.slides[state.activeSlide] : state.meta;
      const editor = Y.mountMarkdownEditor(host, {
        id, label: host.dataset.editorLabel, value: record[key], placeholder: host.dataset.placeholder || '在这里写下内容…',
        required: host.getAttribute('aria-required') === 'true', invalid: host.getAttribute('aria-invalid') === 'true',
        describedby: host.getAttribute('aria-describedby'),
        onChange: value => {
          if (!host.isConnected) return;
          record[key] = value;
          updateFieldState(host, id, slide);
          markdownEditors.get(id)?.setInvalid(false);
        }
      });
      markdownEditors.set(id, editor);
    });
  }
  function focusField(id) {
    const element = document.getElementById(id);
    const details = element?.closest('details'); if (details) details.open = true;
    const editor = markdownEditors.get(id);
    if (editor) editor.focus(); else element?.focus();
  }
  function go(step, slide, fieldName) {
    if (exporting) return toast('工作包正在导出，请稍候。');
    step = step === 'materials' ? 'context' : step;
    state.step = step;
    if (steps.includes(step)) state.resumeStep = step;
    if (slide != null) state.activeSlide = Math.max(0, Math.min(state.slides.length - 1, Number(slide)));
    validation = false; render(true); save();
    if (fieldName) {
      focusField(`${step === 'outline' ? 'slide' : 'meta'}-${fieldName}`);
    }
  }
  function next() {
    const errors = Y.issues(state, attachments).errors.filter(e => e.step === state.step);
    if (errors.length && ['context', 'outline'].includes(state.step)) {
      validation = true; if (errors[0].slide != null) state.activeSlide = errors[0].slide;
      render(); toast(errors[0].message); focusField(`${state.step === 'outline' ? 'slide' : 'meta'}-${errors[0].field}`); return;
    }
    go(steps[Math.min(steps.length - 1, steps.indexOf(state.step) + 1)]);
  }
  function addFiles(fileList, targetSlideId = state.step === 'outline' ? state.slides[state.activeSlide].id : null) {
    fileImportChain = fileImportChain.then(() => importFiles(fileList, targetSlideId)).catch(error => toast(`添加失败：${error.message}`));
    return fileImportChain;
  }
  async function importFiles(fileList, targetSlideId) {
    const accepted = [];
    let skipped = 0, restored = 0, added = 0, total = attachments.filter(a => a.file).reduce((sum, a) => sum + a.size, 0);
    for (const file of fileList) {
      const relativePath = file.webkitRelativePath || file.name;
      const match = attachments.find(a => (a.relativePath || a.name) === relativePath && a.size === file.size && (!a.file || a.lastModified === file.lastModified));
      if (match?.file) {
        const [a, b] = await Promise.all([match.file.arrayBuffer(), file.arrayBuffer()]);
        const other = new Uint8Array(b);
        if (new Uint8Array(a).every((byte, i) => byte === other[i])) { accepted.push(match.id); skipped++; continue; }
      }
      if (file.size > 100 * 1048576 || total + file.size > 300 * 1048576) { skipped++; continue; }
      const data = { name: file.name, relativePath, type: file.type, size: file.size, lastModified: file.lastModified, file };
      if (match && !match.file) { Object.assign(match, data); accepted.push(match.id); restored++; } else { const id = Y.uid(); attachments.push({ id, ...data }); accepted.push(id); added++; }
      total += file.size;
    }
    const targetSlide = state.slides.find(s => s.id === targetSlideId);
    if (targetSlide) targetSlide.sourceIds = [...new Set([...targetSlide.sourceIds, ...accepted])];
    save(true); render(); toast(`新增 ${added} 份${restored ? `，恢复 ${restored} 份` : ''}${skipped ? `；跳过 ${skipped} 份重复或超限文件` : ''}。`);
  }
  function download(blob, name) {
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  function showSettings() {
    $('#export-location').textContent = exportDirectory ? `所选文件夹：${exportDirectory.name}` : '浏览器默认下载位置';
    $('[data-action="choose-export-directory"]').disabled = typeof window.showDirectoryPicker !== 'function';
    $('#directory-hint').textContent = typeof window.showDirectoryPicker === 'function' ? '浏览器重开后可能需要重新授权所选文件夹。' : '当前浏览器无法指定文件夹，导出时使用浏览器下载位置。Chrome / Edge 的本机工作区支持选择文件夹。';
    $('#settings-draft-summary').textContent = `${state.meta.title || '未命名汇报'} · ${state.slides.length} 页 · ${attachments.length} 份素材`;
    $('[data-action="resume-draft"]').disabled = !hasDraft;
    $('#settings-status').textContent = '';
    if (!$('#settings-dialog').open) $('#settings-dialog').showModal();
  }
  async function authorizedDirectory() {
    if (!exportDirectory) return null;
    const options = { mode: 'readwrite' };
    if (await exportDirectory.queryPermission(options) !== 'granted' && await exportDirectory.requestPermission(options) !== 'granted') throw new Error('文件夹未获写入授权，请在设置中重新选择，或切换为浏览器下载。');
    return exportDirectory;
  }
  async function saveOutput(blob, filename, directory) {
    if (directory) return `已保存到「${directory.name}」：${await Y.saveExportFile(blob, filename, directory)}`;
    download(blob, filename); return '已准备下载，请检查浏览器下载列表。';
  }
  async function backup() {
    if (draftBusy) return;
    draftBusy = true;
    const button = $('#settings-dialog [data-action="backup"]'); button.disabled = true;
    $('#settings-status').textContent = '正在保存草稿与素材…';
    try {
      const directory = await authorizedDirectory();
      const snapshot = JSON.parse(JSON.stringify(state)), files = attachments.map(a => ({ ...a }));
      const result = await Y.buildDraftArchive(snapshot, files);
      const message = await saveOutput(result.blob, result.filename, directory);
      $('#settings-status').textContent = message; toast(`草稿${message}`);
    } catch (error) { $('#settings-status').textContent = `保存失败：${error.message}`; toast(`保存失败：${error.message}`); }
    finally { draftBusy = false; button.disabled = false; }
  }
  async function importDraft(file) {
    if (!file || draftBusy) return;
    draftBusy = true;
    try {
      const record = await Y.readDraftFile(file);
      if (meaningfulDraft() && !await confirm('用读取的草稿替换当前内容？', '当前本地草稿会被替换。需要保留时，请先取消并保存草稿。', '读取草稿')) return;
      state = record.state; attachments = record.attachments;
      state.step = state.step === 'welcome' ? state.resumeStep : state.step;
      hasDraft = true; validation = false;
      $('#settings-dialog').close(); save(true); render(true);
      toast(attachments.some(a => !a.file) ? '草稿已读取，部分素材需在第一步重新选择。' : '草稿与素材已读取，可以继续编辑。');
    } catch (error) { toast(`读取失败：${error.message}`); }
    finally { draftBusy = false; }
  }
  async function exportPackage(parentDirectory, outputDirectory) {
    if (exporting) return;
    exporting = true; const button = $('[data-action="export"]'); button.disabled = true;
    const folderButton = $('[data-action="export-folder"]'); if (folderButton) folderButton.disabled = true;
    try {
      const directory = parentDirectory ? null : outputDirectory;
      const result = await Y.buildPackage(JSON.parse(JSON.stringify(state)), attachments.map(a => ({ ...a })), {
        allowIncomplete: true,
        onProgress: p => { button.textContent = `正在打包 ${Math.round(p.percent)}%`; $('#export-status').textContent = p.message; }
      });
      if (parentDirectory) {
        const name = await Y.savePackageFolder(result.entries, parentDirectory, { onProgress: p => {
          $('#export-status').textContent = `正在保存文件夹 ${p.completed} / ${p.total}，请保持页面打开。`;
          if (folderButton) folderButton.textContent = `写入 ${Math.round(p.completed / p.total * 100)}%`;
        } });
        $('#export-status').textContent = `文件夹「${name}」已完整保存。将整个文件夹交给 Agent 即可。`;
        toast('工作包文件夹已保存，不会覆盖已有内容。');
      } else {
        const message = await saveOutput(result.blob, result.filename, directory); $('#export-status').textContent = `${message} 工作包含可恢复的 draft.json；未完成内容和素材缺口见 brief.md。`; toast(message);
      }
    } catch (error) {
      $('#export-status').textContent = `导出失败：${error.message}。${parentDirectory ? '可改用 ZIP 导出。' : '请确认项目中的 assets/skills 文件夹完整后重试。'}`; toast('未生成完整工作包，请查看导出提示。');
    } finally {
      exporting = false; button.disabled = false; button.textContent = '导出完整工作包 ↓';
      if (folderButton) { folderButton.disabled = false; folderButton.textContent = '直接保存文件夹 ↗'; }
    }
  }
  function updateFieldState(element, id, slide) {
    if (slide) {
      const s = state.slides[state.activeSlide], row = $(`[data-slide-index="${state.activeSlide}"]`);
      if (row) {
        row.querySelector('.outline-title').textContent = s.title || '未命名页面';
        const complete = !!(s.title.trim() && s.purpose.trim() && s.content.trim());
        row.querySelector('i').classList.toggle('complete', complete);
        row.querySelector('i').setAttribute('aria-label', complete ? '必填内容已填写' : '内容待填写');
      }
    }
    element.removeAttribute('aria-invalid');
    element.setAttribute('aria-describedby', `${id}-hint`);
    element.closest('.field')?.classList.remove('has-error');
    element.closest('.field')?.querySelector('.field-error')?.remove();
    const input = document.getElementById(id);
    input?.removeAttribute('aria-invalid'); input?.setAttribute('aria-describedby', `${id}-hint`);
    save();
  }
  document.addEventListener('input', event => {
    const el = event.target;
    if (el.id === 'source-search') { $('#source-options').innerHTML = sourceOptions(el.value); return; }
    if (el.id === 'folder-search') { renderFolderResults(); return; }
    if (el.matches('input[data-meta]')) {
      state.meta[el.dataset.meta] = el.value;
      updateFieldState(el, el.id, false);
    }
  });
  document.addEventListener('change', event => {
    const el = event.target;
    if (el.dataset.source) { const s = state.slides[state.activeSlide]; s.sourceIds = el.checked ? [...new Set([...s.sourceIds, el.dataset.source])] : s.sourceIds.filter(id => id !== el.dataset.source); $('#source-count').textContent = `已选择 ${s.sourceIds.length} 份`; save(); }
    if (el.dataset.folderFile != null) { const index = Number(el.dataset.folderFile); el.checked ? folderSelected.add(index) : folderSelected.delete(index); renderFolderResults(); }
    if (el.id === 'source-folder-input' && el.files.length) { folderCandidates = [...el.files]; folderSelected.clear(); folderSlideId = state.slides[state.activeSlide].id; $('#folder-search').value = ''; renderFolderResults(); $('#reference-dialog').showModal(); $('#folder-search').focus(); el.value = ''; }
    if (el.id === 'file-input' || el.id === 'folder-input') addFiles([...el.files]);
    if (el.id === 'preview-slide') { state.activeSlide = Number(el.value); render(); save(); }
    if (el.id === 'import-input') { importDraft(el.files[0]); el.value = ''; }
  });
  document.addEventListener('click', async event => {
    const label = event.target.closest('label[data-editor-label]');
    if (label) { focusField(label.dataset.editorLabel); return; }
    const el = event.target.closest('button'); if (!el || el.disabled) return;
    const d = el.dataset;
    if (d.action === 'cancel-reference') return closeReferenceDialog();
    if (d.action === 'add-folder-references') { const files = [...folderSelected].map(i => folderCandidates[i]), target = folderSlideId; closeReferenceDialog(); return addFiles(files, target); }
    if (d.action === 'markdown-help') return $('#markdown-dialog').showModal();
    if (d.action === 'close-markdown-help') return $('#markdown-dialog').close();
    if (d.action === 'help') return $('#help-dialog').showModal();
    if (d.action === 'close-help') return $('#help-dialog').close();
    if (d.action === 'settings' || d.action === 'read-draft') return showSettings();
    if (d.action === 'close-settings') return $('#settings-dialog').close();
    if (draftBusy && ['new', 'example', 'start', 'resume-draft', 'import'].includes(d.action)) return toast('草稿正在读写，请稍候。');
    if (exporting) return toast('工作包正在导出，请稍候。');
    if (d.go) return go(d.go, d.targetSlide, d.focus);
    if (d.slideIndex != null) { state.activeSlide = Number(d.slideIndex); validation = false; render(); save(); return; }
    if (d.style) { state.style = d.style; state.palette = Y.STYLES[d.style].palettes[0].id; render(); save(); return; }
    if (d.palette) { state.palette = d.palette; render(); save(); return; }
    if (d.delivery) { state.delivery = d.delivery; render(); save(); return; }
    if (d.preview) { preview = d.preview; render(); return; }
    if (d.unlinkSource) { const s = state.slides[state.activeSlide]; s.sourceIds = s.sourceIds.filter(id => id !== d.unlinkSource); render(); save(); return; }
    if (d.removeFile) {
      const linked = state.slides.filter(s => s.sourceIds.includes(d.removeFile));
      if (linked.length && !await confirm('移除这份素材？', `这份文件关联了 ${linked.length} 页。移除后也会取消这些页面的关联，不会删除电脑上的原文件。`, '移除素材')) return;
      attachments = attachments.filter(a => a.id !== d.removeFile); state.slides.forEach(s => s.sourceIds = s.sourceIds.filter(id => id !== d.removeFile)); save(true); render(); return;
    }
    switch (d.action) {
      case 'start': return go(state.resumeStep || 'context');
      case 'resume-draft': $('#settings-dialog').close(); return go(state.resumeStep || 'context');
      case 'choose-export-directory':
        try {
          const handle = await window.showDirectoryPicker({ mode: 'readwrite', id: 'yoursppt-exports' });
          await Y.saveExportDirectory(handle); exportDirectory = handle; showSettings();
        } catch (error) { if (error.name !== 'AbortError') toast(`无法保存导出位置：${error.message}`); } return;
      case 'reset-export-directory':
        try { await Y.saveExportDirectory(null); exportDirectory = null; showSettings(); }
        catch (error) { toast(`无法重置导出位置：${error.message}`); } return;
      case 'home': return go('welcome');
      case 'next': return next();
      case 'back': return go(steps[steps.indexOf(state.step) - 1] || 'welcome');
      case 'new':
      case 'example':
        if (meaningfulDraft() && !await confirm(d.action === 'new' ? '开始一份新汇报？' : '载入示例汇报？', '当前草稿会被替换。需要保留时，请先取消并备份草稿。', d.action === 'new' ? '新建汇报' : '载入示例')) return;
        state = d.action === 'example' ? Y.exampleDraft() : Y.freshDraft(); attachments = []; state.step = 'context'; validation = false; preview = 'cover'; save(true); render(true); return;
      case 'add-slide':
      case 'duplicate':
        if (state.slides.length >= 200) return toast('一份汇报最多 200 页。');
        state.slides.splice(state.activeSlide + 1, 0, Y.createSlide(d.action === 'duplicate' ? state.slides[state.activeSlide] : {})); state.activeSlide++; break;
      case 'delete-slide':
        if (!await confirm('删除这一页？', '删除后当前草稿中的这一页将被移除。', '删除页面')) return;
        state.slides.splice(state.activeSlide, 1); state.activeSlide = Math.min(state.activeSlide, state.slides.length - 1); break;
      case 'move-up':
      case 'move-down': {
        const target = state.activeSlide + (d.action === 'move-up' ? -1 : 1);
        [state.slides[target], state.slides[state.activeSlide]] = [state.slides[state.activeSlide], state.slides[target]]; state.activeSlide = target; break;
      }
      case 'previous-slide': state.activeSlide--; break;
      case 'next-slide': state.activeSlide++; break;
      case 'pick-files': return $('#file-input').click();
      case 'pick-folder': return $('#folder-input').click();
      case 'search-folder': return $('#source-folder-input').click();
      case 'backup': return backup();
      case 'import': return $('#import-input').click();
      case 'export':
        try { return exportPackage(null, await authorizedDirectory()); }
        catch (error) { return toast(error.message); }
      case 'export-folder':
        try { return exportPackage(await authorizedDirectory() || await window.showDirectoryPicker({ mode: 'readwrite' })); }
        catch (error) { return toast(error.name === 'AbortError' ? '已取消保存，没有写入文件。' : `无法选择文件夹：${error.message}。请使用 ZIP 导出。`); }
      case 'copy-handoff':
        try { await navigator.clipboard.writeText($('.handoff p').textContent); toast('Agent 提示词已复制。'); } catch { toast('浏览器未允许复制，请选中提示词手动复制。'); } return;
      default: return;
    }
    validation = false; render(); save();
  });
  document.addEventListener('dragover', event => {
    if (!event.dataTransfer?.types.includes('Files')) return; event.preventDefault(); $('#dropzone')?.classList.add('drag');
  });
  document.addEventListener('dragleave', event => { if (!event.relatedTarget || !$('#dropzone')?.contains(event.relatedTarget)) $('#dropzone')?.classList.remove('drag'); });
  document.addEventListener('drop', event => {
    if (!event.dataTransfer?.types.includes('Files')) return; event.preventDefault(); $('#dropzone')?.classList.remove('drag');
    if (!['context', 'outline'].includes(state.step)) return toast('请在第一步或逐页引用内容中拖入文件。');
    if ([...event.dataTransfer.items].some(item => item.webkitGetAsEntry?.()?.isDirectory)) return toast('拖拽文件夹请改用“选择文件夹”，以保留完整目录。');
    addFiles([...event.dataTransfer.files]);
  });
  document.addEventListener('keydown', event => {
    const target = event.target.closest?.('button[role="radio"], button[role="tab"]');
    if (target && !event.altKey && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      const group = target.closest('[role="radiogroup"], [role="tablist"]');
      const buttons = [...group.querySelectorAll('button')], index = buttons.indexOf(target);
      const next = buttons[(index + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1) + buttons.length) % buttons.length];
      const key = Object.keys(next.dataset)[0], selector = `[data-${key}="${next.dataset[key]}"]`;
      event.preventDefault(); next.click(); $(selector)?.focus(); return;
    }
    if (!event.altKey || !['ArrowLeft', 'ArrowRight'].includes(event.key) || state.step === 'welcome' || $('dialog[open]')) return;
    event.preventDefault(); if (event.key === 'ArrowRight' && state.step !== steps[steps.length - 1]) next();
    else if (event.key === 'ArrowLeft') go(steps[steps.indexOf(state.step) - 1] || 'welcome');
  });
  window.addEventListener('beforeunload', () => { if (hasDraft) Y.saveTextBackup(state, attachments); });
  $('#reference-dialog').addEventListener('cancel', event => { event.preventDefault(); closeReferenceDialog(); });
  async function init() {
    saveStatus('正在恢复草稿…');
    try {
      const saved = await Y.loadDraft();
      exportDirectory = await Y.loadExportDirectory();
      if (saved?.state) {
        state = Y.normalizeDraft(saved.state); attachments = (saved.attachments || []).map(a => ({ ...a, file: a.file || null })); hasDraft = true; state.step = 'welcome';
        saveStatus(attachments.some(a => !a.file) ? '文字已恢复 · 素材需重选' : '已恢复本机草稿', attachments.some(a => !a.file) ? 'warning' : 'saved');
      } else saveStatus('本地工作区');
    } catch { saveStatus('草稿未恢复 · 可导入备份', 'warning'); }
    render();
  }
  init();
})();
