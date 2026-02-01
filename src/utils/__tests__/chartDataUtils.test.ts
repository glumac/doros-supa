import { describe, it, expect } from 'vitest';
import {
  generateDateRange,
  generateWeekRange,
  generateMonthRange,
  fillDailyData,
  fillWeeklyData,
  fillMonthlyData,
  ChartDataPoint,
  WeeklyDataPoint,
  MonthlyDataPoint,
} from '../chartDataUtils';

describe('chartDataUtils', () => {
  describe('generateDateRange', () => {
    it('generates consecutive dates for a week range', () => {
      const start = new Date(2026, 0, 26); // Jan 26, 2026 (Sunday)
      const end = new Date(2026, 1, 1); // Feb 1, 2026 (Saturday)

      const result = generateDateRange(start, end);

      expect(result).toEqual([
        '2026-01-26',
        '2026-01-27',
        '2026-01-28',
        '2026-01-29',
        '2026-01-30',
        '2026-01-31',
        '2026-02-01'
      ]);
    });

    it('generates single day for same start and end date', () => {
      const date = new Date(2026, 0, 31);

      const result = generateDateRange(date, date);

      expect(result).toEqual(['2026-01-31']);
    });

    it('handles month boundaries correctly', () => {
      const start = new Date(2026, 0, 30); // Jan 30, 2026
      const end = new Date(2026, 1, 2); // Feb 2, 2026

      const result = generateDateRange(start, end);

      expect(result).toEqual([
        '2026-01-30',
        '2026-01-31',
        '2026-02-01',
        '2026-02-02'
      ]);
    });

    it('handles leap year correctly', () => {
      const start = new Date(2024, 1, 28); // Feb 28, 2024 (leap year)
      const end = new Date(2024, 2, 2); // Mar 2, 2024

      const result = generateDateRange(start, end);

      expect(result).toEqual([
        '2024-02-28',
        '2024-02-29', // Leap day
        '2024-03-01',
        '2024-03-02'
      ]);
    });
  });

  describe('generateWeekRange', () => {
    it('generates week start dates (Mondays)', () => {
      const start = new Date(2026, 0, 26); // Jan 26, 2026 (Monday)
      const end = new Date(2026, 1, 8); // Feb 8, 2026 (Sunday)

      const result = generateWeekRange(start, end);

      expect(result).toEqual([
        '2026-01-26', // Monday of week containing Jan 26
        '2026-02-02'  // Next Monday (Feb 8 is Sunday, so only 2 Mondays in range)
      ]);
    });

    it('handles start date being a Monday', () => {
      const start = new Date(2026, 0, 26); // Jan 26, 2026 (Monday)
      const end = new Date(2026, 1, 9); // Feb 9, 2026 (Monday)

      const result = generateWeekRange(start, end);

      expect(result).toEqual([
        '2026-01-26',
        '2026-02-02',
        '2026-02-09'
      ]);
    });

    it('handles single week range', () => {
      const start = new Date(Date.UTC(2026, 0, 29)); // Jan 29, 2026 UTC (Thursday)
      const end = new Date(Date.UTC(2026, 1, 1)); // Feb 1, 2026 UTC (Sunday)

      const result = generateWeekRange(start, end);

      expect(result).toEqual(['2026-01-26']); // Monday of that week in UTC
    });
  });

  describe('generateMonthRange', () => {
    it('generates month start dates for multi-month range', () => {
      const start = new Date(2026, 0, 15); // Jan 15, 2026
      const end = new Date(2026, 3, 20); // Apr 20, 2026

      const result = generateMonthRange(start, end);

      expect(result).toEqual([
        '2026-01-01',
        '2026-02-01',
        '2026-03-01',
        '2026-04-01'
      ]);
    });

    it('generates single month for same month start and end', () => {
      const start = new Date(2026, 0, 5); // Jan 5, 2026
      const end = new Date(2026, 0, 25); // Jan 25, 2026

      const result = generateMonthRange(start, end);

      expect(result).toEqual(['2026-01-01']);
    });

    it('handles year boundaries', () => {
      const start = new Date(2025, 11, 15); // Dec 15, 2025
      const end = new Date(2026, 1, 10); // Feb 10, 2026

      const result = generateMonthRange(start, end);

      expect(result).toEqual([
        '2025-12-01',
        '2026-01-01',
        '2026-02-01'
      ]);
    });
  });

  describe('fillDailyData', () => {
    it('fills missing days with zero counts', () => {
      const sparseData: ChartDataPoint[] = [
        { date: '2026-01-27', count: 5 },
        { date: '2026-01-29', count: 3 }
      ];
      const start = new Date(2026, 0, 26); // Jan 26, 2026
      const end = new Date(2026, 0, 30); // Jan 30, 2026

      const result = fillDailyData(sparseData, start, end);

      expect(result).toEqual([
        { date: '2026-01-26', count: 0 },
        { date: '2026-01-27', count: 5 },
        { date: '2026-01-28', count: 0 },
        { date: '2026-01-29', count: 3 },
        { date: '2026-01-30', count: 0 }
      ]);
    });

    it('handles empty input data', () => {
      const start = new Date(2026, 0, 29); // Jan 29, 2026
      const end = new Date(2026, 0, 31); // Jan 31, 2026

      const result = fillDailyData([], start, end);

      expect(result).toEqual([
        { date: '2026-01-29', count: 0 },
        { date: '2026-01-30', count: 0 },
        { date: '2026-01-31', count: 0 }
      ]);
    });

    it('handles data with ISO datetime strings', () => {
      const sparseData: ChartDataPoint[] = [
        { date: '2026-01-27T10:30:00.000Z', count: 7 }
      ];
      const start = new Date(2026, 0, 26); // Jan 26, 2026
      const end = new Date(2026, 0, 28); // Jan 28, 2026

      const result = fillDailyData(sparseData, start, end);

      expect(result).toEqual([
        { date: '2026-01-26', count: 0 },
        { date: '2026-01-27', count: 7 },
        { date: '2026-01-28', count: 0 }
      ]);
    });

    it('preserves all existing data points', () => {
      const sparseData: ChartDataPoint[] = [
        { date: '2026-01-26', count: 2 },
        { date: '2026-01-27', count: 4 },
        { date: '2026-01-28', count: 1 }
      ];
      const start = new Date(2026, 0, 26);
      const end = new Date(2026, 0, 28);

      const result = fillDailyData(sparseData, start, end);

      expect(result).toEqual([
        { date: '2026-01-26', count: 2 },
        { date: '2026-01-27', count: 4 },
        { date: '2026-01-28', count: 1 }
      ]);
    });
  });

  describe('fillWeeklyData', () => {
    it('fills missing weeks with zero counts', () => {
      const sparseData: WeeklyDataPoint[] = [
        { week_start: '2026-01-26', count: 12 },
        { week_start: '2026-02-09', count: 8 }
      ];
      const start = new Date(2026, 0, 26); // Jan 26, 2026 (Monday)
      const end = new Date(2026, 1, 11); // Feb 11, 2026 (Wednesday)

      const result = fillWeeklyData(sparseData, start, end);

      expect(result).toEqual([
        { week_start: '2026-01-26', count: 12 },
        { week_start: '2026-02-02', count: 0 }, // Missing week filled
        { week_start: '2026-02-09', count: 8 }
      ]);
    });

    it('handles empty input data', () => {
      const start = new Date(2026, 0, 26); // Jan 26, 2026 (Monday)
      const end = new Date(2026, 1, 9); // Feb 9, 2026 (Monday)

      const result = fillWeeklyData([], start, end);

      expect(result).toEqual([
        { week_start: '2026-01-26', count: 0 },
        { week_start: '2026-02-02', count: 0 },
        { week_start: '2026-02-09', count: 0 }
      ]);
    });

    it('handles data with ISO datetime strings', () => {
      const sparseData: WeeklyDataPoint[] = [
        { week_start: '2026-01-27T05:00:00.000Z', count: 15 }
      ];
      const start = new Date(Date.UTC(2026, 0, 27));
      const end = new Date(Date.UTC(2026, 1, 10));

      const result = fillWeeklyData(sparseData, start, end);

      expect(result).toEqual([
        { week_start: '2026-01-26', count: 0 },  // Monday before the data point
        { week_start: '2026-02-02', count: 0 },
        { week_start: '2026-02-09', count: 0 }
      ]);
    });
  });

  describe('fillMonthlyData', () => {
    it('fills missing months with zero counts', () => {
      const sparseData: MonthlyDataPoint[] = [
        { month_start: '2026-01-01', count: 25 },
        { month_start: '2026-03-01', count: 18 }
      ];
      const start = new Date(2026, 0, 15); // Jan 15, 2026
      const end = new Date(2026, 3, 20); // Apr 20, 2026

      const result = fillMonthlyData(sparseData, start, end);

      expect(result).toEqual([
        { month_start: '2026-01-01', count: 25 },
        { month_start: '2026-02-01', count: 0 }, // Missing month filled
        { month_start: '2026-03-01', count: 18 },
        { month_start: '2026-04-01', count: 0 }  // Missing month filled
      ]);
    });

    it('handles empty input data', () => {
      const start = new Date(2026, 0, 1); // Jan 1, 2026
      const end = new Date(2026, 2, 1); // Mar 1, 2026

      const result = fillMonthlyData([], start, end);

      expect(result).toEqual([
        { month_start: '2026-01-01', count: 0 },
        { month_start: '2026-02-01', count: 0 },
        { month_start: '2026-03-01', count: 0 }
      ]);
    });

    it('handles data with ISO datetime strings', () => {
      const sparseData: MonthlyDataPoint[] = [
        { month_start: '2026-02-01T05:00:00.000Z', count: 30 }
      ];
      const start = new Date(2026, 0, 15);
      const end = new Date(2026, 3, 20);

      const result = fillMonthlyData(sparseData, start, end);

      expect(result).toEqual([
        { month_start: '2026-01-01', count: 0 },
        { month_start: '2026-02-01', count: 30 },
        { month_start: '2026-03-01', count: 0 },
        { month_start: '2026-04-01', count: 0 }
      ]);
    });

    it('handles year boundaries correctly', () => {
      const sparseData: MonthlyDataPoint[] = [
        { month_start: '2025-12-01', count: 20 },
        { month_start: '2026-02-01', count: 15 }
      ];
      const start = new Date(2025, 11, 15); // Dec 15, 2025
      const end = new Date(2026, 1, 10); // Feb 10, 2026

      const result = fillMonthlyData(sparseData, start, end);

      expect(result).toEqual([
        { month_start: '2025-12-01', count: 20 },
        { month_start: '2026-01-01', count: 0 }, // Missing month filled
        { month_start: '2026-02-01', count: 15 }
      ]);
    });
  });

  describe('edge cases', () => {
    it('handles February in leap year and non-leap year', () => {
      // Non-leap year
      const start2026 = new Date(2026, 1, 27); // Feb 27, 2026
      const end2026 = new Date(2026, 2, 2); // Mar 2, 2026
      const range2026 = generateDateRange(start2026, end2026);

      expect(range2026).toEqual([
        '2026-02-27',
        '2026-02-28', // No leap day in 2026
        '2026-03-01',
        '2026-03-02'
      ]);

      // Leap year
      const start2024 = new Date(2024, 1, 27); // Feb 27, 2024
      const end2024 = new Date(2024, 2, 2); // Mar 2, 2024
      const range2024 = generateDateRange(start2024, end2024);

      expect(range2024).toEqual([
        '2024-02-27',
        '2024-02-28',
        '2024-02-29', // Leap day in 2024
        '2024-03-01',
        '2024-03-02'
      ]);
    });

    it('handles timezone-sensitive dates correctly', () => {
      // Create dates in UTC to avoid timezone conversion issues
      const start = new Date(Date.UTC(2026, 0, 1, 0, 0, 0)); // Jan 1, 2026 at midnight UTC
      const end = new Date(Date.UTC(2026, 0, 3, 23, 59, 59)); // Jan 3, 2026 at end of day UTC

      const result = generateDateRange(start, end);

      expect(result).toEqual([
        '2026-01-01',
        '2026-01-02',
        '2026-01-03'
      ]);
    });
  });
});
