import { calculateTotals, summarizePayments, type PaymentSummary, type Totals } from "./calc";
import { eventDurationMinutes, eventInterval } from "./schedule";
import type { Booking, Customer, Hall, Invoice, Payment } from "./types";

export interface BookingView {
  booking: Booking;
  customer?: Customer;
  hall?: Hall;
  totals: Totals;
  summary: PaymentSummary;
  payments: Payment[];
  invoices: Invoice[];
  start: Date;
  end: Date;
  durationMinutes: number;
}

export function buildBookingViews(
  bookings: Booking[],
  customers: Customer[],
  halls: Hall[],
  payments: Payment[],
  invoices: Invoice[],
): BookingView[] {
  const customerMap = new Map(customers.map((c) => [c.id, c]));
  const hallMap = new Map(halls.map((h) => [h.id, h]));
  const paymentsBy = groupBy(payments, (p) => p.bookingId);
  const invoicesBy = groupBy(invoices, (i) => i.bookingId);
  return bookings.map((booking) => {
    const totals = calculateTotals(booking.charges, booking.event.guests);
    const bookingPayments = (paymentsBy.get(booking.id) ?? []).sort((a, b) =>
      (a.date + a.createdAt).localeCompare(b.date + b.createdAt),
    );
    const { start, end } = eventInterval(booking.event);
    return {
      booking,
      customer: customerMap.get(booking.customerId),
      hall: hallMap.get(booking.event.hallId),
      totals,
      summary: summarizePayments(totals.grandTotal, bookingPayments),
      payments: bookingPayments,
      invoices: (invoicesBy.get(booking.id) ?? []).sort((a, b) => a.issuedAt.localeCompare(b.issuedAt)),
      start,
      end,
      durationMinutes: eventDurationMinutes(
        booking.event.startTime,
        booking.event.endTime,
        booking.event.overnight,
      ),
    };
  });
}

function groupBy<T>(items: T[], key: (item: T) => string) {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}
