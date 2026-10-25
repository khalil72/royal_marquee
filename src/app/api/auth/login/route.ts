import type { NextRequest } from "next/server";
import { checkCredentials, clearLoginFailures, loginLocked, recordLoginFailure, startSession } from "@/lib/server/auth";
import { error, json, parseBody } from "@/lib/server/api";
import { loginSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (loginLocked(ip)) return error("Too many failed attempts. Try again in a few minutes.", 429);
  const body = await parseBody(req, loginSchema);
  if (body instanceof Response) return body;
  let user;
  try {
    user = await checkCredentials(body.username, body.password);
  } catch (err) {
    console.error("[api] POST /api/auth/login", err);
    return error("Can't reach the database. Please try again.", 503);
  }
  if (!user) {
    recordLoginFailure(ip);
    return error("Incorrect username or password.", 401);
  }
  clearLoginFailures(ip);
  await startSession(user.username, user.role);
  return json({ ok: true, data: user });
}
