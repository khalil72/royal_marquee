import "server-only";
import type { Db } from "mongodb";
import { env } from "./env";
import { hashPassword } from "./password";

/** The app has exactly one user, and it is the admin. */
export type Role = "admin";

export interface UserDoc {
  _id: string;
  username: string;
  passwordHash: string;
  role: Role;
  createdAt: string;
}

export const ADMIN_ID = "admin";

/** Create the admin from ADMIN_USERNAME / ADMIN_PASSWORD if the users collection has none yet. */
export async function seedAdmin(d: Db) {
  const users = d.collection<UserDoc>("users");
  if (await users.findOne({ _id: ADMIN_ID })) return;
  await users.updateOne(
    { _id: ADMIN_ID },
    {
      $setOnInsert: {
        username: env.adminUsername,
        passwordHash: await hashPassword(env.adminPassword),
        role: "admin",
        createdAt: new Date().toISOString(),
      },
    },
    { upsert: true },
  );
  console.log(`[users] Seeded admin user "${env.adminUsername}".`);
}
