# YoursPPT

想清楚，再开始制作。YoursPPT 是一个本地汇报制作工具：把人的逐页逻辑、真实素材与视觉要求整理成完整工作包，并在最后一步调用本机的 Codex 或 Claude Code，生成 PPTX 或 HTML 演示文件。

它不替你决定观点，也不自动编造事实或论证。

## 开始使用

使用 Node.js 22+，在项目目录运行：

```powershell
node scripts/serve.cjs
```

用桌面版 Chrome 或 Edge 打开 [本机工作区](http://127.0.0.1:4173)。服务不需要 npm 安装，仅监听 `127.0.0.1`。端口已占用时可设置 `YOURSPPT_PORT` 后启动。

也可以直接打开 `index.html`，离线准备内容和导出工作包；浏览器文件页面不能启动本机程序。两种打开方式的浏览器存储相互独立，切换前请在右上角“设置”保存草稿 ZIP，在新页面读取即可恢复文字与真实素材。旧版 JSON 仍可读取，但需要重新选择素材。使用时请保留同目录的 `src/`、`styles.css`、`app.js` 和 `assets/`。

开始页提供“新内容”“读取草稿”“了解工作流”三个入口；有本机草稿时也可直接继续。顶栏和左侧导航固定，只有中间内容滚动。逐页编辑的页面列表与编辑区、视觉风格的方案列表与预览区独立滚动；小屏幕将列表放在内容区上方。滚动条静止时隐藏，滚动期间仅显示细滑块，没有箭头和背景轨道；内容滚出窗口时，上下边缘渐隐，到达首尾时对应边缘恢复清晰。

1. **目标与引用**：填写主题、日期、汇报人、听众，并导入可引用的文件或文件夹；支持拖入真实文件，保留目录和原始字节。
2. **逐页逻辑**：每页必填**主题、目的和内容**，选填**细节和承接关系**。所有文字编辑框（含引用说明、视觉表达、讲稿和第一步的文字字段）采用 Markdown，支持标题、列表、粗体、表格、引用、代码块和链接，采用类似 Obsidian 的单区实时预览：直接在已排版的文字中编辑，光标进入相应语法位置时展开标记，离开后自动收起；不再分成源码和预览两栏。检查页也会渲染 Markdown。日期、时长和文件搜索保留专用控件。引用内容可从共享素材库搜索勾选，也可在本页打开文件夹、按文件名或路径搜索，选择后添加并自动关联到本页。视觉要求与讲稿仍可选填。
3. **视觉风格**：电子杂志、瑞士网格、学术简报、极简黑白、暗色科技、柔和粉彩、大字撞色、典雅金黑、复古纸感，共 9 种视觉方案和 26 套配色。学术简报提供石墨蓝、深青、学术红白、学术蓝白、雅致紫白 5 套配色。每种提供有区别的字体、构图、图形和配色预览；PPTX／HTML 与风格独立选择。
4. **检查与导出**：完整检查每页内容和引用关系，也可导出完整工作包。确认后点击“进入 Agent 生成”。
5. **Agent 生成**：在独立页面选择发现的本机 Agent，点击“开始生成 PPTX / HTML”，查看制作日志、取消任务和下载结果。缺少必填内容或真实文件会阻止生成演示；草稿和工作包仍可导出，工作包的 brief.md 会列出缺口。

## 使用本机 Agent

- 支持发现 PATH 及常见用户安装目录中的 **Codex CLI** 和 **Claude Code**，包括 Windows npm 安装的 CLI。只有版本探测成功的 Agent 可选择；发现成功不代表账号已登录或配额可用。需要先在终端完成相应 CLI 的登录和初始配置。
- 复用 Agent 本身的账号、模型和网络配置，不在页面收集 API Key。点击生成后，CLI 可能把 Brief 和使用的素材发往其模型服务，并消耗该账号的额度。
- 每次生成保存点击时的内容快照、真实素材及完整原始 Skill。可以继续编辑页面；修改内容需重新生成。每个服务同时运行一个任务，刷新页面后可恢复同一标签页的进度；服务重启后可从磁盘找回已有文件。
- 任务目录：`output/agent-runs/<任务 ID>/`。`work-package.zip` 是完整输入包，`workspace/` 是制作目录，最终文件在 `workspace/artifacts/`；`prompt.txt` 和 `job.json` 保留制作入口和最终状态。目录不覆盖旧任务，也不会自动删除素材。
- Codex 使用 `workspace-write`；Claude Code 使用编辑权限和限定的 Python / Node 工具许可。不会添加绕过全部审批的参数。依赖或权限不足导致不能生成、登录失效或超过 30 分钟会明确失败；被拒绝的辅助操作会保留提醒，可查看日志和制作说明。
- CLI 正常退出且存在匹配交付格式的非空有效文件后才显示完成。格式检查不等于内容或视觉质量审核，请打开结果检查。HTML 带配套资源时下载“全部产物 ZIP”，解压后打开。
- 本机服务检查请求来源和会话令牌；它不是面向公网或多用户的服务。不要通过反向代理暴露。生成的 HTML 以文件下载，不在应用同源页面中执行。

CLI 适配参考：[Codex 非交互模式](https://learn.chatgpt.com/docs/non-interactive-mode)、[Claude Code 编程调用](https://code.claude.com/docs/en/headless)。新增其他 Agent 时应增加受控适配器，而不是从浏览器接收任意命令。

预览用于说明视觉方向，不是最终 PPT，也不会承诺最终像素级复刻。配色是 YoursPPT 应用预设；新增视觉方案引用 PPT Master 的 visual-styles 原始参考。典雅金黑为应用自定义方案，参考 Editorial 原则。视觉规范不会替换用户的论证顺序。

旧版草稿中的“页面概括 / 关键结论”自动保留到可选“细节”，原“支持点”迁移为“内容”，原“参考素材”步骤自动跳转到第一步。编辑器使用本地打包的 CodeMirror 6；检查页与表格渲染使用随项目附带的 Marked 与 DOMPurify，原始 HTML 显示为文本，图片语法显示描述，不自动请求外部图片。

## Markdown 编辑快捷操作

- 在同一编辑区内直接输入与查看格式。标题、粗体、列表等边写边呈现；点击文字即可继续编辑。表格直接显示，点击表格可编辑其 Markdown 源码。
- 编辑框右上角的淡色“Markdown”按钮打开独立语法和快捷键说明，格式工具栏已移除；可直接输入语法或使用键盘快捷键。工作流介绍不再包含 Markdown 内容。
- 在 `- `、`* `、`+ ` 列表中回车自动续写下一项，有序列表自动递增，任务列表续写为未勾选项。空列表项再次回车退出列表；`Shift + Enter` 只换行。代码围栏内保留普通回车。
- `Ctrl / ⌘ + B` 加粗，`Ctrl / ⌘ + I` 斜体，`Ctrl / ⌘ + K` 插入链接；中文输入法确认文字时不会触发列表续写。
- `Ctrl / ⌘ + Z` 撤销，`Ctrl / ⌘ + Shift + Z` 重做。
- Markdown 原文即时保存，完整工作包保留所有字段的原文。细节和承接关系留空不阻止导出或生成。

## 一个完整工作包

默认下载 ZIP，解压后交出整个文件夹。右上角“设置”可用系统选择器设置导出文件夹，草稿 ZIP、工作包 ZIP 与 Agent 产物均使用此位置；目录句柄保存到当前浏览器，重开后浏览器可能要求重新授权，同名文件自动编号。未获授权时会显示失败提示，可重新选择目录或恢复浏览器下载。支持 File System Access API 和原始 DEFLATE 解压的浏览器还会显示“直接保存文件夹”；通过系统选择器选择位置，自动创建不重名的子文件夹，不覆盖已有内容。

```text
汇报主题/
├─ draft.json                  可恢复的草稿、页面位置与素材关联
├─ brief.md                    完整内容、逐页逻辑、缺口与 Agent 入口
├─ references/
│  ├─ manifest.json            稳定素材 ID、原名称、包内相对路径
│  └─ …                        真实文件，按原始字节保留
└─ style/
   ├─ selection.json           风格、准确色值、布局与交付形式
   ├─ guide.md                 执行要求与完整 Skill 入口
   └─ skills/
      ├─ guizang-ppt-skill/    需要此风格时附上完整原始快照
      └─ ppt-master/           选择 PPTX、学术简报或新增视觉方案时附上
```

Guizang 的视觉风格 + PPTX 会附上两套 Skill。完整 PPT Master 资源约 53 MB 压缩数据，含 12,953 个文件，所以导出包比较大。直接保存文件夹需要写入上万个文件，通常比 ZIP 下载慢，请保持页面打开。

写入文件夹失败时会保留 `INCOMPLETE.txt`，这类文件夹不能交给 Agent；请重新导出。没有能力选择文件夹的浏览器可使用 ZIP。

给 Agent 的提示词：

> 阅读工作包内的 brief.md 和 style/guide.md，遵循所附 Skill；保留我的逐页逻辑，先确认缺口，再生成指定格式的演示。

工作包不依赖本机 `vendor/` 绝对路径。Skill 要求的制作软件、Python／Node 依赖、模型或网络服务仍需由下游 Agent 的环境提供；“资源齐全”不等于能在任意环境直接生成 PPT。

## 草稿与隐私

- 文字即时备份到浏览器本地存储；文字和真实素材自动保存到 IndexedDB。刷新或重开页面可恢复。
- 右上角“设置”提供“保存草稿”“读取草稿文件”和“继续本机草稿”。草稿 ZIP 包含文字、未完成页面、当前页、风格和真实素材，无需先填完必填项。读取时验证文件大小、ZIP 结构和 CRC，损坏文件不会替换当前内容。
- 工作包也附带 draft.json，可在“读取草稿文件”中直接选择工作包 ZIP 恢复；素材尚未恢复时会记录为缺失并保留关联。旧版草稿 JSON 仍可读取，素材需重新选择。
- 清理浏览器数据、切换浏览器、隐私窗口或存储配额限制可能导致草稿丢失。重要内容请在设置中保存草稿 ZIP 或导出工作包，勿仅依赖自动保存。
- 每个素材最多 100 MB，累计最多 300 MB；最多 200 页。重复文件先核对字节，同名不同内容不会丢弃；导出时自动处理中文名称和重名路径。
- 离线准备与导出不会上传文件或自动向第三方发请求；本机 Agent 模式将工作包发送到当前电脑的本地服务，再由 CLI 按其配置调用模型。点击上游链接会打开外部仓库；下游 Skill 的网络行为由 Agent 管理。
- 可用 `Alt + ← / →` 切换步骤。返回已有步骤无需重新填写。

## 项目结构与开发

```text
index.html / styles.css / app.js   页面、视觉与交互
src/model.js                      草稿规范、校验与示例
src/storage.js                    本地存储、二进制恢复与导出目录记忆
src/draft.js                      草稿 ZIP 与工作包读取、素材字节校验
src/scroll.js                     滚动条显隐与内容边缘渐隐
src/styles.js                     视觉风格定义、色值与来源
src/markdown.js                   本地 Markdown 渲染与清理
src/markdown-editor.js            选区格式切换与列表续写
src/live-markdown-editor.js       CodeMirror 单区实时预览构建源
scripts/editor-build/            编辑器依赖锁定与离线打包入口
assets/lib/                       离线渲染库与原始许可证
src/zip.js / export.js / folder.js ZIP、Brief 与文件夹交付
src/agent.js                      最后一步的本机 Agent 连接与任务界面
server/                          Agent 发现、执行、本机接口与产物检查
scripts/serve.cjs                 本机工作区启动入口
assets/skills/                    预压缩离线 Skill 资源
scripts/build-skill-assets.cjs    从原始快照生成资源
tests/                           模型、打包、文件夹与浏览器验收
vendor/                          完整上游快照，保持原文件
```

运行时使用本地随附编辑器与渲染库，不需要联网或 npm 构建。修改编辑器构建源后，在项目目录运行 `npm --prefix scripts/editor-build ci --ignore-scripts` 与 `npm --prefix scripts/editor-build run build`，更新 `assets/lib/live-markdown-editor.bundle.js` 和第三方许可证记录。开发测试使用 Node.js 22+、Python 3；浏览器验收另外需要 Playwright 和本机 Chrome。文件夹测试覆盖重名保护与失败标记；浏览器原生写入测试在 localhost 安全来源下用隔离的 OPFS 目录替代系统选择器，未自动操作用户真实磁盘位置。

```powershell
node --test tests/draft.test.cjs tests/model.test.cjs tests/markdown-editor.test.cjs tests/folder.test.cjs tests/export.test.cjs tests/visual-export.test.cjs
node --test tests/agent-client.test.cjs tests/agents.test.cjs tests/bridge.test.cjs
node tests/workspace-browser-smoke.cjs
node tests/browser-smoke.cjs
node tests/markdown-browser-smoke.cjs
node tests/agent-browser-smoke.cjs
```

已有 Playwright 未安装在当前项目时，可将其模块目录作为第二个参数传给浏览器脚本。截图和下载校验产物位于 `output/playwright/`。

更新上游快照后，重新生成离线资源：

```powershell
node scripts/build-skill-assets.cjs
```

构建器保留完整子树、目录、许可证、来源说明、赞助说明与 attribution guard，仅排除 Git 内部数据和真实缓存。测试独立解压 ZIP 并校验原始文件哈希、UTF-8 名称、CRC、相对路径与 guard。

## 上游与许可

- [Guizang PPT Skill](https://github.com/op7418/guizang-ppt-skill)：本地快照随附 AGPL-3.0。
- [PPT Master](https://github.com/hugohe3/ppt-master)：本地快照随附 MIT。

原始许可证、版权和 attribution guard 不删改。第三方字体、图片等可能另有条款。开源发布前仍需确定 YoursPPT 自有代码的许可证，并核对分发的上游资源；详见 `vendor/README.md`。
