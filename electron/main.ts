import * as path from "node:path";
import { app, BrowserWindow, ipcMain, shell, type IpcMainEvent, type Tray } from "electron";
import { IPC } from "./ipc";
import { createTray } from "./tray";

const DOROS_URL = process.env.DOROS_URL ?? "https://crush.quest";
const DOROS_ORIGIN = new URL(DOROS_URL).origin;

let mainWindow: BrowserWindow | null = null;
// Held in module scope so the tray icon isn't garbage-collected.
let tray: Tray | null = null;
let isQuitting = false;

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
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => showWindow());

  app.on("before-quit", () => {
    isQuitting = true;
  });

  // Dock icon click (or relaunch from Finder) brings the window back.
  app.on("activate", () => showWindow());

  // Closing the window only hides it; quitting is explicit (tray or ⌘Q).
  app.on("window-all-closed", () => {});

  void app.whenReady().then(() => {
    registerIpc();
    mainWindow = createWindow();
    tray = createTray({ showWindow, quit: () => app.quit() });
  });
}
