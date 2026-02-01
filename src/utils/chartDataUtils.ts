/**
 * Utility functions for filling chart data with empty days/weeks/months
 */

export interface ChartDataPoint {
  date: string;
  count: number;
}

export interface WeeklyDataPoint {
  week_start: string;
  count: number;
}

export interface MonthlyDataPoint {
  month_start: string;
  count: number;
}

/**
 * Generate an array of all dates between start and end (inclusive)
 * @param startDate Start date
 * @param endDate End date
 * @returns Array of date strings in YYYY-MM-DD format
 */
export function generateDateRange(startDate: Date, endDate: Date): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Generate an array of all week start dates between start and end
 * @param startDate Start date
 * @param endDate End date
 * @returns Array of week start dates in YYYY-MM-DD format (Mondays)
 */
export function generateWeekRange(startDate: Date, endDate: Date): string[] {
  const weeks: string[] = [];
  const current = new Date(startDate);

  // Find the Monday of the week containing startDate
  const day = current.getDay();
  const diff = day === 0 ? -6 : 1 - day; // If Sunday, go back 6 days, else go to Monday
  current.setDate(current.getDate() + diff);
  current.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999); // Include the full end date

  while (current <= end) {
    weeks.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 7);
  }

  return weeks;
}

/**
 * Generate an array of all month start dates between start and end
 * @param startDate Start date
 * @param endDate End date
 * @returns Array of month start dates in YYYY-MM-DD format (1st of each month)
 */
export function generateMonthRange(startDate: Date, endDate: Date): string[] {
  const months: string[] = [];
  const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  while (current <= end) {
    months.push(current.toISOString().split('T')[0]);
    current.setMonth(current.getMonth() + 1);
  }

  return months;
}

/**
 * Fill daily chart data with empty days
 * @param data Sparse daily data from database
 * @param startDate Start date of range
 * @param endDate End date of range
 * @returns Complete daily data with zero-filled gaps
 */
export function fillDailyData(
  data: ChartDataPoint[],
  startDate: Date,
  endDate: Date
): ChartDataPoint[] {
  const dateRange = generateDateRange(startDate, endDate);
  const dataMap = new Map<string, number>();

  // Build map of existing data
  data.forEach(item => {
    // Normalize date format (handle both YYYY-MM-DD and ISO strings)
    const date = item.date.split('T')[0];
    dataMap.set(date, item.count);
  });

  // Fill with zeros where data is missing
  return dateRange.map(date => ({
    date,
    count: dataMap.get(date) ?? 0
  }));
}

/**
 * Fill weekly chart data with empty weeks
 * @param data Sparse weekly data from database
 * @param startDate Start date of range
 * @param endDate End date of range
 * @returns Complete weekly data with zero-filled gaps
 */
export function fillWeeklyData(
  data: WeeklyDataPoint[],
  startDate: Date,
  endDate: Date
): WeeklyDataPoint[] {
  const weekRange = generateWeekRange(startDate, endDate);
  const dataMap = new Map<string, number>();

  // Build map of existing data
  data.forEach(item => {
    // Normalize date format
    const weekStart = item.week_start.split('T')[0];
    dataMap.set(weekStart, item.count);
  });

  // Fill with zeros where data is missing
  return weekRange.map(week_start => ({
    week_start,
    count: dataMap.get(week_start) ?? 0
  }));
}

/**
 * Fill monthly chart data with empty months
 * @param data Sparse monthly data from database
 * @param startDate Start date of range
 * @param endDate End date of range
 * @returns Complete monthly data with zero-filled gaps
 */
export function fillMonthlyData(
  data: MonthlyDataPoint[],
  startDate: Date,
  endDate: Date
): MonthlyDataPoint[] {
  const monthRange = generateMonthRange(startDate, endDate);
  const dataMap = new Map<string, number>();

  // Build map of existing data
  data.forEach(item => {
    // Normalize date format
    const monthStart = item.month_start.split('T')[0];
    dataMap.set(monthStart, item.count);
  });

  // Fill with zeros where data is missing
  return monthRange.map(month_start => ({
    month_start,
    count: dataMap.get(month_start) ?? 0
  }));
}
