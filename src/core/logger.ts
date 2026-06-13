import { appendFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const LOG_DIR = join(homedir(), ".cache", "opencode", "logs");
const LOG_FILE = join(LOG_DIR, "mascot.log");

function ensureDir(): void {
  if (!existsSync(LOG_DIR)) {
    try { mkdirSync(LOG_DIR, { recursive: true }); } catch {}
  }
}

export function log(level: string, message: string): void {
  ensureDir();
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  try {
    appendFileSync(LOG_FILE, `${ts} [${level}] ${message}\n`);
  } catch {}
}
