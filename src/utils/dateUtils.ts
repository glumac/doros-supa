/**
 * Date utility functions for user stats
 * All weeks run Monday-Sunday in EST timezone
 */

// Get the current date in EST
export function getCurrentDateEST(): Date {
  // Use proper timezone conversion instead of manual calculation
  const now = new Date();
  const estTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  return estTime;
}

// Get Monday of current week in EST
export function getThisWeekStartEST(): Date {
  const now = getCurrentDateEST();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day; // If Sunday, go back 6 days, else go to Monday
  const monday = new Date(now);
  monday.setDate(monday.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// Get Sunday of current week in EST (end of week)
export function getThisWeekEndEST(): Date {
  const monday = getThisWeekStartEST();
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return sunday;
}

// Get Monday of last week in EST
export function getLastWeekStartEST(): Date {
  const thisMonday = getThisWeekStartEST();
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(lastMonday.getDate() - 7);
  return lastMonday;
}

// Get Sunday of last week in EST
export function getLastWeekEndEST(): Date {
  const lastMonday = getLastWeekStartEST();
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastSunday.getDate() + 6);
  lastSunday.setHours(23, 59, 59, 999);
  return lastSunday;
}

// Get first day of current month in EST (midnight EST = 5am UTC)
export function getThisMonthStartEST(): Date {
  const now = getCurrentDateEST();
  // 1st of month at midnight EST = 1st at 5am UTC
  const firstDay = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 5, 0, 0, 0));
  return firstDay;
}

// Get last day of current month in EST
export function getThisMonthEndEST(): Date {
  const now = getCurrentDateEST();
  // Last day at 23:59:59.999 EST = 1st of next month at 04:59:59.999 UTC
  const lastDay = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1, 4, 59, 59, 999));
  return lastDay;
}

// EST offset in hours (EST = UTC-5, but we add 5 to convert EST midnight to UTC)
const EST_OFFSET_HOURS = 5;

// Get first day of current year in EST (midnight EST = 5am UTC)
export function getThisYearStartEST(): Date {
  const now = getCurrentDateEST();
  // Jan 1 at midnight EST = Jan 1 at 5am UTC
  const firstDay = new Date(Date.UTC(now.getFullYear(), 0, 1, EST_OFFSET_HOURS, 0, 0, 0));
  return firstDay;
}

// Get last day of current year in EST (end of Dec 31 EST = Jan 1 ~5am UTC)
export function getThisYearEndEST(): Date {
  const now = getCurrentDateEST();
  // Dec 31 at 23:59:59.999 EST = Jan 1 at 04:59:59.999 UTC
  const lastDay = new Date(Date.UTC(now.getFullYear() + 1, 0, 1, EST_OFFSET_HOURS - 1, 59, 59, 999));
  return lastDay;
}

// Get first day of last year in EST
export function getLastYearStartEST(): Date {
  const now = getCurrentDateEST();
  // Jan 1 at midnight EST = Jan 1 at 5am UTC
  const firstDay = new Date(Date.UTC(now.getFullYear() - 1, 0, 1, EST_OFFSET_HOURS, 0, 0, 0));
  return firstDay;
}

// Get last day of last year in EST
export function getLastYearEndEST(): Date {
  const now = getCurrentDateEST();
  // Dec 31 at 23:59:59.999 EST = Jan 1 at 04:59:59.999 UTC
  const lastDay = new Date(Date.UTC(now.getFullYear(), 0, 1, EST_OFFSET_HOURS - 1, 59, 59, 999));
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

// Parse date from YYYY-MM-DD format
export function parseDate(dateStr: string): Date {
  const date = new Date(dateStr + 'T00:00:00');
  return date;
}

// Create a safe date from YYYY-MM-DD format that doesn't shift timezone
export function createSafeDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}
