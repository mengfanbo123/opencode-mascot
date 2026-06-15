import type { PropPack, PropTrigger } from "./types";
import { laptopProp } from "../builtins/props/laptop";
import { padProp } from "../builtins/props/pad";
import { boxProp } from "../builtins/props/box";

// 内置道具注册表
const BUILTIN_PROPS: Record<string, PropPack> = {
  laptop: laptopProp,
  pad: padProp,
  box: boxProp,
};

const loaded: Record<string, PropPack> = { ...BUILTIN_PROPS };

export function registerProp(prop: PropPack): void {
  loaded[prop.name] = prop;
}

export function getProp(name: string): PropPack | undefined {
  return loaded[name];
}

export function getAllProps(): Record<string, PropPack> {
  return loaded;
}

/** 按 trigger 筛选道具，按 weight 加权随机选一个 */
export function pickPropByTrigger(trigger: PropTrigger): PropPack | null {
  const candidates = Object.values(loaded).filter((p) => p.trigger === trigger);
  if (candidates.length === 0) return null;
  const totalWeight = candidates.reduce((sum, p) => sum + (p.weight ?? 1), 0);
  let r = Math.random() * totalWeight;
  for (const p of candidates) {
    r -= p.weight ?? 1;
    if (r <= 0) return p;
  }
  return candidates[candidates.length - 1];
}
