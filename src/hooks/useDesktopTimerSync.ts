import { useEffect, useRef } from "react";
import { getDesktopBridge, IDLE_TIMER_STATE } from "../lib/desktopBridge";
import type { DesktopTimerState, TrayCommand } from "../types/desktop";

export interface DesktopTimerControls {
  pause(): void;
  resume(): void;
  stop(): void;
  /** Open the new-doro form. */
  start(): void;
}

function runCommand(cmd: TrayCommand, state: DesktopTimerState, controls: DesktopTimerControls): void {
  const active = state.phase !== "idle";
  if (cmd === "pause" && active && !state.isPaused) controls.pause();
  else if (cmd === "resume" && active && state.isPaused) controls.resume();
  else if (cmd === "stop" && active) controls.stop();
  else if (cmd === "start" && !active) controls.start();
  // "show" is handled by the main process.
}

/**
 * Desktop app only: pushes the timer to the menu bar tray and runs tray commands
 * (pause / resume / cancel / start) through the web app's own timer handlers.
 * No-op in a normal browser.
 */
export function useDesktopTimerSync(state: DesktopTimerState, controls: DesktopTimerControls): void {
  const latest = useRef({ state, controls });
  latest.current = { state, controls };

  const stateKey = JSON.stringify(state);
  useEffect(() => {
    getDesktopBridge()?.updateTimer(JSON.parse(stateKey) as DesktopTimerState);
  }, [stateKey]);

  useEffect(() => {
    const bridge = getDesktopBridge();
    if (!bridge) return;
    const unsubscribe = bridge.onTrayCommand((cmd) => {
      runCommand(cmd, latest.current.state, latest.current.controls);
    });
    return () => {
      unsubscribe();
      bridge.updateTimer(IDLE_TIMER_STATE);
    };
  }, []);
}
