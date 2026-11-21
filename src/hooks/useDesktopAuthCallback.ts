import { useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { getDesktopBridge, parseAuthCallback } from "../lib/desktopBridge";

const LOGIN_FAILED_MESSAGE = "Failed to login. Please try again.";

async function handleAuthCallback(url: string): Promise<void> {
  const result = parseAuthCallback(url);
  if (!result) return;

  if (result.type === "error") {
    console.error("Desktop login error:", result.message);
    alert(LOGIN_FAILED_MESSAGE);
    return;
  }

  // AuthContext's onAuthStateChange picks up the new session (SIGNED_IN) from here.
  const { error } = await supabase.auth.setSession({
    access_token: result.accessToken,
    refresh_token: result.refreshToken,
  });
  if (error) {
    console.error("Desktop login error:", error);
    alert(LOGIN_FAILED_MESSAGE);
  }
}

/**
 * Desktop app only: completes Google sign-in when the system browser hands the
 * `doros://auth-callback#…` deep link back to the app. No-op in a normal browser.
 * Mount once, near AuthProvider.
 */
export function useDesktopAuthCallback(): void {
  useEffect(() => {
    const bridge = getDesktopBridge();
    if (!bridge) return;
    return bridge.onAuthCallback((url) => {
      void handleAuthCallback(url);
    });
  }, []);
}
