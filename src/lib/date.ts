/** Small date helpers. All dates are YYYY-MM-DD strings, months are YYYY-MM. */

const DAY_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const DAY_SHORT_HI = ["र", "सो", "मं", "बु", "गु", "शु", "श"];
const DAY_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const DAY_LONG_HI = [
  "रविवार",
  "सोमवार",
  "मंगलवार",
  "बुधवार",
  "गुरुवार",
  "शुक्रवार",
  "शनिवार",
];
const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sept",
  "Oct",
  "Nov",
  "Dec",
];
const MONTH_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const MONTH_LONG_HI = [
  "जनवरी",
  "फ़रवरी",
  "मार्च",
  "अप्रैल",
  "मई",
  "जून",
  "जुलाई",
  "अगस्त",
  "सितंबर",
  "अक्टूबर",
  "नवंबर",
  "दिसंबर",
];

export function dayShort(lang: "en" | "hi" = "en"): string[] {
  return lang === "hi" ? DAY_SHORT_HI : DAY_SHORT;
}

export function dayLong(lang: "en" | "hi" = "en"): string[] {
  return lang === "hi" ? DAY_LONG_HI : DAY_LONG;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, n: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function weekdayOf(iso: string): number {
  return parseISODate(iso).getDay();
}

export function dayOfMonth(iso: string): number {
  return parseISODate(iso).getDate();
}

export function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

export function monthDates(month: string): string[] {
  const n = daysInMonth(month);
  return Array.from({ length: n }, (_, i) => `${month}-${pad(i + 1)}`);
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** Sunday-start week containing `iso`, ending on Saturday. */
export function weekOf(iso: string): string[] {
  const start = addDays(iso, -weekdayOf(iso));
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / 86400000);
}

export function formatDayMonth(iso: string, lang: "en" | "hi" = "en"): string {
  const d = parseISODate(iso);
  const month = lang === "hi" ? MONTH_LONG_HI[d.getMonth()] : MONTH_SHORT[d.getMonth()];
  return `${d.getDate()} ${month}`;
}

export function formatMonth(month: string, lang: "en" | "hi" = "en"): string {
  const [y, m] = month.split("-").map(Number);
  const name = lang === "hi" ? MONTH_LONG_HI[m - 1] : MONTH_SHORT[m - 1];
  return `${name} ${y}`;
}

export function formatMonthLong(month: string, lang: "en" | "hi" = "en"): string {
  const [, m] = month.split("-").map(Number);
  return lang === "hi" ? MONTH_LONG_HI[m - 1] : MONTH_LONG[m - 1];
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  let h = d.getHours();
  const m = pad(d.getMinutes());
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

export function formatTimeShort(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours() % 12 || 12}:${pad(d.getMinutes())}`;
}
