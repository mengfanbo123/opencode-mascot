# Changelog

本项目版本号遵循 semver。每个版本列出主要变更。

## [0.6.0] - 2025-06-15

### Added
- 新角色：小猫（cat）——橘猫，5帧表情 + 6种专属动画（甩尾巴/耳朵抖/瞳孔放大/踩奶/呼噜气泡/拖拽炸毛）
- 总能力从 33+ 提升到 39+

## [0.5.9] - 2025-06-14

### Fixed
- sidebar 躲猫猫恢复后跳跃+跺脚冲突：bounce 只在 idle 状态触发，不再和 busy/thinking 动画叠加
- returnToView 加 stopReturn 防重复调用导致多个 interval 竞争

## [0.5.8] - 2025-06-14

### Fixed
- README 跺脚动画描述与代码一致（单脚跺，左脚固定右脚抬起）
- 移除 CI workflow（账号计费锁定 + 国内卡无法支付 GitHub）

## [0.5.7] - 2025-06-14

### Added
- LICENSE 文件（MIT）
- CONTRIBUTING.md
- CHANGELOG.md

### Removed
- CI workflow（GitHub Actions typecheck）——账号计费锁定，暂停 CI

## [0.5.6] - 2025-06-14

### Changed
- 启动及状态切换默认锁定月儿，不再随机选择包子
- README 状态联动描述与实际代码一致

### Added
- LICENSE 文件（MIT）
- CONTRIBUTING.md
- CHANGELOG.md

### Removed
- CI workflow（GitHub Actions typecheck）——账号计费锁定，暂停 CI

## [0.5.5] - 2025-06-14

### Fixed
- 跺脚动画改为单脚（左脚固定，右脚抬起）
- 版本号显示用独立 signal，不再被 celebrate/scatter 覆盖
- 跺脚支持 busy 状态
- README 安装方式修正为 tui.json plugin 数组格式

## [0.5.0] - 2025-06-13

### Added
- 天降炸弹随机事件：idle 时 10% 概率，引线燃烧 + 倒计时 + 爆炸 + 重组
- 工作页首次收到 session.status 时触发重组动画
- 重组 scattered flag 互斥，防止重复触发

## [0.4.28] - 2025-06-13

### Changed
- 首页摔坏概率从 40% 提至 50%
- 摔坏位置扩展到全页（posY -3~-18 行）

### Fixed
- happy 状态呆毛方向修正
- 包子 sleep 后删除残留 Zzz
- initY 范围缩至 -1~-4 避免藏对话框后面

## [0.4.27] - 2025-06-12

### Added
- 启动打散聚合动画（行级偏移，15 帧线性插值归零）
- 跳跃后摔坏重组（bounce 结束 30% 概率，1.5s 后 scatterIn）
- Zzz 火星文上标 `ᶻᶻᶻ`

### Fixed
- Zzz 断头问题——renderer box 加 alignItems=flex-start
- 首页 Zzz 行宽溢出断头
- updater 锁泄漏——stale lock 从 5 分钟改 30 秒
- 拖拽卡顿根因——onMouseOut 中断拖拽

## [0.4.x] - 2025-06-10 ~ 2025-06-12

### Added
- 拖拽交互（Alt + 鼠标拖拽自由移动）
- 拖拽变色（8 色高亮闪换）
- 拖拽火星文气泡
- 双击切换角色
- 躲猫猫系统（工作页边缘 hide/peek/return）
- 文件 logger 替换 console.error
- selectable=false 防选中

### Fixed
- zIndex 拉到 9999 确保覆盖对话框
- 拖拽丝滑——移除 drag 中 clearSelection
- sidebar 小人不显示——外层 box 加 height=100%
- sleep 断头——内层 absolute box 去掉 alignItems=center
- 扩大命中区 padding=1 width=16 height=7

## [0.1.0] - 2025-06-09

### Added
- 项目初始化
- 月儿角色（5 帧表情 + 专属动画）
- 包子角色（5 帧表情 + 专属动画）
- 基础渲染引擎（blink/breath/walk/jump/sleep）
- 首页 + 工作页双场景
- 自动更新机制
