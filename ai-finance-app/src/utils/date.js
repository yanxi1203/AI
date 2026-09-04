const APP_TIME_ZONE = 'Asia/Taipei';
const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

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
  return getMonthKey(new Date(date.getFullYear(), date.getMonth() - 1, 1));
}

export function getDaysInMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}
