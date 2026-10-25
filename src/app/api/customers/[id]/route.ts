import { deleteCustomer, updateCustomer } from "@/lib/domain";
import { error, json, parseBody, respond, withAuth } from "@/lib/server/api";
import { loadAll, mutate } from "@/lib/server/db";
import { customerSchema } from "@/lib/validation";

type Ctx = RouteContext<"/api/customers/[id]">;

export const GET = withAuth<Ctx>(async (_req, ctx) => {
  const { id } = await ctx.params;
  const { customers, bookings } = await loadAll();
  const customer = customers.find((c) => c.id === id);
  if (!customer) return error("Customer not found.", 404);
  const bookingIds = bookings.filter((b) => b.customerId === id).map((b) => b.id);
  return json({ ok: true, data: { ...customer, bookingIds } });
});

export const PUT = withAuth<Ctx>(async (req, ctx) => {
  const { id } = await ctx.params;
  const body = await parseBody(req, customerSchema);
  if (body instanceof Response) return body;
  return respond(await mutate((data) => updateCustomer(data, id, body)));
});

export const DELETE = withAuth<Ctx>(async (_req, ctx) => {
  const { id } = await ctx.params;
  return respond(await mutate((data) => deleteCustomer(data, id)));
});
