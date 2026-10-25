import { z } from "zod";
import { importData } from "@/lib/domain";
import { parseBody, respond, withAuth } from "@/lib/server/api";
import { mutate } from "@/lib/server/db";
import type { AppData } from "@/lib/types";

const backupSchema = z.object({
  settings: z.record(z.string(), z.unknown()),
  halls: z.array(z.unknown()),
  customers: z.array(z.unknown()),
  bookings: z.array(z.unknown()),
  payments: z.array(z.unknown()),
  invoices: z.array(z.unknown()),
});

/** Replace all data with a JSON backup (as downloaded from Settings). */
export const POST = withAuth(async (req) => {
  const body = await parseBody(req, backupSchema);
  if (body instanceof Response) return body;
  return respond(await mutate((data) => importData(data, body as unknown as AppData)));
});
