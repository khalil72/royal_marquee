import { json, withAuth } from "@/lib/server/api";
import { loadAll } from "@/lib/server/db";

/** Everything the dashboard needs, in one request. */
export const GET = withAuth(async () => json({ ok: true, data: await loadAll() }));
