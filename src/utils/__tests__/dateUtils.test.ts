import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getThisWeekStart,
  getThisWeekEnd,
  getThisMonthStart,
  getThisMonthEnd,
  getThisYearStart,
  getThisYearEnd,
  getDaysBetween,
  toISOString,
  parseDate,
} from "../dateUtils";

describe("Local Timezone Date Utilities", () => {
  beforeEach(() => {
    // Mock current date to Feb 1, 2026 (Saturday)
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-01T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getThisWeekStart', () => {
    it('returns Monday of current week at midnight UTC', () => {
      const weekStart = getThisWeekStart();

      // Feb 1, 2026 is Sunday, so Monday is Jan 26 in UTC
      expect(weekStart.getUTCFullYear()).toBe(2026);
      expect(weekStart.getUTCMonth()).toBe(0); // January (0-indexed)
      expect(weekStart.getUTCDate()).toBe(26);
      expect(weekStart.getUTCHours()).toBe(0);
      expect(weekStart.getUTCMinutes()).toBe(0);
      expect(weekStart.getUTCSeconds()).toBe(0);
    });

    it('handles Sunday correctly (goes back to Monday of same week)', () => {
      vi.setSystemTime(new Date('2026-02-08T12:00:00.000Z')); // Sunday
      const weekStart = getThisWeekStart();

      // Feb 8 is Sunday, so Monday is Feb 2
      expect(weekStart.getUTCDate()).toBe(2);
    });

    it('handles Monday correctly (same day)', () => {
      vi.setSystemTime(new Date('2026-02-02T12:00:00.000Z')); // Monday
      const weekStart = getThisWeekStart();

      expect(weekStart.getUTCDate()).toBe(2);
      expect(weekStart.getUTCHours()).toBe(0);
    });
  });

  describe('getThisWeekEnd', () => {
    it('returns Sunday of current week at end of day UTC', () => {
      const weekEnd = getThisWeekEnd();

      // Feb 1, 2026 is Sunday, so Sunday is Feb 1 (same day)
      expect(weekEnd.getUTCFullYear()).toBe(2026);
      expect(weekEnd.getUTCMonth()).toBe(1); // February
      expect(weekEnd.getUTCDate()).toBe(1);
      expect(weekEnd.getUTCHours()).toBe(23);
      expect(weekEnd.getUTCMinutes()).toBe(59);
      expect(weekEnd.getUTCSeconds()).toBe(59);
      expect(weekEnd.getUTCMilliseconds()).toBe(999);
    });
  });

  describe('getThisMonthStart', () => {
    it('returns first day of current month at midnight UTC', () => {
      const monthStart = getThisMonthStart();

      expect(monthStart.getUTCFullYear()).toBe(2026);
      expect(monthStart.getUTCMonth()).toBe(1); // February
      expect(monthStart.getUTCDate()).toBe(1);
      expect(monthStart.getUTCHours()).toBe(0);
      expect(monthStart.getUTCMinutes()).toBe(0);
      expect(monthStart.getUTCSeconds()).toBe(0);
    });

    it('handles DST transition month (March)', () => {
      vi.setSystemTime(new Date('2026-03-15T12:00:00.000Z'));
      const monthStart = getThisMonthStart();

      expect(monthStart.getUTCMonth()).toBe(2); // March
      expect(monthStart.getUTCDate()).toBe(1);
      expect(monthStart.getUTCHours()).toBe(0);
    });

    it('handles DST transition month (November)', () => {
      vi.setSystemTime(new Date('2026-11-15T12:00:00.000Z'));
      const monthStart = getThisMonthStart();

      expect(monthStart.getUTCMonth()).toBe(10); // November
      expect(monthStart.getUTCDate()).toBe(1);
      expect(monthStart.getUTCHours()).toBe(0);
    });
  });

  describe('getThisMonthEnd', () => {
    it('returns last day of current month at end of day UTC', () => {
      const monthEnd = getThisMonthEnd();

      expect(monthEnd.getUTCFullYear()).toBe(2026);
      expect(monthEnd.getUTCMonth()).toBe(1); // February
      expect(monthEnd.getUTCDate()).toBe(28); // 2026 is not a leap year
      expect(monthEnd.getUTCHours()).toBe(23);
      expect(monthEnd.getUTCMinutes()).toBe(59);
      expect(monthEnd.getUTCSeconds()).toBe(59);
    });

    it('handles leap year February', () => {
      vi.setSystemTime(new Date('2024-02-15T12:00:00.000Z'));
      const monthEnd = getThisMonthEnd();

      expect(monthEnd.getUTCDate()).toBe(29); // 2024 is a leap year
    });

    it('handles months with 31 days', () => {
      vi.setSystemTime(new Date('2026-01-15T12:00:00.000Z'));
      const monthEnd = getThisMonthEnd();

      expect(monthEnd.getUTCDate()).toBe(31);
    });
  });

  describe('getThisYearStart', () => {
    it('returns Jan 1 at midnight UTC', () => {
      const yearStart = getThisYearStart();

      expect(yearStart.getUTCFullYear()).toBe(2026);
      expect(yearStart.getUTCMonth()).toBe(0); // January
      expect(yearStart.getUTCDate()).toBe(1);
      expect(yearStart.getUTCHours()).toBe(0);
      expect(yearStart.getUTCMinutes()).toBe(0);
      expect(yearStart.getUTCSeconds()).toBe(0);
    });
  });

  describe('getThisYearEnd', () => {
    it('returns Dec 31 at end of day UTC', () => {
      const yearEnd = getThisYearEnd();

      expect(yearEnd.getUTCFullYear()).toBe(2026);
      expect(yearEnd.getUTCMonth()).toBe(11); // December
      expect(yearEnd.getUTCDate()).toBe(31);
      expect(yearEnd.getUTCHours()).toBe(23);
      expect(yearEnd.getUTCMinutes()).toBe(59);
      expect(yearEnd.getUTCSeconds()).toBe(59);
    });
  });

  describe('parseDate', () => {
    it('parses YYYY-MM-DD as UTC to prevent timezone shifts', () => {
      const date = parseDate('2026-03-15');

      // Should be interpreted as UTC midnight
      expect(date.toISOString()).toBe('2026-03-15T00:00:00.000Z');
    });

    it('handles year boundaries', () => {
      const date = parseDate('2026-01-01');

      expect(date.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    });
  });

  describe('toISOString', () => {
    it('converts Date to ISO string', () => {
      const date = new Date('2026-03-15T12:30:45.123Z');
      const iso = toISOString(date);

      expect(iso).toBe('2026-03-15T12:30:45.123Z');
    });
  });

  describe('getDaysBetween', () => {
    it('calculates days between two dates', () => {
      const start = new Date('2026-01-01');
      const end = new Date('2026-01-08');

      expect(getDaysBetween(start, end)).toBe(7);
    });

    it('handles same day', () => {
      const date = new Date('2026-01-01');

      expect(getDaysBetween(date, date)).toBe(0);
    });

    it('handles reversed dates (absolute value)', () => {
      const start = new Date('2026-01-08');
      const end = new Date('2026-01-01');

      expect(getDaysBetween(start, end)).toBe(7);
    });
  });
});
