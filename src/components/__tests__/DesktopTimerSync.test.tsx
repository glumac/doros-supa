import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import DesktopTimerSync from "../DesktopTimerSync";
import DoroContext, { type DoroContextValue } from "../../utils/DoroContext";
import type { DorosBridge, TrayCommand } from "../../types/desktop";

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

describe("DesktopTimerSync", () => {
  let bridge: DorosBridge;
  let sendCommand: ((cmd: TrayCommand) => void) | undefined;

  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(console, "log").mockImplementation(() => {});
    bridge = {
      updateTimer: vi.fn(),
      onTrayCommand: vi.fn((cb: (cmd: TrayCommand) => void) => {
        sendCommand = cb;
        return () => {};
      }),
      openExternal: vi.fn(),
      onAuthCallback: vi.fn(() => () => {}),
    };
    window.doros = bridge;
  });

  afterEach(() => {
    delete window.doros;
  });

  const renderOnFeed = (ctx: DoroContextValue) =>
    render(
      <MemoryRouter initialEntries={["/"]}>
        <DoroContext.Provider value={ctx}>
          <DesktopTimerSync />
          <Routes>
            <Route path="/" element={<p>Feed page</p>} />
            <Route path="/create-doro" element={<p>New doro form</p>} />
          </Routes>
        </DoroContext.Provider>
      </MemoryRouter>,
    );

  it("sends the running doro's saved endTime to the tray", () => {
    localStorage.setItem("timerState", JSON.stringify({ endTime: NOW, task: "write chapter 3", isPaused: false }));
    renderOnFeed(makeContext());
    expect(bridge.updateTimer).toHaveBeenLastCalledWith({
      phase: "focus",
      endTime: NOW,
      isPaused: false,
      task: "write chapter 3",
    });
  });

  it("pauses and cancels the timer from the tray while on another page", () => {
    localStorage.setItem("timerState", JSON.stringify({ endTime: NOW, task: "write chapter 3", isPaused: false, originalDuration: 1_500_000 }));
    const ctx = makeContext();
    renderOnFeed(ctx);

    act(() => sendCommand!("pause"));
    expect(ctx.setIsPaused).toHaveBeenCalledWith(true);
    expect(JSON.parse(localStorage.getItem("timerState")!)).toMatchObject({ isPaused: true, pausedTimeLeft: 600_000 });

    act(() => sendCommand!("stop"));
    expect(localStorage.getItem("timerState")).toBeNull();
    expect(ctx.setInProgress).toHaveBeenCalledWith(false);
    expect(ctx.setIsActive).toHaveBeenCalledWith(false);
    expect(screen.getByText("Feed page")).toBeInTheDocument();
  });

  it("start opens the new-doro form", () => {
    renderOnFeed(makeContext({ inProgress: false, isActive: false }));
    act(() => sendCommand!("start"));
    expect(screen.getByText("New doro form")).toBeInTheDocument();
  });
});
