import { error, json, withAuth } from "@/lib/server/api";
import { loadAll } from "@/lib/server/db";
import { buildSlip } from "@/lib/server/slips";

/** Payment slip (receipt) data. The printable version is the page /payments/[id]/receipt. */
export const GET = withAuth<RouteContext<"/api/payments/[id]/slip">>(async (_req, ctx) => {
  const { id } = await ctx.params;
  const slip = buildSlip(await loadAll(), id);
  return slip ? json({ ok: true, data: slip }) : error("Payment not found.", 404);
});
