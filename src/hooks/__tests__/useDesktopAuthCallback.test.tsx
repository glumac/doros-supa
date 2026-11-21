import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useDesktopAuthCallback } from "../useDesktopAuthCallback";
import { supabase } from "../../lib/supabaseClient";
import type { DorosBridge } from "../../types/desktop";

vi.mock("../../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      setSession: vi.fn(),
    },
  },
}));

describe("useDesktopAuthCallback", () => {
  let emit: ((url: string) => void) | undefined;
  let unsubscribe: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    emit = undefined;
    unsubscribe = vi.fn();
    const bridge: DorosBridge = {
      updateTimer: vi.fn(),
      onTrayCommand: vi.fn(() => () => {}),
      openExternal: vi.fn(),
      onAuthCallback: vi.fn((cb: (url: string) => void) => {
        emit = cb;
        return unsubscribe;
      }),
    };
    window.doros = bridge;
    vi.mocked(supabase.auth.setSession).mockResolvedValue({
      data: { session: null, user: null },
      error: null,
    } as never);
  });

  afterEach(() => {
    delete window.doros;
  });

  it("does nothing in a normal browser (no window.doros)", () => {
    delete window.doros;
    expect(() => renderHook(() => useDesktopAuthCallback())).not.toThrow();
    expect(supabase.auth.setSession).not.toHaveBeenCalled();
  });

  it("calls setSession with the tokens from the deep link", async () => {
    renderHook(() => useDesktopAuthCallback());
    expect(emit).toBeDefined();

    emit!("doros://auth-callback#access_token=acc&expires_in=3600&refresh_token=ref&token_type=bearer");

    await waitFor(() => {
      expect(supabase.auth.setSession).toHaveBeenCalledWith({
        access_token: "acc",
        refresh_token: "ref",
      });
    });
  });

  it("ignores callback URLs without tokens", () => {
    renderHook(() => useDesktopAuthCallback());
    emit!("doros://auth-callback");
    emit!("doros://other#access_token=a&refresh_token=b");
    expect(supabase.auth.setSession).not.toHaveBeenCalled();
  });

  it("reports an OAuth error instead of setting a session", () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderHook(() => useDesktopAuthCallback());
    emit!("doros://auth-callback#error=access_denied&error_description=User+denied");

    expect(supabase.auth.setSession).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith("Failed to login. Please try again.");

    alertSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("reports a setSession failure", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(supabase.auth.setSession).mockResolvedValue({
      data: { session: null, user: null },
      error: new Error("bad token"),
    } as never);

    renderHook(() => useDesktopAuthCallback());
    emit!("doros://auth-callback#access_token=acc&refresh_token=ref");

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Failed to login. Please try again.");
    });

    alertSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() => useDesktopAuthCallback());
    expect(unsubscribe).not.toHaveBeenCalled();
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
