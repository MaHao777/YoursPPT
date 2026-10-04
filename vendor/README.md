# 完整上游快照

YoursPPT 保留用户指定的两个上游项目，作为风格、预设、制作工具与验收要求的离线来源。

- `guizang-ppt-skill/`：完整 Guizang 快照，随附 `LICENSE`（AGPL-3.0）。[官方仓库](https://github.com/op7418/guizang-ppt-skill)。
- `ppt-master-vendored/skills/ppt-master/`：完整 PPT Master Skill 子树，12,953 个文件，保留 `SKILL.md`、工具、模板、字体、许可证、来源说明、赞助说明和 attribution guard。[官方仓库](https://github.com/hugohe3/ppt-master)。整个仓库随附 MIT 许可证。

`scripts/build-skill-assets.cjs` 从这两处读取原始内容，按文件预压缩生成 `assets/skills/*.js`。不改变上游文件，不去掉保护声明或依赖资产。生成资源供浏览器离线按需加载并打入工作包；页面本身不直接执行上游 Python、Node 或生成器。

导出路由：

- 电子杂志／瑞士网格 + HTML：完整 Guizang。
- 电子杂志／瑞士网格 + PPTX：完整 Guizang + 完整 PPT Master。
- 学术简报：完整 PPT Master，视觉方法采用 `academic-research`，配色明确标记为 YoursPPT 应用预设。

版权、许可证、第三方资源条款和归属说明应随分发保留。PPT Master 的 `attribution_guard.py` 原样保留；下游 Agent 须先运行并遵循其原始入口。Guizang 更新检查和来源说明遵循原入口，离线检查无法执行时如实说明。

本目录可能还保留历史克隆尝试或工作副本；构建器只使用上述两处，不读取其他副本。本项目不表示上游背书，开源发布也需核对各资源的分发条件。
