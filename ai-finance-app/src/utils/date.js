const APP_TIME_ZONE = 'Asia/Taipei';
const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

// Despite the legacy Local names, every helper in this module uses the app's
// fixed Taiwan calendar and never the computer's local timezone.

export function getLocalDateKey(date = new Date()) {
  const parts = Object.fromEntries(
    dateKeyFormatter.formatToParts(date).map(({ type, value }) => [type, value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getLocalDay(date = new Date()) {
  return Number(getLocalDateKey(date).slice(-2));
}

export function getMonthKey(date = new Date()) {
  return getLocalDateKey(date).slice(0, 7);
}

export function getPreviousMonthKey(date = new Date()) {
  const [year, month] = getMonthKey(date).split('-').map(Number);
  const previousYear = month === 1 ? year - 1 : year;
  const previousMonth = month === 1 ? 12 : month - 1;
  return `${previousYear}-${String(previousMonth).padStart(2, '0')}`;
}

export function getDaysInMonth(date = new Date()) {
  const [year, month] = getMonthKey(date).split('-').map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
