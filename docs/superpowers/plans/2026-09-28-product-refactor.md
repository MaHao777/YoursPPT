# YoursPPT Product Refactor Implementation Plan

**Goal:** 完整可用、简洁清晰且适合实际汇报准备的本地工作流。

**Architecture:** 保留直接打开 index.html 的能力。经典脚本注册到 YoursPPT 命名空间；将状态与草稿、风格目录、ZIP、导出和界面拆开。上游 Skill 以可重复生成的浏览器资源包分发，导出时恢复完整文件树。

**Tech Stack:** 原生 HTML/CSS/JS、IndexedDB、localStorage、Node 内置工具（构建/验收）。

### 1. 核查缺陷
- [x] 跟踪复制 ID、草稿丢失、不完整检查页、ZIP central directory、包外路径依赖。
- [x] 用 Node 与独立 ZIP 读取器验证 Unicode、CRC、目录尺寸、二进制保真。

### 2. 状态与导出
- [x] 创建 src/model.js：唯一 ID、字段校验、稳定素材 ID、重排与示例草稿。
- [x] 创建 src/storage.js：IndexedDB 保存 File 数据，localStorage 文本备份；错误提示、恢复与草稿导入导出。
- [x] 创建 src/zip.js、src/export.js：自包含 Markdown、相对路径、文件清单、完整上游 Skill、所选样式配置。
- [x] 创建 scripts/build-skill-assets.cjs：保留许可证与来源快照字节，重建离线资源。

### 3. 交互与视觉
- [x] 重构 index.html、styles.css、app.js：欢迎/介绍，基本信息、逐页内容、素材、风格、检查交付。
- [x] 一次编辑一页；支持增删复制排序、关联真实素材、逐页修改入口、完整检查、字段级错误。
- [x] 风格主题色选择、可翻页预览、交付格式选择；预览明确标注为版式示意。
- [x] 文件/文件夹选择、拖拽、重名去重策略、素材持久化与上传反馈。

### 4. 验收与文档
- [x] Node 核心测试覆盖身份、序列化、非法草稿、素材路径和 ZIP。
- [x] 真浏览器验收：完整工作流、复制独立编辑、刷新恢复、素材内容匹配、ZIP 解压、移动端溢出。
- [x] 更新 README 与示例；列明浏览器支持、离线资源、运行与构建方法及真实限制。

追加交付：src/folder.js 支持直接保存到用户选择的位置，创建唯一子文件夹并保留失败标记。原生文件接口通过浏览器 OPFS 校验，系统选择器边界在自动化测试中替换。

No repository commits: 当前目录无根 Git 仓库，不替用户初始化或发布。
