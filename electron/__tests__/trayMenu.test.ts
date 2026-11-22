// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { buildTrayMenu, type TrayMenuActions } from "../trayMenu";
import type { DesktopTimerState } from "../ipc";

const actions = (): TrayMenuActions => ({
  command: vi.fn(),
  showWindow: vi.fn(),
  quit: vi.fn(),
});

const idle: DesktopTimerState = { phase: "idle", isPaused: false, task: "" };
const running: DesktopTimerState = { phase: "focus", endTime: 1, isPaused: false, task: "write chapter 3" };
const paused: DesktopTimerState = { phase: "focus", pausedTimeLeft: 1, isPaused: true, task: "write chapter 3" };

const labels = (items: ReturnType<typeof buildTrayMenu>) =>
  items.filter((i) => i.type !== "separator").map((i) => i.label);
const byLabel = (items: ReturnType<typeof buildTrayMenu>, label: string) => {
  const item = items.find((i) => i.label === label);
  if (!item) throw new Error(`no menu item "${label}" in ${JSON.stringify(labels(items))}`);
  return item;
};

describe("buildTrayMenu", () => {
  it("idle: offers to start a doro, Cancel is disabled", () => {
    const a = actions();
    const menu = buildTrayMenu(idle, a);
    expect(labels(menu)).toEqual(["Start a Doro…", "Cancel Doro", "Show Doros", "Quit Doros"]);
    expect(byLabel(menu, "Cancel Doro").enabled).toBe(false);

    byLabel(menu, "Start a Doro…").click?.({} as never, undefined, {} as never);
    expect(a.command).toHaveBeenCalledWith("start");
  });

  it("running: shows the task and offers Pause and Cancel", () => {
    const a = actions();
    const menu = buildTrayMenu(running, a);
    expect(labels(menu)).toEqual(["🍅 Focus: write chapter 3", "Pause", "Cancel Doro", "Show Doros", "Quit Doros"]);
    expect(menu[0]?.enabled).toBe(false);

    byLabel(menu, "Pause").click?.({} as never, undefined, {} as never);
    byLabel(menu, "Cancel Doro").click?.({} as never, undefined, {} as never);
    expect(a.command).toHaveBeenNthCalledWith(1, "pause");
    expect(a.command).toHaveBeenNthCalledWith(2, "stop");
  });

  it("paused: offers Resume", () => {
    const a = actions();
    const menu = buildTrayMenu(paused, a);
    expect(labels(menu)).toEqual(["⏸ Paused: write chapter 3", "Resume", "Cancel Doro", "Show Doros", "Quit Doros"]);

    byLabel(menu, "Resume").click?.({} as never, undefined, {} as never);
    expect(a.command).toHaveBeenCalledWith("resume");
  });

  it("truncates a long task in the status line", () => {
    const menu = buildTrayMenu({ ...running, task: "a".repeat(80) }, actions());
    expect(menu[0]?.label).toBe(`🍅 Focus: ${"a".repeat(39)}…`);
  });

  it("Show and Quit call their actions", () => {
    const a = actions();
    const menu = buildTrayMenu(idle, a);
    byLabel(menu, "Show Doros").click?.({} as never, undefined, {} as never);
    byLabel(menu, "Quit Doros").click?.({} as never, undefined, {} as never);
    expect(a.showWindow).toHaveBeenCalledTimes(1);
    expect(a.quit).toHaveBeenCalledTimes(1);
  });

  it("adds the dev paste item only when given", () => {
    expect(labels(buildTrayMenu(idle, actions()))).not.toContain("Paste Auth Callback URL (dev)");
    const a = { ...actions(), pasteAuthCallback: vi.fn() };
    const menu = buildTrayMenu(idle, a);
    byLabel(menu, "Paste Auth Callback URL (dev)").click?.({} as never, undefined, {} as never);
    expect(a.pasteAuthCallback).toHaveBeenCalledTimes(1);
  });
});

describe("buildTrayMenu: Countdown Inside Tomato", () => {
  it("is shown only when the tray can switch styles", () => {
    expect(labels(buildTrayMenu(idle, actions()))).not.toContain("Countdown Inside Tomato");
  });

  it("is a checkbox reflecting the setting, just above Quit", () => {
    const a = { ...actions(), setCountdownInTomato: vi.fn() };
    const on = buildTrayMenu(running, a, { countdownInTomato: true });
    const item = byLabel(on, "Countdown Inside Tomato");
    expect(item.type).toBe("checkbox");
    expect(item.checked).toBe(true);
    expect(labels(on).slice(-2)).toEqual(["Countdown Inside Tomato", "Quit Doros"]);

    const off = buildTrayMenu(running, a, { countdownInTomato: false });
    expect(byLabel(off, "Countdown Inside Tomato").checked).toBe(false);
  });

  it("toggles the setting when clicked", () => {
    const a = { ...actions(), setCountdownInTomato: vi.fn() };
    byLabel(buildTrayMenu(idle, a, { countdownInTomato: true }), "Countdown Inside Tomato")
      .click?.({} as never, undefined, {} as never);
    byLabel(buildTrayMenu(idle, a, { countdownInTomato: false }), "Countdown Inside Tomato")
      .click?.({} as never, undefined, {} as never);
    expect(a.setCountdownInTomato).toHaveBeenNthCalledWith(1, false);
    expect(a.setCountdownInTomato).toHaveBeenNthCalledWith(2, true);
  });
});

describe("buildTrayMenu: Launch at Login", () => {
  it("is shown only when the app can register a login item (packaged)", () => {
    expect(labels(buildTrayMenu(idle, actions()))).not.toContain("Launch at Login");
  });

  it("is a checkbox reflecting the login item, above the tomato setting", () => {
    const a = { ...actions(), setLaunchAtLogin: vi.fn(), setCountdownInTomato: vi.fn() };
    const on = buildTrayMenu(idle, a, { countdownInTomato: true, launchAtLogin: true });
    const item = byLabel(on, "Launch at Login");
    expect(item.type).toBe("checkbox");
    expect(item.checked).toBe(true);
    expect(labels(on).slice(-3)).toEqual(["Launch at Login", "Countdown Inside Tomato", "Quit Doros"]);

    const off = buildTrayMenu(idle, a, { countdownInTomato: true, launchAtLogin: false });
    expect(byLabel(off, "Launch at Login").checked).toBe(false);
  });

  it("toggles the login item when clicked", () => {
    const a = { ...actions(), setLaunchAtLogin: vi.fn() };
    byLabel(buildTrayMenu(idle, a, { countdownInTomato: true, launchAtLogin: false }), "Launch at Login")
      .click?.({} as never, undefined, {} as never);
    byLabel(buildTrayMenu(idle, a, { countdownInTomato: true, launchAtLogin: true }), "Launch at Login")
      .click?.({} as never, undefined, {} as never);
    expect(a.setLaunchAtLogin).toHaveBeenNthCalledWith(1, true);
    expect(a.setLaunchAtLogin).toHaveBeenNthCalledWith(2, false);
  });
});

describe("buildTrayMenu: Show Doros shortcut", () => {
  it("shows the global shortcut as the accelerator hint when it's registered", () => {
    const menu = buildTrayMenu(idle, actions(), { countdownInTomato: true, showShortcut: "Alt+Command+D" });
    expect(byLabel(menu, "Show Doros").accelerator).toBe("Alt+Command+D");
    expect(byLabel(menu, "Show Doros").registerAccelerator).toBe(false);
    expect(byLabel(buildTrayMenu(idle, actions()), "Show Doros").accelerator).toBeUndefined();
  });
});

describe("buildTrayMenu: website blocking", () => {
  const ready = { setup: "ready", outdated: false, blocked: false, manual: false, error: null } as const;
  const withBlocking = () => ({ ...actions(), setBlockManual: vi.fn(), setUpBlocking: vi.fn() });
  const opts = (blocking: Partial<typeof ready> | { setup: "missing" | "checking" }) => ({
    countdownInTomato: true,
    blocking: { ...ready, ...blocking },
  });

  it("is left out without a blocker", () => {
    expect(labels(buildTrayMenu(idle, actions()))).not.toContain("Block Sites Now");
  });

  it("ready: a Block Sites Now checkbox and the current state, between Show Doros and the settings", () => {
    const a = { ...withBlocking(), setCountdownInTomato: vi.fn() };
    const menu = buildTrayMenu(idle, a, opts({}));
    expect(labels(menu)).toEqual([
      "Start a Doro…", "Cancel Doro", "Show Doros",
      "Block Sites Now", "Sites Blocked: No",
      "Countdown Inside Tomato", "Quit Doros",
    ]);
    const shape = menu.map((i) => (i.type === "separator" ? "---" : i.label));
    expect(shape.slice(shape.indexOf("Show Doros"))).toEqual([
      "Show Doros", "---", "Block Sites Now", "Sites Blocked: No", "---", "Countdown Inside Tomato", "Quit Doros",
    ]);

    const toggle = byLabel(menu, "Block Sites Now");
    expect(toggle.type).toBe("checkbox");
    expect(toggle.checked).toBe(false);
    expect(byLabel(menu, "Sites Blocked: No").enabled).toBe(false);
    toggle.click?.({} as never, undefined, {} as never);
    expect(a.setBlockManual).toHaveBeenCalledWith(true);
  });

  it("shows when sites are blocked and turns the manual block off", () => {
    const a = withBlocking();
    const menu = buildTrayMenu(running, a, opts({ blocked: true, manual: true }));
    expect(byLabel(menu, "Block Sites Now").checked).toBe(true);
    expect(labels(menu)).toContain("Sites Blocked: Yes");
    byLabel(menu, "Block Sites Now").click?.({} as never, undefined, {} as never);
    expect(a.setBlockManual).toHaveBeenCalledWith(false);
  });

  it("says when the last change failed", () => {
    const menu = buildTrayMenu(running, withBlocking(), opts({ blocked: false, error: "sudo: nope" }));
    expect(labels(menu)).toContain("Sites Blocked: No (last change failed)");
  });

  it("missing: Block Sites Now is disabled and Set Up Site Blocking… is offered", () => {
    const a = withBlocking();
    const menu = buildTrayMenu(idle, a, opts({ setup: "missing" }));
    expect(byLabel(menu, "Block Sites Now").enabled).toBe(false);
    expect(labels(menu)).not.toContain("Sites Blocked: No");
    byLabel(menu, "Set Up Site Blocking…").click?.({} as never, undefined, {} as never);
    expect(a.setUpBlocking).toHaveBeenCalledTimes(1);
  });

  it("outdated: still usable, and offers to update the helper", () => {
    const a = withBlocking();
    const menu = buildTrayMenu(idle, a, opts({ outdated: true }));
    expect(byLabel(menu, "Block Sites Now").enabled).not.toBe(false);
    byLabel(menu, "Update Site Blocking…").click?.({} as never, undefined, {} as never);
    expect(a.setUpBlocking).toHaveBeenCalledTimes(1);
  });

  it("checking: disabled until the helper answers", () => {
    const menu = buildTrayMenu(idle, withBlocking(), opts({ setup: "checking" }));
    expect(byLabel(menu, "Block Sites Now").enabled).toBe(false);
    expect(byLabel(menu, "Sites Blocked: Checking…").enabled).toBe(false);
  });
});
