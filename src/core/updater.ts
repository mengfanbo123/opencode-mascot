import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { homedir, tmpdir } from "node:os";
import { openSync, closeSync, unlinkSync, statSync, writeSync, mkdtempSync, readdirSync, rmSync } from "node:fs";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);

const PKG_NAME = "@mingxy/opencode-mascot";
const LOCK_FILE = join(tmpdir(), "mascot-update.lock");
const STALE_LOCK_MS = 5 * 60 * 1000;
let lockFd: number | null = null;

async function getLatestVersion(): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("npm", ["view", PKG_NAME, "version"], { timeout: 10000 });
    return stdout.trim();
  } catch {
    return null;
  }
}

function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/, "").split(".").map(Number);
  const pb = b.replace(/^v/, "").split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return 1;
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return -1;
  }
  return 0;
}

function getInstallDir(): string {
  try {
    const pkgPath = require.resolve(`${PKG_NAME}/package.json`);
    return dirname(pkgPath);
  } catch {
    return join(homedir(), ".cache", "opencode", "packages", "@mingxy", "opencode-mascot");
  }
}

async function installUpdate(targetDir: string): Promise<boolean> {
  const tmpDir = mkdtempSync(join(tmpdir(), "mascot-update-"));
  try {
    await execFileAsync("npm", ["pack", `${PKG_NAME}@latest`, "--pack-destination", tmpDir], { timeout: 60000 });
    const files = readdirSync(tmpDir);
    const tgz = files.find(f => f.endsWith(".tgz"));
    if (!tgz) return false;
    await execFileAsync(
      "tar",
      ["-xzf", join(tmpDir, tgz), "-C", targetDir, "--strip-components=1", "--no-same-owner", "--no-same-permissions"],
      { timeout: 30000 },
    );
    return true;
  } catch {
    return false;
  } finally {
    try { rmSync(tmpDir, { recursive: true }); } catch {}
  }
}

function acquireLock(): boolean {
  try {
    try {
      const s = statSync(LOCK_FILE);
      if (Date.now() - s.mtimeMs > STALE_LOCK_MS) unlinkSync(LOCK_FILE);
    } catch {}
    lockFd = openSync(LOCK_FILE, "wx");
    writeSync(lockFd, String(process.pid));
    return true;
  } catch {
    return false;
  }
}

function releaseLock(): void {
  if (lockFd !== null) {
    try { closeSync(lockFd); } catch {}
    lockFd = null;
    try { unlinkSync(LOCK_FILE); } catch {}
  }
}

/**
 * 更新成功后的回调：把新版本号交给调用方，由其触发吉祥物庆祝动画
 */
export async function checkAndUpdate(
  currentVersion: string,
  onSuccess: (newVersion: string) => void,
): Promise<void> {
  const latest = await getLatestVersion();
  if (!latest) return;

  if (compareVersions(latest, currentVersion) <= 0) return;

  if (!acquireLock()) return;

  try {
    const targetDir = getInstallDir();
    const success = await installUpdate(targetDir);
    if (success) {
      onSuccess(latest);
    }
  } finally {
    releaseLock();
  }
}
