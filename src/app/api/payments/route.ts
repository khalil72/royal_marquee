import { json, withAuth } from "@/lib/server/api";
import { loadAll } from "@/lib/server/db";

/** All payments, newest first. Filters: ?bookingId=…&from=yyyy-MM-dd&to=yyyy-MM-dd&includeVoided=false */
export const GET = withAuth(async (req) => {
  const p = req.nextUrl.searchParams;
  const bookingId = p.get("bookingId");
  const from = p.get("from");
  const to = p.get("to");
  const includeVoided = p.get("includeVoided") !== "false";
  const { payments } = await loadAll();
  const list = payments
    .filter((x) => {
      if (bookingId && x.bookingId !== bookingId) return false;
      if (from && x.date < from) return false;
      if (to && x.date > to) return false;
      if (!includeVoided && x.voided) return false;
      return true;
    })
    .sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt));
  return json({ ok: true, data: list });
});
