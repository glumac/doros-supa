// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { AuthCallbackRelay, isAuthCallbackUrl } from "../deepLink";

describe("isAuthCallbackUrl", () => {
  it("accepts the doros://auth-callback deep link with or without a hash", () => {
    expect(isAuthCallbackUrl("doros://auth-callback")).toBe(true);
    expect(isAuthCallbackUrl("doros://auth-callback#access_token=a&refresh_token=b")).toBe(true);
    expect(isAuthCallbackUrl("doros://auth-callback?error=access_denied")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isAuthCallbackUrl("doros://other#access_token=a")).toBe(false);
    expect(isAuthCallbackUrl("https://auth-callback/#access_token=a")).toBe(false);
    expect(isAuthCallbackUrl("doros:auth-callback")).toBe(false);
    expect(isAuthCallbackUrl("not a url")).toBe(false);
    expect(isAuthCallbackUrl("")).toBe(false);
  });
});

describe("AuthCallbackRelay", () => {
  it("holds a URL until the renderer is listening, then delivers it once", () => {
    const send = vi.fn();
    const relay = new AuthCallbackRelay(send);

    relay.receive("doros://auth-callback#1");
    expect(send).not.toHaveBeenCalled();

    relay.rendererReady();
    expect(send).toHaveBeenCalledExactlyOnceWith("doros://auth-callback#1");

    relay.rendererReady();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("delivers immediately while the renderer is listening", () => {
    const send = vi.fn();
    const relay = new AuthCallbackRelay(send);
    relay.rendererReady();

    relay.receive("doros://auth-callback#1");
    expect(send).toHaveBeenCalledExactlyOnceWith("doros://auth-callback#1");
  });

  it("buffers again after the page reloads, keeping only the latest URL", () => {
    const send = vi.fn();
    const relay = new AuthCallbackRelay(send);
    relay.rendererReady();
    relay.rendererGone();

    relay.receive("doros://auth-callback#old");
    relay.receive("doros://auth-callback#new");
    expect(send).not.toHaveBeenCalled();

    relay.rendererReady();
    expect(send).toHaveBeenCalledExactlyOnceWith("doros://auth-callback#new");
  });
});
