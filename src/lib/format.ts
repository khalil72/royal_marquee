import { format, parseISO } from "date-fns";

export function formatMoney(amount: number, currency = "PKR") {
  const value = Number.isFinite(amount) ? amount : 0;
  const formatted = new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: 0,
  }).format(Math.round(Math.abs(value)));
  return `${value < 0 ? "-" : ""}${currency} ${formatted}`;
}

export function formatCompactMoney(amount: number, currency = "PKR") {
  const abs = Math.abs(amount);
  if (abs >= 10_000_000) return `${currency} ${(amount / 10_000_000).toFixed(2)} Cr`;
  if (abs >= 100_000) return `${currency} ${(amount / 100_000).toFixed(2)} Lac`;
  return formatMoney(amount, currency);
}

export function formatDate(date: string | Date, pattern = "dd MMM yyyy") {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, pattern);
}

export function formatDateTime(date: string) {
  return formatDate(date, "dd MMM yyyy, h:mm a");
}

/** "18:30" -> "6:30 PM" */
export function formatTime(time: string) {
  if (!time) return "—";
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatDuration(minutes: number) {
  if (!Number.isFinite(minutes) || minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr${h > 1 ? "s" : ""}`;
  return `${h} hr${h > 1 ? "s" : ""} ${m} min`;
}

export function toDateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
