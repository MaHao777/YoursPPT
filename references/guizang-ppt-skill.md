# Guizang PPT Skill

- 官方仓库：[https://github.com/op7418/guizang-ppt-skill](https://github.com/op7418/guizang-ppt-skill)
- 本地参考快照：`vendor/guizang-ppt-skill/`
- 包内 Skill ID：`guizang`；入口：`style/skills/guizang-ppt-skill/SKILL.md`

## 在本项目中的作用

选择电子杂志或瑞士网格时，完整原始快照随包附上，重点帮助下游 Agent 做以下判断：

- 选择 Editorial 或 Swiss 的整体视觉方向；
- 组织网格、留白、标题层级、主题色和页面节奏；
- 将截图、图表、信息图放入明确的版式槽位，并保持证据可读；
- 为每页准备稳定的演讲备注、承接关系和交付前检查。

## 不负责的部分

它不定义 YoursPPT 的 Markdown 字段、不替用户补充事实，也不强制下游 Agent 使用其 HTML 模板。不要把主题色、布局编号或模板 class 当作 brief 中的事实；它们只能作为视觉实现提示。

## 下游约束

1. 先读 brief 的 `purpose`、`key message` 和 `sources`，再选布局。
2. 需要 Swiss 方向时，保持版式系统一致；不要随意混用另一套主题的组件规则。
3. 截图和数据图优先保真与可读，不能为了铺满画布裁掉关键文字或单位。
4. 保留原始许可证、来源和赞助说明，遵循原始 SKILL 对其展示位置和边界的要求。
5. 生成后做逐页检查，并把无法验证的素材、字体或布局能力报告出来。

## 与 YoursPPT 的连接

当前导出在 `style/selection.json` 中使用 `style: editorial` 或 `style: swiss`，并写入准确主题色、排版规则与格式。HTML 路由使用 Guizang；PPTX 路由还附上完整 PPT Master。最终页面仍服从用户内容、来源和交付目标。
