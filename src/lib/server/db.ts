import "server-only";
import { MongoClient, type AnyBulkWriteOperation, type ClientSession, type Document } from "mongodb";
import { defaultSettings } from "@/lib/seed";
import type { AppData, Settings } from "@/lib/types";
import { env } from "./env";
import { seedAdmin, type UserDoc } from "./users";

const COLLECTIONS = ["halls", "customers", "bookings", "payments", "invoices"] as const;
type CollectionName = (typeof COLLECTIONS)[number];
type Record = AppData[CollectionName][number];

const SETTINGS_ID = "settings";

// Reuse one client across hot reloads and route invocations
const globalForMongo = globalThis as unknown as { mongoClient?: Promise<MongoClient> };

function client() {
  if (!globalForMongo.mongoClient) {
    globalForMongo.mongoClient = new MongoClient(env.mongoUri, { serverSelectionTimeoutMS: 15000, ignoreUndefined: true })
      .connect()
      .then(async (c) => {
        await ensureIndexes(c);
        await seedAdmin(c.db(env.mongoDb));
        return c;
      })
      .catch((err) => {
        globalForMongo.mongoClient = undefined;
        throw err;
      });
  }
  return globalForMongo.mongoClient;
}

async function db() {
  return (await client()).db(env.mongoDb);
}

async function ensureIndexes(c: MongoClient) {
  const d = c.db(env.mongoDb);
  await Promise.all([
    d.collection("bookings").createIndex({ bookingNumber: 1 }, { unique: true }),
    d.collection("bookings").createIndex({ "event.hallId": 1, "event.date": 1 }),
    d.collection("payments").createIndex({ receiptNumber: 1 }, { unique: true }),
    d.collection("payments").createIndex({ bookingId: 1 }),
    d.collection("invoices").createIndex({ invoiceNumber: 1 }, { unique: true }),
    d.collection("customers").createIndex({ mobile: 1 }),
    d.collection("users").createIndex({ username: 1 }, { unique: true }),
  ]);
}

export async function findUser(username: string) {
  return (await db()).collection<UserDoc>("users").findOne({ username });
}

const strip = <T,>(doc: Document) => {
  const { _id, ...rest } = doc;
  void _id;
  return rest as T;
};

/** Load the full data set. A business of this size fits comfortably in memory. */
export async function loadAll(): Promise<AppData> {
  const d = await db();
  const [settingsDoc, ...lists] = await Promise.all([
    d.collection("settings").findOne({ _id: SETTINGS_ID as never }),
    ...COLLECTIONS.map((name) =>
      d
        .collection(name)
        .find({}, { sort: { createdAt: name === "customers" || name === "bookings" ? -1 : 1 } })
        .toArray(),
    ),
  ]);
  const [halls, customers, bookings, payments, invoices] = lists.map((l) => l.map((doc) => strip(doc)));
  return {
    settings: settingsDoc ? { ...defaultSettings, ...strip<Settings>(settingsDoc) } : { ...defaultSettings },
    halls: halls as AppData["halls"],
    customers: customers as AppData["customers"],
    bookings: bookings as AppData["bookings"],
    payments: payments as AppData["payments"],
    invoices: invoices as AppData["invoices"],
  };
}

export interface Diff {
  settings?: Settings;
  upsert: Partial<{ [K in CollectionName]: AppData[K] }>;
  remove: Partial<{ [K in CollectionName]: string[] }>;
}

/** Records whose object identity changed are written; missing ids are deleted. */
export function diffData(prev: AppData, next: AppData): Diff {
  const diff: Diff = { upsert: {}, remove: {} };
  if (prev.settings !== next.settings) diff.settings = next.settings;
  for (const name of COLLECTIONS) {
    const before = new Set<Record>(prev[name]);
    const nextIds = new Set(next[name].map((r) => r.id));
    const changed = (next[name] as Record[]).filter((r) => !before.has(r));
    const removed = (prev[name] as Record[]).filter((r) => !nextIds.has(r.id)).map((r) => r.id);
    if (changed.length) (diff.upsert as { [k: string]: Record[] })[name] = changed;
    if (removed.length) diff.remove[name] = removed;
  }
  return diff;
}

export function isEmptyDiff(diff: Diff) {
  return !diff.settings && !Object.keys(diff.upsert).length && !Object.keys(diff.remove).length;
}

async function writeDiff(diff: Diff, session: ClientSession) {
  const d = await db();
  if (diff.settings) {
    await d
      .collection("settings")
      .replaceOne({ _id: SETTINGS_ID as never }, { ...diff.settings }, { upsert: true, session });
  }
  for (const name of COLLECTIONS) {
    const ops: AnyBulkWriteOperation<Document>[] = [
      ...((diff.upsert[name] as Record[] | undefined) ?? []).map((r) => ({
        replaceOne: { filter: { _id: r.id as never }, replacement: { _id: r.id, ...r }, upsert: true },
      })),
      ...(diff.remove[name] ?? []).map((id) => ({ deleteOne: { filter: { _id: id as never } } })),
    ];
    if (ops.length) await d.collection(name).bulkWrite(ops, { session, ordered: true });
  }
}

// Serialize mutations in this process so numbering and conflict checks see a consistent snapshot
let queue: Promise<unknown> = Promise.resolve();

/** Load → apply a pure operation → write the changes in one transaction. */
export function mutate<T>(
  op: (data: AppData) => { ok: true; data: { next: AppData; value: T } } | { ok: false; error: string },
): Promise<{ ok: true; value: T; diff: Diff } | { ok: false; error: string }> {
  const run = async () => {
    const prev = await loadAll();
    const result = op(prev);
    if (!result.ok) return result;
    const diff = diffData(prev, result.data.next);
    if (!isEmptyDiff(diff)) {
      const session = (await client()).startSession();
      try {
        await session.withTransaction(() => writeDiff(diff, session));
      } finally {
        await session.endSession();
      }
    }
    return { ok: true as const, value: result.data.value, diff };
  };
  const p = queue.then(run, run);
  queue = p.catch(() => undefined);
  return p;
}
