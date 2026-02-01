// Simulate the exact logic from UserStats.tsx
function getThisWeekStart() {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setUTCDate(monday.getUTCDate() + diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

function getThisWeekEnd() {
  const monday = getThisWeekStart();
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  return sunday;
}

function toISOString(date) {
  return date.toISOString();
}

function createSafeDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

// Test the full flow
const weekStart = getThisWeekStart();
const weekEnd = getThisWeekEnd();
console.log('Week start:', toISOString(weekStart));
console.log('Week end:', toISOString(weekEnd));

// Convert to ISO strings (what gets passed to createSafeDate)
const startDate = toISOString(weekStart);
const endDate = toISOString(weekEnd);
console.log('startDate:', startDate.split('T')[0]);
console.log('endDate:', endDate.split('T')[0]);

// Parse back (what happens in chart rendering)
const startUTC = new Date(startDate);
const endUTC = new Date(endDate);
console.log('Parsed start UTC date:', startUTC.getUTCDate());
console.log('Parsed end UTC date:', endUTC.getUTCDate());

// Create safe dates (what generates the date range)
const startDateStr = `${startUTC.getFullYear()}-${String(startUTC.getMonth() + 1).padStart(2, '0')}-${String(startUTC.getUTCDate()).padStart(2, '0')}`;
const endDateStr = `${endUTC.getFullYear()}-${String(endUTC.getMonth() + 1).padStart(2, '0')}-${String(endUTC.getUTCDate()).padStart(2, '0')}`;
const start = createSafeDate(startDateStr);
const end = createSafeDate(endDateStr);
console.log('start (createSafeDate):', start.toISOString());
console.log('end (createSafeDate):', end.toISOString());

// Generate date range
const dates = [];
const current = new Date(start);
current.setUTCHours(0, 0, 0, 0);
const endCopy = new Date(end);
endCopy.setUTCHours(0, 0, 0, 0);
while (current <= endCopy) {
  dates.push(current.toISOString().split('T')[0]);
  current.setUTCDate(current.getUTCDate() + 1);
}
console.log('\nDate range (' + dates.length + ' days):');
dates.forEach(d => console.log('  ' + d));
