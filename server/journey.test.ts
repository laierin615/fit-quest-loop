import { describe, expect, it } from "vitest";
import { journeyStateSchema } from "./routers";

describe("journeyStateSchema", () => {
  const validState = {
    settings: {
      dailyGoal: 10,
      kcalPerCycle: 30,
      difficulty: "standard" as const,
      actions: ["深蹲 12 次", "伏地挺身 8 次"],
      soundEnabled: true,
      reminderEnabled: false,
      reminderTime: "20:00",
    },
    totalCount: 0,
    xp: 0,
    coins: 0,
    streak: 0,
    currentChapter: 1,
    unlockedAchievements: [],
    kcalBalance: 0,
    kcalSpent: 0,
    equipment: [],
    activeDate: "2026-08-29",
    currentWeekKey: "2026-08-24",
    weeklyChestCount: 0,
    study: { solved: 0, correct: 0, streak: 0, bestStreak: 0, chapter: 1, chestCount: 0 },
    entries: [],
  };

  it("accepts a fresh daily-zero journey state", () => {
    expect(journeyStateSchema.parse(validState).totalCount).toBe(0);
    expect(journeyStateSchema.parse(validState).entries).toHaveLength(0);
  });

  it("accepts coin rewards and shop spending transactions with references", () => {
    const parsed = journeyStateSchema.parse({
      ...validState,
      transactions: [
        { id: "study-coins-1", occurredAt: "2026-08-29T12:00:00.000Z", localDate: "2026-08-29", resource: "coins", kind: "study", amountDelta: 8, balanceAfter: 38, description: "教檢答對獎勵 +8 金幣", referenceId: "teacher-certification" },
        { id: "equipment-1", occurredAt: "2026-08-29T12:01:00.000Z", localDate: "2026-08-29", resource: "coins", kind: "equipment", amountDelta: -20, balanceAfter: 18, description: "購買裝備：獵徑靴", referenceId: "trail-boots" },
      ],
    });
    expect(parsed.transactions).toHaveLength(2);
    expect(parsed.transactions[0]?.referenceId).toBe("teacher-certification");
    expect(parsed.transactions[1]?.amountDelta).toBe(-20);
  });

  it("accepts a cycle with a local date and action snapshot", () => {
    const parsed = journeyStateSchema.parse({
      ...validState,
      totalCount: 1,
      entries: [{
        id: "cycle-1",
        date: "2026-08-29",
        time: "20:00",
        kcal: 30,
        xp: 20,
        coins: 10,
        actions: ["深蹲 12 次"],
      }],
    });
    expect(parsed.entries[0]?.date).toBe("2026-08-29");
  });

  it("rejects an invalid reminder time and empty action list", () => {
    expect(() => journeyStateSchema.parse({ ...validState, settings: { ...validState.settings, reminderTime: "25:99" } })).toThrow();
    expect(() => journeyStateSchema.parse({ ...validState, settings: { ...validState.settings, actions: [] } })).toThrow();
  });
});
