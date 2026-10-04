(function (root) {
  'use strict';
  const Y = root.YoursPPT = root.YoursPPT || {};
  const uid = () => root.crypto?.randomUUID?.() || `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const text = value => typeof value === 'string' ? value : '';
  const FIELDS = ['title', 'purpose', 'content', 'details', 'transition', 'visual', 'notes', 'sourceNotes'];
  function createSlide(input = {}) {
    // Keep distinct legacy notes when old and new fields coexist, then persist only the canonical field.
    const details = [...new Set([input.details, input.summary, input.key].filter(value => typeof value === 'string' && value.length))].join('\n\n');
    const migrated = { ...input, details, content: input.content ?? input.support };
    return { id: uid(), ...Object.fromEntries(FIELDS.map(k => [k, text(migrated[k])])), sourceIds: Array.isArray(input.sourceIds) ? input.sourceIds.filter(id => typeof id === 'string') : [] };
  }
  function freshDraft() {
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return { version: 2, meta: { title: '', date, presenter: '', audience: '', goal: '', duration: '', constraints: '' },
      slides: [createSlide()], style: 'swiss', palette: 'ikb', delivery: 'pptx', activeSlide: 0, step: 'welcome', resumeStep: 'context' };
  }
  function normalizeDraft(input) {
    if (!input || input.version !== 2 || !input.meta || !Array.isArray(input.slides) || !input.slides.length || input.slides.length > 200) {
      throw new Error('这份草稿的格式不正确，请选择 YoursPPT 导出的草稿文件。');
    }
    const state = freshDraft();
    Object.keys(state.meta).forEach(k => state.meta[k] = text(input.meta[k]).slice(0, 100000));
    const ids = new Set();
    state.slides = input.slides.map(x => {
      if (!x || typeof x !== 'object') throw new Error('草稿中的页面内容不完整。');
      const s = createSlide(x);
      if (typeof x.id === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(x.id) && !ids.has(x.id)) s.id = x.id;
      ids.add(s.id);
      FIELDS.forEach(k => s[k] = s[k].slice(0, 100000));
      s.sourceIds = Array.isArray(x.sourceIds) ? x.sourceIds.filter(v => typeof v === 'string') : [];
      return s;
    });
    state.style = Object.hasOwn(Y.STYLES || { editorial: 1, swiss: 1, research: 1 }, input.style) ? input.style : 'swiss';
    state.palette = text(input.palette) || 'ikb';
    state.delivery = input.delivery === 'html' ? 'html' : 'pptx';
    state.activeSlide = Math.max(0, Math.min(state.slides.length - 1, Math.floor(Number(input.activeSlide) || 0)));
    const step = input.step === 'materials' ? 'context' : input.step;
    const resumeStep = input.resumeStep === 'materials' ? 'context' : input.resumeStep;
    state.step = ['welcome', 'context', 'outline', 'style', 'review', 'generate'].includes(step) ? step : 'welcome';
    state.resumeStep = ['context', 'outline', 'style', 'review', 'generate'].includes(resumeStep) ? resumeStep : state.step === 'welcome' ? 'context' : state.step;
    return state;
  }
  function issues(state, attachments = []) {
    const errors = [], suggestions = [];
    [['title', '汇报主题'], ['presenter', '汇报人'], ['audience', '听众']].forEach(([key, label]) => {
      if (!state.meta[key].trim()) errors.push({ step: 'context', field: key, message: `请填写${label}` });
    });
    const date = new Date(`${state.meta.date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(state.meta.date) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== state.meta.date) {
      errors.push({ step: 'context', field: 'date', message: '请选择有效的汇报日期' });
    }
    const materialIds = new Set(attachments.filter(a => a.file).map(a => a.id));
    if (state.meta.duration.trim() && (!/^\d+(\.\d+)?$/.test(state.meta.duration.trim()) || !Number.isFinite(Number(state.meta.duration)) || Number(state.meta.duration) <= 0)) errors.push({ step: 'context', field: 'duration', message: '预计时长请填写大于 0 的分钟数' });
    const knownIds = new Set(attachments.map(a => a.id));
    state.slides.forEach((s, i) => {
      [['title', '主题'], ['purpose', '目的'], ['content', '内容']].forEach(([field, label]) => {
        if (!s[field].trim()) errors.push({ step: 'outline', slide: i, field, message: `第 ${i + 1} 页缺少${label}` });
      });
      if (i && !s.transition.trim()) suggestions.push({ step: 'outline', slide: i, field: 'transition', message: `第 ${i + 1} 页尚未说明如何承接上一页` });
      if (s.sourceIds.some(id => !knownIds.has(id))) errors.push({ step: 'outline', slide: i, message: `第 ${i + 1} 页有无法识别的素材关联，请在来源中移除或重新关联` });
      if (s.sourceIds.some(id => knownIds.has(id) && !materialIds.has(id))) errors.push({ step: 'context', slide: i, message: `第 ${i + 1} 页关联的资料需要重新选择` });
    });
    attachments.filter(a => !a.file).forEach(a => errors.push({ step: 'context', message: `请重新选择资料「${a.name}」` }));
    return { errors, suggestions };
  }
  function safePath(path) {
    return String(path || 'file').split(/[\\/]/).filter(p => p && p !== '.' && p !== '..')
      .map(p => p.replace(/[<>:"|?*\x00-\x1f]/g, '-').replace(/[. ]+$/g, '').replace(/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i, '_$1$2') || 'file').join('/');
  }
  function attachmentPaths(attachments) {
    const used = new Set(['manifest.json', 'readme.md']);
    return attachments.map(a => {
      const clean = safePath(a.relativePath || a.name);
      let path = clean, number = 2;
      const dot = clean.lastIndexOf('.'), slash = clean.lastIndexOf('/');
      const base = dot > slash ? clean.slice(0, dot) : clean, ext = dot > slash ? clean.slice(dot) : '';
      while (used.has(path.toLowerCase())) path = `${base}-${number++}${ext}`;
      used.add(path.toLowerCase());
      return { ...a, exportPath: `references/${path}` };
    });
  }
  function exampleDraft() {
    const s = freshDraft();
    s.meta = { ...s.meta, title: '让每一次汇报，都有清晰的逻辑', presenter: 'YoursPPT 示例', audience: '希望优化汇报流程的团队', goal: '让听众理解如何把人的思考交给 Agent 执行。', duration: '10', constraints: '这是演示草稿，内容为流程示例，不包含真实业务数据。' };
    s.slides = [
      createSlide({ title: '好看的页面，需要清晰的思考', purpose: '说明为什么要先确定逻辑', content: '汇报者先想清楚要表达什么，再进入视觉制作。\n\n- 明确听众与目标\n- 每页只承担一个主要任务', details: '结合自己的汇报经历解释问题。', visual: '一句核心判断，留出足够空白' }),
      createSlide({ title: '先写下结论，再找到支撑', purpose: '解释逐页准备方法', content: '每个结论都需要对应的事实、证据或明确的推理。\n\n1. 写明本页主题与目的\n2. 整理内容与支持证据\n3. 按需补充细节和承接关系', details: '在来源不完整时标明 **待确认**。', transition: '既然思考先于制作，接下来就把思考落实到每一页。', visual: '三步流程示意，避免虚构数字' }),
      createSlide({ title: '一个工作包，完成交接', purpose: '让听众知道下一步如何行动', content: '将内容、素材与风格打包，让 Agent 有完整的执行上下文。\n\n- 完整 brief\n- 真实参考文件\n- 选定风格与制作工具', transition: '逐页逻辑确定后，统一整理制作所需的资料。', visual: '三个并列模块', notes: '邀请听众用自己的主题试一次。' })
    ];
    s.step = 'context';
    return s;
  }
  Object.assign(Y, { uid, createSlide, freshDraft, normalizeDraft, issues, safePath, attachmentPaths, exampleDraft });
})(globalThis);
