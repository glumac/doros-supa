/**
 * Date utility functions for user stats
 * All date calculations use local timezone for accurate personal stats
 */

// Get Monday of current week in UTC timezone
export function getThisWeekStart(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day; // If Sunday, go back 6 days, else go to Monday
  const monday = new Date(now);
  monday.setUTCDate(monday.getUTCDate() + diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

// Get Sunday of current week in local timezone (as UTC end of day)
export function getThisWeekEnd(): Date {
  const monday = getThisWeekStart();
  // Add 6 days to get Sunday, then set to end of day
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  return sunday;
}

// Get first day of current month in local timezone (as UTC midnight)
export function getThisMonthStart(): Date {
  const now = new Date();
  // Create UTC date at midnight
  const firstDay = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0));
  return firstDay;
}

// Get last day of current month in local timezone (as UTC end of day)
export function getThisMonthEnd(): Date {
  const now = new Date();
  // Get last day of month (day 0 of next month)
  const lastDay = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));
  return lastDay;
}

// Get first day of current year in local timezone (as UTC midnight)
export function getThisYearStart(): Date {
  const now = new Date();
  // Create UTC date at midnight
  const firstDay = new Date(Date.UTC(now.getFullYear(), 0, 1, 0, 0, 0, 0));
  return firstDay;
}

// Get last day of current year in local timezone (as UTC end of day)
export function getThisYearEnd(): Date {
  const now = new Date();
  // Create UTC date at end of day
  const lastDay = new Date(Date.UTC(now.getFullYear(), 11, 31, 23, 59, 59, 999));
  return lastDay;
}

// Calculate days between two dates
export function getDaysBetween(start: Date, end: Date): number {
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Format date to ISO string for API calls
// Date is already in UTC from our date functions
export function toISOString(date: Date): string {
  return date.toISOString();
}

// Parse date from YYYY-MM-DD format as UTC to prevent timezone shifts
export function parseDate(dateStr: string): Date {
  const date = new Date(dateStr + 'T00:00:00Z'); // Explicit UTC
  return date;
}

// Create a safe date from YYYY-MM-DD format that doesn't shift timezone
export function createSafeDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

// Get Monday of the week containing the given date (as UTC midnight)
export function getWeekStart(date: Date): Date {
  const result = new Date(date);
  // Use UTC methods to avoid timezone issues
  const day = result.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day; // If Sunday, go back 6 days, else go to Monday
  result.setUTCDate(result.getUTCDate() + diff);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

// Get Sunday of the week containing the given date (as UTC end of day)
export function getWeekEnd(date: Date): Date {
  const monday = getWeekStart(date);
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  return sunday;
}

// Format date as "Feb 2026" for chart titles
export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// Format week start date as "Jan 27" for chart labels
export function formatWeekLabel(weekStart: string): string {
  const date = new Date(weekStart + "T12:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
