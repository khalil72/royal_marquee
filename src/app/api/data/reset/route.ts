import { z } from "zod";
import { resetData } from "@/lib/domain";
import { parseBody, respond, withAuth } from "@/lib/server/api";
import { mutate } from "@/lib/server/db";

/** Erase everything, optionally loading demo data. Requires { confirm: "RESET" }. */
export const POST = withAuth(async (req) => {
  const body = await parseBody(req, z.object({ demo: z.boolean(), confirm: z.literal("RESET") }));
  if (body instanceof Response) return body;
  return respond(await mutate((data) => resetData(data, body.demo)));
});
