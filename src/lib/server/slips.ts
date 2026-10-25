import "server-only";
import { buildBookingViews } from "@/lib/views";
import type { AppData } from "@/lib/types";

/** Payment slip (receipt) for one payment, with the booking's balance after it. */
export function buildSlip(data: AppData, paymentId: string) {
  const payment = data.payments.find((p) => p.id === paymentId);
  if (!payment) return null;
  const view = buildBookingViews(
    data.bookings.filter((b) => b.id === payment.bookingId),
    data.customers,
    data.halls,
    data.payments,
    data.invoices,
  )[0];
  if (!view) return null;
  const active = view.payments.filter((p) => !p.voided);
  const index = active.findIndex((p) => p.id === payment.id);
  const paidToDate = index >= 0 ? active.slice(0, index + 1).reduce((s, p) => s + p.amount, 0) : null;
  const invoice = data.invoices.find((i) => i.id === payment.invoiceId);
  const s = data.settings;
  return {
    receiptNumber: payment.receiptNumber,
    status: payment.voided ? "Voided" : "Valid",
    voided: payment.voided ?? null,
    date: payment.date,
    amount: payment.amount,
    currency: s.currency,
    kind: payment.kind,
    method: payment.method,
    reference: payment.reference || null,
    note: payment.note || null,
    invoiceNumber: invoice?.invoiceNumber ?? null,
    business: { name: s.businessName, phone: s.phone, email: s.email, address: s.address },
    customer: view.customer
      ? { name: view.customer.name, mobile: view.customer.mobile, address: view.customer.address }
      : null,
    booking: {
      id: view.booking.id,
      bookingNumber: view.booking.bookingNumber,
      title: view.booking.event.title,
      type: view.booking.event.type,
      date: view.booking.event.date,
      startTime: view.booking.event.startTime,
      endTime: view.booking.event.endTime,
      overnight: view.booking.event.overnight,
      hall: view.hall?.name ?? null,
      status: view.booking.status,
    },
    totals: {
      grandTotal: view.totals.grandTotal,
      paidToDate,
      balanceAfterThisPayment: paidToDate === null ? null : Math.max(0, view.totals.grandTotal - paidToDate),
      currentBalance: view.summary.remaining,
    },
  };
}
