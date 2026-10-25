"use client";

import { useMemo } from "react";
import { useStore } from "./store";
import { buildBookingViews } from "./views";

export { buildBookingViews, type BookingView } from "./views";

export function useBookingViews() {
  const bookings = useStore((s) => s.bookings);
  const customers = useStore((s) => s.customers);
  const halls = useStore((s) => s.halls);
  const payments = useStore((s) => s.payments);
  const invoices = useStore((s) => s.invoices);
  return useMemo(
    () => buildBookingViews(bookings, customers, halls, payments, invoices),
    [bookings, customers, halls, payments, invoices],
  );
}

export function useBookingView(id: string | undefined) {
  const views = useBookingViews();
  return useMemo(() => views.find((v) => v.booking.id === id), [views, id]);
}
