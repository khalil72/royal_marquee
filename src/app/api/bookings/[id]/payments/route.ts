import { addPayment } from "@/lib/domain";
import { error, json, parseBody, respond, withAuth } from "@/lib/server/api";
import { loadAll, mutate } from "@/lib/server/db";
import { paymentInputSchema } from "@/lib/validation";

type Ctx = RouteContext<"/api/bookings/[id]/payments">;

export const GET = withAuth<Ctx>(async (_req, ctx) => {
  const { id } = await ctx.params;
  const data = await loadAll();
  if (!data.bookings.some((b) => b.id === id)) return error("Booking not found.", 404);
  return json({ ok: true, data: data.payments.filter((p) => p.bookingId === id) });
});

/** Record a payment. Rejected if it exceeds the outstanding balance (unless overpayments are allowed). */
export const POST = withAuth<Ctx>(async (req, ctx) => {
  const { id } = await ctx.params;
  const body = await parseBody(req, paymentInputSchema);
  if (body instanceof Response) return body;
  return respond(await mutate((data) => addPayment(data, id, body)), 201);
});
