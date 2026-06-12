import type { MascotPack } from "./types"
import { yueerPack } from "../builtins/yueer"
import { baoziPack } from "../builtins/baozi"

const BUILTINS: Record<string, MascotPack> = {
  yueer: yueerPack,
  baozi: baoziPack,
}

const ALL_NAMES = Object.keys(BUILTINS)

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function loadAllMascots(): Record<string, MascotPack> {
  return { ...BUILTINS }
}

export function getMascotNames(): string[] {
  return [...ALL_NAMES]
}

export function getRandomMascot(): MascotPack {
  return randomPick(Object.values(BUILTINS))
}

export async function loadMascot(options?: Record<string, unknown>): Promise<MascotPack> {
  const mascotName = (options?.mascot as string) || "random"

  if (mascotName === "random") return getRandomMascot()
  if (BUILTINS[mascotName]) return BUILTINS[mascotName]

  return getRandomMascot()
}
