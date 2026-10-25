import { createBooking } from "@/lib/domain";
import { json, parseBody, respond, withAuth } from "@/lib/server/api";
import { loadAll, mutate } from "@/lib/server/db";
import { buildBookingViews } from "@/lib/views";
import { bookingInputSchema } from "@/lib/validation";

/**
 * List bookings with computed totals and balances.
 * Filters: ?status=Confirmed&hallId=…&from=yyyy-MM-dd&to=yyyy-MM-dd&q=text
 */
export const GET = withAuth(async (req) => {
  const p = req.nextUrl.searchParams;
  const status = p.get("status");
  const hallId = p.get("hallId");
  const from = p.get("from");
  const to = p.get("to");
  const q = p.get("q")?.trim().toLowerCase();
  const data = await loadAll();
  const views = buildBookingViews(data.bookings, data.customers, data.halls, data.payments, data.invoices).filter((v) => {
    const b = v.booking;
    if (status && b.status !== status) return false;
    if (hallId && b.event.hallId !== hallId) return false;
    if (from && b.event.date < from) return false;
    if (to && b.event.date > to) return false;
    if (q && ![b.bookingNumber, b.event.title, v.customer?.name, v.customer?.mobile].some((s) => s?.toLowerCase().includes(q)))
      return false;
    return true;
  });
  return json({ ok: true, data: views });
});

/** Create a booking (and its customer, and an optional advance payment). */
export const POST = withAuth(async (req) => {
  const body = await parseBody(req, bookingInputSchema);
  if (body instanceof Response) return body;
  return respond(await mutate((data) => createBooking(data, body)), 201);
});
