//     0123456789
// Note: neck line (`> ^ <` etc.) removed from all frames.
// Neck is now a random-event animation driven by catEffects (see index.ts).
const defaultFrame = [
  "  /\\_/\\   ",
  " ( o.o )  ",
  " /|   |\\  ",
  "(_|   |_) ",
];

const blinkFrame = [
  "  /\\_/\\   ",
  " ( -.- )  ",
  " /|   |\\  ",
  "(_|   |_) ",
];

const happyFrame = [
  "  /\\_/\\   ",
  " ( ^ω^ )  ",
  " /|   |\\  ",
  "(_|   |_) ",
];

const thinkingFrame = [
  "  /\\_/\\   ",
  " ( o_o )  ",
  " /|   |\\  ",
  "(_|   |_) ",
];

const sleepingFrame = [
  "  /\\_/\\   ",
  " ( -.- )  ",
  " /|   |\\  ",
  "(_|   |_) ",
];

export const frames = {
  default: defaultFrame,
  blink: blinkFrame,
  happy: happyFrame,
  thinking: thinkingFrame,
  sleeping: sleepingFrame,
};
