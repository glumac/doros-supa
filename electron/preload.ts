// Runs in the sandboxed renderer before the page loads. Sandboxed preloads can
// only require a few built-ins ("electron", "events", …), so only type imports
// from ./ipc are allowed here — they are erased at compile time.
import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import type { DesktopTimerState, DorosBridge, IpcChannels, TrayCommand } from "./ipc";

const CH: IpcChannels = {
  updateTimer: "doros:update-timer",
  trayCommand: "doros:tray-command",
  openExternal: "doros:open-external",
  authCallback: "doros:auth-callback",
  authCallbackReady: "doros:auth-callback-ready",
};

function subscribe<T>(channel: string, cb: (value: T) => void): () => void {
  const listener = (_event: IpcRendererEvent, value: T) => cb(value);
  ipcRenderer.on(channel, listener);
  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
}

const bridge: DorosBridge = {
  updateTimer: (state: DesktopTimerState) => ipcRenderer.send(CH.updateTimer, state),
  onTrayCommand: (cb) => subscribe<TrayCommand>(CH.trayCommand, cb),
  openExternal: (url: string) => ipcRenderer.send(CH.openExternal, url),
  onAuthCallback: (cb) => {
    const unsubscribe = subscribe<string>(CH.authCallback, cb);
    // Lets main deliver a deep link that arrived before the page was listening.
    ipcRenderer.send(CH.authCallbackReady);
    return unsubscribe;
  },
};

contextBridge.exposeInMainWorld("doros", bridge);
