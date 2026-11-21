// @vitest-environment node
import { describe, it, expect } from "vitest";
import { DEFAULT_SETTINGS, parseSettings } from "../settings";

describe("parseSettings", () => {
  it("defaults to the countdown inside the tomato", () => {
    expect(DEFAULT_SETTINGS).toEqual({ countdownInTomato: true });
  });

  it("returns the defaults for missing or malformed data", () => {
    expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("nope")).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings([])).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings({ countdownInTomato: "no" })).toEqual(DEFAULT_SETTINGS);
  });

  it("reads a saved choice and drops unknown keys", () => {
    expect(parseSettings({ countdownInTomato: false, extra: 1 })).toEqual({ countdownInTomato: false });
  });
});
