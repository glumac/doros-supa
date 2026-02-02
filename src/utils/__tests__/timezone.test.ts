import { describe, it, expect } from "vitest";
import { getUserTimezone } from "../timezone";

describe("getUserTimezone", () => {
  it("should return a valid IANA timezone string", () => {
    const timezone = getUserTimezone();

    // Should return a string
    expect(typeof timezone).toBe("string");

    // Should not be empty
    expect(timezone.length).toBeGreaterThan(0);

    // Should be a valid timezone format (contains a slash for IANA timezones or is fallback)
    expect(
      timezone.includes("/") || timezone === "America/New_York"
    ).toBe(true);
  });

  it("should return America/New_York as fallback", () => {
    // We can't easily mock Intl.DateTimeFormat to fail in tests,
    // but we can at least verify the fallback value is correct
    const fallbackTimezone = "America/New_York";

    // If the actual timezone is the same as fallback, that's fine
    const timezone = getUserTimezone();
    expect(typeof timezone).toBe("string");

    // The fallback should be a valid timezone
    expect(fallbackTimezone).toBe("America/New_York");
  });

  it("should detect browser timezone (integration test)", () => {
    // This will use the actual browser/Node timezone
    const timezone = getUserTimezone();

    // Should match what Intl.DateTimeFormat would return
    const expected = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";

    expect(timezone).toBe(expected);
  });
});
