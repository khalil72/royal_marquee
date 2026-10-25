import { currentUser } from "@/lib/server/auth";
import { error, json } from "@/lib/server/api";

export async function GET() {
  const user = await currentUser();
  return user ? json({ ok: true, data: user }) : error("Not signed in.", 401);
}
