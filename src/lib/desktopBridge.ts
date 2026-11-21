// Thin, React-free helpers around the Electron bridge (`window.doros`).
// In a normal browser `window.doros` is undefined and every helper here is a no-op.
import type { DorosBridge } from "../types/desktop";

/** Where Supabase sends the desktop OAuth flow back to (registered in Supabase → Redirect URLs). */
export const DESKTOP_AUTH_REDIRECT = "doros://auth-callback";

export function getDesktopBridge(): DorosBridge | undefined {
  return typeof window === "undefined" ? undefined : window.doros;
}

export function isDesktop(): boolean {
  return getDesktopBridge() !== undefined;
}

export type AuthCallbackResult =
  | { type: "tokens"; accessToken: string; refreshToken: string }
  | { type: "error"; message: string };

/**
 * Parses `doros://auth-callback#access_token=…&refresh_token=…` (Supabase implicit flow).
 * Returns the OAuth error if Supabase sent one, or null for anything that isn't a usable
 * auth callback.
 */
export function parseAuthCallback(url: string): AuthCallbackResult | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (`${parsed.protocol}//${parsed.host}` !== DESKTOP_AUTH_REDIRECT) return null;

  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ""));
  const query = parsed.searchParams;

  const error = hash.get("error") ?? query.get("error");
  if (error) {
    return {
      type: "error",
      message: hash.get("error_description") ?? query.get("error_description") ?? error,
    };
  }

  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");
  if (!accessToken || !refreshToken) return null;
  return { type: "tokens", accessToken, refreshToken };
}
