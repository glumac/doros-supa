import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getThisWeekStart,
  getThisWeekEnd,
  getWeekStart,
  getWeekEnd,
} from '../dateUtils';

describe('Week Range Utils - Ensure Mon-Sun (7 days)', () => {
  beforeEach(() => {
    // Mock current date as Saturday, January 31, 2026
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-31T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getThisWeekStart', () => {
    it('returns Monday of current week (Jan 26, 2026)', () => {
      const result = getThisWeekStart();

      expect(result.getUTCDate()).toBe(26);
      expect(result.getUTCMonth()).toBe(0); // January
      expect(result.getUTCFullYear()).toBe(2026);
      expect(result.getUTCDay()).toBe(1); // Monday
    });
  });

  describe('getThisWeekEnd', () => {
    it('returns Sunday of current week (Feb 1, 2026)', () => {
      const result = getThisWeekEnd();

      expect(result.getUTCDate()).toBe(1);
      expect(result.getUTCMonth()).toBe(1); // February
      expect(result.getUTCFullYear()).toBe(2026);
      expect(result.getUTCDay()).toBe(0); // Sunday
    });
  });

  describe('this week is always exactly 7 days', () => {
    it('Mon Jan 26 to Sun Feb 1 is exactly 7 days', () => {
      const start = getThisWeekStart();
      const end = getThisWeekEnd();

      const daysDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBe(6); // 6 days difference = 7 days total (inclusive)
    });
  });

  describe('getWeekStart', () => {
    it('returns Monday for any date in the week', () => {
      // Test with Saturday Jan 31
      const saturday = new Date('2026-01-31T12:00:00Z');
      const monday = getWeekStart(saturday);

      expect(monday.getUTCDate()).toBe(26); // Jan 26
      expect(monday.getUTCMonth()).toBe(0); // January
      expect(monday.getUTCDay()).toBe(1); // Monday
    });

    it('returns same Monday for a Monday', () => {
      const monday = new Date('2026-01-26T12:00:00Z');
      const result = getWeekStart(monday);

      expect(result.getUTCDate()).toBe(26);
      expect(result.getUTCMonth()).toBe(0);
      expect(result.getUTCDay()).toBe(1);
    });

    it('returns Monday for Sunday', () => {
      const sunday = new Date('2026-02-01T12:00:00Z');
      const monday = getWeekStart(sunday);

      expect(monday.getUTCDate()).toBe(26); // Jan 26
      expect(monday.getUTCMonth()).toBe(0); // January
      expect(monday.getUTCDay()).toBe(1); // Monday
    });
  });

  describe('getWeekEnd', () => {
    it('returns Sunday for any date in the week', () => {
      // Test with Saturday Jan 31
      const saturday = new Date('2026-01-31T12:00:00Z');
      const sunday = getWeekEnd(saturday);

      expect(sunday.getUTCDate()).toBe(1); // Feb 1
      expect(sunday.getUTCMonth()).toBe(1); // February
      expect(sunday.getUTCDay()).toBe(0); // Sunday
    });

    it('returns same Sunday for a Sunday', () => {
      const sunday = new Date('2026-02-01T12:00:00Z');
      const result = getWeekEnd(sunday);

      expect(result.getUTCDate()).toBe(1);
      expect(result.getUTCMonth()).toBe(1);
      expect(result.getUTCDay()).toBe(0);
    });

    it('returns Sunday for Monday', () => {
      const monday = new Date('2026-01-26T12:00:00Z');
      const sunday = getWeekEnd(monday);

      expect(sunday.getUTCDate()).toBe(1); // Feb 1
      expect(sunday.getUTCMonth()).toBe(1); // February
      expect(sunday.getUTCDay()).toBe(0); // Sunday
    });
  });

  describe('week range is always 7 days', () => {
    it('getWeekStart to getWeekEnd is always 7 days', () => {
      const anyDate = new Date('2026-02-01T12:00:00Z');
      const start = getWeekStart(anyDate);
      const end = getWeekEnd(anyDate);

      const daysDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBe(6); // 6 days difference = 7 days total
    });
  });
});
