import { describe, expect, it } from "vitest";
import { emptyCollection } from "./collection";
import { emptyQuest } from "./questSystem";
import { applyStudyAnswer, buildJourneySyncPayload, buildResourceSyncSnapshot, canPurchaseEquipment, coinBalanceFromLedger, combatActionCost, cycleKcalGain, cycleRewards, dailyMilestoneAt, dailyMilestoneEvent, dailyMilestoneReward, legacyCoinOpeningBalance, legacyCoinOpeningTransaction, mergeTransactionLedgers, remoteLegacyCoinOpeningAmount, removeCycleFromLedger, resourceBalanceFromLedger, routeActionCost, shouldResetDaily, studyCoinReward, weeklyReward, weeklyRewardFromProgress, weeklyRewardFromXp } from "./gameRules";

describe("Fit Quest Loop game rules", () => {
  it("resets only when the active local date changes", () => {
    expect(shouldResetDaily("2026-08-28", "2026-08-29")).toBe(true);
    expect(shouldResetDaily("2026-08-29", "2026-08-29")).toBe(false);
    expect(shouldResetDaily("", "2026-08-29")).toBe(false);
  });

  it("keeps legacy coin balances when migrating into the transaction ledger", () => {
    expect(legacyCoinOpeningBalance(33, [])).toBe(330);
    expect(legacyCoinOpeningBalance(33, [10, 12, 15])).toBe(37);
    expect(legacyCoinOpeningBalance(33, [-10, 12])).toBe(12);
  });

  it("migrates legacy cloud coins before study rewards and shop spending", () => {
    const opening = legacyCoinOpeningTransaction(370, false, "2026-08-30T12:00:00.000Z");
    expect(opening).toMatchObject({ amountDelta: 370, balanceAfter: 370, referenceId: "legacy-migration" });
    const afterStudy = (opening?.amountDelta ?? 0) + studyCoinReward(8, []);
    expect(afterStudy).toBe(378);
    expect(afterStudy - 120).toBe(258);
    expect(legacyCoinOpeningTransaction(370, true, "2026-08-30T12:00:00.000Z")).toBeNull();
    expect(remoteLegacyCoinOpeningAmount(370, 0, false, false)).toBe(370);
    expect(remoteLegacyCoinOpeningAmount(500, 370, true, false)).toBe(130);
    expect(remoteLegacyCoinOpeningAmount(500, 370, true, true)).toBe(0);
  });

  it("builds a correct sync snapshot across legacy cloud coins, study reward, and shop spending", () => {
    const openingAmount = remoteLegacyCoinOpeningAmount(370, 0, false, false);
    const opening = legacyCoinOpeningTransaction(openingAmount, false, "2026-08-30T12:00:00.000Z");
    const studyReward = studyCoinReward(8, []);
    const ledger = mergeTransactionLedgers(opening ? [opening] : [], [
      { id: "study-1", occurredAt: "2026-08-30T12:01:00.000Z", resource: "coins" as const, kind: "study" as const, amountDelta: studyReward, balanceAfter: 378, description: "教檢答對獎勵 +8 金幣", referenceId: "teacher-certification" },
      { id: "equipment-1", occurredAt: "2026-08-30T12:02:00.000Z", resource: "coins" as const, kind: "equipment" as const, amountDelta: -120, balanceAfter: 258, description: "購買裝備：獵徑靴", referenceId: "trail-boots" },
    ]);
    const duplicateLedger = [...ledger, ledger[1]!];
    const snapshot = buildResourceSyncSnapshot(duplicateLedger, 0);
    expect(snapshot.coins).toBe(258);
    expect(snapshot.transactions).toHaveLength(3);
    expect(snapshot.transactions.map(transaction => transaction.referenceId)).toEqual(["trail-boots", "teacher-certification", "legacy-migration"]);
    expect(snapshot.transactions.every(transaction => transaction.localDate === "2026-08-30")).toBe(true);

    const payload = buildJourneySyncPayload({
      settings: { dailyGoal: 10, kcalPerCycle: 30, difficulty: "standard", actions: ["深蹲"], soundEnabled: true, reminderEnabled: false, reminderTime: "20:00" },
      totalCount: 3, xp: 60, streak: 1, currentChapter: 1, unlockedAchievements: [], kcalBalance: 0, kcalSpent: 0, equipment: ["trail-boots"], activeDate: "2026-08-30", currentWeekKey: "2026-08-24", lastSettledWeek: null, weeklyChestCount: 0, rareChestCount: 0, milestonesClaimed: [], study: { solved: 1, correct: 1, streak: 1, bestStreak: 1, chapter: 1, chestCount: 0 }, quest: emptyQuest(), collection: emptyCollection(), entries: [{ id: "entry-1", date: "2026-08-30", time: "20:00", kcal: 30, xp: 20, coins: 10, actions: ["深蹲"] }], transactions: duplicateLedger, fallbackCoins: 0, serializeEntry: entry => ({ ...entry, performedAt: "2026-08-30T12:00:00.000Z" }),
    });
    expect(payload.coins).toBe(258);
    expect(payload.transactions).toHaveLength(3);
    expect(payload.transactions[0]).toMatchObject({ localDate: "2026-08-30", referenceId: "trail-boots" });
    expect(payload.entries[0]).toMatchObject({ performedAt: "2026-08-30T12:00:00.000Z" });
  });

  it("triggers the 5th and 10th daily milestone once per daily ledger", () => {
    expect(dailyMilestoneAt(5, [])).toBe(5);
    expect(dailyMilestoneAt(5, [5])).toBeNull();
    expect(dailyMilestoneAt(10, [5])).toBe(10);
    expect(dailyMilestoneAt(10, [5, 10])).toBeNull();
    expect(dailyMilestoneReward(5)).toEqual({ rareChest: 1, bonusXp: 60 });
    expect(dailyMilestoneReward(10)).toEqual({ rareChest: 1, bonusXp: 140 });
    expect(dailyMilestoneEvent(5, [])).toMatchObject({ milestone: 5, rareChest: 1, bonusXp: 60, animation: "fifth-cycle" });
    expect(dailyMilestoneEvent(10, [5])).toMatchObject({ milestone: 10, rareChest: 1, bonusXp: 140, animation: "tenth-cycle" });
    expect(dailyMilestoneEvent(10, [5, 10])).toBeNull();
  });

  it("merges local and remote ledgers idempotently", () => {
    const local = [{ id: "opening", occurredAt: "2026-08-30T12:00:00.000Z", resource: "coins", amountDelta: 370 }];
    const remote = [{ id: "opening", occurredAt: "2026-08-30T12:00:00.000Z", resource: "coins", amountDelta: 370 }, { id: "study", occurredAt: "2026-08-30T12:01:00.000Z", resource: "coins", amountDelta: 8 }];
    const merged = mergeTransactionLedgers(local, remote);
    expect(merged).toHaveLength(2);
    expect(resourceBalanceFromLedger(merged, "coins")).toBe(378);
    expect(coinBalanceFromLedger(merged, 999)).toBe(378);
    expect(coinBalanceFromLedger([], 370)).toBe(370);
  });

  it("applies equipment bonuses without changing cycle count", () => {
    expect(cycleKcalGain(30, [])).toBe(30);
    expect(cycleKcalGain(30, ["ember-flask"])).toBe(35);
    expect(routeActionCost(20, [])).toBe(20);
    expect(routeActionCost(20, ["trail-boots"])).toBe(15);
    expect(combatActionCost(30, ["battle-bracer"])).toBe(22);
    expect(studyCoinReward(8, [])).toBe(8);
    expect(studyCoinReward(8, ["study-satchel"])).toBe(13);
  });

  it("checks equipment purchase eligibility", () => {
    expect(canPurchaseEquipment(50, 40, "trail-boots", [])).toBe(true);
    expect(canPurchaseEquipment(30, 40, "trail-boots", [])).toBe(false);
    expect(canPurchaseEquipment(50, 40, "trail-boots", ["trail-boots"])).toBe(false);
  });

  it("persists study streaks, chapters, and every-third-answer chests", () => {
    const initial = { solved: 0, correct: 0, streak: 0, bestStreak: 0, chapter: 1, chestCount: 0 };
    const one = applyStudyAnswer(initial, true);
    const two = applyStudyAnswer(one, true);
    const three = applyStudyAnswer(two, true);
    expect(three).toMatchObject({ solved: 3, correct: 3, streak: 3, bestStreak: 3, chapter: 2, chestCount: 1 });
    expect(applyStudyAnswer(three, false)).toMatchObject({ solved: 4, correct: 3, streak: 0, bestStreak: 3, chestCount: 1 });
  });

  it("increases XP, kcal, and coins for each daily cycle while capping at 2x", () => {
    const first = cycleRewards(20, 30, 10, 1, []);
    const second = cycleRewards(20, 30, 10, 2, []);
    const tenth = cycleRewards(20, 30, 10, 10, []);
    const eleventh = cycleRewards(20, 30, 10, 11, ["ember-flask"]);
    expect(second.xp).toBeGreaterThan(first.xp);
    expect(second.kcal).toBeGreaterThan(first.kcal);
    expect(second.coins).toBeGreaterThan(first.coins);
    expect(cycleRewards(20, 30, 10, 1, ["hunter-charm"]).coins).toBe(14);
    expect(tenth).toMatchObject({ xp: 38, kcal: 57, coins: 19 });
    expect(eleventh).toMatchObject({ xp: 40, kcal: 65, coins: 20 });
  });

  it("can roll back the exact reward entry after an undo", () => {
    const first = cycleRewards(20, 30, 10, 1, []);
    const second = cycleRewards(20, 30, 10, 2, []);
    const ledger = [{ id: "cycle-1", ...first }, { id: "cycle-2", ...second }];
    const result = removeCycleFromLedger(ledger, "cycle-2");
    expect(result.entries).toHaveLength(1);
    expect(result.removedRewards).toEqual(second);
    expect(result.entries[0]).toEqual({ id: "cycle-1", ...first });
  });

  it("calculates weekly bonus from actual progressive XP and kcal成果", () => {
    expect(weeklyRewardFromXp(0, [])).toBe(100);
    expect(weeklyRewardFromXp(200, [])).toBe(140);
    expect(weeklyRewardFromProgress(200, 600, [])).toBe(170);
    expect(weeklyRewardFromProgress(200, 600, ["field-compass"])).toBe(220);
  });

  it("calculates a weekly reward once from cycles and compass gear", () => {
    expect(weeklyReward(0, [])).toBe(100);
    expect(weeklyReward(20, ["field-compass"])).toBe(250);
  });
});
