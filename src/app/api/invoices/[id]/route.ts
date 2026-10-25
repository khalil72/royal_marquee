import { error, json, withAuth } from "@/lib/server/api";
import { loadAll } from "@/lib/server/db";
import { buildBookingViews } from "@/lib/views";

/** Invoice with its booking, customer, charges, totals and payments. */
export const GET = withAuth<RouteContext<"/api/invoices/[id]">>(async (_req, ctx) => {
  const { id } = await ctx.params;
  const data = await loadAll();
  const invoice = data.invoices.find((i) => i.id === id);
  if (!invoice) return error("Invoice not found.", 404);
  const view = buildBookingViews(
    data.bookings.filter((b) => b.id === invoice.bookingId),
    data.customers,
    data.halls,
    data.payments,
    data.invoices,
  )[0];
  return json({ ok: true, data: { invoice, booking: view ?? null, business: data.settings } });
});
