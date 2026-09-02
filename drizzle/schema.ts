import { boolean, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const fitnessProfiles = mysqlTable("fitness_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  dailyGoal: int("dailyGoal").notNull().default(10),
  kcalPerCycle: int("kcalPerCycle").notNull().default(30),
  difficulty: mysqlEnum("difficulty", ["easy", "standard", "hard"]).notNull().default("standard"),
  actions: text("actions").notNull(),
  soundEnabled: boolean("soundEnabled").notNull().default(true),
  reminderEnabled: boolean("reminderEnabled").notNull().default(false),
  reminderTime: varchar("reminderTime", { length: 5 }).notNull().default("20:00"),
  totalCount: int("totalCount").notNull().default(0),
  xp: int("xp").notNull().default(0),
  coins: int("coins").notNull().default(0),
  streak: int("streak").notNull().default(0),
  currentChapter: int("currentChapter").notNull().default(1),
  unlockedAchievements: text("unlockedAchievements").notNull(),
  kcalBalance: int("kcalBalance").notNull().default(0),
  kcalSpent: int("kcalSpent").notNull().default(0),
  equipment: varchar("equipment", { length: 4000 }).notNull().default("[]"),
  activeDate: varchar("activeDate", { length: 10 }).notNull().default(""),
  currentWeekKey: varchar("currentWeekKey", { length: 10 }).notNull().default(""),
  lastSettledWeek: varchar("lastSettledWeek", { length: 10 }),
  weeklyChestCount: int("weeklyChestCount").notNull().default(0),
  rareChestCount: int("rareChestCount").notNull().default(0),
  milestonesClaimed: varchar("milestonesClaimed", { length: 2000 }).notNull().default("[]"),
  studyProgress: varchar("studyProgress", { length: 2000 }).notNull().default("{}"),
  questProgress: text("questProgress"),
  collectionProgress: text("collectionProgress"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  userIdUnique: uniqueIndex("fitness_profiles_user_id_unique").on(table.userId),
}));

export const fitnessCycles = mysqlTable("fitness_cycles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  localId: varchar("localId", { length: 64 }).notNull(),
  performedAt: timestamp("performedAt").notNull(),
  localDate: varchar("localDate", { length: 10 }).notNull(),
  kcal: int("kcal").notNull(),
  xp: int("xp").notNull(),
  coins: int("coins").notNull(),
  actions: text("actions").notNull(),
}, table => ({
  userDateIdx: index("fitness_cycles_user_date_idx").on(table.userId, table.localDate),
  userPerformedIdx: index("fitness_cycles_user_performed_idx").on(table.userId, table.performedAt),
  userLocalIdUnique: uniqueIndex("fitness_cycles_user_local_id_unique").on(table.userId, table.localId),
}));

export const fitnessTransactions = mysqlTable("fitness_transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  localId: varchar("localId", { length: 80 }).notNull(),
  occurredAt: timestamp("occurredAt").notNull(),
  localDate: varchar("localDate", { length: 10 }).notNull(),
  resource: mysqlEnum("resource", ["kcal", "coins"]).notNull(),
  kind: mysqlEnum("kind", ["cycle", "trail", "combat", "equipment", "milestone", "study"]).notNull(),
  amountDelta: int("amountDelta").notNull(),
  balanceAfter: int("balanceAfter").notNull(),
  description: varchar("description", { length: 160 }).notNull(),
  referenceId: varchar("referenceId", { length: 80 }),
}, table => ({
  userDateIdx: index("fitness_transactions_user_date_idx").on(table.userId, table.localDate),
  userLocalIdUnique: uniqueIndex("fitness_transactions_user_local_id_unique").on(table.userId, table.localId),
}));

export type FitnessProfile = typeof fitnessProfiles.$inferSelect;
export type InsertFitnessProfile = typeof fitnessProfiles.$inferInsert;
export type FitnessCycle = typeof fitnessCycles.$inferSelect;
export type InsertFitnessCycle = typeof fitnessCycles.$inferInsert;
export type FitnessTransaction = typeof fitnessTransactions.$inferSelect;
export type InsertFitnessTransaction = typeof fitnessTransactions.$inferInsert;