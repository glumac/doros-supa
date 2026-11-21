// Thin, React-free helpers around the Electron bridge (`window.doros`).
// In a normal browser `window.doros` is undefined and every helper here is a no-op.
import type { DesktopTimerState, DorosBridge } from "../types/desktop";

/** Where Supabase sends the desktop OAuth flow back to (registered in Supabase → Redirect URLs). */
export const DESKTOP_AUTH_REDIRECT = "doros://auth-callback";

export function getDesktopBridge(): DorosBridge | undefined {
  return typeof window === "undefined" ? undefined : window.doros;
}

export function isDesktop(): boolean {
  return getDesktopBridge() !== undefined;
}

export type AuthCallbackResult =
  | { type: "tokens"; accessToken: string; refreshToken: string }
  | { type: "error"; message: string };

/**
 * Parses `doros://auth-callback#access_token=…&refresh_token=…` (Supabase implicit flow).
 * Returns the OAuth error if Supabase sent one, or null for anything that isn't a usable
 * auth callback.
 */
export function parseAuthCallback(url: string): AuthCallbackResult | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (`${parsed.protocol}//${parsed.host}` !== DESKTOP_AUTH_REDIRECT) return null;

  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ""));
  const query = parsed.searchParams;

  const error = hash.get("error") ?? query.get("error");
  if (error) {
    return {
      type: "error",
      message: hash.get("error_description") ?? query.get("error_description") ?? error,
    };
  }

  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");
  if (!accessToken || !refreshToken) return null;
  return { type: "tokens", accessToken, refreshToken };
}

export const IDLE_TIMER_STATE: DesktopTimerState = { phase: "idle", isPaused: false, task: "" };

export interface TimerSnapshot {
  inProgress: boolean;
  isActive: boolean;
  isPaused: boolean;
  task: string;
}

/** The parts of localStorage["timerState"] the tray needs. */
export interface SavedTimerTimes {
  endTime?: number;
  pausedTimeLeft?: number;
}

/**
 * Maps the web app's timer (DoroContext + the saved timerState) to the bridge state.
 * The web app has no break timer, so the phase is only "idle" or "focus". A finished doro
 * waiting to be logged is idle: its countdown is over.
 */
export function toDesktopTimerState(
  timer: TimerSnapshot,
  saved: SavedTimerTimes | null,
): DesktopTimerState {
  if (!timer.inProgress || !timer.isActive) return IDLE_TIMER_STATE;
  const state: DesktopTimerState = { phase: "focus", isPaused: timer.isPaused, task: timer.task };
  if (timer.isPaused) {
    if (saved?.pausedTimeLeft !== undefined) state.pausedTimeLeft = saved.pausedTimeLeft;
  } else if (saved?.endTime !== undefined) {
    state.endTime = saved.endTime;
  }
  return state;
}

/** Reads endTime / pausedTimeLeft from localStorage["timerState"], tolerating bad data. */
export function readSavedTimerTimes(): SavedTimerTimes | null {
  try {
    const raw = localStorage.getItem("timerState");
    if (!raw) return null;
    const saved = JSON.parse(raw) as Record<string, unknown>;
    const times: SavedTimerTimes = {};
    const endTime = Number(saved.endTime);
    if (saved.endTime !== undefined && Number.isFinite(endTime)) times.endTime = endTime;
    if (typeof saved.pausedTimeLeft === "number") times.pausedTimeLeft = saved.pausedTimeLeft;
    return times;
  } catch {
    return null;
  }
}
