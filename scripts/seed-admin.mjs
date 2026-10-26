// Create the admin user, or reset its username and password, from ADMIN_USERNAME / ADMIN_PASSWORD.
// Usage: npm run seed:admin   (reads .env)
import { randomBytes, scryptSync } from "node:crypto";
import dns from "node:dns";
import { MongoClient } from "mongodb";

const { MONGODB_URI, MONGODB_DB = "marquee", ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;
if (!MONGODB_URI || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
  console.error("MONGODB_URI, ADMIN_USERNAME and ADMIN_PASSWORD must be set in .env.");
  process.exit(1);
}

// Same format as src/lib/server/password.ts
const salt = randomBytes(16);
const passwordHash = `scrypt$${salt.toString("base64")}$${scryptSync(ADMIN_PASSWORD, salt, 64).toString("base64")}`;

// Node on Windows can fail SRV lookups via the system resolver; use public DNS (same as src/lib/server/db.ts)
if (MONGODB_URI.startsWith("mongodb+srv://")) dns.setServers(["8.8.8.8", "1.1.1.1"]);

const client = await new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 15000 }).connect();
try {
  const users = client.db(MONGODB_DB).collection("users");
  await users.createIndex({ username: 1 }, { unique: true });
  // The app has exactly one user: the admin
  await users.deleteMany({ _id: { $ne: "admin" } });
  await users.updateOne(
    { _id: "admin" },
    {
      $set: { username: ADMIN_USERNAME, passwordHash, role: "admin" },
      $setOnInsert: { createdAt: new Date().toISOString() },
    },
    { upsert: true },
  );
  console.log(`Admin user "${ADMIN_USERNAME}" saved to ${MONGODB_DB}.users.`);
} finally {
  await client.close();
}
