import { createSignal } from "solid-js";

const [mascotVisible, setMascotVisible] = createSignal(true);
const [phaseMachineOn, setPhaseMachineOn] = createSignal(true);

// 当前形象名 — pad 等道具按此信号路由 frames
const [globalCurrentName, setGlobalCurrentName] = createSignal<string>("yueer");

export {
  mascotVisible,
  setMascotVisible,
  phaseMachineOn,
  setPhaseMachineOn,
  globalCurrentName,
  setGlobalCurrentName,
};
