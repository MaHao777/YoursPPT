# PPT Master

- 官方仓库：[https://github.com/hugohe3/ppt-master](https://github.com/hugohe3/ppt-master)
- 包内 Skill ID：`pptMaster`；入口：`style/skills/ppt-master/SKILL.md`

## 在本项目中的作用

完整制作 Skill 会在选择 PPTX 或学术简报时随工作包附上，重点帮助下游 Agent 关注：

- 文本框、形状、连接线、表格和图表应尽可能保持为可编辑对象；
- 文档/Markdown 到 PPTX 的流程需要把内容、版式和素材来源分开处理；
- speaker notes、动画、模板/母版和导出后验证属于交付链，而非 brief 本身的事实；
- 图表应保留数据来源、单位和可追溯的输入，而不是只嵌入一张静态图片。

## 不负责的部分

PPT Master 不替 YoursPPT 决定叙事，不会自动使缺失来源变成可信事实，也不改变本项目的 Markdown schema。它的实现方式、依赖、模型和许可证必须由实际使用它的下游 Agent 重新核验。

## 下游约束

1. 先完成 brief 的事实、冲突和缺口检查，再调用原生 PPT 生成流程。
2. 任何“原生可编辑”声明都要实际打开生成的 PPTX，检查对象是否可选、文本是否可编辑、图表数据是否存在。
3. 如果输入只有图片或截图，明确标记哪些内容不可编辑；不要把图片化结果描述成原生图表或原生文字。
4. 保留每页来源和演讲备注的对应关系；页序变化后重新检查备注是否串页。
5. 保留随包完整快照及其许可证、来源说明和 attribution guard。先完整阅读原始入口，运行其 guard，再按要求配置实际制作环境。

## 与 YoursPPT 的连接

当前导出用 `style/selection.json` 的 `delivery: pptx` 表达可编辑交付，`style` 可为 `editorial`、`swiss` 或 `research`。前两种 PPTX 路由组合 Guizang 的视觉系统与 PPT Master 原生制作；学术简报使用 `academic-research` 方法与 YoursPPT 明示的配色。发生冲突时说明取舍，不改变用户确定的事实和逐页逻辑。
