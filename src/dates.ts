export const DAY_MS = 86_400_000;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function toIsoDate(time: number) {
  return new Date(time).toISOString().slice(0, 10);
}

export function previousDate(date: string) {
  return toIsoDate(Date.parse(date) - DAY_MS);
}

export function isIsoDate(value: string) {
  const time = Date.parse(value);
  return ISO_DATE.test(value) && !Number.isNaN(time) && toIsoDate(time) === value;
}
