import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ReactNode } from "react";
import { useTimerControls } from "../useTimerControls";
import DoroContext, { type DoroContextValue } from "../../utils/DoroContext";

const NOW = 1_800_000_000_000;

const makeContext = (overrides: Partial<DoroContextValue> = {}): DoroContextValue => ({
  inProgress: true,
  setInProgress: vi.fn(),
  timerState: null,
  setTimerState: vi.fn(),
  isActive: true,
  setIsActive: vi.fn(),
  isPaused: false,
  setIsPaused: vi.fn(),
  timeLeft: 600_000,
  setTimeLeft: vi.fn(),
  task: "write chapter 3",
  setTask: vi.fn(),
  launchAt: "2026-11-21T10:00:00.000Z",
  setLaunchAt: vi.fn(),
  completed: false,
  setCompleted: vi.fn(),
  ...overrides,
});

const renderControls = (ctx: DoroContextValue) =>
  renderHook(() => useTimerControls(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <DoroContext.Provider value={ctx}>{children}</DoroContext.Provider>
    ),
  });

describe("useTimerControls", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    vi.spyOn(console, "log").mockImplementation(() => {});
    localStorage.setItem(
      "timerState",
      JSON.stringify({ endTime: NOW + 600_000, task: "write chapter 3", isPaused: false, originalDuration: 1_500_000, launchAt: "2026-11-21T10:00:00.000Z" }),
    );
  });

  it("pause saves the time left and marks the timer paused", () => {
    const ctx = makeContext();
    const { result } = renderControls(ctx);
    act(() => result.current.pauseTimer());

    expect(JSON.parse(localStorage.getItem("timerState")!)).toEqual({
      task: "write chapter 3",
      launchAt: "2026-11-21T10:00:00.000Z",
      pausedTimeLeft: 600_000,
      isPaused: true,
      originalDuration: 1_500_000,
    });
    expect(ctx.setIsPaused).toHaveBeenCalledWith(true);
  });

  it("resume saves a new endTime from the time left and unpauses", () => {
    const ctx = makeContext({ isPaused: true, timeLeft: 300_000 });
    const { result } = renderControls(ctx);
    act(() => result.current.resumeTimer());

    expect(JSON.parse(localStorage.getItem("timerState")!)).toEqual({
      task: "write chapter 3",
      launchAt: "2026-11-21T10:00:00.000Z",
      endTime: NOW + 300_000,
      isPaused: false,
      originalDuration: 1_500_000,
    });
    expect(ctx.setIsPaused).toHaveBeenCalledWith(false);
  });

  it("stop clears the saved timer and resets the context", () => {
    const ctx = makeContext();
    const { result } = renderControls(ctx);
    act(() => result.current.stopTimer());

    expect(localStorage.getItem("timerState")).toBeNull();
    expect(ctx.setInProgress).toHaveBeenCalledWith(false);
    expect(ctx.setIsActive).toHaveBeenCalledWith(false);
    expect(ctx.setIsPaused).toHaveBeenCalledWith(false);
    expect(ctx.setTimeLeft).toHaveBeenCalledWith(null);
  });
});
