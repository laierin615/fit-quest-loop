import { describe, expect, it } from "vitest";
import { toCloudPayload } from "@/pages/Home";
import { legacyCoinOpeningTransaction, remoteLegacyCoinOpeningAmount, studyCoinReward } from "@shared/gameRules";
import { emptyCollection, makeChest, recordRelic } from "@shared/collection";
import { applyStageDamage, emptyQuest } from "@shared/questSystem";

describe("Home toCloudPayload resource sync", () => {
  it("preserves legacy cloud coins through study reward and equipment spending", () => {
    const openingAmount = remoteLegacyCoinOpeningAmount(370, 0, false, false);
    const opening = legacyCoinOpeningTransaction(openingAmount, false, "2026-08-30T12:00:00.000Z");
    if (!opening) throw new Error("expected a legacy opening transaction");
    const studyReward = studyCoinReward(8, []);
    const study = { id: "study-1", occurredAt: "2026-08-30T12:01:00.000Z", resource: "coins" as const, kind: "study" as const, amountDelta: studyReward, balanceAfter: 378, description: "教檢答對獎勵 +8 金幣", referenceId: "teacher-certification" };
    const purchase = { id: "equipment-1", occurredAt: "2026-08-30T12:02:00.000Z", resource: "coins" as const, kind: "equipment" as const, amountDelta: -120, balanceAfter: 258, description: "購買裝備：獵徑靴", referenceId: "trail-boots" };
    const state: Parameters<typeof toCloudPayload>[0] = {
      history: { "2026-08-30": 3 },
      totalCount: 3,
      settings: { dailyGoal: 10, kcalPerCycle: 30, difficulty: "standard", actions: ["深蹲"], soundEnabled: true, reminderEnabled: false, reminderTime: "20:00" },
      entries: [{ id: "entry-1", date: "2026-08-30", time: "20:00", actions: ["深蹲"], kcal: 30, xp: 20, coins: 10 }],
      transactions: [opening, study, purchase, purchase],
      kcalBalance: 0,
      kcalSpent: 0,
      equipment: ["trail-boots"],
      activeDate: "2026-08-30",
      currentWeekKey: "2026-08-24",
      weeklyChestCount: 0,
      rareChestCount: 0,
      milestonesClaimed: [],
      bonusXp: 0,
      trailProgress: {},
      combatDamage: {},
      study: { solved: 1, correct: 1, streak: 1, bestStreak: 1, chapter: 1, chestCount: 0 },
      quest: applyStageDamage(emptyQuest(), 60, { difficulty: "standard", equipment: [], at: "2026-08-30T12:03:00.000Z", cycles: 6 }).quest,
      collection: { ...recordRelic(emptyCollection(), "ember-pebble", "2026-08-30T12:03:00.000Z"), chests: [makeChest("silver", "weekly", "2026-08-30T12:03:00.000Z", "chest-weekly-1")] },
      weeklySettlement: null,
    };

    const payload = toCloudPayload(state);
    expect(payload.coins).toBe(258);
    expect(payload.transactions).toHaveLength(3);
    expect(payload.transactions.map(transaction => transaction.referenceId)).toEqual(["trail-boots", "teacher-certification", "legacy-migration"]);
    expect(payload.transactions.every(transaction => transaction.localDate === "2026-08-30")).toBe(true);
    expect(payload.transactions[0]).toMatchObject({ amountDelta: -120, resource: "coins", kind: "equipment" });
    expect(payload.transactions[1]).toMatchObject({ amountDelta: 8, referenceId: "teacher-certification" });
  });

  it("carries quest and collection progress into the cloud payload", () => {
    const quest = applyStageDamage(emptyQuest(), 130, { difficulty: "standard", equipment: [], at: "2026-08-30T12:03:00.000Z", cycles: 6 }).quest;
    const collection = { ...recordRelic(emptyCollection(), "ember-pebble", "2026-08-30T12:03:00.000Z"), chests: [makeChest("gold", "chapter", "2026-08-30T12:03:00.000Z", "chest-chapter-1")] };
    const state: Parameters<typeof toCloudPayload>[0] = {
      history: { "2026-08-30": 13 },
      totalCount: 13,
      settings: { dailyGoal: 10, kcalPerCycle: 30, difficulty: "standard", actions: ["深蹲"], soundEnabled: true, reminderEnabled: false, reminderTime: "20:00" },
      entries: [],
      transactions: [],
      kcalBalance: 0,
      kcalSpent: 0,
      equipment: [],
      activeDate: "2026-08-30",
      currentWeekKey: "2026-08-24",
      weeklyChestCount: 0,
      rareChestCount: 0,
      milestonesClaimed: [],
      bonusXp: 0,
      trailProgress: {},
      combatDamage: {},
      study: { solved: 0, correct: 0, streak: 0, bestStreak: 0, chapter: 1, chestCount: 0 },
      quest,
      collection,
      weeklySettlement: null,
    };

    const payload = toCloudPayload(state);
    expect(payload.quest.stageIndex).toBe(2);
    expect(Object.keys(payload.quest.cleared)).toEqual(["ch1-s1", "ch1-s2"]);
    expect(payload.collection.relics["ember-pebble"]!.count).toBe(1);
    expect(payload.collection.chests).toHaveLength(1);
    expect(payload.unlockedAchievements).toContain("first_step");
  });
});
