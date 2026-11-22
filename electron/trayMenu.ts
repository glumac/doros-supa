// Pure: builds the tray menu template from the timer state. Only type imports from
// electron, so it's unit-tested under Node.
import type { MenuItemConstructorOptions } from "electron";
import type { DesktopTimerState, TrayCommand } from "./ipc";

export interface TrayMenuActions {
  /** Forwards pause / resume / stop / start to the renderer's timer. */
  command(cmd: TrayCommand): void;
  showWindow(): void;
  quit(): void;
  /**
   * Dev only: deep links can't reach an unpackaged app, so the tray offers to read a
   * copied doros://auth-callback URL from the clipboard instead.
   */
  pasteAuthCallback?: () => void;
  /** Switches between the countdown inside the tomato and the small tomato + text fallback. */
  setCountdownInTomato?: (on: boolean) => void;
  /** Packaged app only: adds or removes Doros from the macOS login items. */
  setLaunchAtLogin?: (on: boolean) => void;
}

export interface TrayMenuOptions {
  countdownInTomato: boolean;
  /** Whether macOS opens Doros at login (read from the OS, not saved by Doros). */
  launchAtLogin?: boolean;
  /** The global Show Doros shortcut, if it registered; shown next to the item as a hint. */
  showShortcut?: string;
}

const MAX_TASK_LABEL = 40;

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function buildTrayMenu(
  state: DesktopTimerState,
  actions: TrayMenuActions,
  options: TrayMenuOptions = { countdownInTomato: true },
): MenuItemConstructorOptions[] {
  const { setCountdownInTomato, setLaunchAtLogin } = actions;
  const launchAtLogin = options.launchAtLogin ?? false;
  const settingsItems: MenuItemConstructorOptions[] = [
    ...(setLaunchAtLogin
      ? [
          {
            label: "Launch at Login",
            type: "checkbox" as const,
            checked: launchAtLogin,
            click: () => setLaunchAtLogin(!launchAtLogin),
          },
        ]
      : []),
    ...(setCountdownInTomato
      ? [
          {
            label: "Countdown Inside Tomato",
            type: "checkbox" as const,
            checked: options.countdownInTomato,
            click: () => setCountdownInTomato(!options.countdownInTomato),
          },
        ]
      : []),
  ];

  const showItem: MenuItemConstructorOptions = { label: "Show Doros", click: () => actions.showWindow() };
  if (options.showShortcut) {
    // Only a hint: the shortcut itself is a globalShortcut registered by main.ts.
    showItem.accelerator = options.showShortcut;
    showItem.registerAccelerator = false;
  }

  const active = state.phase !== "idle";
  const task = truncate(state.task.trim() || "Doro", MAX_TASK_LABEL);

  const timerItems: MenuItemConstructorOptions[] = active
    ? [
        { label: state.isPaused ? `⏸ Paused: ${task}` : `🍅 Focus: ${task}`, enabled: false },
        state.isPaused
          ? { label: "Resume", click: () => actions.command("resume") }
          : { label: "Pause", click: () => actions.command("pause") },
      ]
    : [{ label: "Start a Doro…", click: () => actions.command("start") }];

  return [
    ...timerItems,
    { label: "Cancel Doro", enabled: active, click: () => actions.command("stop") },
    { type: "separator" },
    showItem,
    ...(actions.pasteAuthCallback
      ? [{ label: "Paste Auth Callback URL (dev)", click: actions.pasteAuthCallback }]
      : []),
    { type: "separator" },
    ...settingsItems,
    { label: "Quit Doros", click: () => actions.quit() },
  ];
}
