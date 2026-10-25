import "server-only";
import { unstable_rethrow } from "next/navigation";
import type { NextRequest } from "next/server";
import type { z } from "zod";
import { currentUser } from "./auth";

export const json = (body: unknown, status = 200) => Response.json(body, { status });
export const error = (message: string, status = 400, details?: unknown) =>
  json({ ok: false, error: message, ...(details ? { details } : {}) }, status);

type Handler<C> = (req: NextRequest, ctx: C) => Promise<Response>;

/**
 * Wraps a route handler: requires a valid session, requires a JSON body on writes
 * (blocks cross-site form posts), and turns unexpected failures into a 500.
 */
export function withAuth<C>(handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      if (!(await currentUser())) return error("Not signed in.", 401);
      if (req.method !== "GET" && req.method !== "DELETE") {
        const type = req.headers.get("content-type") ?? "";
        if (!type.includes("application/json")) return error("Expected a JSON request body.", 415);
      }
      return await handler(req, ctx);
    } catch (err) {
      // Let Next.js handle its own signals (e.g. cookies() during prerendering)
      unstable_rethrow(err);
      console.error(`[api] ${req.method} ${req.nextUrl.pathname}`, err);
      return error("Something went wrong on the server. Please try again.", 500);
    }
  };
}

/** Parse and validate a JSON body. Returns the data, or a 400 response. */
export async function parseBody<S extends z.ZodType>(req: NextRequest, schema: S): Promise<z.infer<S> | Response> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return error("Request body is not valid JSON.");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return error(first ? `${first.path.join(".") || "body"}: ${first.message}` : "Invalid request.", 400, parsed.error.issues);
  }
  return parsed.data;
}

/** Shape a mutation outcome as an HTTP response. */
export function respond<T>(
  result: { ok: true; value: T; diff: unknown } | { ok: false; error: string },
  successStatus = 200,
) {
  if (!result.ok) return error(result.error, result.error.endsWith("not found.") ? 404 : 409);
  return json({ ok: true, data: result.value, diff: result.diff }, successStatus);
}
