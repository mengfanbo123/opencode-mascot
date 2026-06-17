# Changelog

本项目版本号遵循 semver。每个版本列出主要变更。

## [0.9.1] - 2026-06-17

### Fixed
- **P1 listener 泄漏**：sidebar 组件 unmount（hot reload/TUI重挂载）后，8 个 event listener（session.status/session.idle/mascot.switch/mascot.toggleWalk + onCelebrate/onVersion/onScatter/onPropShow）仍挂在 event bus，新组件 mount 时重复累积，旧闭包操作已 destroy 的 renderer 导致 timer 永久泄漏。修复：接口 `api.event.on` 返回 unsubscribe 函数，所有 listener push 到 `singletonUnsubs` 数组，onCleanup 遍历调用
- **P1 perf 降级被 setState 绕过**：perf guardrail 降级 → stopFlash → opencode 重发 session.status（busy/retry 频繁）→ setState("busy") 无视 perfDegraded 直接重建 flashTimer → 降级失效。修复：setState 创建 flashTimer 前检查 `if (!perfDegraded)`
- **P1 effects.render 偷读 jumpOffset 破坏 memo**（最严重）：memoizedLines 声称不追踪 jumpOffset，但 `if (effects?.render)` 块内构造 renderCtx 时调用了 `jumpOffset()` 和 `dragging()`，yueer/baozi/cat 三个内置角色全部定义了 effects.render。跳跃时 setJumpOffset 三连击触发 memo 重算 → lines.map 全量重建所有 Text 节点，memo 的「省 lines 重算」价值在跳跃期间失效。修复：从 EffectRenderCtx 类型移除 jumpOffset 字段（位移由 `<box top>` 承担），yueer render 删除 jumpOffset 分支，dragging 保留并显式加入 memo 追踪列表
- **P2 perf recover 未 stopFlash**：性能恢复重建 flashTimer 前未先 stopFlash，边缘场景 timer 泄漏。修复：recover 时先 stopFlash 再重建
- **P2 enterPhase1 globalJumping 残留**：两个 early return（renderer null + prop null）未恢复 globalJumping=false 和 currentPhase=0，导致后续 busy 触发 Phase Machine 时 `if (globalJumping) return` 直接退出。修复：return 前恢复状态

## [0.9.0] - 2026-06-17

### Changed
- **Phase Machine 改有限状态机**：原 P1→P2→P3→P1 无限循环导致渲染管线过载（native abort × 105 次），改为 P1→P2→P3→回 P2 停住直到 idle。加 `phaseCycleCompleted` 标志，P2 判断是否进 P3，长任务稳定停在 P2 vibe coding，视觉无感知
- **ASCII 行 createMemo 化**：element()/propElement()/secondaryPropElement 的 lines 计算抽到 createMemo，frame 不变时不重建 text 节点树
- **flashColor 解耦**：flashColor 从 element() 追踪列表移除，solid fine-grained 响应式下 `<text fg={flashColor() ?? fg}>` 编译为 getter，flashColor 变化只更新 DOM fg 属性不重建节点
- **单例 timer 全清 destroy() API**：blink/expression/breath/walk/jump/effectTimers/idleSleep/idlePad/idleBox 全部存引用，新增 destroy() 方法彻底清理，onCleanup 扩展 + sidebar 组件卸载时调用 destroy + stopPhaseMachine，修复单例设计 timer 泄漏（跨会话累积）

### Added
- **性能护栏**：监控 memoizedLines() 执行耗时，>50ms 连续 2 次自动降级（停 flashTimer），<20ms 连续 5 次自动恢复，日志记录降级/恢复事件

## [0.8.4] - 2026-06-17

### Fixed
- **紧急止血 TUI 卡死**：v0.8.0+ 引入 Phase Machine 无限循环 + 16ms timer 风暴 + flashColor 120ms 高频重建，导致 opentui 渲染管线过载，native 后端 abort（opencode.log 中 error=Aborted × 105 次）
  - Phase Machine 全局开关 `PHASE_MACHINE_ENABLED=false` 禁用无限循环（回退 v0.6.x 简单 busy 闪烁）
  - flashColor 降频 120ms → 250ms
  - stopPhaseMachine 补全清理 busyPacingTimer + globalFallTimer（原遗漏导致 timer 泄漏）
  - 16ms interval → 50ms（startFlySequence/startDiveSequence/startPadSlideOut/fallToWorkY 四处）

## [0.8.3] - 2025-06-17

### Fixed
- 电源线 p3→p1 转场残留：pad 滑出时电源线跟随小人跳出，修复为 pad slideOut onDone 时 `setGlobalPowerLineVisible(false)`，enterPhase1 再显示

## [0.8.2] - 2025-06-17

### Added
- phase machine 完整流程：phase1（跳机箱+爬梯+dive钻入）→ phase2（显示器+vibe彩色闪动+小人罚站）→ phase3（pad peek躲猫猫+三prop同屏）→ phase1 循环
- dive 钻入机箱动画：fall 完成后 posY 下沉3格，zIndex 降到40被机箱遮挡，500ms 后 hidden 进入 phase2
- vibe coding 彩色闪动：phase2 显示器上方显示 `ᵛⁱᵇᵉ ᶜᵒᵈⁱⁿᵍ` 火星文，6色循环（品红/青/黄/绿/橙/玫红），300ms 切色 + dots 打字动画同步
- phase3 pad peek 躲猫猫：7步序列探出缩回，pad 与小人联动（小人眼睛 `<_<` 瞟向 pad + pacing 持续向左靠近模拟拽 pad）
- 机箱电源线：phase1/phase2 期间从机箱右侧延伸灰色 `━` 横线到 sidebar 最右被边缘裁掉
- pad 滑出后下落动画：pad 消失→小人跳出→抬高10格→easeInQuad 下落→落地停留→再跳机箱

### Changed
- pc-case 变窄：CW 9→7（总宽12→10），更像机箱
- phase3 时长缩短：pad peek 7步350ms→4步300ms，总时长 120s→30s
- idle pad 位置修复：独立 box 渲染，left=posX()-1, top=posY()-2, zIndex=45（参考 phase3 pad 位置，避免被兄弟元素遮挡）
- vibe 隐藏时机：从 enterPhase3 入口改为 pad slideOut onDone（pad 消失时 vibe 才跟着隐藏）

### Fixed
- 梯子不可见：box 加 `flexDirection="column" width={3}`（opentui 默认 row 水平排列裁掉）
- 小人爬完掉左边：fall 动画 onComplete 删 `setGlobalOnMachine(false)`，fall 后 onMachine 保持 true
- pacingX 残留偏移：stopBusyPacing 清 timer 时 reset pacingX=0
- 多次 busy 竞态：加 phaseSessionId token，stopPhaseMachine 时 bump，异步回调执行前 check sid 丢弃旧回调
- onCleanup 误调 stopPhaseMachine：组件重挂载→phaseSessionId++→enterPhase1 回调被 token 判废，去掉 stopPhaseMachine 调用，phase machine 单例跨挂载保持
- 双击切角色 bug：switchToNext 只传 mainProp 丢 secondaryProp + characterHidden 用 oldPropFront 判断错，修复为传 getSecondaryProp + 真实 getCharacterHidden
- pad 联动失效：pacingSteps 正负交替抵消净位移≈0，改为持续递增负值 `[-2,-3,-4,-5]`
- 眼睛瞟左失效：peekingPad 判断在 thinking/busy 脸替换之前被覆盖，移到 render 末尾最后生效
- p3→p1 转场 pad 隐藏后小人立即跳机箱：加 800ms 落地停留延迟

## [0.8.0] - 2025-06-16

### Added
- 道具系统：显示器（laptop）、Pad、立体箱子（box）三种道具
- 显示器：16×5，20帧火星文随机切换（~$ᵒᵖᵉⁿᶜᵒᵈᵉ 提示符 + thinking/writing/git/bug/npm/compile/test/refactor/deploy/merge/lint/format/review/oops/hmm/help），busy 状态主力道具（65% 触发，side-right）
- Pad：18×9，15帧游戏轮播（贪吃蛇/俄罗斯方块/2048），月儿在屏幕里打游戏又菜又爱玩（开局→走两步→game over→哭→不服→重开），busy 状态变体道具（35% 触发，front 覆盖，角色隐藏）
- 立体箱子：14×8，4帧等轴测动画（关闭→抖动→打开→月儿蹲着露头→冒头），正面ᵇᵒˣ火星文，首页启动下落仪式（加速曲线+延迟2秒摇晃）
- busy 踱步：小步焦急来回走（±3，走3秒停2秒），显示器不跟随移动
- idle Pad：闲置30秒后40%概率触发，小人跳进 Pad 打游戏10-20秒
- idle 回箱子：闲置1分钟后5%概率触发（每分钟最多1次），月儿藏进箱子3秒后跳出 bounce
- 降落动画：busy/idle 触发道具时自动降落到工作区域（easeInQuad 500ms）
- 爆炸效果升级：白色文字改为红/橙/黄循环闪烁（适配 light/dark 主题），ᵇᵒᵒᵐ~ 后加 💥

### Changed
- renderer/listener/state 单例化：模块级变量跨组件挂载保持，解决 busy 触发 sidebar 重挂载导致状态丢失
- prop 独立 box 渲染：fragment 同级 + position="absolute"，解决拖拽卡顿、边框变形、z-index 分层
- onCleanup 不清持续 timer：blink/breath/effect/propTimer/idleSleep/walk 跨挂载保持

### Fixed
- 首页 prop box 挤压 bottom 元素（加 position="absolute" 脱离文档流）
- prop 出现时角色腿闪烁覆盖 Pad（hideForProp 自动隐藏 + 组件层 front 时不渲染角色 box）
- busy 后双击切换的角色被重置回月儿（userOverride 保留）
- 版本号显示不清（emitVersion 独立显示5秒，原混在庆祝气泡里）
- 首页箱子下落打散重组（去掉启动 scatterIn）
- 跳转工作页+cerebro 注入后 prop 动画静止（onCleanup 不清 propTimer）

## [0.7.0] - 2025-06-15

### Added
- 道具系统架构：PropPack 类型 + prop-loader 加载器 + ascii-renderer 道具渲染层
- 首版笔记本/Pad/箱子道具（后被 v0.8.0 重构替换）

### Fixed
- 版本号检测后头顶清晰显示5秒
- busy 结束后双击切换角色保留

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
