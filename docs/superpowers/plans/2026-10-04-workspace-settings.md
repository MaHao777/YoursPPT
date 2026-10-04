# Workspace and saving implementation plan

**Goal:** 固定导航与顶栏，让内容和左右面板独立滚动，整理编辑器与主题色，并提供可恢复未完成内容的保存设置。

**Architecture:** 沿用原生 JS 与 CodeMirror。页面容器控制滚动；IndexedDB 保存导出目录句柄；ZIP 草稿复用现有 ZIP 写入器，包含 draft.json 和原始素材，兼容旧 JSON。

**Tech Stack:** HTML / CSS / JavaScript / IndexedDB / File System Access / Node browser smoke tests.

- [x] 修改 app.js 与 styles.css：stage-body、固定头尾、左右独立滚动、同页刷新保留滚动位置。
- [x] 修改编辑栏外观，移除语法提示，index.html 使用介绍添加语法和快捷键说明。
- [x] src/styles.js 学术简报增加红白、蓝白、紫白三套主题色，验证预览与工作包色值。
- [x] 新增 src/draft.js：包含素材的 ZIP 草稿写入、受大小与 CRC 校验的读取、旧 JSON 导入。
- [x] src/storage.js / folder.js 保存目录句柄与防覆盖文件写入；index.html / app.js 新增设置和开始页三个入口。
- [x] src/export.js 工作包包含 draft.json，界面允许未完成草稿导出并记录缺口；Agent 生成继续检查完整性。
- [x] 新增草稿往返与损坏输入单元测试、滚动和设置浏览器验收，更新原有浏览器流程与 README，检查截图。

Validation: 46 model/editor/export/draft tests and 43 Agent tests passed. Four browser acceptance scripts passed, including file://, localhost, native OPFS folder writing, Markdown typing, responsive layouts and independent wheel scrolling. Screenshots reviewed under output/playwright/.
