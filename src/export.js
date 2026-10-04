(function (root) {
  'use strict';
  const Y = root.YoursPPT = root.YoursPPT || {};
  if (typeof module !== 'undefined' && module.exports && !Y.createZip) require('./zip.js');
  const doc = root.document;
  const scriptURL = doc && doc.currentScript && doc.currentScript.src;
  const assetBase = scriptURL ? new URL('../assets/skills/', scriptURL).href : 'assets/skills/';
  const loading = new Map();
  const bundles = {
    guizang: { asset: 'guizang.js', folder: 'guizang-ppt-skill', label: 'Guizang' },
    pptMaster: { asset: 'ppt-master.js', folder: 'ppt-master', label: 'PPT Master' }
  };
  const defaults = {
    editorial: { label: 'Guizang Editorial', font: 'Noto Serif SC / Playfair Display；无衬线正文；等宽元数据', layouts: 'Hero、Quote + Image、Image Grid、Pipeline、Before/After', images: '遵循登记的图片比例与固定高度', motion: '遵循页面语义，保留演讲者模式', accent: '#b84835', paper: '#f1efea', ink: '#0a0a0b' },
    swiss: { label: 'Guizang Swiss', font: 'Inter / Helvetica / Noto Sans SC', layouts: '12 列网格；S01–S22；每页记录 data-layout', images: '统一比例；直角', motion: '每页一个语义化动效；提供静态模式', accent: '#002FA7', paper: '#fafaf8', ink: '#0a0a0a' },
    research: { label: 'Research', font: '清晰可读的无衬线正文；公式与数据单位可辨识', layouts: '问题 → 方法 → 证据 → 结论；突出图表、误差与限定条件', images: '证据图保留坐标轴、图例、单位和来源', motion: '以解释研究过程为目的，保持克制', accent: '#2457d6', paper: '#f7f8fb', ink: '#101828' }
  };
  function text(value) { return value == null ? '' : String(value); }
  function absent(value) { return value == null || (typeof value === 'string' && !value.trim()); }
  function slideValue(slide, field) {
    if (field === 'details') return [...new Set([slide.details, slide.summary, slide.key].filter(value => typeof value === 'string' && value.length))].join('\n\n');
    return field === 'content' ? slide.content ?? slide.support : slide[field];
  }
  function safeSegment(value, fallback) {
    let result = text(value).normalize('NFC').replace(/[\x00-\x1f\x7f\\/:*?"<>|]/gu, '-').replace(/[\ud800-\udfff]/gu, '-').trim();
    result = Array.from(result).slice(0, 100).join('').replace(/[. ]+$/gu, '');
    if (!result || result === '.' || result === '..') result = fallback;
    if (/^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/iu.test(result)) result = '_' + result;
    return result;
  }
  function attachmentPath(attachment, index) {
    const original = text(attachment.relativePath || attachment.name || 'attachment-' + (index + 1)).replace(/\\/gu, '/');
    if (original.startsWith('/') || /^[a-z]:/iu.test(original) || original.split('/').some(p => p === '..' || p === '.' || !p)) {
      throw new Error('Unsafe attachment relativePath: ' + original);
    }
    return original.split('/').map(p => safeSegment(p, 'unnamed')).join('/');
  }
  function canonical(path) { return path.normalize('NFC').toLowerCase(); }
  // Reserve metadata filenames and shared directory components before allocating files.
  function allocateAttachmentPaths(attachments) {
    const used = new Map([['manifest.json', 'file']]);
    const directories = new Map();
    return attachments.map((attachment, index) => {
      const parts = attachmentPath(attachment, index).split('/');
      let parent = '';
      for (let i = 0; i < parts.length - 1; i++) {
        const original = canonical(parts.slice(0, i + 1).join('/'));
        if (directories.has(original)) { parent = directories.get(original); continue; }
        let segment = parts[i], candidate = parent + segment, suffix = 2;
        while (used.get(canonical(candidate)) === 'file') candidate = parent + segment + '-' + suffix++;
        used.set(canonical(candidate), 'directory');
        parent = candidate + '/'; directories.set(original, parent);
      }
      const filename = parts[parts.length - 1], dot = filename.lastIndexOf('.');
      const stem = dot > 0 ? filename.slice(0, dot) : filename, extension = dot > 0 ? filename.slice(dot) : '';
      let candidate = parent + filename, suffix = 2;
      while (used.has(canonical(candidate))) candidate = parent + stem + '-' + suffix++ + extension;
      used.set(canonical(candidate), 'file');
      return 'references/' + candidate;
    });
  }
  function link(path) { return path.split('/').map(encodeURIComponent).join('/'); }
  function label(value) { return text(value).replace(/[\r\n]/gu, ' ').replace(/[\\\[\]]/gu, '\\$&'); }
  function fenced(value, language) {
    const body = text(value), runs = body.match(/`+/gu) || [];
    const fence = '`'.repeat(Math.max(3, ...runs.map(run => run.length + 1)));
    return fence + (language || '') + '\n' + body + '\n' + fence;
  }
  function json(value) { return JSON.stringify(value, null, 2); }
  function chooseStyle(state) {
    const id = Object.prototype.hasOwnProperty.call(Y.STYLES || defaults, state.style) ? state.style : 'editorial';
    const configured = Y.STYLES && (Array.isArray(Y.STYLES) ? Y.STYLES.find(s => s.id === id) : Y.STYLES[id]);
    const resolved = typeof Y.getStyle === 'function' ? Y.getStyle({ ...state, style: id }) : null;
    const definition = Object.assign({}, defaults[id] || defaults.research, configured || {}, resolved || {});
    const palettes = definition.palettes;
    const palette = resolved && resolved.palette && typeof resolved.palette === 'object' ? resolved.palette :
      (Array.isArray(palettes) ? palettes.find(p => p.id === state.palette) || palettes[0] :
        palettes && (palettes[state.palette] || Object.values(palettes)[0]));
    definition.colors = Object.assign({}, (resolved && resolved.colors) || palette ||
      { ink: definition.ink, paper: definition.paper, accent: definition.accent });
    for (const color of ['ink', 'paper', 'accent', 'tint', 'inkTint', 'accentOn']) {
      if (definition.colors[color] !== undefined) definition[color] = definition.colors[color];
    }
    definition.label = (resolved && (resolved.label || resolved.name)) || (configured && (configured.label || configured.name)) || (defaults[id] || defaults.research).label;
    if (definition.typography) definition.font = definition.typography;
    return { id, definition, palette: palette || null };
  }
  function decodeBase64(encoded) {
    if (typeof encoded !== 'string') throw new TypeError('Skill entry base64 must be a string');
    if (typeof root.atob === 'function') {
      const binary = root.atob(encoded), bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes;
    }
    if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(encoded, 'base64'));
    throw new Error('No base64 decoder available');
  }
  function loadBundle(key, options) {
    if (Y.SKILL_BUNDLES && Y.SKILL_BUNDLES[key]) return Promise.resolve(Y.SKILL_BUNDLES[key]);
    const base = options.skillAssetBaseURL || assetBase;
    const cacheKey = key + '|' + base;
    if (loading.has(cacheKey)) return loading.get(cacheKey);
    const promise = new Promise((resolve, reject) => {
      if (!doc && typeof require === 'function') {
        try {
          const bundle = require('../assets/skills/' + bundles[key].asset);
          Y.SKILL_BUNDLES = Y.SKILL_BUNDLES || {}; Y.SKILL_BUNDLES[key] = bundle;
          resolve(bundle);
        } catch (error) { reject(error); }
        return;
      }
      if (!doc) { reject(new Error('Cannot load skill assets without a document')); return; }
      const script = doc.createElement('script');
      // A classic script tag works from file://; fetch/import commonly fail there.
      script.src = base.replace(/\/?$/u, '/') + bundles[key].asset;
      script.async = true;
      script.onload = () => {
        const bundle = Y.SKILL_BUNDLES && Y.SKILL_BUNDLES[key];
        script.remove();
        if (bundle) resolve(bundle); else reject(new Error('Skill asset did not register ' + key));
      };
      script.onerror = () => { script.remove(); reject(new Error('Failed to load skill asset: ' + script.src)); };
      (doc.head || doc.documentElement).appendChild(script);
    });
    loading.set(cacheKey, promise);
    promise.catch(() => loading.delete(cacheKey));
    return promise;
  }
  function skillPaths(keys) {
    return keys.map(key => ({ id: key, path: 'style/skills/' + bundles[key].folder, entry: 'style/skills/' + bundles[key].folder + '/SKILL.md' }));
  }
  function makeBrief(state, manifest, selection, gaps) {
    const meta = state.meta || {}, lines = ['# YoursPPT 制作 Brief', '', '## Agent 入口', '',
      '从本文件所在根目录开始，阅读 [风格选择](style/selection.json)、[风格指南](style/guide.md) 与 [素材清单](references/manifest.json)。所有链接均相对于本文件。',
      '逐页读取主题、目的、内容、细节、承接关系与引用内容。每页主题、目的和内容必填，细节和承接关系选填；未填写的选填项不作为制作阻碍。所有文字输入均以 Markdown 原文完整保留；解析其层级、列表、表格和代码，避免遗漏。保留用户逐页目的、结论、顺序与承接；先列出缺口和矛盾，再按输入制作。不得编造数字、事实、引用或因果关系。交付格式：' + selection.delivery + '。'];
    if (selection.skippedSkills) lines.push('', '**此包设置了 skipSkills，未附 skill 文件；制作前必须补齐下列入口。**');
    for (const skill of selection.skills) {
      lines.push('- ' + (selection.skippedSkills ? skill.entry + '（未附）' : '[' + label(skill.id) + ' SKILL.md](' + link(skill.entry) + ')'));
    }
    lines.push('', '先完整阅读选定入口并遵循其中的依赖与执行要求。PPT Master 的 SKILL_DIR 必须指向解压后的 skill 绝对目录，先执行其原始 attribution_guard.py，非零退出须停止。Guizang 的更新检查按其原始入口执行，离线快照无法检查时说明并继续。',
      'skill 内的版权、许可证、来源识别与 guard 原样保留；遵循入口关于来源／赞助说明的展示边界。',
      selection.delivery === 'pptx' ? '交付可编辑 PPTX，使用 PPT Master 制作原生对象；Guizang 指导视觉风格。' : '交付 HTML 幻灯片；按选定视觉风格执行，若 skill 无对应 HTML 路由，说明适配方式。',
      '', '## 基本信息');
    const metaLabels = { title: '主题', date: '日期', presenter: '主讲人', audience: '听众', goal: '目标', duration: '时长（分钟）', constraints: '补充要求与限制' };
    for (const [key, heading] of Object.entries(metaLabels)) lines.push('', '### ' + heading, absent(meta[key]) ? '未提供。' : fenced(meta[key], 'markdown'));
    lines.push('', '## 风格与交付', '', '- 风格：' + selection.style, '- 调色板 ID：' + (absent(selection.palette) ? '未提供' : text(selection.palette)), '- 交付：' + selection.delivery,
      '', '实际选定配色：', fenced(json(selection.colors), 'json'),
      '', '## 素材与包内路径');
    if (!manifest.length) lines.push('', '未提供素材。');
    for (const item of manifest) lines.push('', '- [' + label(item.name || item.id) + '](' + link(item.path) + ') — ID: ' + label(item.id) + '；' + item.size + ' bytes；' + label(item.type || 'unknown'));
    const sources = new Map(manifest.map(item => [text(item.id), item]));
    const slideLabels = { title: '主题', purpose: '目的', content: '内容', details: '细节（选填）', transition: '承接关系（选填）', visual: '视觉需求', notes: '讲稿备注', sourceNotes: '引用说明' };
    (state.slides || []).forEach((slide, index) => {
      lines.push('', '## 第 ' + (index + 1) + ' 页', '', '页面 ID：', fenced(slide.id));
      for (const [key, heading] of Object.entries(slideLabels)) {
        const value = slideValue(slide, key);
        lines.push('', '### ' + heading, absent(value) ? '未提供。' : fenced(value, 'markdown'));
      }
      lines.push('', '### 引用内容 / 本页素材');
      if (!slide.sourceIds || !slide.sourceIds.length) lines.push('未选择素材。');
      for (const id of slide.sourceIds || []) {
        const item = sources.get(text(id));
        lines.push(item ? '- [' + label(item.name || id) + '](' + link(item.path) + ') — ID: ' + label(id) : '- 未找到素材 ID：' + label(id));
      }
    });
    lines.push('', '## 输入缺口与待确认', '', ...(gaps.length ? gaps.map(gap => '- ' + gap) : ['当前必需字段与素材映射未发现缺口；仍需核验输入证据和论证。']),
      '', '## 完整输入记录', '', '以下保留全部 state 字段和附件元数据。附件二进制见包内 references；原始名称／relativePath 仅用于追溯，实际访问使用 manifest 的 path。',
      '', fenced(json({ state, attachments: manifest }), 'json'), '');
    return lines.join('\n');
  }
  function preparePackage(state, attachments, options) {
    if (!Array.isArray(attachments) || (state.slides != null && !Array.isArray(state.slides))) throw new TypeError('attachments and slides must be arrays');
    const style = chooseStyle(state), delivery = state.delivery === 'pptx' ? 'pptx' : 'html';
    const keys = style.definition.family === 'pptMaster' || style.id === 'research' ? ['pptMaster'] : ['guizang'];
    if (delivery === 'pptx' && !keys.includes('pptMaster')) keys.push('pptMaster');
    const rootName = safeSegment(state.meta && state.meta.title, 'yours-ppt');
    const selection = { style: style.id, requestedStyle: state.style == null ? null : state.style, palette: state.palette == null ? null : state.palette,
      resolvedPalette: style.palette, colors: style.definition.colors,
      delivery, requestedDelivery: state.delivery == null ? null : state.delivery, definition: style.definition,
      skills: skillPaths(keys), skippedSkills: !!options.skipSkills };
    const gaps = [], meta = state.meta || {}, slides = state.slides || [];
    for (const field of ['title', 'date', 'presenter', 'audience', 'goal', 'duration']) if (absent(meta[field])) gaps.push('基本信息未提供：' + field);
    if (style.id !== state.style) gaps.push('未知或未提供风格，使用 editorial：' + text(state.style));
    if (state.delivery !== delivery) gaps.push('未知或未提供交付格式，使用 html：' + text(state.delivery));
    if (absent(state.palette)) gaps.push('未提供调色板 ID；执行前确认默认配色。');
    else if (style.palette && style.palette.id !== state.palette) gaps.push('调色板 ID 未匹配，使用：' + style.palette.id);
    if (!slides.length) gaps.push('未提供幻灯片。');
    if (!attachments.length) gaps.push('未提供参考素材；涉及事实／数据的页面需要补充证据。');
    if (options.skipSkills) gaps.push('skipSkills=true：完整 skill 树未附。');
    const paths = allocateAttachmentPaths(attachments), ids = new Set();
    const manifest = attachments.map((attachment, index) => {
      const id = absent(attachment.id) ? 'attachment-' + (index + 1) : attachment.id;
      if (ids.has(text(id))) throw new Error('Duplicate attachment ID: ' + id);
      ids.add(text(id));
      const { file, ...input } = attachment;
      const size = file && Number.isSafeInteger(file.size) ? file.size : (attachment.size || 0);
      if (absent(attachment.id)) gaps.push('附件未提供 ID，分配：' + id);
      if (attachment.size != null && attachment.size !== size) gaps.push('附件声明大小与真实字节数不符：' + label(id));
      if (!file || typeof file.arrayBuffer !== 'function') gaps.push('附件缺少真实文件：' + label(id));
      return { ...input, id, name: attachment.name || 'attachment-' + (index + 1), relativePath: attachment.relativePath || attachment.name || '',
        type: attachment.type || (file && file.type) || '', declaredSize: attachment.size == null ? null : attachment.size, size, path: paths[index] };
    });
    slides.forEach((slide, index) => {
      if (!slide || typeof slide !== 'object') throw new TypeError('Slide must be an object');
      if (slide.sourceIds != null && !Array.isArray(slide.sourceIds)) throw new TypeError('sourceIds must be an array');
      for (const field of ['title', 'purpose', 'content']) {
        const value = slideValue(slide, field);
        if (absent(value)) gaps.push('第 ' + (index + 1) + ' 页未提供：' + field);
      }
      if (!slide.sourceIds || !slide.sourceIds.length) gaps.push('第 ' + (index + 1) + ' 页未选择素材。');
      for (const id of slide.sourceIds || []) if (!ids.has(text(id))) gaps.push('第 ' + (index + 1) + ' 页素材 ID 无匹配：' + label(id));
    });
    return { style, delivery, keys, rootName, selection, gaps, manifest };
  }
  /** Synchronous Markdown preview. Optional options.skipSkills matches test-only exports. */
  Y.buildBrief = function (state, attachments, options) {
    state = state || {}; attachments = attachments || []; options = options || {};
    const prepared = preparePackage(state, attachments, options);
    return makeBrief(state, prepared.manifest, prepared.selection, prepared.gaps);
  };
  /**
   * @param {object} state {meta,slides,style,palette,delivery}
   * @param {Array} attachments [{id,name,relativePath,type,size,file:Blob}]
   * @param {object} options {skipSkills?, onProgress?, skillAssetBaseURL?}
   * onProgress receives {phase,completed,total,percent,message,detail?}; percent is monotonic.
   * @returns {Promise<{blob:Blob,filename:string,entries:Array}>}
   */
  Y.buildPackage = async function (state, attachments, options) {
    state = state || {}; attachments = attachments || []; options = options || {};
    if (typeof Y.createZip !== 'function') throw new Error('Load src/zip.js before exporting');
    let lastPercent = 0;
    function progress(phase, completed, total, percent, message, detail) {
      lastPercent = Math.max(lastPercent, percent);
      if (typeof options.onProgress === 'function') options.onProgress({ phase, completed, total, percent: lastPercent, message, detail });
    }
    progress('prepare', 0, 1, 0, '准备导出内容');
    const { style, delivery, keys, rootName, selection, gaps, manifest } = preparePackage(state, attachments, options);
    const entries = [];
    function add(name, data) { entries.push({ name: rootName + '/' + name, data }); }
    add('', new Uint8Array()); add('references/', new Uint8Array()); add('style/', new Uint8Array());
    for (let i = 0; i < attachments.length; i++) {
      const attachment = attachments[i];
      if (!attachment.file || typeof attachment.file.arrayBuffer !== 'function') {
        if (options.allowIncomplete) continue;
        throw new TypeError('Attachment must contain a Blob file: ' + attachment.name);
      }
      const raw = new Uint8Array(await attachment.file.arrayBuffer());
      const item = manifest[i];
      if (raw.length !== item.size) throw new Error('Attachment Blob size mismatch: ' + item.id);
      add(item.path, raw);
      progress('attachments', i + 1, attachments.length, 5 + 20 * (i + 1) / attachments.length, '读取素材 ' + (i + 1) + '/' + attachments.length, { id: item.id, path: item.path });
    }
    if (!options.skipSkills) {
      add('style/skills/', new Uint8Array());
      for (let k = 0; k < keys.length; k++) {
        const key = keys[k], prefix = rootName + '/style/skills/' + bundles[key].folder + '/';
        progress('skills-load', k, keys.length, 25 + 60 * k / keys.length, '加载完整 ' + bundles[key].label + ' skill', { bundle: key });
        const bundle = await loadBundle(key, options);
        if (!bundle || !Array.isArray(bundle.entries) || !bundle.entries.some(e => e.name === 'SKILL.md') || !bundle.entries.some(e => e.name === 'LICENSE')) {
          throw new Error('Incomplete skill bundle: ' + key);
        }
        add('style/skills/' + bundles[key].folder + '/', new Uint8Array());
        for (let i = 0; i < bundle.entries.length; i++) {
          const entry = bundle.entries[i];
          entries.push({ name: prefix + entry.name, compressedData: decodeBase64(entry.base64), uncompressedSize: entry.size, crc: entry.crc, method: entry.method });
          if ((i + 1) % 200 === 0 || i === bundle.entries.length - 1) {
            progress('skills', i + 1, bundle.entries.length, 25 + 60 * (k + (i + 1) / bundle.entries.length) / keys.length,
              '打包 ' + bundles[key].label + ' ' + (i + 1) + '/' + bundle.entries.length, { bundle: key, path: entry.name });
            // Keep rendering responsive while decoding large offline bundles.
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }
      }
    }
    add('references/manifest.json', json(manifest) + '\n');
    add('draft.json', json({ version: 3, state, attachments: manifest.map((a, i) => ({ ...a, missing: !attachments[i].file })) }) + '\n');
    add('style/selection.json', json(selection) + '\n');
    const guide = ['# ' + text(style.definition.label), '', '风格：' + selection.style + '；调色板 ID：' + text(selection.palette) + '；交付：' + delivery + '。',
      '使用用户选定的视觉系统，保持页面叙事；素材与图表必须可追溯。不得因视觉风格重排用户论证或套用新的叙事模板。',
      ...(style.definition.resourcePath ? ['', '## 选定视觉参考', '', options.skipSkills ? style.definition.resourcePath + '（skipSkills：未附）' : '[' + label(style.definition.visualReference) + '](' + link(style.definition.resourcePath.replace(/^style\//u, '')) + ')', '此参考只约束画面。具体色值、字体方向和版式要求以 selection.json 中的定义为准。'] : []), '', '## 风格定义', '', fenced(json(style.definition), 'json'), '', '## 完整 Skill 入口', '',
      ...selection.skills.map(skill => options.skipSkills ? '- ' + skill.entry.replace(/^style\//u, '') + '（skipSkills：未附）' : '- [' + label(skill.id) + '](skills/' + bundles[skill.id].folder + '/SKILL.md)'),
      '', '入口及子树中许可证、版权、来源声明与 attribution guard 均保持上游原样。先阅读入口，再按其中规则执行。', ''];
    add('style/guide.md', guide.join('\n'));
    add('brief.md', makeBrief(state, manifest, selection, gaps));
    progress('zip', 0, entries.length, 90, '写入 ZIP 中央目录');
    const blob = await Y.createZip(entries);
    progress('done', entries.length, entries.length, 100, '导出完成', { filename: rootName + '.zip', bytes: blob.size });
    return { blob, filename: rootName + '.zip', entries };
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Y;
}(typeof window !== 'undefined' ? window : globalThis));
