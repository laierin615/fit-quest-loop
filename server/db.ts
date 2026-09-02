import { desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { FitnessCycle, FitnessProfile, FitnessTransaction, InsertFitnessCycle, InsertFitnessProfile, InsertFitnessTransaction, InsertUser, fitnessCycles, fitnessProfiles, fitnessTransactions, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getFitnessProfile(userId: number): Promise<FitnessProfile | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(fitnessProfiles).where(eq(fitnessProfiles.userId, userId)).limit(1);
  return rows[0];
}

export async function getFitnessCycles(userId: number, limit = 180): Promise<FitnessCycle[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(fitnessCycles).where(eq(fitnessCycles.userId, userId)).orderBy(desc(fitnessCycles.performedAt)).limit(limit);
}

export async function getFitnessTransactions(userId: number, limit = 500): Promise<FitnessTransaction[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(fitnessTransactions).where(eq(fitnessTransactions.userId, userId)).orderBy(desc(fitnessTransactions.occurredAt)).limit(limit);
}

export type FitnessProfilePayload = Omit<InsertFitnessProfile, "id" | "userId" | "createdAt" | "updatedAt">;

export async function upsertFitnessProfile(userId: number, payload: FitnessProfilePayload): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(fitnessProfiles).values({ userId, ...payload }).onDuplicateKeyUpdate({ set: payload });
}

export async function insertFitnessCycles(userId: number, rows: Array<Omit<InsertFitnessCycle, "id" | "userId">>): Promise<void> {
  const db = await getDb();
  if (!db || rows.length === 0) return;
  const values = rows.map(row => ({ userId, ...row }));
  await db.insert(fitnessCycles).values(values).onDuplicateKeyUpdate({ set: { localId: sql`localId` } });
}

export async function insertFitnessTransactions(userId: number, rows: Array<Omit<InsertFitnessTransaction, "id" | "userId">>): Promise<void> {
  const db = await getDb();
  if (!db || rows.length === 0) return;
  const values = rows.map(row => ({ userId, ...row }));
  await db.insert(fitnessTransactions).values(values).onDuplicateKeyUpdate({ set: { localId: sql`localId` } });
}

