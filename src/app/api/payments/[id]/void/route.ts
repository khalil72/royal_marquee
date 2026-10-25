import { voidPayment } from "@/lib/domain";
import { parseBody, respond, withAuth } from "@/lib/server/api";
import { mutate } from "@/lib/server/db";
import { voidInputSchema } from "@/lib/validation";

/** Payments are never deleted; voiding keeps them in history with a reason. */
export const POST = withAuth<RouteContext<"/api/payments/[id]/void">>(async (req, ctx) => {
  const { id } = await ctx.params;
  const body = await parseBody(req, voidInputSchema);
  if (body instanceof Response) return body;
  return respond(await mutate((data) => voidPayment(data, id, body.reason)));
});
