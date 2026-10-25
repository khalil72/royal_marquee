import { jwtVerify, SignJWT } from "jose";

/** Shared by proxy.ts and route handlers. Kept free of Node-only imports. */
export const SESSION_COOKIE = "marquee_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const key = (secret: string) => new TextEncoder().encode(secret);

export async function signSession(username: string, role: "admin", secret: string) {
  return new SignJWT({ sub: username, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(key(secret));
}

export async function verifySession(token: string | undefined, secret: string) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: ["HS256"] });
    // Sessions from before roles existed have no role claim; the only user is the admin
    return typeof payload.sub === "string" ? { username: payload.sub, role: "admin" as const } : null;
  } catch {
    return null;
  }
}
