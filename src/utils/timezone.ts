/**
 * Get the user's timezone from their browser
 * Falls back to 'America/New_York' if detection fails
 *
 * @returns IANA timezone identifier (e.g., "America/Los_Angeles", "Europe/London")
 */
export function getUserTimezone(): string {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone) {
      return timezone;
    }
  } catch (error) {
    console.warn('Failed to detect user timezone:', error);
  }

  // Fallback to Eastern Time
  return 'America/New_York';
}
