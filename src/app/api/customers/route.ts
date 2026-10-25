import { addCustomer } from "@/lib/domain";
import { json, parseBody, respond, withAuth } from "@/lib/server/api";
import { loadAll, mutate } from "@/lib/server/db";
import { customerSchema } from "@/lib/validation";

/** List customers. Optional ?q= searches name, mobile and CNIC. */
export const GET = withAuth(async (req) => {
  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase();
  const { customers } = await loadAll();
  const list = q
    ? customers.filter((c) => [c.name, c.mobile, c.cnic].some((v) => v?.toLowerCase().includes(q)))
    : customers;
  return json({ ok: true, data: list });
});

export const POST = withAuth(async (req) => {
  const body = await parseBody(req, customerSchema);
  if (body instanceof Response) return body;
  return respond(await mutate((data) => addCustomer(data, body)), 201);
});
