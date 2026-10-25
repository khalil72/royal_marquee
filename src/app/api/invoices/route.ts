import { json, withAuth } from "@/lib/server/api";
import { loadAll } from "@/lib/server/db";

export const GET = withAuth(async () => {
  const { invoices } = await loadAll();
  return json({ ok: true, data: [...invoices].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)) });
});
