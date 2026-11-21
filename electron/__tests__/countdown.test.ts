// @vitest-environment node
import { describe, it, expect } from "vitest";
import { formatMMSS, isRunning, parseTimerState, remainingMs, trayLabel } from "../countdown";
import type { DesktopTimerState } from "../ipc";

const NOW = 1_800_000_000_000;
const MIN = 60_000;

const running = (msLeft: number): DesktopTimerState => ({
  phase: "focus",
  endTime: NOW + msLeft,
  isPaused: false,
  task: "write chapter 3",
});

describe("remainingMs", () => {
  it("counts down from endTime while running", () => {
    expect(remainingMs(running(24 * MIN + 13_000), NOW)).toBe(24 * MIN + 13_000);
    expect(remainingMs(running(24 * MIN), NOW + 1_000)).toBe(24 * MIN - 1_000);
  });

  it("uses pausedTimeLeft while paused, whatever the clock says", () => {
    const paused: DesktopTimerState = { phase: "focus", pausedTimeLeft: 10 * MIN, isPaused: true, task: "t" };
    expect(remainingMs(paused, NOW)).toBe(10 * MIN);
    expect(remainingMs(paused, NOW + 60 * MIN)).toBe(10 * MIN);
  });

  it("clamps to 0 once the session is past its end", () => {
    expect(remainingMs(running(5_000), NOW + 6_000)).toBe(0);
  });

  it("handles a large time jump (Mac asleep) by computing from endTime, not ticks", () => {
    const state = running(25 * MIN);
    expect(remainingMs(state, NOW + 10 * MIN)).toBe(15 * MIN);
    expect(remainingMs(state, NOW + 8 * 60 * MIN)).toBe(0);
  });

  it("is 0 when idle or when the fields it needs are missing", () => {
    expect(remainingMs({ phase: "idle", isPaused: false, task: "" }, NOW)).toBe(0);
    expect(remainingMs({ phase: "focus", isPaused: false, task: "t" }, NOW)).toBe(0);
    expect(remainingMs({ phase: "focus", isPaused: true, task: "t" }, NOW)).toBe(0);
  });
});

describe("isRunning", () => {
  it("is true only for an unpaused focus session", () => {
    expect(isRunning(running(MIN))).toBe(true);
    expect(isRunning({ ...running(MIN), isPaused: true })).toBe(false);
    expect(isRunning({ phase: "idle", isPaused: false, task: "" })).toBe(false);
  });
});

describe("formatMMSS", () => {
  it("pads minutes and seconds", () => {
    expect(formatMMSS(24 * MIN + 13_000)).toBe("24:13");
    expect(formatMMSS(5_000)).toBe("00:05");
    expect(formatMMSS(0)).toBe("00:00");
  });

  it("floors partial seconds, like the web timer", () => {
    expect(formatMMSS(24 * MIN + 13_999)).toBe("24:13");
  });

  it("keeps counting minutes past 59", () => {
    expect(formatMMSS(75 * MIN)).toBe("75:00");
  });

  it("treats negative values as 0", () => {
    expect(formatMMSS(-3_000)).toBe("00:00");
  });
});

describe("parseTimerState (untrusted IPC payload)", () => {
  it("accepts a valid running or paused state", () => {
    expect(parseTimerState(running(MIN))).toEqual(running(MIN));
    expect(parseTimerState({ phase: "focus", pausedTimeLeft: 5, isPaused: true, task: "t" })).toEqual({
      phase: "focus",
      pausedTimeLeft: 5,
      isPaused: true,
      task: "t",
    });
    expect(parseTimerState({ phase: "idle", isPaused: false, task: "" })).toEqual({
      phase: "idle",
      isPaused: false,
      task: "",
    });
  });

  it("drops unknown fields", () => {
    expect(parseTimerState({ phase: "idle", isPaused: false, task: "", extra: 1 })).toEqual({
      phase: "idle",
      isPaused: false,
      task: "",
    });
  });

  it("rejects malformed payloads", () => {
    expect(parseTimerState(null)).toBeNull();
    expect(parseTimerState("focus")).toBeNull();
    expect(parseTimerState({ phase: "nap", isPaused: false, task: "" })).toBeNull();
    expect(parseTimerState({ phase: "focus", isPaused: "no", task: "" })).toBeNull();
    expect(parseTimerState({ phase: "focus", isPaused: false, task: 3 })).toBeNull();
    expect(parseTimerState({ phase: "focus", isPaused: false, task: "", endTime: "soon" })).toBeNull();
    expect(parseTimerState({ phase: "focus", isPaused: false, task: "", endTime: Number.NaN })).toBeNull();
    expect(parseTimerState({ phase: "focus", isPaused: true, task: "", pausedTimeLeft: "5" })).toBeNull();
  });

  it("caps very long task names", () => {
    const parsed = parseTimerState({ phase: "focus", isPaused: false, task: "x".repeat(500), endTime: NOW });
    expect(parsed?.task.length).toBe(200);
  });
});

describe("trayLabel (the number inside the tomato)", () => {
  it("shows whole minutes left, rounded up, while a minute or more is left", () => {
    expect(trayLabel(25 * MIN)).toBe("25");
    expect(trayLabel(24 * MIN + 13_000)).toBe("25");
    expect(trayLabel(24 * MIN)).toBe("24");
    expect(trayLabel(MIN + 1_000)).toBe("2");
    expect(trayLabel(MIN)).toBe("1");
  });

  it("shows seconds in the last minute, matching the window's floored MM:SS", () => {
    expect(trayLabel(MIN - 1)).toBe("59");
    expect(trayLabel(45_500)).toBe("45");
    expect(trayLabel(999)).toBe("0");
    expect(trayLabel(0)).toBe("0");
  });

  it("agrees with formatMMSS at the minute boundary (01:00 → 1, 00:59 → 59)", () => {
    expect(formatMMSS(MIN + 999)).toBe("01:00");
    expect(trayLabel(MIN + 999)).toBe("1");
  });

  it("handles long sessions and negative input", () => {
    expect(trayLabel(100 * MIN)).toBe("100");
    expect(trayLabel(-5_000)).toBe("0");
  });
});
