import { addHall } from "@/lib/domain";
import { json, parseBody, respond, withAuth } from "@/lib/server/api";
import { loadAll, mutate } from "@/lib/server/db";
import { hallInputSchema } from "@/lib/validation";

export const GET = withAuth(async () => json({ ok: true, data: (await loadAll()).halls }));

export const POST = withAuth(async (req) => {
  const body = await parseBody(req, hallInputSchema);
  if (body instanceof Response) return body;
  return respond(await mutate((data) => addHall(data, body)), 201);
});
