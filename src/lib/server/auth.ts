import "server-only";
import { cookies } from "next/headers";
import { findUser } from "./db";
import { env } from "./env";
import { hashPassword, verifyPassword } from "./password";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession } from "./session";
import type { Role } from "./users";

// Checked against when the username is unknown, so timing doesn't reveal which part was wrong
const dummyHash = hashPassword("not-a-real-password");

/** Returns the user from the users collection when the password matches, otherwise null. */
export async function checkCredentials(username: string, password: string) {
  const user = await findUser(username);
  const ok = await verifyPassword(password, user?.passwordHash ?? (await dummyHash));
  return user && ok ? { username: user.username, role: user.role } : null;
}

export async function startSession(username: string, role: Role) {
  const token = await signSession(username, role, env.authSecret);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function currentUser() {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value, env.authSecret);
}

// Simple per-IP lockout after repeated failures (single process; resets on restart)
const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 5;
const LOCK_MS = 5 * 60 * 1000;

export function loginLocked(ip: string) {
  const a = attempts.get(ip);
  return !!a && a.count >= MAX_ATTEMPTS && a.until > Date.now();
}

export function recordLoginFailure(ip: string) {
  const a = attempts.get(ip);
  const count = a && a.until > Date.now() ? a.count + 1 : 1;
  attempts.set(ip, { count, until: Date.now() + LOCK_MS });
}

export function clearLoginFailures(ip: string) {
  attempts.delete(ip);
}
