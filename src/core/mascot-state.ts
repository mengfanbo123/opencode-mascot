import { createSignal } from "solid-js";

const [mascotVisible, setMascotVisible] = createSignal(true);
const [phaseMachineOn, setPhaseMachineOn] = createSignal(true);

// 当前形象名 — pad 等道具按此信号路由 frames
const [globalCurrentName, setGlobalCurrentName] = createSignal<string>("yueer");

// switchToNext 自增 → sidebar_content 重挂 → 渲染层 renderers[currentName()] 读新值
// 根因：createMemo/IIFE 在 opentui solid 不可靠，切形象后 propElement 不重算
const [forceSidebarRebuild, setForceSidebarRebuild] = createSignal(0);

// ─── Slot heartbeat：派子代理视图切换时防止 setState 打到失效 scope ───
// sidebar_content 被 opencode 调用 = 视图可见。handler 检测心跳超时 → buffer pendingState。
// 视图回归 sidebar_content 重新被调用 → auto-flush。
// 修复：派子代理 → session.status=busy + opencode 视图切走 → setState 打到吊空的 createRoot scope → insertBefore OOM
let lastSlotActiveTs = 0;
const SLOT_GUARD_MS = 500;

const markSlotActive = () => { lastSlotActiveTs = Date.now(); };
const isSlotStale = () => Date.now() - lastSlotActiveTs > SLOT_GUARD_MS;

export {
  mascotVisible,
  setMascotVisible,
  phaseMachineOn,
  setPhaseMachineOn,
  globalCurrentName,
  setGlobalCurrentName,
  forceSidebarRebuild,
  setForceSidebarRebuild,
  markSlotActive,
  isSlotStale,
  SLOT_GUARD_MS,
};
