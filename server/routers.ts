import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { emptyCollection, mergeCollections, type CollectionState } from "@shared/collection";
import { emptyQuest, mergeQuests, type QuestState } from "@shared/questSystem";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getFitnessCycles, getFitnessProfile, getFitnessTransactions, insertFitnessCycles, insertFitnessTransactions, upsertFitnessProfile } from "./db";

const difficulty = z.enum(["easy", "standard", "hard"]);
const studyProgressSchema = z.object({ solved: z.number().int().min(0), correct: z.number().int().min(0), streak: z.number().int().min(0), bestStreak: z.number().int().min(0), chapter: z.number().int().min(1).max(3), chestCount: z.number().int().min(0) });

const stageClearSchema = z.object({ stars: z.union([z.literal(1), z.literal(2), z.literal(3)]), clearedAt: z.string().max(40), cycles: z.number().int().min(0).max(10000) });
const dailyQuestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  id: z.string().min(1).max(64),
  kind: z.enum(["cycles", "kcal", "study", "combat"]),
  title: z.string().max(80),
  hint: z.string().max(160),
  target: z.number().int().min(0).max(100000),
  progress: z.number().int().min(0).max(100000),
  claimed: z.boolean(),
  reward: z.object({ coins: z.number().int().min(0).max(10000), xp: z.number().int().min(0).max(10000), chest: z.enum(["wood", "silver", "gold"]) }),
});
const questStateSchema = z.object({
  chapter: z.number().int().min(1).max(99),
  stageIndex: z.number().int().min(0).max(50),
  damage: z.number().int().min(0).max(1000000),
  cycles: z.number().int().min(0).max(100000),
  cleared: z.record(z.string().max(40), stageClearSchema),
  daily: dailyQuestSchema.nullable().default(null),
});
const chestSchema = z.object({ id: z.string().min(1).max(120), tier: z.enum(["wood", "silver", "gold"]), source: z.string().max(80), createdAt: z.string().max(40), openedAt: z.string().max(40).optional() });
const collectionStateSchema = z.object({
  relics: z.record(z.string().max(60), z.object({ count: z.number().int().min(0).max(100000), firstAt: z.string().max(40) })),
  bestiary: z.record(z.string().max(60), z.object({ defeats: z.number().int().min(0).max(100000), firstAt: z.string().max(40) })),
  chests: z.array(chestSchema).max(300),
  openedCount: z.number().int().min(0).max(100000),
  legacyMigrated: z.boolean(),
});

function parseQuestProgress(raw: string | null | undefined): QuestState {
  if (!raw) return emptyQuest();
  const parsed = questStateSchema.safeParse(JSON.parse(raw));
  return parsed.success ? parsed.data : emptyQuest();
}

function parseCollectionProgress(raw: string | null | undefined): CollectionState {
  if (!raw) return emptyCollection();
  const parsed = collectionStateSchema.safeParse(JSON.parse(raw));
  return parsed.success ? parsed.data : emptyCollection();
}

const settingsSchema = z.object({
  dailyGoal: z.number().int().min(1).max(30),
  kcalPerCycle: z.number().int().min(1).max(500),
  difficulty,
  actions: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
  soundEnabled: z.boolean(),
  reminderEnabled: z.boolean().default(false),
  reminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default("20:00"),
});

const transactionSchema = z.object({
  id: z.string().min(1).max(80),
  occurredAt: z.string().datetime(),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  resource: z.enum(["kcal", "coins"]),
  kind: z.enum(["cycle", "trail", "combat", "equipment", "milestone", "study"]),
  amountDelta: z.number().int().min(-100000).max(100000),
  balanceAfter: z.number().int().min(0),
  description: z.string().trim().min(1).max(160),
  referenceId: z.string().max(80).optional(),
});

const cycleSchema = z.object({
  id: z.string().min(1).max(64),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  performedAt: z.string().datetime().optional(),
  kcal: z.number().int().min(0).max(500),
  xp: z.number().int().min(0).max(1000),
  coins: z.number().int().min(0).max(1000),
  actions: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
});

export const journeyStateSchema = z.object({
  settings: settingsSchema,
  totalCount: z.number().int().min(0),
  xp: z.number().int().min(0),
  coins: z.number().int().min(0),
  streak: z.number().int().min(0),
  currentChapter: z.number().int().min(1).max(99),
  unlockedAchievements: z.array(z.string().min(1).max(80)).max(100),
  kcalBalance: z.number().int().min(0),
  kcalSpent: z.number().int().min(0),
  equipment: z.array(z.string().min(1).max(80)).max(20),
  activeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  currentWeekKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  lastSettledWeek: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  weeklyChestCount: z.number().int().min(0),
  rareChestCount: z.number().int().min(0).default(0),
  milestonesClaimed: z.array(z.number().int().min(5).max(10)).default([]),
  entries: z.array(cycleSchema).max(500),
  transactions: z.array(transactionSchema).max(2000).default([]),
  study: studyProgressSchema,
  quest: questStateSchema.default(() => emptyQuest()),
  collection: collectionStateSchema.default(() => emptyCollection()),
});

const defaultActions = ["深蹲 12 次", "伏地挺身 8 次", "登山者 20 次", "伸展 30 秒"];
const defaultAchievements = ["first_step"];

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  journey: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const [profile, cycles, transactions] = await Promise.all([getFitnessProfile(ctx.user.id), getFitnessCycles(ctx.user.id), getFitnessTransactions(ctx.user.id)]);
      return {
        exists: Boolean(profile),
        profile: profile ? {
          ...profile,
          actions: JSON.parse(profile.actions) as string[],
          unlockedAchievements: JSON.parse(profile.unlockedAchievements) as string[],
          equipment: JSON.parse(profile.equipment) as string[],
          milestonesClaimed: JSON.parse(profile.milestonesClaimed || "[]") as number[],
          study: JSON.parse(profile.studyProgress || "{}"),
          quest: parseQuestProgress(profile.questProgress),
          collection: parseCollectionProgress(profile.collectionProgress),
        } : {
          dailyGoal: 10, kcalPerCycle: 30, difficulty: "standard" as const, actions: defaultActions,
          soundEnabled: true, reminderEnabled: false, reminderTime: "20:00", totalCount: 0, xp: 0, coins: 0, streak: 0, currentChapter: 1, unlockedAchievements: defaultAchievements, kcalBalance: 0, kcalSpent: 0, equipment: [], activeDate: "", currentWeekKey: "", lastSettledWeek: null, weeklyChestCount: 0, rareChestCount: 0, milestonesClaimed: [], study: { solved: 0, correct: 0, streak: 0, bestStreak: 0, chapter: 1, chestCount: 0 }, quest: emptyQuest(), collection: emptyCollection(),
        },
        cycles: cycles.map(cycle => ({ ...cycle, actions: JSON.parse(cycle.actions) as string[] })),
        transactions,
      };
    }),
    sync: protectedProcedure.input(journeyStateSchema).mutation(async ({ ctx, input }) => {
      const [existingProfile, existingCycles, existingTransactions] = await Promise.all([getFitnessProfile(ctx.user.id), getFitnessCycles(ctx.user.id, 500), getFitnessTransactions(ctx.user.id, 2000)]);
      const existingIds = new Set(existingCycles.map(cycle => cycle.localId));
      const mergedEntries = [...existingCycles.map(cycle => ({ id: cycle.localId, date: cycle.localDate, time: new Date(cycle.performedAt).toISOString().slice(11, 16), kcal: cycle.kcal, xp: cycle.xp, coins: cycle.coins, actions: JSON.parse(cycle.actions) as string[] })), ...input.entries.filter(entry => !existingIds.has(entry.id))];
      const previousAchievements = existingProfile ? JSON.parse(existingProfile.unlockedAchievements) as string[] : [];
      const mergedAchievements = Array.from(new Set([...previousAchievements, ...input.unlockedAchievements]));
      const previousStudy = existingProfile?.studyProgress ? studyProgressSchema.parse(JSON.parse(existingProfile.studyProgress)) : { solved: 0, correct: 0, streak: 0, bestStreak: 0, chapter: 1, chestCount: 0 };
      const mergedStudy = { solved: Math.max(previousStudy.solved, input.study.solved), correct: Math.max(previousStudy.correct, input.study.correct), streak: Math.max(previousStudy.streak, input.study.streak), bestStreak: Math.max(previousStudy.bestStreak, input.study.bestStreak), chapter: Math.max(previousStudy.chapter, input.study.chapter), chestCount: Math.max(previousStudy.chestCount, input.study.chestCount) };
      const mergedTotalCount = Math.max(existingProfile?.totalCount ?? 0, input.totalCount, mergedEntries.length);
      const mergedQuest = mergeQuests(input.quest, parseQuestProgress(existingProfile?.questProgress));
      const mergedCollection = mergeCollections(input.collection, parseCollectionProgress(existingProfile?.collectionProgress));
      await upsertFitnessProfile(ctx.user.id, {
        dailyGoal: input.settings.dailyGoal,
        kcalPerCycle: input.settings.kcalPerCycle,
        difficulty: input.settings.difficulty,
        actions: JSON.stringify(input.settings.actions),
        soundEnabled: input.settings.soundEnabled,
        reminderEnabled: input.settings.reminderEnabled,
        reminderTime: input.settings.reminderTime,
        totalCount: mergedTotalCount,
        xp: Math.max(existingProfile?.xp ?? 0, input.xp, mergedTotalCount * 20),
        coins: Math.max(existingProfile?.coins ?? 0, input.coins, mergedTotalCount * 10),
        streak: Math.max(existingProfile?.streak ?? 0, input.streak),
        currentChapter: Math.max(existingProfile?.currentChapter ?? 1, input.currentChapter),
        unlockedAchievements: JSON.stringify(mergedAchievements),
        kcalBalance: Math.max(existingProfile?.kcalBalance ?? 0, input.kcalBalance),
        kcalSpent: Math.max(existingProfile?.kcalSpent ?? 0, input.kcalSpent),
        equipment: JSON.stringify(Array.from(new Set([...(existingProfile ? JSON.parse(existingProfile.equipment) as string[] : []), ...input.equipment]))),
        activeDate: input.activeDate,
        currentWeekKey: input.currentWeekKey,
        lastSettledWeek: input.lastSettledWeek ?? existingProfile?.lastSettledWeek ?? null,
        weeklyChestCount: Math.max(existingProfile?.weeklyChestCount ?? 0, input.weeklyChestCount),
        rareChestCount: Math.max(existingProfile?.rareChestCount ?? 0, input.rareChestCount),
        milestonesClaimed: JSON.stringify(input.milestonesClaimed),
        studyProgress: JSON.stringify(mergedStudy),
        questProgress: JSON.stringify(mergedQuest),
        collectionProgress: JSON.stringify(mergedCollection),
      });
      const existingTransactionIds = new Set(existingTransactions.map(transaction => transaction.localId));
      await insertFitnessTransactions(ctx.user.id, input.transactions.filter(transaction => !existingTransactionIds.has(transaction.id)).map(transaction => ({
        localId: transaction.id,
        occurredAt: new Date(transaction.occurredAt),
        localDate: transaction.localDate,
        resource: transaction.resource,
        kind: transaction.kind,
        amountDelta: transaction.amountDelta,
        balanceAfter: transaction.balanceAfter,
        description: transaction.description,
        referenceId: transaction.referenceId ?? null,
      })));
      await insertFitnessCycles(ctx.user.id, input.entries.map(entry => ({
        localId: entry.id,
        performedAt: entry.performedAt ? new Date(entry.performedAt) : new Date(`${entry.date}T${entry.time}:00`),
        localDate: entry.date,
        kcal: entry.kcal,
        xp: entry.xp,
        coins: entry.coins,
        actions: JSON.stringify(entry.actions),
      })));
      return { ok: true, syncedEntries: input.entries.length, syncedTransactions: input.transactions.length, mergedTotalCount } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;

export { defaultActions };
