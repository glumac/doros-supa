import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDesktopTimerSync, type DesktopTimerControls } from "../useDesktopTimerSync";
import type { DesktopTimerState, DorosBridge, TrayCommand } from "../../types/desktop";

const idle: DesktopTimerState = { phase: "idle", isPaused: false, task: "" };
const running: DesktopTimerState = { phase: "focus", endTime: 1_800_000_000_000, isPaused: false, task: "t" };
const paused: DesktopTimerState = { phase: "focus", pausedTimeLeft: 60_000, isPaused: true, task: "t" };

describe("useDesktopTimerSync", () => {
  let bridge: DorosBridge;
  let sendCommand: ((cmd: TrayCommand) => void) | undefined;
  let unsubscribe: ReturnType<typeof vi.fn>;
  let controls: DesktopTimerControls;

  beforeEach(() => {
    sendCommand = undefined;
    unsubscribe = vi.fn();
    bridge = {
      updateTimer: vi.fn(),
      onTrayCommand: vi.fn((cb: (cmd: TrayCommand) => void) => {
        sendCommand = cb;
        return unsubscribe;
      }),
      openExternal: vi.fn(),
      onAuthCallback: vi.fn(() => () => {}),
    };
    window.doros = bridge;
    controls = { pause: vi.fn(), resume: vi.fn(), stop: vi.fn(), start: vi.fn() };
  });

  afterEach(() => {
    delete window.doros;
  });

  it("does nothing in a normal browser (no window.doros)", () => {
    delete window.doros;
    const { rerender, unmount } = renderHook(({ s }) => useDesktopTimerSync(s, controls), {
      initialProps: { s: running },
    });
    rerender({ s: paused });
    unmount();
    expect(bridge.updateTimer).not.toHaveBeenCalled();
    expect(bridge.onTrayCommand).not.toHaveBeenCalled();
  });

  it("pushes the timer state on mount and on every change", () => {
    const { rerender } = renderHook(({ s }) => useDesktopTimerSync(s, controls), {
      initialProps: { s: idle },
    });
    expect(bridge.updateTimer).toHaveBeenLastCalledWith(idle);

    rerender({ s: running });
    expect(bridge.updateTimer).toHaveBeenLastCalledWith(running);

    rerender({ s: paused });
    expect(bridge.updateTimer).toHaveBeenLastCalledWith(paused);
    expect(bridge.updateTimer).toHaveBeenCalledTimes(3);
  });

  it("doesn't resend an identical state (new object, same values)", () => {
    const { rerender } = renderHook(({ s }) => useDesktopTimerSync(s, controls), {
      initialProps: { s: { ...running } },
    });
    rerender({ s: { ...running } });
    rerender({ s: { ...running } });
    expect(bridge.updateTimer).toHaveBeenCalledTimes(1);
  });

  it("runs the matching handler for tray commands", () => {
    const { rerender } = renderHook(({ s }) => useDesktopTimerSync(s, controls), {
      initialProps: { s: running },
    });
    sendCommand!("pause");
    expect(controls.pause).toHaveBeenCalledTimes(1);

    rerender({ s: paused });
    sendCommand!("resume");
    expect(controls.resume).toHaveBeenCalledTimes(1);

    sendCommand!("stop");
    expect(controls.stop).toHaveBeenCalledTimes(1);

    rerender({ s: idle });
    sendCommand!("start");
    expect(controls.start).toHaveBeenCalledTimes(1);
  });

  it("ignores commands that don't fit the current state", () => {
    const { rerender } = renderHook(({ s }) => useDesktopTimerSync(s, controls), {
      initialProps: { s: idle },
    });
    sendCommand!("pause");
    sendCommand!("resume");
    sendCommand!("stop");

    rerender({ s: running });
    sendCommand!("resume");
    sendCommand!("start");

    rerender({ s: paused });
    sendCommand!("pause");

    sendCommand!("show"); // handled by the main process
    expect(controls.pause).not.toHaveBeenCalled();
    expect(controls.resume).not.toHaveBeenCalled();
    expect(controls.stop).not.toHaveBeenCalled();
    expect(controls.start).not.toHaveBeenCalled();
  });

  it("uses the latest handlers without resubscribing", () => {
    const { rerender } = renderHook(({ s, c }) => useDesktopTimerSync(s, c), {
      initialProps: { s: running, c: controls },
    });
    const newer: DesktopTimerControls = { pause: vi.fn(), resume: vi.fn(), stop: vi.fn(), start: vi.fn() };
    rerender({ s: running, c: newer });

    sendCommand!("pause");
    expect(newer.pause).toHaveBeenCalledTimes(1);
    expect(controls.pause).not.toHaveBeenCalled();
    expect(bridge.onTrayCommand).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes and resets the tray to idle on unmount", () => {
    const { unmount } = renderHook(() => useDesktopTimerSync(running, controls));
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(bridge.updateTimer).toHaveBeenLastCalledWith(idle);
  });
});
