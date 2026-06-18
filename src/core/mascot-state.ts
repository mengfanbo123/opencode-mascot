import { createSignal } from "solid-js";

const [mascotVisible, setMascotVisible] = createSignal(true);
const [phaseMachineOn, setPhaseMachineOn] = createSignal(true);

export { mascotVisible, setMascotVisible, phaseMachineOn, setPhaseMachineOn };
