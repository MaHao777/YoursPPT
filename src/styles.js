(function (root) {
  'use strict';
  const Y = root.YoursPPT;
  const STYLES = {
    editorial: { id: 'editorial', name: '电子杂志', tag: '叙事 / 观点 / 分享', description: '衬线标题、温暖纸色与克制留白，让一个观点有自己的节奏。', family: 'guizang', source: 'https://github.com/op7418/guizang-ppt-skill', license: 'AGPL-3.0', typography: 'Noto Serif SC / Playfair Display 标题，非衬线正文，等宽元数据；离线使用系统衬线字体兜底。', layouts: ['封面', '章节幕封', '数据大字报', '左文右图', '图片网格', '两列 Pipeline', '问题收束', '大引用', '并列对比', '图文混排'], rules: ['一份 deck 使用一套主题，不混搭纸色与墨色。', '通过字号、字体与留白建立层级，避免装饰性卡片和阴影。', 'Hero 与正文、light 与 dark 交替；连续同主题不超过三页。', '图片使用标准比例并贴顶；网格图片固定高度，保留关键证据。', '保持稳定页面 ID，讲稿补充上下文与过渡，不重复屏幕文字。'], palettes: [
      { id: 'ink', name: '墨水经典', ink: '#0a0a0b', paper: '#f1efea', tint: '#e8e5de', inkTint: '#18181a' },
      { id: 'indigo', name: '靛蓝瓷', ink: '#0a1f3d', paper: '#f1f3f5', tint: '#e4e8ec', inkTint: '#152a4a' },
      { id: 'forest', name: '森林墨', ink: '#1a2e1f', paper: '#f5f1e8', tint: '#ece7da', inkTint: '#253d2c' },
      { id: 'kraft', name: '牛皮纸', ink: '#2a1e13', paper: '#eedfc7', tint: '#e0d0b6', inkTint: '#3a2a1d' },
      { id: 'dune', name: '沙丘', ink: '#1f1a14', paper: '#f0e6d2', tint: '#e3d7bf', inkTint: '#2d2620' }
    ] },
    swiss: { id: 'swiss', name: '瑞士网格', tag: '技术 / 产品 / 分析', description: '单一锚点色、明确的字体对比与精准网格，让信息一眼可读。', family: 'guizang', source: 'https://github.com/op7418/guizang-ppt-skill', license: 'AGPL-3.0', typography: 'Inter / Helvetica / Noto Sans SC；Windows 以 Microsoft YaHei UI 兜底；大字 200–300，正文 400–500，meta 500–600。', layouts: Array.from({ length: 22 }, (_, i) => `S${String(i + 1).padStart(2, '0')}`), rules: ['使用 12 列网格、左上标题轴和发丝线；正文版式记录 S01–S22 的 data-layout。', '整份 deck 使用一个 accent；不使用渐变、阴影或圆角。', '主标题以大字号轻字重形成对比；正文 ≥18px，caption ≥16px，meta ≥14px。', '单张主图使用 S22 的 21:9 槽位；多图使用 S15/S16 且统一比例与高度。', '每页一个语义化动效，保留 B 低功耗模式、稳定 slide ID 和演讲者备注。', '7–8 页至少六种布局；10 页以上至少八种布局。内容不得进入导航安全区域。'], palettes: [
      { id: 'ikb', name: '克莱因蓝', ink: '#0a0a0a', paper: '#fafaf8', tint: '#f0f0ee', accent: '#002FA7', accentOn: '#ffffff' },
      { id: 'lemon', name: '柠檬黄', ink: '#0a0a0a', paper: '#fafaf8', tint: '#f0f0ee', accent: '#FFD500', accentOn: '#0a0a0a' },
      { id: 'lime', name: '柠檬绿', ink: '#0a0a0a', paper: '#fafaf8', tint: '#f0f0ee', accent: '#C5E803', accentOn: '#0a0a0a' },
      { id: 'orange', name: '安全橙', ink: '#0a0a0a', paper: '#fafaf8', tint: '#f0f0ee', accent: '#FF6B35', accentOn: '#ffffff' }
    ] },
    research: { id: 'research', name: '学术简报', tag: '研究 / 答辩 / 专业报告', description: '结论与证据相邻，图表与局限清楚可见，适合需要严谨表达的报告。', family: 'pptMaster', source: 'https://github.com/hugohe3/ppt-master', license: 'MIT', upstreamStyle: 'academic-research', typography: '使用清晰的无衬线字体、稳定的字号层级，并确保数学符号、单位和图表标签可读。', layouts: ['研究问题', '方法与流程', '实验结果', '对比与消融', '局限与结论'], rules: ['按用户确定的逻辑组织问题、方法、结果与解释；区分观察、推断与假设。', '一页一个可检验的结论，图表与所支持的结论相邻。', '估计值保留不确定性、单位、样本与来源；不虚构数据。', '优先原生可编辑文本、形状、图表、表格；分析产出的证据图保留原始保真度。', '采用克制无衬线、扁平排版与稳定色彩映射；装饰需有信息作用。', '对资料、SVG 质量、图表数据、备注和最终 PPTX 分别验收。'], palettes: [
      { id: 'slate', name: '石墨蓝', ink: '#17243a', paper: '#fafbfc', tint: '#eef1f5', accent: '#345c8d', accentOn: '#ffffff' },
      { id: 'teal', name: '深青', ink: '#173331', paper: '#f8faf9', tint: '#eaf0ed', accent: '#26736a', accentOn: '#ffffff' },
      { id: 'red-white', name: '学术红白', ink: '#302126', paper: '#ffffff', tint: '#f8ecee', accent: '#a51c30', accentOn: '#ffffff' },
      { id: 'blue-white', name: '学术蓝白', ink: '#172b46', paper: '#ffffff', tint: '#edf3fa', accent: '#1859a3', accentOn: '#ffffff' },
      { id: 'purple-white', name: '雅致紫白', ink: '#30263d', paper: '#ffffff', tint: '#f2eef7', accent: '#72508d', accentOn: '#ffffff' }
    ], note: '颜色是 YoursPPT 提供的应用预设；方法与视觉规范来自 PPT Master academic-research。' }
  };
  const visualStyles = [
    { id: 'minimal', name: '极简黑白', tag: '大留白 / 单色 / 字体秩序', visualReference: 'swiss-minimal', description: '只用黑白与清晰字阶。宽阔留白、纤细分隔线和偏轴构图，让文字成为主角。', typography: 'Helvetica / Arial / Microsoft YaHei UI；标题轻字重、正文常规字重，使用字号与空白建立对比。', layouts: ['偏轴大标题', '留白单句', '细线双栏', '巨大数字', '单幅图片'], rules: ['仅使用选定的黑白配色；线条、图表与正文共享同一色彩体系。', '保持宽阔边距、严格对齐和单一字体家族。', '不使用渐变、阴影、圆角卡片或装饰纹理。'], palettes: [
      { id: 'white', name: '纯白', ink: '#181818', paper: '#ffffff', tint: '#f1f1f1', accent: '#181818', accentOn: '#ffffff' },
      { id: 'charcoal', name: '反白', ink: '#f5f5f5', paper: '#202020', tint: '#303030', accent: '#ffffff', accentOn: '#202020' }
    ] },
    { id: 'dark-tech', name: '暗色科技', tag: '深色 / 荧光 / 精密网格', visualReference: 'dark-tech', description: '深色画布、局部荧光强调与等宽标签。细网格和几何线条带出精密感。', typography: 'Inter / Microsoft YaHei UI 正文，Consolas 等宽标签和数字；宽字距小标题。', layouts: ['暗场大标题', '发光核心数字', '节点连线', '细框双栏', '暗色证据图'], rules: ['深色负空间为主体，荧光仅用于重要数字与节点。', '使用细线网格、精确几何和等宽元信息，发光范围保持克制。', '图表轴线与标签须与深色背景保持可读对比。'], palettes: [
      { id: 'cyan', name: '冰青', ink: '#e5f2ff', paper: '#0b1424', tint: '#17283e', accent: '#63e8f5', accentOn: '#0b1424' },
      { id: 'violet', name: '电紫', ink: '#efe9ff', paper: '#171126', tint: '#2b2042', accent: '#c2a1ff', accentOn: '#171126' }
    ] },
    { id: 'soft-rounded', name: '柔和粉彩', tag: '浅色 / 圆角 / 轻盈层次', visualReference: 'soft-rounded', description: '柔和浅色、圆润容器和舒适间距。标题轻快，内容以低对比色块自然分组。', typography: '圆润几何无衬线标题，Microsoft YaHei UI / Arial 正文；中等字重和宽松行距。', layouts: ['圆形色域封面', '圆角双栏', '柔色步骤链', '悬浮主面板', '圆润数字'], rules: ['采用一致的圆角体系与舒适卡片内边距。', '同色系浅色块承载内容，关键数字使用清晰强调色。', '层次轻浅，避免浓重投影；同级卡片保持平面。'], palettes: [
      { id: 'lavender', name: '薰衣草', ink: '#33294e', paper: '#f6f2ff', tint: '#e9dffb', accent: '#7355ac', accentOn: '#ffffff' },
      { id: 'mint', name: '薄荷', ink: '#20493e', paper: '#f0faf6', tint: '#dcefe6', accent: '#367d65', accentOn: '#ffffff' }
    ] },
    { id: 'memphis', name: '大字撞色', tag: '粗字 / 色块 / 波普几何', visualReference: 'memphis', description: '海报级粗标题、大胆撞色和描边几何。用不对称色块制造鲜明的视觉节奏。', typography: 'Arial Black / Microsoft YaHei UI 粗标题；中性无衬线正文。标题与正文保持显著字号对比。', layouts: ['撞色海报', '描边焦点框', '偏轴几何', '大字数字', '双色分区'], rules: ['一个主标题主导画面，装饰几何留在内容外围。', '浅色底与深色描边稳定结构，使用一主一辅的撞色组合。', '采用平面色块与硬边框，避免柔光和复杂渐变。'], palettes: [
      { id: 'pop', name: '黄蓝波普', ink: '#171717', paper: '#fff8e5', tint: '#ffdf63', accent: '#294bd6', accentOn: '#ffffff', secondary: '#ff7d9f' },
      { id: 'coral', name: '珊瑚青', ink: '#202021', paper: '#fff3ed', tint: '#ff977a', accent: '#176c75', accentOn: '#ffffff', secondary: '#eedc64' }
    ] },
    { id: 'elegant', name: '典雅金黑', tag: '衬线 / 金属色 / 克制对称', visualReference: 'editorial', description: '深色或暖白底、金色细线与衬线标题。宽字距、对称轴与精致留白形成典雅气质。', typography: 'Georgia / Noto Serif SC / SimSun 衬线标题，清晰无衬线正文；元信息使用宽字距。', layouts: ['居中衬线封面', '金线双栏', '大引文', '留白图文', '对称章节页'], rules: ['以居中标题、细线边界和稳定对称轴建立秩序。', '金属色仅作为平面色值，保持高对比文字与充足留白。', '不叠加闪光、浮雕或复杂纹理；内容图保留真实色彩。'], palettes: [
      { id: 'gold', name: '曜黑金', ink: '#f4eddf', paper: '#1c1b19', tint: '#302d27', accent: '#d6b879', accentOn: '#1c1b19' },
      { id: 'ivory', name: '象牙金', ink: '#382e20', paper: '#fcf8ee', tint: '#eee4cf', accent: '#826322', accentOn: '#ffffff' }
    ], note: 'YoursPPT 自定义视觉方案，参考 Editorial 的字体与留白原则；配色与对称规则以本方案为准。' },
    { id: 'vintage', name: '复古纸感', tag: '暖纸 / 印刷色 / 海报构图', visualReference: 'vintage-poster', description: '暖纸底、有限印刷色与巨大圆弧。平面叠色和微弱网点形成复古海报的温度。', typography: 'Georgia / SimSun 复古衬线标题，清晰无衬线正文；粗标题与印刷式元信息。', layouts: ['太阳圆弧封面', '横向地平线', '复古色块', '印刷引文', '半调图文'], rules: ['限定少量平面印刷色，用暖纸背景与几何叠色建立层次。', '纸纹和网点维持低对比，正文区域保持清晰。', '不使用渐变和柔阴影；真实证据图不做损害信息的滤镜。'], palettes: [
      { id: 'terracotta', name: '赤陶纸', ink: '#493426', paper: '#f0e1be', tint: '#e2cfa5', accent: '#a63e27', accentOn: '#ffffff' },
      { id: 'olive', name: '橄榄纸', ink: '#333b2b', paper: '#efe7cb', tint: '#dad3af', accent: '#596744', accentOn: '#ffffff' }
    ] }
  ];
  for (const visual of visualStyles) STYLES[visual.id] = {
    family: 'pptMaster', license: 'MIT', ...visual,
    source: `https://github.com/hugohe3/ppt-master/blob/main/skills/ppt-master/references/visual-styles/${visual.visualReference}.md`,
    resourcePath: `style/skills/ppt-master/references/visual-styles/${visual.visualReference}.md`,
    note: visual.note || '视觉原则参考 PPT Master；具体配色为 YoursPPT 应用预设。原始视觉参考随工作包导出。',
    rules: [...visual.rules, '保持用户的页面目的、内容与承接顺序；视觉方案不改变论证结构。']
  };
  function getStyle(state) {
    const style = STYLES[state.style] || STYLES.swiss;
    const palette = style.palettes.find(p => p.id === state.palette) || style.palettes[0];
    return { ...style, palette, colors: palette, delivery: state.delivery };
  }
  Object.assign(Y, { STYLES, getStyle });
})(globalThis);
