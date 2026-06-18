import { createSignal } from "solid-js";

const [mascotVisible, setMascotVisible] = createSignal(true);
const [phaseMachineOn, setPhaseMachineOn] = createSignal(true);

// 当前形象名 — pad 等道具按此信号路由 frames
const [globalCurrentName, setGlobalCurrentName] = createSignal<string>("yueer");

// switchToNext 自增 → sidebar_content 重挂 → 渲染层 renderers[currentName()] 读新值
// 根因：createMemo/IIFE 在 opentui solid 不可靠，切形象后 propElement 不重算
const [forceSidebarRebuild, setForceSidebarRebuild] = createSignal(0);

export {
  mascotVisible,
  setMascotVisible,
  phaseMachineOn,
  setPhaseMachineOn,
  globalCurrentName,
  setGlobalCurrentName,
  forceSidebarRebuild,
  setForceSidebarRebuild,
};
