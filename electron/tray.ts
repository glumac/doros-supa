import * as path from "node:path";
import { Menu, Tray, nativeImage } from "electron";
import { IDLE_STATE, formatMMSS, isRunning, remainingMs } from "./countdown";
import type { DesktopTimerState } from "./ipc";
import { buildTrayMenu, type TrayMenuActions } from "./trayMenu";

export interface DorosTray {
  /** Latest timer state from the renderer. Rebuilds the menu if it changed. */
  update(state: DesktopTimerState): void;
  /** Redraw the countdown now (e.g. after the Mac wakes up). */
  render(): void;
}

// electron-dist/tray.js → electron/assets (same layout inside the packaged app.asar).
const ASSETS_DIR = path.join(__dirname, "..", "electron", "assets");
const TICK_MS = 1000;

const menuKey = (s: DesktopTimerState) => JSON.stringify([s.phase, s.isPaused, s.task]);

export function createTray(actions: TrayMenuActions): DorosTray {
  // nativeImage picks up trayTomato@2x.png automatically on Retina screens.
  const icon = nativeImage.createFromPath(path.join(ASSETS_DIR, "trayTomato.png"));
  // Held in this closure so the tray icon isn't garbage-collected.
  const tray = new Tray(icon);
  tray.setToolTip("Doros");

  let state: DesktopTimerState = IDLE_STATE;
  let shownMenuKey = "";
  let ticker: NodeJS.Timeout | null = null;

  // Phase 4 draws this inside the tomato; for now it's the text next to it.
  const render = () => {
    const time = formatMMSS(remainingMs(state, Date.now()));
    const title = state.phase === "idle" ? "" : state.isPaused ? `⏸ ${time}` : time;
    tray.setTitle(title, { fontType: "monospacedDigit" });
  };

  const rebuildMenuIfChanged = () => {
    const key = menuKey(state);
    if (key === shownMenuKey) return;
    shownMenuKey = key;
    tray.setContextMenu(Menu.buildFromTemplate(buildTrayMenu(state, actions)));
  };

  const update = (next: DesktopTimerState) => {
    state = next;
    rebuildMenuIfChanged();
    render();
    if (isRunning(state) && !ticker) {
      ticker = setInterval(render, TICK_MS);
    } else if (!isRunning(state) && ticker) {
      clearInterval(ticker);
      ticker = null;
    }
  };

  update(IDLE_STATE);
  return { update, render };
}
