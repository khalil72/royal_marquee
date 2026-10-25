import { deleteHall, updateHall } from "@/lib/domain";
import { parseBody, respond, withAuth } from "@/lib/server/api";
import { mutate } from "@/lib/server/db";
import { hallInputSchema } from "@/lib/validation";

type Ctx = RouteContext<"/api/halls/[id]">;

export const PUT = withAuth<Ctx>(async (req, ctx) => {
  const { id } = await ctx.params;
  const body = await parseBody(req, hallInputSchema);
  if (body instanceof Response) return body;
  return respond(await mutate((data) => updateHall(data, id, body)));
});

export const DELETE = withAuth<Ctx>(async (_req, ctx) => {
  const { id } = await ctx.params;
  return respond(await mutate((data) => deleteHall(data, id)));
});
