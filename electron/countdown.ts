// Pure countdown math for the tray. The renderer's timer is the source of truth; the
// main process only ever computes time left from endTime (never by counting ticks),
// so sleep or a stalled event loop can't make it drift.
import type { DesktopTimerState } from "./ipc";

const MAX_TASK_LENGTH = 200;
const PHASES: ReadonlyArray<DesktopTimerState["phase"]> = ["idle", "focus", "break"];

export const IDLE_STATE: DesktopTimerState = { phase: "idle", isPaused: false, task: "" };

export function isRunning(state: DesktopTimerState): boolean {
  return state.phase !== "idle" && !state.isPaused;
}

/** Ms left in the session at `now`, clamped to 0. */
export function remainingMs(state: DesktopTimerState, now: number): number {
  if (state.phase === "idle") return 0;
  const left = state.isPaused ? state.pausedTimeLeft : state.endTime !== undefined ? state.endTime - now : undefined;
  return left === undefined ? 0 : Math.max(0, left);
}

/** 1453000 → "24:13". Floors partial seconds, like the web timer. */
export function formatMMSS(ms: number): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Validates an updateTimer payload from the renderer. Returns null if it's malformed. */
export function parseTimerState(value: unknown): DesktopTimerState | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (!PHASES.includes(v.phase as DesktopTimerState["phase"])) return null;
  if (typeof v.isPaused !== "boolean" || typeof v.task !== "string") return null;
  if (v.endTime !== undefined && !isFiniteNumber(v.endTime)) return null;
  if (v.pausedTimeLeft !== undefined && !isFiniteNumber(v.pausedTimeLeft)) return null;

  const state: DesktopTimerState = {
    phase: v.phase as DesktopTimerState["phase"],
    isPaused: v.isPaused,
    task: v.task.slice(0, MAX_TASK_LENGTH),
  };
  if (v.endTime !== undefined) state.endTime = v.endTime as number;
  if (v.pausedTimeLeft !== undefined) state.pausedTimeLeft = v.pausedTimeLeft as number;
  return state;
}
