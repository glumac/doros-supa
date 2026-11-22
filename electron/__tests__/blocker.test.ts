// @vitest-environment node
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import {
  createBlocker,
  shouldBlock,
  type BlockerOptions,
  type BlockerStatus,
  type HelperCommand,
  type HelperInstall,
  type HelperResult,
} from "../blocker";
import type { DesktopTimerState } from "../ipc";

const NOW = 1_700_000_000_000;
const idle: DesktopTimerState = { phase: "idle", isPaused: false, task: "" };
const focus = (msLeft = 25 * 60_000): DesktopTimerState => ({
  phase: "focus",
  endTime: Date.now() + msLeft,
  isPaused: false,
  task: "write",
});
const paused: DesktopTimerState = { phase: "focus", pausedTimeLeft: 60_000, isPaused: true, task: "write" };

describe("shouldBlock", () => {
  it("blocks only while a focus session is running, or when forced", () => {
    expect(shouldBlock(focus(), false, Date.now())).toBe(true);
    expect(shouldBlock(paused, false, Date.now())).toBe(false);
    expect(shouldBlock(idle, false, Date.now())).toBe(false);
    expect(shouldBlock({ ...focus(), phase: "break" }, false, Date.now())).toBe(false);
    expect(shouldBlock(idle, true, Date.now())).toBe(true);
    expect(shouldBlock(paused, true, Date.now())).toBe(true);
  });

  it("stops blocking once endTime has passed, even if the renderer never says so", () => {
    const s = focus(1000);
    expect(shouldBlock(s, false, s.endTime! - 1)).toBe(true);
    expect(shouldBlock(s, false, s.endTime!)).toBe(false);
    expect(shouldBlock({ ...s, endTime: undefined }, false, Date.now())).toBe(false);
  });
});

/** A fake helper: keeps "/etc/hosts" state and records every call. */
function fakeHelper(initiallyOn = false) {
  const helper = {
    hostsOn: initiallyOn,
    calls: [] as HelperCommand[],
    fail: null as null | ((cmd: HelperCommand) => boolean),
    running: 0,
    maxRunning: 0,
    install: "current" as HelperInstall,
    run: async (cmd: HelperCommand): Promise<HelperResult> => {
      helper.calls.push(cmd);
      helper.running++;
      helper.maxRunning = Math.max(helper.maxRunning, helper.running);
      await Promise.resolve();
      helper.running--;
      if (helper.fail?.(cmd)) return { ok: false, stdout: "", stderr: "sudo: a password is required\n" };
      if (cmd === "on") helper.hostsOn = true;
      if (cmd === "off") helper.hostsOn = false;
      return { ok: true, stdout: helper.hostsOn ? "on\n" : "off\n", stderr: "" };
    },
  };
  return helper;
}

function setup(helper = fakeHelper(), extra: Partial<BlockerOptions> = {}) {
  const changes: BlockerStatus[] = [];
  const blocker = createBlocker({
    run: helper.run,
    inspect: () => helper.install,
    onChange: (s) => changes.push(s),
    unblockDelayMs: 3000,
    startupDelayMs: 15000,
    ...extra,
  });
  return { blocker, helper, changes };
}

const onOff = (calls: HelperCommand[]) => calls.filter((c) => c !== "status");

describe("createBlocker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it("does nothing if the helper isn't installed", async () => {
    const { blocker, helper } = setup();
    helper.install = "missing";
    await blocker.start();
    blocker.setTimer(focus());
    await blocker.settled();
    expect(helper.calls).toEqual([]);
    expect(blocker.status()).toMatchObject({ setup: "missing", blocked: false });
  });

  it("treats a sudo refusal (no sudoers rule) as not set up", async () => {
    const { blocker, helper } = setup();
    helper.fail = () => true;
    await blocker.start();
    expect(blocker.status()).toMatchObject({ setup: "missing", blocked: false });
  });

  it("reads the current state on start and flags an outdated helper", async () => {
    const { blocker, helper } = setup();
    helper.install = "outdated";
    await blocker.start();
    expect(helper.calls).toEqual(["status"]);
    expect(blocker.status()).toEqual({ setup: "ready", outdated: true, blocked: false, manual: false, error: null });
  });

  it("blocks once when a focus session starts, not on every update", async () => {
    const { blocker, helper, changes } = setup();
    await blocker.start();
    blocker.setTimer(focus());
    blocker.setTimer({ ...focus(), task: "renamed" });
    await blocker.settled();
    blocker.setTimer(focus(20 * 60_000));
    await blocker.settled();
    expect(onOff(helper.calls)).toEqual(["on"]);
    expect(blocker.status().blocked).toBe(true);
    expect(changes.at(-1)?.blocked).toBe(true);
  });

  it("unblocks a few seconds after the session stops, not right away", async () => {
    const { blocker, helper } = setup();
    await blocker.start();
    blocker.setTimer(focus());
    await blocker.settled();
    blocker.setTimer(idle);
    await vi.advanceTimersByTimeAsync(2999);
    expect(onOff(helper.calls)).toEqual(["on"]);
    await vi.advanceTimersByTimeAsync(1);
    await blocker.settled();
    expect(onOff(helper.calls)).toEqual(["on", "off"]);
    expect(blocker.status().blocked).toBe(false);
  });

  it("stays blocked through a page reload (idle, then focus again)", async () => {
    const { blocker, helper } = setup();
    await blocker.start();
    const s = focus();
    blocker.setTimer(s);
    await blocker.settled();
    blocker.setTimer(idle);
    await vi.advanceTimersByTimeAsync(1500);
    blocker.setTimer(s);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(onOff(helper.calls)).toEqual(["on"]);
  });

  it("unblocks on pause and blocks again on resume", async () => {
    const { blocker, helper } = setup();
    await blocker.start();
    blocker.setTimer(focus());
    await blocker.settled();
    blocker.setTimer(paused);
    await vi.advanceTimersByTimeAsync(3000);
    blocker.setTimer(focus(60_000));
    await blocker.settled();
    expect(onOff(helper.calls)).toEqual(["on", "off", "on"]);
  });

  it("unblocks when endTime passes even without another update", async () => {
    const { blocker, helper } = setup();
    await blocker.start();
    blocker.setTimer(focus(10_000));
    await blocker.settled();
    await vi.advanceTimersByTimeAsync(10_000 + 3000 + 100);
    await blocker.settled();
    expect(onOff(helper.calls)).toEqual(["on", "off"]);
  });

  it("after a crash, unblocks on launch unless a running session shows up first", async () => {
    const crashed = setup(fakeHelper(true));
    await crashed.blocker.start();
    expect(crashed.blocker.status().blocked).toBe(true);
    await vi.advanceTimersByTimeAsync(14_999);
    expect(onOff(crashed.helper.calls)).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    await crashed.blocker.settled();
    expect(onOff(crashed.helper.calls)).toEqual(["off"]);

    const resumed = setup(fakeHelper(true));
    await resumed.blocker.start();
    await vi.advanceTimersByTimeAsync(5000);
    resumed.blocker.setTimer(focus());
    await vi.advanceTimersByTimeAsync(60_000);
    expect(onOff(resumed.helper.calls)).toEqual([]);
    expect(resumed.blocker.status().blocked).toBe(true);
  });

  it("Block Sites Now: blocks right away and unblocks right away when idle", async () => {
    const { blocker, helper } = setup();
    await blocker.start();
    blocker.setManual(true);
    await blocker.settled();
    expect(blocker.status()).toMatchObject({ manual: true, blocked: true });
    blocker.setManual(false);
    await blocker.settled();
    expect(onOff(helper.calls)).toEqual(["on", "off"]);
    expect(blocker.status()).toMatchObject({ manual: false, blocked: false });
  });

  it("Block Sites Now off during a focus session keeps the sites blocked", async () => {
    const { blocker, helper } = setup();
    await blocker.start();
    blocker.setTimer(focus());
    blocker.setManual(true);
    blocker.setManual(false);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(onOff(helper.calls)).toEqual(["on"]);
  });

  it("reports a failed change and tries again on the next change", async () => {
    const { blocker, helper } = setup();
    await blocker.start();
    helper.fail = (cmd) => cmd === "on";
    blocker.setTimer(focus());
    await blocker.settled();
    expect(blocker.status()).toMatchObject({ setup: "ready", blocked: false, error: "sudo: a password is required" });
    helper.fail = null;
    blocker.setTimer({ ...focus(), task: "again" });
    await blocker.settled();
    expect(blocker.status()).toMatchObject({ blocked: true, error: null });
  });

  it("checks again when a session starts after the helper was missing (user just installed it)", async () => {
    const { blocker, helper } = setup();
    helper.install = "missing";
    await blocker.start();
    helper.install = "current";
    blocker.setTimer(focus());
    await blocker.settled();
    expect(blocker.status()).toMatchObject({ setup: "ready", blocked: true });
  });

  it("refresh() re-reads the helper and applies the current state", async () => {
    const { blocker, helper } = setup();
    helper.install = "missing";
    await blocker.start();
    blocker.setManual(true);
    await blocker.settled();
    expect(helper.calls).toEqual([]);
    helper.install = "current";
    await blocker.refresh();
    expect(blocker.status()).toMatchObject({ setup: "ready", blocked: true, manual: true });
  });

  it("never runs two helper calls at once", async () => {
    const { blocker, helper } = setup();
    await blocker.start();
    for (let i = 0; i < 5; i++) {
      blocker.setManual(true);
      blocker.setManual(false);
    }
    blocker.setTimer(focus());
    void blocker.refresh();
    await blocker.settled();
    expect(helper.maxRunning).toBe(1);
    expect(helper.hostsOn).toBe(true);
  });

  it("dispose() cancels pending timers", async () => {
    const { blocker, helper } = setup();
    await blocker.start();
    blocker.setTimer(focus());
    await blocker.settled();
    blocker.setTimer(idle);
    blocker.dispose();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(onOff(helper.calls)).toEqual(["on"]);
  });
});
