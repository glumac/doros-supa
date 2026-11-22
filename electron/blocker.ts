// Website blocking: decides when the sites should be blocked and drives the root helper
// (sudo -n doros-block on|off|status) to match. No electron import, so it's unit-tested
// under Node with a fake helper. Never prompts for or stores a password: if sudo -n is
// refused, blocking is "missing" and the tray offers to set it up.
import { execFile } from "node:child_process";
import * as fs from "node:fs";
import type { DesktopTimerState } from "./ipc";

export type HelperCommand = "on" | "off" | "status";
export interface HelperResult {
  ok: boolean;
  stdout: string;
  stderr: string;
}
export type HelperRunner = (cmd: HelperCommand) => Promise<HelperResult>;
/** The installed helper compared with the one bundled with this build of the app. */
export type HelperInstall = "missing" | "outdated" | "current";

export interface BlockerStatus {
  /** checking: not known yet. missing: helper or its sudoers rule isn't installed. */
  setup: "checking" | "missing" | "ready";
  /** The installed helper has an older block list than this app (still used). */
  outdated: boolean;
  /** Whether /etc/hosts has the Doros section, as the helper last reported. */
  blocked: boolean;
  /** "Block Sites Now" is on. */
  manual: boolean;
  /** The last failed helper call, if the one after it hasn't succeeded yet. */
  error: string | null;
}

export interface BlockerOptions {
  run: HelperRunner;
  inspect: () => HelperInstall;
  onChange: (status: BlockerStatus) => void;
  /** Wait before unblocking, so a page reload (idle, then focus again) doesn't unblock. */
  unblockDelayMs?: number;
  /** On launch, wait this long for the renderer to report a running session before
   *  cleaning up a block left behind by a crash. */
  startupDelayMs?: number;
}

export interface Blocker {
  /** Reads the helper's state; schedules cleanup of a leftover block. */
  start(): Promise<void>;
  setTimer(state: DesktopTimerState): void;
  setManual(on: boolean): void;
  /** Checks the helper again (after the user installed it), then applies the current state. */
  refresh(): Promise<void>;
  status(): BlockerStatus;
  /** Resolves when no helper call is queued or running. */
  settled(): Promise<void>;
  dispose(): void;
}

/** Block while a focus session is running (and not past its end), or while forced on. */
export function shouldBlock(timer: DesktopTimerState, manual: boolean, now: number): boolean {
  if (manual) return true;
  return timer.phase === "focus" && !timer.isPaused && timer.endTime !== undefined && timer.endTime > now;
}

const MAX_TIMEOUT_MS = 2 ** 31 - 1;
const firstLine = (text: string) => text.trim().split("\n")[0] || "the helper failed";

export function createBlocker(options: BlockerOptions): Blocker {
  const { run, inspect, onChange } = options;
  const unblockDelayMs = options.unblockDelayMs ?? 3000;
  const startupDelayMs = options.startupDelayMs ?? 15000;

  let status: BlockerStatus = { setup: "checking", outdated: false, blocked: false, manual: false, error: null };
  let timer: DesktopTimerState = { phase: "idle", isPaused: false, task: "" };
  /** What the helper should make /etc/hosts say (after the unblock delay). */
  let desired = false;
  let offTimer: NodeJS.Timeout | null = null;
  let endTimer: NodeJS.Timeout | null = null;
  let queue: Promise<void> = Promise.resolve();
  let disposed = false;

  const update = (patch: Partial<BlockerStatus>) => {
    const next = { ...status, ...patch };
    if (JSON.stringify(next) === JSON.stringify(status)) return;
    status = next;
    onChange(status);
  };

  /** Helper calls run one at a time, in order. */
  const enqueue = (task: () => Promise<void>): Promise<void> => {
    queue = queue.then(task).catch((err: unknown) => {
      console.error("[doros] blocker:", err);
    });
    return queue;
  };

  const checkSetup = async () => {
    const install = inspect();
    if (install === "missing") {
      update({ setup: "missing", outdated: false, blocked: false });
      return;
    }
    const r = await run("status");
    if (r.ok) update({ setup: "ready", outdated: install === "outdated", blocked: r.stdout.trim() === "on" });
    else update({ setup: "missing", outdated: false, blocked: false, error: firstLine(r.stderr) });
  };

  const apply = async () => {
    if (status.setup !== "ready" || desired === status.blocked) return;
    const cmd = desired ? "on" : "off";
    const r = await run(cmd);
    if (r.ok) {
      update({ blocked: cmd === "on", error: null });
    } else {
      const error = firstLine(r.stderr);
      console.error(`[doros] doros-block ${cmd} failed: ${error}`);
      update({ error });
      await checkSetup(); // what does /etc/hosts say now, and is sudo still allowed?
    }
  };

  const clearOffTimer = () => {
    if (offTimer) clearTimeout(offTimer);
    offTimer = null;
  };

  /** Recomputes the wanted state. Blocking is immediate; unblocking waits `offDelayMs`. */
  const evaluate = (offDelayMs: number) => {
    if (disposed) return;
    const now = Date.now();
    if (endTimer) clearTimeout(endTimer);
    endTimer = null;
    if (shouldBlock(timer, false, now) && timer.endTime !== undefined) {
      endTimer = setTimeout(() => evaluate(unblockDelayMs), Math.min(timer.endTime - now + 50, MAX_TIMEOUT_MS));
    }

    if (shouldBlock(timer, status.manual, now)) {
      clearOffTimer();
      desired = true;
      void enqueue(apply);
    } else if (offDelayMs <= 0) {
      clearOffTimer();
      desired = false;
      void enqueue(apply);
    } else if (desired && !offTimer) {
      offTimer = setTimeout(() => {
        offTimer = null;
        if (!shouldBlock(timer, status.manual, Date.now())) {
          desired = false;
          void enqueue(apply);
        }
      }, offDelayMs);
    }
  };

  return {
    async start() {
      await enqueue(checkSetup);
      desired = status.blocked;
      evaluate(startupDelayMs);
    },
    setTimer(state) {
      timer = state;
      if (status.setup === "missing" && shouldBlock(state, status.manual, Date.now())) {
        void enqueue(checkSetup);
      }
      evaluate(unblockDelayMs);
    },
    setManual(on) {
      update({ manual: on });
      evaluate(0);
    },
    async refresh() {
      await enqueue(checkSetup);
      if (!offTimer) evaluate(0);
      await queue;
    },
    status: () => status,
    settled: async () => {
      // A call can queue another (e.g. a failure re-checks the setup), so wait until it's quiet.
      let last: Promise<void>;
      do {
        last = queue;
        await last;
      } while (last !== queue);
    },
    dispose() {
      disposed = true;
      clearOffTimer();
      if (endTimer) clearTimeout(endTimer);
      endTimer = null;
    },
  };
}

/** The real helper: `sudo -n <helper> <cmd>`. -n makes sudo fail instead of asking for a password. */
export function sudoHelperRunner(helperPath: string, timeoutMs = 10_000): HelperRunner {
  return (cmd) =>
    new Promise((resolve) => {
      execFile("/usr/bin/sudo", ["-n", helperPath, cmd], { timeout: timeoutMs }, (err, stdout, stderr) => {
        resolve({ ok: !err, stdout: String(stdout), stderr: String(stderr || (err ? err.message : "")) });
      });
    });
}

/** Compares the installed helper with the bundled copy (both are world-readable). */
export function inspectInstalledHelper(installedPath: string, bundledPath: string): HelperInstall {
  let installed: string;
  try {
    installed = fs.readFileSync(installedPath, "utf8");
  } catch {
    return "missing";
  }
  try {
    return installed === fs.readFileSync(bundledPath, "utf8") ? "current" : "outdated";
  } catch {
    return "current"; // no bundled copy to compare with; the installed one still works
  }
}
