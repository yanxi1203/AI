export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
