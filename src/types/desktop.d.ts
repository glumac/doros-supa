// Renderer-side copy of the Electron bridge contract (electron/ipc.ts).
// Keep the two in sync. `window.doros` only exists inside the desktop app;
// in a normal browser it is undefined.

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

declare global {
  interface Window {
    doros?: DorosBridge;
  }
}
