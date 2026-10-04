# Quiet editor and scroll chrome implementation plan

**Goal:** 隐藏静止状态的滚动条、缩小滑块并移除箭头与轨道，编辑器只保留 Markdown 帮助入口，并柔化滚动边缘。

**Architecture:** src/scroll.js 统一观察滚动位置和内容尺寸，以 class 控制透明滑块与上下渐隐；保留原生滚动和左右独立面板。Markdown 帮助使用独立原生 dialog，编辑器和键盘操作继续复用 CodeMirror。

**Tech Stack:** Browser JavaScript, CSS masks, ResizeObserver, MutationObserver, native dialog, Playwright acceptance.

- [x] app.js 移除格式工具栏与相关点击分发，加入每个编辑框的 Markdown 帮助按钮。
- [x] index.html 将 Markdown 说明移到独立弹窗，使用介绍只保留工作流内容。
- [x] src/scroll.js / styles.css 添加滚动时滑块显示、650ms 停止后隐藏与位置感知渐隐；渲染后刷新观察。
- [x] 更新现有 Markdown 和 workspace 验收，覆盖帮助按钮、快捷键、原生滚动、首尾渐隐和小屏布局。
- [x] 更新 README，运行相关浏览器验收并复核截图。

Validation: 22 model/editor tests passed; Markdown, workspace, full localhost export, and Agent browser acceptance passed. Workspace acceptance checks 5px scrollbar width, transparent idle thumb and track, removed arrows, reveal/hide during scroll, first/middle/last fade states, internal CodeMirror scrolling, and help dialogs. Desktop and mobile screenshots inspected in output/playwright/.
