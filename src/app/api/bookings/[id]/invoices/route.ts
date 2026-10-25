import { z } from "zod";
import { issueInvoice } from "@/lib/domain";
import { parseBody, respond, withAuth } from "@/lib/server/api";
import { mutate } from "@/lib/server/db";

/** Return the booking's latest invoice, creating one if needed. Send { forceNew: true } to re-issue. */
export const POST = withAuth<RouteContext<"/api/bookings/[id]/invoices">>(async (req, ctx) => {
  const { id } = await ctx.params;
  const body = await parseBody(req, z.object({ forceNew: z.boolean().optional() }));
  if (body instanceof Response) return body;
  return respond(await mutate((data) => issueInvoice(data, id, body.forceNew)));
});
