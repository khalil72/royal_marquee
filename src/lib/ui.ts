import type { BookingStatus, PaymentStatus } from "./types";

export const bookingStatusStyles: Record<BookingStatus, { badge: string; dot: string; block: string }> = {
  Pending: {
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
    dot: "bg-amber-500",
    block:
      "border-l-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-500/15 dark:text-amber-100 border-dashed",
  },
  Confirmed: {
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
    dot: "bg-emerald-500",
    block: "border-l-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-100",
  },
  Completed: {
    badge: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
    dot: "bg-sky-500",
    block: "border-l-sky-500 bg-sky-50 text-sky-900 dark:bg-sky-500/15 dark:text-sky-100",
  },
  Cancelled: {
    badge: "bg-rose-100 text-rose-700 line-through decoration-rose-400/60 dark:bg-rose-500/15 dark:text-rose-300",
    dot: "bg-rose-500",
    block:
      "border-l-rose-500 bg-rose-50/70 text-rose-800 line-through opacity-70 dark:bg-rose-500/10 dark:text-rose-200",
  },
};

export const paymentStatusStyles: Record<PaymentStatus, string> = {
  Unpaid: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  "Partially Paid": "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  Paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
};

export const HALL_COLORS = ["#7c3aed", "#059669", "#d97706", "#2563eb", "#db2777", "#0891b2", "#65a30d", "#dc2626"];
