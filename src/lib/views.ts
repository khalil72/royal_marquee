import { calculateTotals, summarizePayments, type PaymentSummary, type Totals } from "./calc";
import { eventDurationMinutes, eventInterval, findPortion, spaceLabel } from "./schedule";
import type { Booking, Customer, Hall, HallPortion, Invoice, Payment } from "./types";

export interface BookingView {
  booking: Booking;
  customer?: Customer;
  hall?: Hall;
  /** Booked portion of a divided hall; undefined for full-hall bookings */
  portion?: HallPortion;
  /** "Hall", or "Hall · Portion A" / "Hall · Full hall" for divided halls */
  space: string;
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
    const hall = hallMap.get(booking.event.hallId);
    return {
      booking,
      customer: customerMap.get(booking.customerId),
      hall,
      portion: findPortion(hall, booking.event.portionId),
      space: spaceLabel(hall, booking.event.portionId, "Deleted hall"),
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
