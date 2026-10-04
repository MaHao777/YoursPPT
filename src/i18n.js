(function (root) {
  'use strict';
  const Y = root.YoursPPT;
  // UI copy only. Editable text, preview content, file names and Agent output
  // are deliberately excluded from DOM localization.
  const en = {
    'YoursPPT · 让思考，成为一场好汇报': 'YoursPPT · Turn ideas into a great presentation',
    '跳到主要内容': 'Skip to main content', 'YoursPPT 首页': 'YoursPPT home',
    '让思考，成为一场好汇报': 'Turn ideas into a great presentation',
    '使用介绍': 'Quick guide', '设置': 'Settings', '关闭设置': 'Close settings',
    '外观与语言': 'Appearance & language', '文件与草稿': 'Files & drafts', '设置分类': 'Settings categories',
    '颜色主题': 'Color theme', '选择适合你的工作区外观。': 'Choose the look of your workspace.',
    '浅色主题': 'Light', '暗色主题': 'Dark', '界面语言': 'Interface language',
    '切换界面语言，汇报原文与素材保持原样。': 'Change the interface language. Your content and files stay as they are.',
    '偏好自动保存在当前浏览器，下次打开继续使用。': 'Preferences are saved in this browser for your next visit.',
    '当前浏览器无法保存偏好，本次设置仍已生效。': 'This browser cannot save preferences. Your changes apply for this visit.',
    '中文（简体）': '中文（简体）',
    '导出位置': 'Export location', '草稿备份、工作包和 Agent 产物保存到此位置。相同名称会自动编号。': 'Draft backups, work packages and Agent results are saved here. Duplicate names are numbered automatically.',
    '浏览器默认下载位置': 'Browser download folder', '选择文件夹': 'Choose folder', '使用浏览器下载': 'Use browser downloads',
    '浏览器重开后可能需要重新授权所选文件夹。': 'You may need to grant folder access again after reopening your browser.',
    '当前浏览器无法指定文件夹，导出时使用浏览器下载位置。Chrome / Edge 的本机工作区支持选择文件夹。': 'This browser uses its download folder. Open the local workspace in Chrome or Edge to choose a folder.',
    '当前草稿': 'Current draft', '保存草稿 ↓': 'Save draft ↓', '读取草稿文件 ↗': 'Import draft ↗', '继续本机草稿 →': 'Continue local draft →',
    '未完成的内容也能保存。草稿 ZIP 包含所有文字、页面、配色与已导入的真实素材；也可读取工作包 ZIP 和旧版 JSON。': 'Unfinished work can be saved too. Draft ZIPs include text, slides, palettes and original files. Work-package ZIPs and older JSON drafts can also be imported.',
    '编辑内容自动保存在当前浏览器。草稿文件用于跨设备恢复和长期备份；旧版 JSON 中的素材需重新选择。': 'Edits are saved automatically in this browser. Draft files support backup and transfer across devices. Older JSON drafts require you to reselect their files.',
    '完成': 'Done', '本机 Agent': 'Local Agent', '打开 Agent 页面 →': 'Open Agent page →',
    '支持 Codex CLI 与 Claude Code。先在终端完成安装和登录，然后在“Agent 生成”页面选择并刷新。': 'Supports Codex CLI and Claude Code. Install and sign in from your terminal, then select or refresh them on the Agent generation page.',
    '使用 Agent 自身的账号、模型与网络配置。制作状态和日志可在最后一步查看。': 'Uses the Agent’s own account, model and network settings. View progress and logs in the final step.',
    '本地工作区': 'Local workspace', '正在保存…': 'Saving…', '已保存在本机': 'Saved locally',
    '文字已保存 · 请备份素材': 'Text saved · Back up your files', '保存受限 · 请备份': 'Storage limited · Please back up', '保存失败 · 请备份': 'Save failed · Please back up',
    '浏览器限制了本地保存。请导出工作包保留素材，并备份草稿。': 'Local storage is restricted. Export a work package to preserve files and back up your draft.',
    '正在恢复草稿…': 'Restoring draft…', '文字已恢复 · 素材需重选': 'Text restored · Reselect files', '已恢复本机草稿': 'Local draft restored', '草稿未恢复 · 可导入备份': 'Draft not restored · Import a backup',
    '好汇报，': 'Great presentations', '从想清楚开始': 'start with clear thinking',
    '你的思考，值得被好好呈现。': 'Your ideas deserve a thoughtful presentation.', '梳理逐页逻辑，选好素材与风格，': 'Organize your slides, evidence and visual style.', '准备好内容，让本机 Agent 接手制作。': 'Prepare the content, then let your local Agent build it.',
    '新内容': 'New presentation', '读取草稿': 'Open draft', '了解工作流': 'Explore the workflow', '本地准备内容 · 按需调用 Agent': 'Prepare locally · Run your Agent when ready',
    '汇报视觉示意': 'Presentation illustration', '让思考': 'Give ideas', '有形。': 'shape.', '让思考有形。': 'Give ideas shape.', '从逻辑到表达 ↗': 'From logic to expression ↗',
    '先讲清楚': 'Clarify your story', '明确听众与目标，确定每页的结论、支持和承接。': 'Define your audience and goal, then each slide’s message, evidence and transition.',
    '再准备好': 'Prepare the essentials', '整理真实素材，选择风格，即时看到版式与配色。': 'Gather original files, choose a style and preview the layout and colors.',
    '最后生成演示': 'Generate your presentation', '调用本机 Agent 制作，或导出完整工作包。': 'Run your local Agent or export a complete work package.',
    '继续我的汇报 ↗': 'Continue my presentation ↗', '你负责逻辑，Agent 负责呈现。': 'You shape the story. Your Agent brings it to life.', '试用示例': 'Try an example',
    '目标与引用': 'Goals & references', '逐页逻辑': 'Slide outline', '参考素材': 'Reference files', '视觉风格': 'Visual style', '检查与导出': 'Review & export', 'Agent 生成': 'Agent generation',
    '准备步骤': 'Preparation steps', '保持清晰': 'STAY CLEAR', '一页一个主要任务。': 'One main task per slide.', '不确定的事实先标记，': 'Flag uncertain facts.', '不让排版代替思考。': 'Let thinking guide the layout.', '新建汇报 ＋': 'New presentation ＋',
    '这一次，你要讲什么？': 'What will you present?', '带 * 的项目为必填': 'Fields marked * are required', '汇报主题': 'Presentation title', '汇报日期': 'Presentation date', '汇报人': 'Presenter', '听众': 'Audience',
    '希望听众带走什么': 'What should your audience take away?', '预计时长（分钟）': 'Duration (minutes)', '帮助 Agent 控制信息密度与讲稿长度。': 'Helps the Agent plan content density and speaking notes.',
    '例如：项目阶段复盘与下一步计划': 'e.g. Project review and next steps', '姓名 / 团队': 'Name / team', '他们已知道什么？最关心什么？': 'What do they already know? What matters most to them?',
    '例如：项目负责人，需要判断是否继续投入': 'e.g. Project leads deciding whether to continue funding', '理解一个观点、支持一项决定，或采取一个行动。': 'Understand an idea, support a decision or take action.', '用一句话描述这次汇报希望达成的结果': 'Describe the intended outcome in one sentence', '例如：15': 'e.g. 15',
    '补充要求': 'Additional requirements', '必须保留 / 避免的内容': 'Content to retain / avoid', '如：数据截至日期、敏感内容、术语、语言或模板要求': 'e.g. Data cutoff, sensitive content, terminology, language or template requirements', '选填': 'Optional',
    '汇报页面': 'Presentation slides', '未命名页面': 'Untitled slide', '未命名汇报': 'Untitled presentation', '未命名': 'Untitled', '必填内容已填写': 'Required content complete', '内容待填写': 'Content incomplete', '＋ 添加一页': '＋ Add a slide',
    '把这一页的逻辑讲清楚': 'Make this slide’s logic clear', '页面上移': 'Move slide up', '页面下移': 'Move slide down', '复制页面': 'Duplicate slide', '删除页面': 'Delete slide', '上移': 'Move up', '下移': 'Move down', '复制': 'Duplicate', '删除': 'Delete',
    '主题': 'Title', '目的': 'Purpose', '内容': 'Content', '细节': 'Details', '承接关系': 'Transition', '这一页要讲什么？': 'What is this slide about?', '这一页在整场汇报中承担什么任务？': 'What role does this slide play in the presentation?',
    '例如：解释瓶颈，为下一页方案建立依据': 'e.g. Explain the bottleneck to support the solution on the next slide', '用事实、证据和解释支撑这一页的主题。': 'Support the slide’s message with facts, evidence and explanation.', '写下本页核心内容、事实或证据，以及需要说明的限定条件。': 'Write the key content, facts or evidence, including relevant limitations.',
    '补充数据、例子、限定条件或其他需要保留的信息。': 'Add data, examples, limitations or other information to retain.', '可选填本页需要展开的细节': 'Optional details to expand on this slide', '如何承接上一页？如何引向下一页？': 'How does this connect to the previous and next slides?', '可说明开场与下一页的关系。': 'Describe the connection between the opening and next slide.', '写下前后页面之间的逻辑关系': 'Describe the logical connection between adjacent slides',
    '引用内容': 'References', '可引用内容 · 搜索素材库': 'Available references · Search files', '按文件名或路径搜索': 'Search by file name or path', '添加文件并引用': 'Add and reference files', '从文件夹搜索添加': 'Search a folder', '管理素材库 ↗': 'Manage files ↗',
    '引用说明': 'Reference notes', '填写引用片段、链接、出处或页码，说明文件中哪部分应被采用。': 'Specify excerpts, links, sources or page numbers to use.', '视觉与讲稿要求': 'Visuals & speaking notes', '视觉表达': 'Visual direction', '讲稿备注': 'Speaking notes', '如：对比图、方法流程、原始证据图；也可让 Agent 决定版式': 'e.g. Comparison chart, process or original evidence; you may leave layout choices to the Agent', '屏幕之外需要说明的例子、限制与讲述重点': 'Examples, limitations and points to explain while speaking', '← 上一页': '← Previous slide', '下一页 →': 'Next slide →',
    '没有匹配的可引用文件。可从本页添加，或回到第一步导入。': 'No matching reference files. Add them here or import them in the first step.', '移除关联': 'Remove reference',
    '从文件夹搜索引用内容': 'Search a folder for references', '关闭文件夹搜索': 'Close folder search', '按文件名或文件夹路径搜索，勾选后加入素材库并关联到当前页面。': 'Search names or paths, then select files to add and reference on this slide.', '搜索文件名 / 路径': 'Search file name / path', '例如：实验、数据、报告.pdf': 'e.g. experiment, data, report.pdf', '没有匹配的文件。': 'No matching files.', '取消': 'Cancel', '添加并引用': 'Add and reference',
    '导入可引用内容': 'Import reference files', '可跳过': 'Optional', '拖入参考文件': 'Drop reference files here', '图片、文档、表格或已有 PPT，保留原文件。': 'Images, documents, spreadsheets or existing presentations. Original files are preserved.', '选择文件': 'Choose files', '每个文件最多 100 MB，总计最多 300 MB · 文件仅保存在本机': '100 MB per file, 300 MB total · Files are stored locally', '尚未关联页面': 'No slides reference this file', '资料无需一次备齐。可以先完成逻辑，之后再回来补充。': 'You can gather files later. Start with the outline and return when ready.', '怎样用好素材': 'Make the most of your files', '这里导入的文件会出现在每页的“引用内容”中，可按需勾选。每页也能从文件夹搜索并添加文件。选择文件夹会保留内部目录；同名文件会在导出时自动区分。': 'Imported files appear in each slide’s references. You can also search folders from individual slides. Folder structure is preserved and duplicate names are distinguished on export.',
    'PPT 风格': 'Presentation style', '版式示意 · 非最终成稿': 'Layout preview · Final output may vary', '封面': 'Cover', '内容页': 'Content slide', '结构页': 'Structure slide', '预览页面类型': 'Preview type', '预览哪一页内容': 'Slide to preview', '主题色': 'Presentation palette', '主题配色': 'Presentation colors', '交付形式': 'Delivery format', '原生可编辑 PowerPoint (.pptx)': 'Editable PowerPoint (.pptx)', 'HTML 浏览器演示': 'HTML browser presentation',
    '电子杂志': 'Editorial', '瑞士网格': 'Swiss grid', '学术简报': 'Research briefing', '极简黑白': 'Minimal monochrome', '暗色科技': 'Dark technology', '柔和粉彩': 'Soft pastels', '大字撞色': 'Bold color', '典雅金黑': 'Elegant gold & black', '复古纸感': 'Vintage paper',
    '墨绿': 'Forest', '暖橙': 'Warm orange', '深紫': 'Deep purple', '钴蓝': 'Cobalt', '朱红': 'Vermilion', '炭黑': 'Charcoal', '石墨蓝': 'Graphite blue', '深青': 'Deep teal', '学术红白': 'Academic red & white', '学术蓝白': 'Academic blue & white', '雅致紫白': 'Purple & white', '黑白': 'Black & white', '暖灰': 'Warm gray', '冰蓝': 'Ice blue', '电紫': 'Electric purple', '薄荷': 'Mint', '薰衣草': 'Lavender', '奶油': 'Cream', '亮黄蓝': 'Yellow & blue', '粉绿': 'Pink & green', '珊瑚青': 'Coral & teal', '曜黑金': 'Black & gold', '象牙金': 'Ivory & gold', '赤陶纸': 'Terracotta paper', '橄榄纸': 'Olive paper',
    '内容已整理': 'Slides organized', '需要补齐': 'Needs attention', '必填信息完整': 'Required information complete', '已就绪': 'Ready', '先补齐这些信息': 'Complete these items first', '去补充 ↗': 'Complete ↗', '汇报目标': 'Presentation goals', '逐页内容': 'Slide content', '顺着读一遍，检查论证与承接': 'Read through to check your argument and transitions', '修改 ↗': 'Edit ↗', '未填写': 'Not provided', '细节（选填）': 'Details (optional)', '承接关系（选填）': 'Transition (optional)', '引用文件': 'Referenced files', '缺失的素材': 'Missing file', '素材与风格': 'Files & style', '参考文件': 'Reference files', '未提供': 'Not provided', '管理素材 ↗': 'Manage files ↗', '检查 ↗': 'Review ↗',
    '一个文件夹，完成交接。': 'Everything for a complete handoff.', '工作包保留你的完整输入、真实素材与原始 Skill。': 'Your work package preserves all input, original files and Skills.', '未完成的草稿也可导出，缺口会记录在 brief.md。': 'Unfinished drafts can also be exported. Missing items are listed in brief.md.', '导出完整工作包 ↓': 'Export work package ↓', '可以导出未完成的工作包；生成演示前请补齐信息。': 'You can export unfinished work. Complete required information before generating.', '首次导出会加载本地制作资源，请稍候。': 'The first export loads local resources. Please wait.',
    '完整制作资源约 53–59 MB（不含你的素材）。保存文件夹需写入上万个资源文件，ZIP 导出更快。': 'Production resources total about 53–59 MB, excluding your files. ZIP export is faster than writing thousands of files to a folder.', '直接保存文件夹 ↗': 'Save as folder ↗',
    '本次演示': 'This presentation', '返回检查 ↗': 'Back to review ↗', '页面与素材': 'Slides & files', '下一步': 'Next', '检查内容': 'Review content', '进入 Agent 生成': 'Continue to Agent', '上一步': 'Previous', '返回首页': 'Home',
    '直接生成演示文件': 'Generate presentation files', '在本项目目录打开终端，运行下方命令，再打开终端显示的本机网址，即可发现并调用已安装的 Agent。': 'Open a terminal in this project, run the command below, then open the local URL to discover and run installed Agents.', '当前页面仍可离线准备内容、导出完整工作包。': 'You can still prepare content and export work packages offline.',
    '让本机 Agent 完成制作': 'Let your local Agent build it', '制作 Agent': 'Production Agent', '已连接本机': 'Connected locally', '未连接': 'Disconnected', '未发现': 'Not found', '尚无可用 Agent': 'No available Agents', '正在连接…': 'Connecting…', '重连本机服务': 'Reconnect service', '刷新 Agent': 'Refresh Agents', '正在提交…': 'Submitting…', '补齐信息后生成': 'Complete required fields to generate', '取消生成': 'Cancel generation', '正在取消…': 'Cancelling…',
    '本次生成使用点击时的内容快照。你可以继续查看和编辑；修改后需重新生成。': 'Generation uses a snapshot taken when you click. You can keep editing; later changes require a new run.', '正在上传素材': 'Uploading files', '正在准备制作资源': 'Preparing resources', 'Agent 正在制作': 'Agent is working', '生成完成': 'Completed', '生成失败': 'Failed', '已取消': 'Cancelled', '正在发现本机 Agent…': 'Discovering local Agents…', '选择 Agent 后即可开始制作。': 'Select an Agent to get started.', '尚未发现可用的 Agent。安装并登录 Claude Code 或 Codex 后刷新。': 'No available Agents found. Install and sign in to Claude Code or Codex, then refresh.', '尚未连接本机服务。': 'Not connected to the local service.',
    '生成的文件': 'Generated files', '下载 ↓': 'Download ↓', '下载全部产物 ZIP ↓': 'Download all results as ZIP ↓', 'HTML 演示含配套资源时，请下载 ZIP 并解压后打开。': 'For HTML presentations with supporting files, download and extract the ZIP before opening.', 'Agent 制作日志': 'Agent production log', '素材上传尚未完成。请取消此任务，再用当前完整内容重新生成。': 'File upload is incomplete. Cancel and start a new run with the complete content.',
    '正在创建生成任务…': 'Creating generation job…', '素材已就绪，正在启动 Agent…': 'Files ready. Starting Agent…', '上次任务已不在本机服务中，可重新生成。': 'The previous job is no longer in the local service. You can start again.', '请先补齐必填信息与真实素材。': 'Complete required information and supply original files first.',
    '请通过本机服务打开 YoursPPT。': 'Open YoursPPT through its local service.', '本机服务响应超时，请重连查看任务状态。': 'Local service timed out. Reconnect to check job status.', '无法连接本机服务，请确认启动窗口仍在运行。': 'Cannot connect to the local service. Check that its terminal is still running.', '本机服务未返回有效会话，请重启服务。': 'No valid service session returned. Restart the service.', '本机 Agent 列表格式错误。': 'Invalid local Agent list.', '本机服务返回了无效的任务状态。': 'Invalid job status returned by the service.',
    '关闭介绍': 'Close guide', '把思考留给自己，': 'Own your ideas,', '把制作交给 Agent。': 'let your Agent build the slides.', 'YoursPPT 帮你先确定目标和每页逻辑，再整理素材、选择风格，最后调用本机 Agent 生成 PPTX 或 HTML，也可导出完整工作包。': 'Define your goals and slide logic, gather files and choose a style. Then run a local Agent to generate PPTX or HTML, or export a complete work package.', '说清楚你要讲什么': 'Clarify your message', '一页一个主要任务，让结论有支撑，让转场有理由。': 'Give each slide one main task, support conclusions and connect the story.', '备齐素材与风格': 'Prepare files and style', '拖入真实文件，选择主题色和版式方向，看到即时预览。': 'Drop original files, choose colors and a layout direction, and preview them immediately.', '由本机 Agent 生成演示': 'Generate with a local Agent', '通过本机服务选择 Agent，生成 PPTX 或 HTML；也可离线导出工作包。': 'Choose an Agent through the local service to generate PPTX or HTML. Work packages can also be exported offline.', '右上角“设置”可选择导出位置、保存和读取草稿。未完成草稿也会完整保留；需要制作时再补齐必填信息。': 'Use Settings to choose an export folder, save and import drafts, and set theme and language. Unfinished drafts are preserved; complete required information when ready to generate.', '知道了': 'Got it',
    '关闭 Markdown 帮助': 'Close Markdown help', 'Markdown 语法与快捷键': 'Markdown syntax & shortcuts', '直接在文字中输入语法。光标进入时显示标记，离开后呈现排版；点击表格可编辑原文。': 'Type Markdown directly. Markup appears at the cursor and formatted text returns when you move away. Click a table to edit its source.', '基本语法': 'Basic syntax', '标题': 'Headings', '粗体 / 斜体': 'Bold / italic', '列表 / 任务': 'Lists / tasks', '引用 / 链接': 'Quotes / links', '代码': 'Code', '代码块用三反引号包围，可在开头注明语言。': 'Wrap code blocks in triple backticks; optionally name a language.', '表格': 'Tables', '快捷键': 'Keyboard shortcuts', '粗体 / 斜体 / 链接': 'Bold / italic / link', '撤销 / 重做': 'Undo / redo', '列表续写 / 退出': 'Continue / exit list', '续写下一项；空项再次 Enter 退出列表。': 'continues the list; Enter on an empty item exits it.', '只换行': 'Line break', '继续编辑': 'Continue editing',
    '确认': 'Confirm', '开始一份新汇报？': 'Start a new presentation?', '载入示例汇报？': 'Load the example?', '当前草稿会被替换。需要保留时，请先取消并备份草稿。': 'Your current draft will be replaced. Cancel and back it up first if you need to keep it.', '新建汇报': 'New presentation', '载入示例': 'Load example', '删除这一页？': 'Delete this slide?', '删除后当前草稿中的这一页将被移除。': 'This slide will be removed from the current draft.',
    '草稿正在读写，请稍候。': 'Draft operation in progress. Please wait.', '工作包正在导出，请稍候。': 'Export in progress. Please wait.', '一份汇报最多 200 页。': 'A presentation supports up to 200 slides.', '已取消保存，没有写入文件。': 'Save cancelled. No files were written.', 'Agent 提示词已复制。': 'Agent prompt copied.', '浏览器未允许复制，请选中提示词手动复制。': 'Clipboard access denied. Select and copy the prompt manually.', '请在第一步或逐页引用内容中拖入文件。': 'Drop files in the first step or a slide’s references.', '拖拽文件夹请改用“选择文件夹”，以保留完整目录。': 'Use Choose folder to preserve the directory structure.',
    '页': 'slides', '份素材': 'files', '项': 'items', '预计时长': 'Duration'
  };
  Object.assign(en, {
    '一个观点，需要清楚的支撑': 'Every idea needs clear support', '先理清内容，再让表达有自己的秩序。': 'Clarify your content, then give the presentation its own structure.', '让听众记住一个有依据的判断。': 'Give your audience a conclusion backed by evidence.', '- 用事实与证据支持结论\n- 让下一页自然发生': '- Support your conclusion with facts and evidence\n- Lead naturally into the next slide', '从目的，到清楚的表达': 'From purpose to clear expression', '这一页要讲什么': 'What this slide explains', '说明这页为什么存在': 'Why this slide belongs here',
    '。': '.', '份': 'files', '一个小提示': 'A small tip',
    '主题说的是“讲什么”，目标说的是“为什么讲”。把这两件事分开，后面的内容就更容易取舍。': 'The title describes what you will present; the goal explains why. Separating them helps you decide what to include.',
    '查看制作原则与来源': 'Production principles & sources', '查看上游仓库 ↗': 'View upstream repository ↗', '最终交付形式': 'Final delivery format', '格式与视觉风格独立。选择 PPTX 时会同时附上原生制作工具。': 'Choose the format independently of visual style. PPTX includes native production tools.', '可编辑 .pptx': 'Editable .pptx', 'HTML 演示': 'HTML presentation', '浏览器播放': 'Play in a browser',
    '视觉规范来自 Guizang PPT Skill；完整原始规范与资源随工作包导出。': 'Visual specifications come from Guizang PPT Skill. Complete original specifications and resources are included in the work package.',
    '查看导出的 Markdown 内容': 'View exported Markdown', '给 Agent 的一句话': 'A prompt for your Agent', '复制提示词 ↗': 'Copy prompt ↗',
    '阅读工作包内的 brief.md 和 style/guide.md，遵循所附 Skill；保留我的逐页逻辑，先确认缺口，再生成指定格式的演示。': 'Read brief.md and style/guide.md in the work package and follow the included Skills. Preserve my slide logic, identify missing information, then generate the requested presentation format.',
    '请选择有效的汇报日期': 'Choose a valid presentation date', '预计时长请填写大于 0 的分钟数': 'Enter a duration greater than zero minutes',
    '准备导出内容': 'Preparing export content', '写入 ZIP 中央目录': 'Writing ZIP directory', '导出完成': 'Export complete',
    '# 一级标题': '# Heading 1', '## 二级标题': '## Heading 2', '**粗体**': '**bold**', '*斜体*': '*italic*', '- 要点': '- Point', '1. 步骤': '1. Step', '- [ ] 待办': '- [ ] Task', '- [x] 完成': '- [x] Done', '> 引用内容': '> Quotation', '[名称](https://example.com)': '[Label](https://example.com)', '`行内代码`': '`inline code`', '| 项目 | 数值 |\n| --- | --- |\n| A | 1 |': '| Item | Value |\n| --- | --- |\n| A | 1 |',
    '用读取的草稿替换当前内容？': 'Replace the current content with this draft?', '当前本地草稿会被替换。需要保留时，请先取消并保存草稿。': 'Your current local draft will be replaced. Cancel and save it first if you need to keep it.', '正在保存草稿与素材…': 'Saving draft and files…',
    '已准备下载，请检查浏览器下载列表。': 'Download ready. Check your browser’s downloads.', '草稿已准备下载，请检查浏览器下载列表。': 'Draft download ready. Check your browser’s downloads.', '草稿已读取，部分素材需在第一步重新选择。': 'Draft imported. Reselect missing files in the first step.', '草稿与素材已读取，可以继续编辑。': 'Draft and files imported. You can continue editing.',
    '文件夹未获写入授权，请在设置中重新选择，或切换为浏览器下载。': 'Folder write access was denied. Reselect it in Settings or use browser downloads.', '工作包文件夹已保存，不会覆盖已有内容。': 'Work-package folder saved with a unique name.', '未生成完整工作包，请查看导出提示。': 'Work package is incomplete. Check the export message.', '这份草稿的格式不正确，请选择 YoursPPT 导出的草稿文件。': 'Invalid draft format. Choose a draft exported by YoursPPT.', '草稿中的页面内容不完整。': 'The draft contains incomplete slide data.',
    '叙事 / 观点 / 分享': 'Narrative / Ideas / Sharing', '技术 / 产品 / 分析': 'Technology / Product / Analysis', '研究 / 答辩 / 专业报告': 'Research / Defense / Reports', '大留白 / 单色 / 字体秩序': 'White space / Monochrome / Typography', '深色 / 荧光 / 精密网格': 'Dark / Neon / Precise grids', '浅色 / 圆角 / 轻盈层次': 'Light / Rounded / Airy layers', '粗字 / 色块 / 波普几何': 'Bold type / Color blocks / Pop geometry', '衬线 / 金属色 / 克制对称': 'Serifs / Metallic tones / Symmetry', '暖纸 / 印刷色 / 海报构图': 'Warm paper / Print colors / Posters',
    '墨水经典': 'Classic ink', '靛蓝瓷': 'Indigo porcelain', '森林墨': 'Forest ink', '牛皮纸': 'Kraft paper', '沙丘': 'Dune', '克莱因蓝': 'Klein blue', '柠檬黄': 'Lemon yellow', '柠檬绿': 'Lime', '安全橙': 'Safety orange', '纯白': 'Pure white', '反白': 'Reverse monochrome', '冰青': 'Ice cyan', '黄蓝波普': 'Yellow & blue pop',
    '衬线标题、温暖纸色与克制留白，让一个观点有自己的节奏。': 'Serif headings, warm paper tones and generous space give each idea its own rhythm.',
    '单一锚点色、明确的字体对比与精准网格，让信息一眼可读。': 'One accent color, clear typographic contrast and a precise grid make information easy to scan.',
    '结论与证据相邻，图表与局限清楚可见，适合需要严谨表达的报告。': 'Keep findings beside evidence, with clear charts and limitations for rigorous reporting.',
    '只用黑白与清晰字阶。宽阔留白、纤细分隔线和偏轴构图，让文字成为主角。': 'Black and white with a clear type hierarchy. Broad margins, fine dividers and offset compositions put words first.',
    '深色画布、局部荧光强调与等宽标签。细网格和几何线条带出精密感。': 'Dark canvases, selective neon accents and monospace labels. Fine grids and geometric lines convey precision.',
    '柔和浅色、圆润容器和舒适间距。标题轻快，内容以低对比色块自然分组。': 'Soft light colors, rounded containers and comfortable spacing. Gentle color blocks group content naturally.',
    '海报级粗标题、大胆撞色和描边几何。用不对称色块制造鲜明的视觉节奏。': 'Poster-scale bold type, contrasting colors and outlined geometry. Asymmetric color blocks create a strong rhythm.',
    '深色或暖白底、金色细线与衬线标题。宽字距、对称轴与精致留白形成典雅气质。': 'Dark or warm white backgrounds, fine gold lines and serif headings. Wide tracking, symmetry and space create elegance.',
    '暖纸底、有限印刷色与巨大圆弧。平面叠色和微弱网点形成复古海报的温度。': 'Warm paper, limited print colors and oversized arcs. Flat overlays and subtle halftones evoke vintage posters.',
    'Noto Serif SC / Playfair Display 标题，非衬线正文，等宽元数据；离线使用系统衬线字体兜底。': 'Noto Serif SC / Playfair Display headings, sans-serif body text and monospace metadata; system serif fallback offline.',
    'Inter / Helvetica / Noto Sans SC；Windows 以 Microsoft YaHei UI 兜底；大字 200–300，正文 400–500，meta 500–600。': 'Inter / Helvetica / Noto Sans SC; Microsoft YaHei UI fallback on Windows. Heading weights 200–300, body 400–500, metadata 500–600.',
    '使用清晰的无衬线字体、稳定的字号层级，并确保数学符号、单位和图表标签可读。': 'Use readable sans-serif type, a consistent hierarchy and legible mathematical symbols, units and chart labels.',
    'Helvetica / Arial / Microsoft YaHei UI；标题轻字重、正文常规字重，使用字号与空白建立对比。': 'Helvetica / Arial / Microsoft YaHei UI. Light headings, regular body text and contrast through size and space.',
    'Inter / Microsoft YaHei UI 正文，Consolas 等宽标签和数字；宽字距小标题。': 'Inter / Microsoft YaHei UI body text, Consolas labels and numbers, and widely tracked small headings.',
    '圆润几何无衬线标题，Microsoft YaHei UI / Arial 正文；中等字重和宽松行距。': 'Rounded geometric sans-serif headings, Microsoft YaHei UI / Arial body text, medium weights and relaxed line spacing.',
    'Arial Black / Microsoft YaHei UI 粗标题；中性无衬线正文。标题与正文保持显著字号对比。': 'Arial Black / Microsoft YaHei UI bold headings, neutral sans-serif body text and strong size contrast.',
    'Georgia / Noto Serif SC / SimSun 衬线标题，清晰无衬线正文；元信息使用宽字距。': 'Georgia / Noto Serif SC / SimSun serif headings, readable sans-serif body text and widely tracked metadata.',
    'Georgia / SimSun 复古衬线标题，清晰无衬线正文；粗标题与印刷式元信息。': 'Georgia / SimSun vintage serif headings, readable sans-serif body text, bold titles and print-style metadata.',
    '一份 deck 使用一套主题，不混搭纸色与墨色。': 'Use one theme per deck with consistent paper and ink colors.',
    '通过字号、字体与留白建立层级，避免装饰性卡片和阴影。': 'Build hierarchy through type size, fonts and space. Avoid decorative cards and shadows.',
    'Hero 与正文、light 与 dark 交替；连续同主题不超过三页。': 'Alternate hero and body layouts, light and dark. Use no more than three consecutive slides with the same theme.',
    '图片使用标准比例并贴顶；网格图片固定高度，保留关键证据。': 'Use standard image proportions aligned to the top. Give grid images a fixed height and retain key evidence.',
    '保持稳定页面 ID，讲稿补充上下文与过渡，不重复屏幕文字。': 'Keep stable slide IDs. Use notes for context and transitions rather than repeating on-screen text.',
    '使用 12 列网格、左上标题轴和发丝线；正文版式记录 S01–S22 的 data-layout。': 'Use a 12-column grid, a top-left title axis and hairlines. Record S01–S22 body layouts in data-layout.',
    '整份 deck 使用一个 accent；不使用渐变、阴影或圆角。': 'Use one accent throughout the deck. Avoid gradients, shadows and rounded corners.',
    '主标题以大字号轻字重形成对比；正文 ≥18px，caption ≥16px，meta ≥14px。': 'Use large, light headings for contrast. Body ≥18px, captions ≥16px, metadata ≥14px.',
    '单张主图使用 S22 的 21:9 槽位；多图使用 S15/S16 且统一比例与高度。': 'Use the S22 21:9 slot for one main image. Use S15/S16 for multiple images with consistent proportions and height.',
    '每页一个语义化动效，保留 B 低功耗模式、稳定 slide ID 和演讲者备注。': 'Use one meaningful animation per slide. Preserve B low-power mode, stable slide IDs and speaker notes.',
    '7–8 页至少六种布局；10 页以上至少八种布局。内容不得进入导航安全区域。': 'Use at least six layouts for 7–8 slides and eight for 10 or more. Keep content outside the navigation safe area.',
    '按用户确定的逻辑组织问题、方法、结果与解释；区分观察、推断与假设。': 'Follow the user’s logic for questions, methods, results and interpretation. Distinguish observations, inferences and assumptions.',
    '一页一个可检验的结论，图表与所支持的结论相邻。': 'Give each slide one testable finding. Place charts beside the findings they support.',
    '估计值保留不确定性、单位、样本与来源；不虚构数据。': 'Preserve uncertainty, units, samples and sources. Never fabricate data.',
    '优先原生可编辑文本、形状、图表、表格；分析产出的证据图保留原始保真度。': 'Prefer native editable text, shapes, charts and tables. Preserve the fidelity of analytical evidence images.',
    '采用克制无衬线、扁平排版与稳定色彩映射；装饰需有信息作用。': 'Use restrained sans-serif type, flat layouts and consistent color mappings. Decoration must convey information.',
    '对资料、SVG 质量、图表数据、备注和最终 PPTX 分别验收。': 'Verify sources, SVG quality, chart data, notes and the final PPTX separately.',
    '仅使用选定的黑白配色；线条、图表与正文共享同一色彩体系。': 'Use the selected monochrome palette consistently for lines, charts and text.',
    '保持宽阔边距、严格对齐和单一字体家族。': 'Keep generous margins, precise alignment and one font family.',
    '不使用渐变、阴影、圆角卡片或装饰纹理。': 'Avoid gradients, shadows, rounded cards and decorative textures.',
    '深色负空间为主体，荧光仅用于重要数字与节点。': 'Let dark negative space dominate. Reserve neon for key numbers and nodes.',
    '使用细线网格、精确几何和等宽元信息，发光范围保持克制。': 'Use fine grids, precise geometry and monospace metadata with restrained glow.',
    '图表轴线与标签须与深色背景保持可读对比。': 'Keep chart axes and labels legible against dark backgrounds.',
    '采用一致的圆角体系与舒适卡片内边距。': 'Use consistent corner radii and comfortable card padding.',
    '同色系浅色块承载内容，关键数字使用清晰强调色。': 'Group content with related light colors and emphasize key numbers clearly.',
    '层次轻浅，避免浓重投影；同级卡片保持平面。': 'Keep layers light and avoid heavy shadows. Equal-level cards remain flat.',
    '一个主标题主导画面，装饰几何留在内容外围。': 'Let one main heading dominate. Keep decorative geometry outside the content.',
    '浅色底与深色描边稳定结构，使用一主一辅的撞色组合。': 'Use light backgrounds, dark outlines and a primary/secondary contrasting color pair.',
    '采用平面色块与硬边框，避免柔光和复杂渐变。': 'Use flat color blocks and hard borders. Avoid soft glows and complex gradients.',
    '以居中标题、细线边界和稳定对称轴建立秩序。': 'Build order with centered headings, fine boundaries and a stable symmetry axis.',
    '金属色仅作为平面色值，保持高对比文字与充足留白。': 'Use metallic tones as flat colors, with high-contrast text and ample space.',
    '不叠加闪光、浮雕或复杂纹理；内容图保留真实色彩。': 'Avoid sparkle, embossing and complex textures. Preserve true colors in content images.',
    '限定少量平面印刷色，用暖纸背景与几何叠色建立层次。': 'Limit flat print colors. Build layers with warm paper backgrounds and geometric overlays.',
    '纸纹和网点维持低对比，正文区域保持清晰。': 'Keep paper textures and halftones subtle; body text areas stay clear.',
    '不使用渐变和柔阴影；真实证据图不做损害信息的滤镜。': 'Avoid gradients and soft shadows. Do not apply filters that damage evidence images.',
    '保持用户的页面目的、内容与承接顺序；视觉方案不改变论证结构。': 'Preserve the user’s slide purposes, content and transition order. Visual style must not change the argument.',
    '颜色是 YoursPPT 提供的应用预设；方法与视觉规范来自 PPT Master academic-research。': 'Colors are YoursPPT presets. Methods and visual specifications come from PPT Master academic-research.',
    '视觉原则参考 PPT Master；具体配色为 YoursPPT 应用预设。原始视觉参考随工作包导出。': 'Visual principles reference PPT Master. Palettes are YoursPPT presets. Original references are included in the work package.',
    'YoursPPT 自定义视觉方案，参考 Editorial 的字体与留白原则；配色与对称规则以本方案为准。': 'A YoursPPT style inspired by Editorial typography and spacing. This style defines its own colors and symmetry rules.',
    '章节幕封': 'Section divider', '数据大字报': 'Large data poster', '左文右图': 'Text left / image right', '图片网格': 'Image grid', '两列 Pipeline': 'Two-column pipeline', '问题收束': 'Question wrap-up', '大引用': 'Large quotation', '并列对比': 'Side-by-side comparison', '图文混排': 'Text & image composition',
    '研究问题': 'Research question', '方法与流程': 'Methods & process', '实验结果': 'Experimental results', '对比与消融': 'Comparisons & ablations', '局限与结论': 'Limitations & conclusions',
    '偏轴大标题': 'Offset headline', '留白单句': 'Spacious single statement', '细线双栏': 'Fine-line columns', '巨大数字': 'Oversized number', '单幅图片': 'Single image',
    '暗场大标题': 'Dark headline', '发光核心数字': 'Glowing key number', '节点连线': 'Connected nodes', '细框双栏': 'Fine-bordered columns', '暗色证据图': 'Evidence on dark backgrounds',
    '圆形色域封面': 'Circular color-field cover', '圆角双栏': 'Rounded columns', '柔色步骤链': 'Soft-color steps', '悬浮主面板': 'Floating main panel', '圆润数字': 'Rounded numbers',
    '撞色海报': 'Contrasting-color poster', '描边焦点框': 'Outlined focal frame', '偏轴几何': 'Offset geometry', '大字数字': 'Bold numbers', '双色分区': 'Two-color zones',
    '居中衬线封面': 'Centered serif cover', '金线双栏': 'Gold-line columns', '大引文': 'Large quotation', '留白图文': 'Spacious text & image', '对称章节页': 'Symmetric section divider',
    '太阳圆弧封面': 'Sun-arc cover', '横向地平线': 'Horizontal horizon', '复古色块': 'Vintage color blocks', '印刷引文': 'Print-style quotation', '半调图文': 'Halftone text & image'
  });
  // Interpolated messages use explicit patterns so captured user text is retained.
  const patterns = [
    [/^读取素材 (\d+)\/(\d+)$/, (_, n, total) => `Reading file ${n}/${total}`],
    [/^加载完整 (.+) skill$/, (_, label) => `Loading complete ${label} Skill`],
    [/^打包 (.+) (\d+)\/(\d+)$/, (_, label, n, total) => `Packaging ${label} ${n}/${total}`],
    [/^移除 (.+)$/, (_, name) => `Remove ${name}`],
    [/^请填写(.+)$/, (_, label) => `Please fill in ${translate(label).toLowerCase()}`],
    [/^第 (\d+) 页缺少(.+)$/, (_, n, label) => `Slide ${n}: missing ${translate(label).toLowerCase()}`],
    [/^第 (\d+) 页尚未说明如何承接上一页$/, (_, n) => `Slide ${n}: add a transition from the previous slide`],
    [/^第 (\d+) 页有无法识别的素材关联，请在来源中移除或重新关联$/, (_, n) => `Slide ${n}: remove or reconnect unrecognized references`],
    [/^第 (\d+) 页关联的资料需要重新选择$/, (_, n) => `Slide ${n}: reselect its reference files`],
    [/^请重新选择资料「(.+)」$/, (_, name) => `Reselect reference file “${name}”`],
    [/^正在打包 (\d+)%$/, (_, n) => `Packaging ${n}%`],
    [/^写入 (\d+)%$/, (_, n) => `Writing ${n}%`],
    [/^正在保存文件夹 (\d+) \/ (\d+)，请保持页面打开。$/, (_, n, total) => `Saving folder ${n} / ${total}. Keep this page open.`],
    [/^文件夹「(.+)」已完整保存。将整个文件夹交给 Agent 即可。$/, (_, name) => `Folder “${name}” saved completely. Hand the entire folder to your Agent.`],
    [/^已保存到「(.+)」：(.+)$/, (_, folder, file) => `Saved to “${folder}”: ${file}`],
    [/^草稿已保存到「(.+)」：(.+)$/, (_, folder, file) => `Draft saved to “${folder}”: ${file}`],
    [/^新增 (\d+) 份(?:，恢复 (\d+) 份)?(?:；跳过 (\d+) 份重复或超限文件)?。$/, (_, n, restored, skipped) => `Added ${n} files${restored ? `, restored ${restored}` : ''}${skipped ? `; skipped ${skipped} duplicate or oversized files` : ''}.`],
    [/^(添加失败|读取失败|无法保存导出位置|无法重置导出位置)：(.*)$/, (_, prefix, reason) => `${({ '添加失败': 'Import failed', '读取失败': 'Read failed', '无法保存导出位置': 'Cannot save export location', '无法重置导出位置': 'Cannot reset export location' })[prefix]}: ${translate(reason)}`],
    [/^第 (\d+) 页(.*)$/, (_, n, tail) => `Slide ${n}${tail}`],
    [/^(\d+) 页 · (\d+) 份素材$/, (_, n, files) => `${n} slides · ${files} files`],
    [/^已选择 (\d+) 份$/, (_, n) => `${n} selected`],
    [/^已关联 (\d+) 页$/, (_, n) => `Referenced by ${n} slides`],
    [/^已添加$/, () => 'Added files'],
    [/^找到 (\d+) 份 · 已选 (\d+) 份(.*)$/, (_, total, n, more) => `${total} found · ${n} selected${more ? ' · Showing the first 200. Narrow your search.' : ''}`],
    [/^还有 (\d+) 项信息需要补齐，请返回第 4 步检查后再开始生成。$/, (_, n) => `${n} items need attention. Return to step 4 before generating.`],
    [/^还有 (\d+) 个可优化点 · 不影响导出$/, (_, n) => `${n} suggestions · Export is available`],
    [/^制作日志 · (\d+) 条$/, (_, n) => `Production log · ${n} entries`],
    [/^任务 (.+)$/, (_, id) => `Job ${id}`],
    [/^所选文件夹：(.+)$/, (_, name) => `Selected folder: ${name}`],
    [/^输出目录：(.+)$/, (_, path) => `Output folder: ${path}`],
    [/^开始生成 (PPTX|HTML)$/, (_, format) => `Generate ${format}`],
    [/^使用电脑上已安装并登录的 Agent，按选定风格生成 (PPTX|HTML)。Agent 会按其自身配置连接模型服务。$/, (_, format) => `Use an installed, signed-in Agent to create ${format} in your chosen style. It connects using its own model configuration.`],
    [/^(.*)：Markdown 语法与快捷键$/, (_, label) => `${translate(label)}: Markdown syntax & shortcuts`],
    [/^(\d+) 分钟$/, (_, n) => `${n} minutes`],
    [/^正在上传素材 (\d+) \/ (\d+)：(.+)$/, (_, n, total, name) => `Uploading file ${n} / ${total}: ${name}`],
    [/^本机服务返回 (\d+)$/, (_, code) => `Local service returned ${code}`],
    [/^本机草稿：$/, () => 'Local draft:'],
    [/^· (\d+) 页 · (\d+) 份素材$/, (_, n, files) => `· ${n} slides · ${files} files`],
    [/^(保存失败|下载失败|连接中断，任务状态尚未确认。|提交未确认完成，请重连查看任务状态。|取消尚未确认，请重连查看任务状态。|任务记录已保留，重连后可继续查看。)([：:]?)(.*)$/, (_, prefix, punctuation, reason) => `${({ '保存失败': 'Save failed', '下载失败': 'Download failed', '连接中断，任务状态尚未确认。': 'Disconnected. Job status is unconfirmed.', '提交未确认完成，请重连查看任务状态。': 'Submission unconfirmed. Reconnect to check the job.', '取消尚未确认，请重连查看任务状态。': 'Cancellation unconfirmed. Reconnect to check the job.', '任务记录已保留，重连后可继续查看。': 'Job retained. Reconnect to view it.' })[prefix]}${punctuation ? ': ' : ' '}${translate(reason)}`]
  ];
  function translate(text) {
    if (Y.getPreferences().language !== 'en') return String(text ?? '');
    const source = String(text ?? ''), trimmed = source.trim();
    if (Object.hasOwn(en, trimmed)) return source.replace(trimmed, en[trimmed]);
    const decorated = trimmed.match(/^([←＋]\s*)(.+)$/) || trimmed.match(/^(.+?)(\s*[→↗↓])$/);
    if (decorated) {
      const output = decorated[1].match(/^[←＋]/) ? decorated[1] + translate(decorated[2]) : translate(decorated[1]) + decorated[2];
      if (output !== trimmed) return source.replace(trimmed, output);
    }
    for (const [pattern, replacement] of patterns) if (pattern.test(trimmed)) return source.replace(trimmed, trimmed.replace(pattern, replacement));
    return source;
  }
  const originals = new WeakMap();
  const protectedText = '[translate="no"], .cm-editor, .markdown-body, .outline-title, .file-icon, .file-info strong, .file-info>span, .source-option>span, .folder-results .source-option, .review-data dd, .slide-preview, .agent-log, .agent-directory, .agent-job-error, .agent-warning, .agent-results li>span, .package-tree, .markdown-details pre, .draft-strip strong, script, style';
  const attributes = ['aria-label', 'title', 'placeholder', 'data-placeholder', 'data-editor-label'];
  function localize(scope = root.document) {
    if (!scope) return;
    const walker = root.document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement?.closest(protectedText)) continue;
      const previous = originals.get(node);
      const source = previous && node.textContent === previous.output ? previous.source : node.textContent;
      const output = translate(source);
      originals.set(node, { source, output });
      if (node.textContent !== output) node.textContent = output;
    }
    for (const element of [scope, ...scope.querySelectorAll('[aria-label], [title], [placeholder], [data-placeholder], [data-editor-label]')]) {
      if (!element.getAttribute || element.closest('[translate="no"], .cm-content')) continue;
      for (const name of attributes) {
        const value = element.getAttribute(name); if (!value) continue;
        const record = originals.get(element) || {};
        const previous = record[name], source = previous && value === previous.output ? previous.source : value;
        const output = translate(source); record[name] = { source, output }; originals.set(element, record);
        if (value !== output) element.setAttribute(name, output);
      }
    }
  }
  Object.assign(Y, { t: translate, localize });
  // Localize asynchronously updated statuses and newly mounted dialogs/Agent UI.
  let pending = false;
  new MutationObserver(records => {
    if (pending || !records.some(r => !(r.target.nodeType === 1 ? r.target : r.target.parentElement)?.closest(protectedText))) return;
    pending = true;
    queueMicrotask(() => { pending = false; localize(); });
  }).observe(root.document.body, { childList: true, subtree: true, characterData: true });
  localize();
})(globalThis);
