// Pure: desktop-only preferences, saved as JSON in the app's userData folder by main.ts.

export interface DesktopSettings {
  /** true: the countdown is drawn inside the tomato. false: small tomato + menu bar text
   *  (the fallback for screens where the text inside the tomato is hard to read). */
  countdownInTomato: boolean;
}

export const DEFAULT_SETTINGS: DesktopSettings = { countdownInTomato: true };

/** Validates saved settings; anything missing or malformed falls back to the default. */
export function parseSettings(value: unknown): DesktopSettings {
  const v = typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
  return {
    countdownInTomato:
      typeof v.countdownInTomato === "boolean" ? v.countdownInTomato : DEFAULT_SETTINGS.countdownInTomato,
  };
}
