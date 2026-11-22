import * as path from "node:path";
import { Menu, Tray, nativeImage, type NativeImage } from "electron";
import type { BlockerStatus } from "./blocker";
import { IDLE_STATE, formatMMSS, isRunning, remainingMs, trayLabel } from "./countdown";
import type { DesktopTimerState } from "./ipc";
import type { DesktopSettings } from "./settings";
import { createImageCache, renderPng, type TomatoVariant } from "./tomatoIcon";
import { buildTrayMenu, type TrayMenuActions } from "./trayMenu";

export interface DorosTray {
  /** Latest timer state from the renderer. Rebuilds the menu if it changed. */
  update(state: DesktopTimerState): void;
  /** Redraw the countdown now (e.g. after the Mac wakes up). */
  render(): void;
  /** Show this global shortcut next to Show Doros (after main registered it). */
  setShowShortcut(accelerator: string | undefined): void;
  /** Website blocking state for the menu (left out until set). */
  setBlocking(status: BlockerStatus): void;
}

/** macOS login item (packaged app only). The OS keeps the setting, so it's read back each time. */
export interface LoginItem {
  get(): boolean;
  set(on: boolean): void;
}

// electron-dist/tray.js → electron/assets (same layout inside the packaged app.asar).
const ASSETS_DIR = path.join(__dirname, "..", "electron", "assets");
const TICK_MS = 1000;
/** Every label of a 25-minute doro (25 minutes + 60 seconds, focus and paused) stays cached. */
const IMAGE_CACHE_SIZE = 200;

const menuKey = (s: DesktopTimerState, settings: DesktopSettings, extra: unknown[]) =>
  JSON.stringify([s.phase, s.isPaused, s.task, settings.countdownInTomato, ...extra]);

/** 1× and 2× renders, so the text is crisp on Retina and non-Retina menu bars alike. */
function drawTomato(key: string): NativeImage {
  const sep = key.indexOf(":");
  const variant = key.slice(0, sep) as TomatoVariant;
  const text = key.slice(sep + 1);
  const image = nativeImage.createFromBuffer(renderPng(text, variant, 2), { scaleFactor: 2 });
  image.addRepresentation({ scaleFactor: 1, buffer: renderPng(text, variant, 1) });
  return image;
}

export function createTray(
  actions: Omit<TrayMenuActions, "setCountdownInTomato" | "setLaunchAtLogin">,
  initialSettings: DesktopSettings,
  saveSettings: (settings: DesktopSettings) => void,
  loginItem?: LoginItem,
): DorosTray {
  // Used only if the tomato can't be drawn (e.g. resvg's native module failed to load).
  // nativeImage picks up trayTomato@2x.png automatically on Retina screens.
  const staticIcon = nativeImage.createFromPath(path.join(ASSETS_DIR, "trayTomato.png"));
  const images = createImageCache(drawTomato, IMAGE_CACHE_SIZE);
  let drawFailed = false;

  // Held in this closure so the tray icon isn't garbage-collected.
  const tray = new Tray(staticIcon);

  let state: DesktopTimerState = IDLE_STATE;
  let settings = initialSettings;
  let shownMenuKey = "";
  let shownImageKey = "";
  let shownTitle: string | null = null;
  let shownToolTip = "";
  let ticker: NodeJS.Timeout | null = null;
  let showShortcut: string | undefined;
  let blocking: BlockerStatus | undefined;

  const setImage = (variant: TomatoVariant, text: string) => {
    const key = drawFailed ? "static" : `${variant}:${text}`;
    if (key === shownImageKey) return;
    try {
      tray.setImage(drawFailed ? staticIcon : images.get(key));
      shownImageKey = key;
    } catch (err) {
      console.error("[doros] couldn't draw the tray tomato, falling back to the static icon:", err);
      drawFailed = true;
      shownImageKey = "static";
      tray.setImage(staticIcon);
    }
  };

  const setTitle = (title: string) => {
    if (title === shownTitle) return;
    shownTitle = title;
    tray.setTitle(title, { fontType: "monospacedDigit" });
  };

  const setToolTip = (toolTip: string) => {
    if (toolTip === shownToolTip) return;
    shownToolTip = toolTip;
    tray.setToolTip(toolTip);
  };

  const render = () => {
    const ms = remainingMs(state, Date.now());
    const time = formatMMSS(ms);
    const variant: TomatoVariant = state.phase === "idle" ? "idle" : state.isPaused ? "paused" : "focus";
    const inside = variant !== "idle" && settings.countdownInTomato;
    // Inside the round tomato: minutes left, or seconds in the last minute.
    setImage(inside ? variant : "idle", inside ? trayLabel(ms) : "");
    // Fallback (or drawing failed): the small tomato with MM:SS as menu bar text.
    const showText = variant !== "idle" && (!inside || drawFailed);
    setTitle(showText ? (state.isPaused ? `⏸ ${time}` : time) : "");
    // The exact time on hover, since the tomato only shows minutes.
    setToolTip(variant === "idle" ? "Doros" : `Doros: ${time} left${state.isPaused ? " (paused)" : ""}`);
  };

  const rebuildMenu = () => {
    const launchAtLogin = loginItem?.get() ?? false;
    const key = menuKey(state, settings, [launchAtLogin, showShortcut, blocking]);
    if (key === shownMenuKey) return;
    shownMenuKey = key;
    const menuActions: TrayMenuActions = {
      ...actions,
      setCountdownInTomato,
      ...(loginItem ? { setLaunchAtLogin } : {}),
    };
    tray.setContextMenu(
      Menu.buildFromTemplate(
        buildTrayMenu(state, menuActions, {
          countdownInTomato: settings.countdownInTomato,
          launchAtLogin,
          ...(showShortcut ? { showShortcut } : {}),
          ...(blocking ? { blocking } : {}),
        }),
      ),
    );
  };

  function setLaunchAtLogin(on: boolean) {
    loginItem?.set(on);
    rebuildMenu(); // the checkbox shows what macOS actually did
  }

  function setCountdownInTomato(on: boolean) {
    settings = { ...settings, countdownInTomato: on };
    saveSettings(settings);
    rebuildMenu();
    render();
  }

  const update = (next: DesktopTimerState) => {
    state = next;
    rebuildMenu();
    render();
    if (isRunning(state) && !ticker) {
      ticker = setInterval(render, TICK_MS);
    } else if (!isRunning(state) && ticker) {
      clearInterval(ticker);
      ticker = null;
    }
  };

  const setShowShortcut = (accelerator: string | undefined) => {
    showShortcut = accelerator;
    rebuildMenu();
  };

  const setBlocking = (status: BlockerStatus) => {
    blocking = status;
    rebuildMenu();
  };

  update(IDLE_STATE);
  return { update, render, setShowShortcut, setBlocking };
}
