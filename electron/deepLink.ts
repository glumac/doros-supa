// Pure helpers for the doros:// deep link that brings Google sign-in back from the
// system browser. No Electron imports, so they're unit-tested under Node.

export const DEEP_LINK_SCHEME = "doros";
const AUTH_CALLBACK_HOST = "auth-callback";

/** True for doros://auth-callback (any hash or query). The renderer parses the tokens. */
export function isAuthCallbackUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === `${DEEP_LINK_SCHEME}:` && parsed.host === AUTH_CALLBACK_HOST;
  } catch {
    return false;
  }
}

/**
 * Hands auth-callback URLs to the renderer. A deep link can arrive before the page
 * has loaded or subscribed (cold start, reload), so the latest URL is held until
 * the renderer says it's listening, then delivered once.
 */
export class AuthCallbackRelay {
  private pending: string | null = null;
  private listening = false;

  constructor(private readonly send: (url: string) => void) {}

  receive(url: string): void {
    if (this.listening) this.send(url);
    else this.pending = url;
  }

  /** The renderer subscribed to auth callbacks. */
  rendererReady(): void {
    this.listening = true;
    if (this.pending !== null) {
      const url = this.pending;
      this.pending = null;
      this.send(url);
    }
  }

  /** The page is navigating or reloading; its listener is gone. */
  rendererGone(): void {
    this.listening = false;
  }
}
