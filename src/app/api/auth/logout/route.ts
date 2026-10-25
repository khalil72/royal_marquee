import { endSession } from "@/lib/server/auth";
import { json } from "@/lib/server/api";

export async function POST() {
  await endSession();
  return json({ ok: true });
}
