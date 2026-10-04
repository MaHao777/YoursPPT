# 上游参考边界

本目录记录 YoursPPT 可引用的上游入口和离线参考说明。导出 ZIP 时，用户拖拽或选择的实际资料会复制到根目录 `references/`；本目录的说明文件不会把本机路径暴露给 Agent，也不会把上游项目变成 YoursPPT 的运行时依赖。

| 参考键 | 官方仓库 | 本项目参考范围 |
| --- | --- | --- |
| `guizang-ppt-skill` | [op7418/guizang-ppt-skill](https://github.com/op7418/guizang-ppt-skill) | Editorial/Swiss 的视觉方向、版式节奏、截图与演讲呈现检查 |
| `ppt-master` | [hugohe3/ppt-master](https://github.com/hugohe3/ppt-master) | 原生可编辑 PPTX 的对象模型、图表/备注和交付验收关注点 |

## 使用规则

- 资料只能通过拖拽或文件选择器进入工作流。Agent 不应要求用户手填路径，也不能假定自己能访问选择器之外的文件。
- brief 只记录用户选择的风格键、参考键和 ZIP 内的相对来源，不记录要求 Agent 猜测的本机绝对路径。
- 风格预设只约束视觉起点。用户决定叙事与逻辑，Agent 负责执行、核验和追问；参考仓库不能替用户决定页序或结论。
- `vendor/guizang-ppt-skill/` 与 `vendor/ppt-master-vendored/skills/ppt-master/` 是本地完整快照。构建器将其预压缩为离线资源，按所选风格与格式打入工作包，原始许可证与 attribution guard 保持不变；分发条件以各自许可证及第三方资源条款为准。
- 使用上游内容前必须同时检查快照中随附的许可证、NOTICE 和官方仓库当前版本；本文件的链接和许可证摘要都不是法律意见。

详见 [`guizang-ppt-skill.md`](guizang-ppt-skill.md)、[`ppt-master.md`](ppt-master.md) 和 [`vendor/README.md`](../vendor/README.md)。
