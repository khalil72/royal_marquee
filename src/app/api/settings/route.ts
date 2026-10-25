import { updateSettings } from "@/lib/domain";
import { json, parseBody, respond, withAuth } from "@/lib/server/api";
import { loadAll, mutate } from "@/lib/server/db";
import { settingsSchema } from "@/lib/validation";

export const GET = withAuth(async () => json({ ok: true, data: (await loadAll()).settings }));

/** Partial update: send only the fields to change. `logo: null` removes the logo. */
export const PUT = withAuth(async (req) => {
  const body = await parseBody(req, settingsSchema.partial().extend({ logo: settingsSchema.shape.logo.nullable() }));
  if (body instanceof Response) return body;
  const { logo, ...rest } = body;
  const patch = logo === null ? { ...rest, logo: undefined } : logo === undefined ? rest : { ...rest, logo };
  return respond(await mutate((data) => updateSettings(data, patch)));
});
