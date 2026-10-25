import { setBookingStatus } from "@/lib/domain";
import { parseBody, respond, withAuth } from "@/lib/server/api";
import { mutate } from "@/lib/server/db";
import { statusInputSchema } from "@/lib/validation";

/** Confirm, complete, cancel or restore a booking. Checks hall availability. */
export const POST = withAuth<RouteContext<"/api/bookings/[id]/status">>(async (req, ctx) => {
  const { id } = await ctx.params;
  const body = await parseBody(req, statusInputSchema);
  if (body instanceof Response) return body;
  return respond(await mutate((data) => setBookingStatus(data, id, body.status, body.note)));
});
