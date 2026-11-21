import { describe, it, expect, afterEach, vi } from "vitest";
import {
  DESKTOP_AUTH_REDIRECT,
  getDesktopBridge,
  isDesktop,
  parseAuthCallback,
  readSavedTimerTimes,
  toDesktopTimerState,
} from "../desktopBridge";
import type { DorosBridge } from "../../types/desktop";

const fakeBridge = (): DorosBridge => ({
  updateTimer: vi.fn(),
  onTrayCommand: vi.fn(() => () => {}),
  openExternal: vi.fn(),
  onAuthCallback: vi.fn(() => () => {}),
});

describe("desktopBridge", () => {
  afterEach(() => {
    delete window.doros;
  });

  describe("isDesktop / getDesktopBridge", () => {
    it("is false in a normal browser", () => {
      expect(isDesktop()).toBe(false);
      expect(getDesktopBridge()).toBeUndefined();
    });

    it("is true when the Electron preload exposed window.doros", () => {
      const bridge = fakeBridge();
      window.doros = bridge;
      expect(isDesktop()).toBe(true);
      expect(getDesktopBridge()).toBe(bridge);
    });
  });

  it("redirects desktop OAuth to the doros:// deep link", () => {
    expect(DESKTOP_AUTH_REDIRECT).toBe("doros://auth-callback");
  });

  describe("parseAuthCallback", () => {
    it("reads the tokens from the implicit-flow hash", () => {
      expect(
        parseAuthCallback(
          "doros://auth-callback#access_token=acc.ess&expires_in=3600&refresh_token=ref123&token_type=bearer",
        ),
      ).toEqual({ type: "tokens", accessToken: "acc.ess", refreshToken: "ref123" });
    });

    it("decodes URL-encoded token values", () => {
      expect(
        parseAuthCallback("doros://auth-callback#access_token=a%2Bb&refresh_token=c%3Dd"),
      ).toEqual({ type: "tokens", accessToken: "a+b", refreshToken: "c=d" });
    });

    it("returns the OAuth error from the hash", () => {
      expect(
        parseAuthCallback(
          "doros://auth-callback#error=access_denied&error_code=403&error_description=User+denied",
        ),
      ).toEqual({ type: "error", message: "User denied" });
    });

    it("returns the OAuth error from the query string", () => {
      expect(
        parseAuthCallback("doros://auth-callback?error=server_error&error_description=Oops"),
      ).toEqual({ type: "error", message: "Oops" });
    });

    it("ignores URLs that are not the auth callback", () => {
      expect(parseAuthCallback("doros://something-else#access_token=a&refresh_token=b")).toBeNull();
      expect(parseAuthCallback("https://evil.example/auth-callback#access_token=a&refresh_token=b")).toBeNull();
      expect(parseAuthCallback("not a url")).toBeNull();
    });

    it("returns null when a token is missing", () => {
      expect(parseAuthCallback("doros://auth-callback#access_token=a")).toBeNull();
      expect(parseAuthCallback("doros://auth-callback")).toBeNull();
    });
  });

  describe("toDesktopTimerState", () => {
    const base = { inProgress: true, isActive: true, isPaused: false, task: "write chapter 3" };

    it("is idle when no doro is in progress", () => {
      const idle = { phase: "idle", isPaused: false, task: "" };
      expect(toDesktopTimerState({ ...base, inProgress: false, isActive: false }, null)).toEqual(idle);
      expect(toDesktopTimerState({ ...base, isActive: false }, { endTime: 5 })).toEqual(idle);
      // Finished, waiting to be logged: the timer itself is no longer running.
      expect(toDesktopTimerState({ ...base, inProgress: false }, { endTime: 5 })).toEqual(idle);
    });

    it("sends the saved endTime while running", () => {
      expect(toDesktopTimerState(base, { endTime: 1_800_000_000_000 })).toEqual({
        phase: "focus",
        endTime: 1_800_000_000_000,
        isPaused: false,
        task: "write chapter 3",
      });
    });

    it("sends the saved pausedTimeLeft while paused", () => {
      expect(toDesktopTimerState({ ...base, isPaused: true }, { pausedTimeLeft: 600_000 })).toEqual({
        phase: "focus",
        pausedTimeLeft: 600_000,
        isPaused: true,
        task: "write chapter 3",
      });
    });

    it("leaves out times that aren't saved", () => {
      expect(toDesktopTimerState(base, null)).toEqual({
        phase: "focus",
        isPaused: false,
        task: "write chapter 3",
      });
    });
  });

  describe("readSavedTimerTimes", () => {
    afterEach(() => localStorage.clear());

    it("is null when nothing is saved or the JSON is broken", () => {
      expect(readSavedTimerTimes()).toBeNull();
      localStorage.setItem("timerState", "{not json");
      expect(readSavedTimerTimes()).toBeNull();
    });

    it("reads endTime and pausedTimeLeft", () => {
      localStorage.setItem("timerState", JSON.stringify({ endTime: 123, task: "t", isPaused: false }));
      expect(readSavedTimerTimes()).toEqual({ endTime: 123 });
      localStorage.setItem("timerState", JSON.stringify({ pausedTimeLeft: 456, isPaused: true }));
      expect(readSavedTimerTimes()).toEqual({ pausedTimeLeft: 456 });
    });

    it("accepts a numeric-string endTime (the web app parseInt()s it) and drops junk", () => {
      localStorage.setItem("timerState", JSON.stringify({ endTime: "789" }));
      expect(readSavedTimerTimes()).toEqual({ endTime: 789 });
      localStorage.setItem("timerState", JSON.stringify({ endTime: "soon", pausedTimeLeft: "5" }));
      expect(readSavedTimerTimes()).toEqual({});
    });
  });
});
