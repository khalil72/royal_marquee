import { deleteBooking, updateBooking } from "@/lib/domain";
import { error, json, parseBody, respond, withAuth } from "@/lib/server/api";
import { loadAll, mutate } from "@/lib/server/db";
import { buildBookingViews } from "@/lib/views";
import { bookingInputSchema } from "@/lib/validation";

type Ctx = RouteContext<"/api/bookings/[id]">;

/** One booking with customer, hall, totals, payments and invoices. */
export const GET = withAuth<Ctx>(async (_req, ctx) => {
  const { id } = await ctx.params;
  const data = await loadAll();
  const view = buildBookingViews(
    data.bookings.filter((b) => b.id === id),
    data.customers,
    data.halls,
    data.payments,
    data.invoices,
  )[0];
  return view ? json({ ok: true, data: view }) : error("Booking not found.", 404);
});

export const PUT = withAuth<Ctx>(async (req, ctx) => {
  const { id } = await ctx.params;
  const body = await parseBody(req, bookingInputSchema);
  if (body instanceof Response) return body;
  return respond(await mutate((data) => updateBooking(data, id, body)));
});

export const DELETE = withAuth<Ctx>(async (_req, ctx) => {
  const { id } = await ctx.params;
  return respond(await mutate((data) => deleteBooking(data, id)));
});
