import * as fs from "node:fs";
import * as path from "node:path";
import {
  app,
  BrowserWindow,
  clipboard,
  globalShortcut,
  ipcMain,
  powerMonitor,
  shell,
  type IpcMainEvent,
} from "electron";
import { IDLE_STATE, parseTimerState } from "./countdown";
import { AuthCallbackRelay, DEEP_LINK_SCHEME, isAuthCallbackUrl } from "./deepLink";
import { IPC, type TrayCommand } from "./ipc";
import { DEFAULT_SETTINGS, parseSettings, type DesktopSettings } from "./settings";
import { createTray, type DorosTray, type LoginItem } from "./tray";

const DOROS_URL = process.env.DOROS_URL ?? "https://crush.quest";
const DOROS_ORIGIN = new URL(DOROS_URL).origin;
/** Global shortcut for Show Doros (⌥⌘D). */
const SHOW_SHORTCUT = "Alt+Command+D";

let mainWindow: BrowserWindow | null = null;
let tray: DorosTray | null = null;
let isQuitting = false;

const authCallbacks = new AuthCallbackRelay((url) => {
  mainWindow?.webContents.send(IPC.authCallback, url);
});

function parseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function isDorosUrl(url: string): boolean {
  return parseUrl(url)?.origin === DOROS_ORIGIN;
}

function isWebUrl(url: string): boolean {
  const protocol = parseUrl(url)?.protocol;
  return protocol === "https:" || protocol === "http:";
}

function openInSystemBrowser(url: string): void {
  if (isWebUrl(url)) void shell.openExternal(url);
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 860,
    minWidth: 380,
    minHeight: 500,
    title: "Doros",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // The timer keeps running while the window is hidden; don't let Chromium
      // throttle its timers in the background.
      backgroundThrottling: false,
    },
  });

  win.once("ready-to-show", () => win.show());

  // target="_blank" links: Doros pages stay in the window, everything else goes
  // to the system browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isDorosUrl(url)) void win.loadURL(url);
    else openInSystemBrowser(url);
    return { action: "deny" };
  });

  // Closing hides the window so the renderer (and its timer) stays alive.
  win.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      win.hide();
    }
  });
  win.on("closed", () => {
    mainWindow = null;
  });

  // A new page (load or reload) has to subscribe again before it gets deep links,
  // and re-sends its timer state once it mounts.
  win.webContents.on("did-start-navigation", (details) => {
    if (details.isMainFrame && !details.isSameDocument) {
      authCallbacks.rendererGone();
      tray?.update(IDLE_STATE);
    }
  });

  win.webContents.on("did-finish-load", () => {
    console.log(`[doros] loaded ${win.webContents.getURL()}`);
  });
  win.webContents.on("did-fail-load", (_e, code, description, url) => {
    console.error(`[doros] failed to load ${url}: ${code} ${description}`);
  });

  void win.loadURL(DOROS_URL);
  return win;
}

function showWindow(): void {
  if (!mainWindow) mainWindow = createWindow();
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

/** Only accept IPC from our own window showing a Doros page. */
function isTrustedSender(event: IpcMainEvent): boolean {
  return (
    mainWindow !== null &&
    event.sender === mainWindow.webContents &&
    isDorosUrl(event.senderFrame?.url ?? "")
  );
}

function registerIpc(): void {
  ipcMain.on(IPC.openExternal, (event, url: unknown) => {
    if (isTrustedSender(event) && typeof url === "string") openInSystemBrowser(url);
  });
  ipcMain.on(IPC.authCallbackReady, (event) => {
    if (isTrustedSender(event)) authCallbacks.rendererReady();
  });
  ipcMain.on(IPC.updateTimer, (event, payload: unknown) => {
    if (!isTrustedSender(event)) return;
    const state = parseTimerState(payload);
    if (state) tray?.update(state);
    else console.warn("[doros] ignored malformed timer state");
  });
}

/** Tray menu → renderer timer. Pause/resume/stop work with the window hidden. */
function sendTrayCommand(cmd: TrayCommand): void {
  if (cmd === "show" || cmd === "start") showWindow();
  if (cmd !== "show") mainWindow?.webContents.send(IPC.trayCommand, cmd);
}

/** doros://auth-callback#… from the system browser → renderer, then bring the window up. */
function handleDeepLink(url: string): void {
  if (!isAuthCallbackUrl(url)) return;
  authCallbacks.receive(url);
  // On a cold start the URL arrives before `ready`; the window is created then.
  if (app.isReady()) showWindow();
}

const settingsPath = () => path.join(app.getPath("userData"), "doros-settings.json");

function loadSettings(): DesktopSettings {
  try {
    return parseSettings(JSON.parse(fs.readFileSync(settingsPath(), "utf8")));
  } catch {
    return DEFAULT_SETTINGS; // first run, or an unreadable file
  }
}

function saveSettings(settings: DesktopSettings): void {
  try {
    fs.writeFileSync(settingsPath(), `${JSON.stringify(settings, null, 2)}\n`);
  } catch (err) {
    console.error("[doros] couldn't save settings:", err);
  }
}

/** macOS login item. Only for the packaged app: unpackaged, it would add the generic Electron.app. */
const loginItem: LoginItem = {
  get: () => app.getLoginItemSettings().openAtLogin,
  set: (on) => {
    app.setLoginItemSettings({ openAtLogin: on });
    const { openAtLogin, status } = app.getLoginItemSettings();
    if (openAtLogin !== on) console.warn(`[doros] launch at login is still ${openAtLogin} (status: ${status})`);
  },
};

function registerShowShortcut(): void {
  const ok = globalShortcut.register(SHOW_SHORTCUT, showWindow);
  if (!ok) console.warn(`[doros] couldn't register ${SHOW_SHORTCUT} (another app has it)`);
  tray?.setShowShortcut(ok ? SHOW_SHORTCUT : undefined);
}

/** Dev fallback: read a copied doros://auth-callback URL from the clipboard. */
async function pasteAuthCallbackFromClipboard(): Promise<void> {
  const url = (await clipboard.readText()).trim();
  if (isAuthCallbackUrl(url)) handleDeepLink(url);
  else console.warn("[doros] clipboard does not hold a doros://auth-callback URL");
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => showWindow());

  app.on("before-quit", () => {
    isQuitting = true;
  });

  app.on("will-quit", () => globalShortcut.unregisterAll());

  // macOS delivers deep links here, including the one that launched the app.
  app.on("open-url", (event, url) => {
    event.preventDefault();
    handleDeepLink(url);
  });

  // Dock icon click (or relaunch from Finder) brings the window back.
  app.on("activate", () => showWindow());

  // Closing the window only hides it; quitting is explicit (tray or ⌘Q).
  app.on("window-all-closed", () => {});

  void app.whenReady().then(() => {
    // Only the packaged app claims doros://. An unpackaged run would register the
    // generic Electron.app as the handler, so dev uses the tray's paste fallback.
    if (app.isPackaged) app.setAsDefaultProtocolClient(DEEP_LINK_SCHEME);
    registerIpc();
    mainWindow = createWindow();
    tray = createTray(
      {
        command: sendTrayCommand,
        showWindow,
        quit: () => app.quit(),
        ...(app.isPackaged ? {} : { pasteAuthCallback: () => void pasteAuthCallbackFromClipboard() }),
      },
      loadSettings(),
      saveSettings,
      app.isPackaged ? loginItem : undefined,
    );
    registerShowShortcut();
    // The countdown is computed from endTime, so after sleep one redraw is enough.
    powerMonitor.on("resume", () => tray?.render());
  });
}
