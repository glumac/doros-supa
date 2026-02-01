import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getCurrentDateEST,
  getThisWeekStartEST,
  getThisWeekEndEST,
  getLastWeekStartEST,
  getLastWeekEndEST,
  getThisMonthStartEST,
  getThisMonthEndEST,
  getThisYearStartEST,
  getThisYearEndEST,
  getLastYearStartEST,
  getLastYearEndEST,
  getDaysBetween,
  toISOString,
  parseDate,
} from "../dateUtils";

describe("dateUtils", () => {
  beforeEach(() => {
    // Mock current date to January 31, 2026 at 10:00 AM EST
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-31T15:00:00.000Z")); // 10:00 AM EST = 15:00 UTC
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getCurrentDateEST", () => {
    it("should return current date in EST", () => {
      const date = getCurrentDateEST();
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(0); // January
      expect(date.getDate()).toBe(31);
    });
  });

  describe("getThisYearStartEST", () => {
    it("should return January 1st at midnight UTC", () => {
      const start = getThisYearStartEST();
      const iso = start.toISOString();
      expect(iso).toBe("2026-01-01T00:00:00.000Z");
    });
  });

  describe("getThisYearEndEST", () => {
    it("should return December 31st at 23:59:59.999 UTC", () => {
      const end = getThisYearEndEST();
      const iso = end.toISOString();
      expect(iso).toBe("2026-12-31T23:59:59.999Z");
    });
  });

  describe("toISOString", () => {
    it("should convert UTC date to ISO string", () => {
      const utcDate = new Date(Date.UTC(2026, 0, 1, 0, 0, 0, 0));
      const isoString = toISOString(utcDate);

      expect(isoString).toBe("2026-01-01T00:00:00.000Z");
    });

    it("should handle year end correctly", () => {
      const utcDate = new Date(Date.UTC(2026, 11, 31, 23, 59, 59, 999));
      const isoString = toISOString(utcDate);

      expect(isoString).toBe("2026-12-31T23:59:59.999Z");
    });

    it("should handle year start correctly", () => {
      const utcDate = new Date(Date.UTC(2026, 0, 1, 0, 0, 0, 0));
      const isoString = toISOString(utcDate);

      expect(isoString.startsWith("2026-01-01")).toBe(true);
    });
  });

  describe("this year range", () => {
    it("should create a valid range that stays within 2026", () => {
      const start = getThisYearStartEST();
      const end = getThisYearEndEST();

      const startISO = toISOString(start);
      const endISO = toISOString(end);

      // Both should be in 2026
      expect(startISO.startsWith("2026-01-01")).toBe(true);
      expect(endISO.startsWith("2026-12-31")).toBe(true);

      // Should not leak into 2025 or 2027
      expect(startISO).not.toContain("2025");
      expect(endISO).not.toContain("2027");
    });
  });

  describe("last year range", () => {
    it("should create a valid range that stays within 2025", () => {
      const start = getLastYearStartEST();
      const end = getLastYearEndEST();

      const startISO = toISOString(start);
      const endISO = toISOString(end);

      // Both should be in 2025
      expect(startISO.startsWith("2025-01-01")).toBe(true);
      expect(endISO.startsWith("2025-12-31")).toBe(true);

      // Should not leak into 2024 or 2026
      expect(startISO).not.toContain("2024");
      expect(endISO).not.toContain("2026");
    });
  });

  describe("getThisWeekStartEST", () => {
    it("should return Monday of current week", () => {
      // Jan 31, 2026 is a Saturday
      const monday = getThisWeekStartEST();

      expect(monday.getDay()).toBe(1); // Monday
      expect(monday.getDate()).toBe(26); // Jan 26, 2026
      expect(monday.getHours()).toBe(0);
      expect(monday.getMinutes()).toBe(0);
    });
  });

  describe("getThisWeekEndEST", () => {
    it("should return Sunday of current week", () => {
      // Jan 31, 2026 is a Saturday
      const sunday = getThisWeekEndEST();

      expect(sunday.getDay()).toBe(0); // Sunday
      expect(sunday.getDate()).toBe(1); // Feb 1, 2026
      expect(sunday.getHours()).toBe(23);
      expect(sunday.getMinutes()).toBe(59);
    });
  });

  describe("getThisMonthStartEST", () => {
    it("should return first day of current month UTC", () => {
      const start = getThisMonthStartEST();
      const iso = start.toISOString();

      expect(iso).toBe("2026-01-01T00:00:00.000Z");
    });
  });

  describe("getThisMonthEndEST", () => {
    it("should return last day of current month UTC", () => {
      const end = getThisMonthEndEST();
      const iso = end.toISOString();

      expect(iso).toBe("2026-01-31T23:59:59.999Z");
    });
  });

  describe("getDaysBetween", () => {
    it("should calculate days between two dates", () => {
      const start = new Date("2026-01-01");
      const end = new Date("2026-01-10");

      expect(getDaysBetween(start, end)).toBe(9);
    });

    it("should handle same date", () => {
      const date = new Date("2026-01-01");

      expect(getDaysBetween(date, date)).toBe(0);
    });
  });

  describe("parseDate", () => {
    it("should parse YYYY-MM-DD format", () => {
      const date = parseDate("2026-01-15");

      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(0); // January
      expect(date.getDate()).toBe(15);
    });
  });
});
