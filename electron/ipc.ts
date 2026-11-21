// IPC contract between the Electron main process and the Doros renderer.
// Mirrored for the renderer by src/types/desktop.d.ts — keep the two in sync.

export interface DesktopTimerState {
  phase: "idle" | "focus" | "break";
  /** Epoch ms when the running session ends. */
  endTime?: number;
  /** Ms left while paused. */
  pausedTimeLeft?: number;
  isPaused: boolean;
  task: string;
}

/** "start" opens the new-doro form (a doro needs a task name, so it can't start from the tray). */
export type TrayCommand = "pause" | "resume" | "stop" | "show" | "start";

export interface DorosBridge {
  /** renderer → main */
  updateTimer(state: DesktopTimerState): void;
  /** main → renderer. Returns an unsubscribe function. */
  onTrayCommand(cb: (cmd: TrayCommand) => void): () => void;
  /** Opens an http(s) URL in the system browser (used for OAuth). */
  openExternal(url: string): void;
  /** Deep link (doros://auth-callback…) → renderer. Returns an unsubscribe function. */
  onAuthCallback(cb: (url: string) => void): () => void;
}

/**
 * Channel names. The sandboxed preload can't `require` local modules, so it
 * re-declares these literals and type-checks them against this object.
 */
export const IPC = {
  updateTimer: "doros:update-timer",
  trayCommand: "doros:tray-command",
  openExternal: "doros:open-external",
  authCallback: "doros:auth-callback",
  /** preload → main: the page subscribed to auth callbacks, deliver any pending deep link. */
  authCallbackReady: "doros:auth-callback-ready",
} as const;

export type IpcChannels = typeof IPC;
