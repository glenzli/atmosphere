export function formatLocalDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function defaultTravelDates(now = new Date()) {
  const start = new Date(now);
  start.setDate(start.getDate() + 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return [formatLocalDate(start), formatLocalDate(end)] as const;
}

function dateValue(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date.getTime() : NaN;
}

export function validTravelDates(start: string, end: string, today = formatLocalDate(new Date())) {
  const startValue = dateValue(start);
  const endValue = dateValue(end);
  return startValue >= dateValue(today) && endValue >= startValue && (endValue - startValue) / 86400000 < 365;
}
