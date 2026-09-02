import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, evaluateAchievements, unlockedAchievementIds, type AchievementInput } from "./achievements";
import { RELICS, emptyCollection, recordRelic } from "./collection";
import { applyStageDamage, emptyQuest, stageHp, ALL_STAGES } from "./questSystem";

const baseInput: AchievementInput = {
  totalCount: 0,
  todayCount: 0,
  dailyGoal: 10,
  streak: 0,
  kcalTotal: 0,
  study: { solved: 0, correct: 0, bestStreak: 0 },
  quest: emptyQuest(),
  collection: emptyCollection(),
  equipment: [],
};

describe("成就資料源", () => {
  it("集中在單一資料源、id 不重複，且保留舊版已同步的成就 id", () => {
    expect(new Set(ACHIEVEMENTS.map(item => item.id)).size).toBe(ACHIEVEMENTS.length);
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(18);
    ["first_step", "daily_trail", "long_walk", "valley_hunter", "steady_pulse", "warmstone_burner"].forEach(id => {
      expect(ACHIEVEMENTS.some(item => item.id === id)).toBe(true);
    });
  });

  it("全新旅程沒有任何成就解鎖", () => {
    expect(unlockedAchievementIds(baseInput)).toHaveLength(0);
  });
});

describe("解鎖邊界", () => {
  it("旅程與連續類成就在剛好達標時解鎖", () => {
    expect(unlockedAchievementIds({ ...baseInput, totalCount: 1 })).toContain("first_step");
    expect(unlockedAchievementIds({ ...baseInput, todayCount: 9 })).not.toContain("daily_trail");
    expect(unlockedAchievementIds({ ...baseInput, todayCount: 10 })).toContain("daily_trail");
    expect(unlockedAchievementIds({ ...baseInput, streak: 7 })).toContain("steady_pulse");
    expect(unlockedAchievementIds({ ...baseInput, streak: 30 })).toContain("moon_walker");
    expect(unlockedAchievementIds({ ...baseInput, kcalTotal: 3000 })).toContain("warmstone_burner");
  });

  it("關卡類成就跟著實際通關節點數走", () => {
    const totalHp = ALL_STAGES.slice(0, 10).reduce((sum, stage) => sum + stageHp(stage, "standard"), 0);
    const quest = applyStageDamage(emptyQuest(), totalHp, { difficulty: "standard", equipment: [], at: "2026-09-02T08:00:00.000Z", cycles: 1 }).quest;
    const ids = unlockedAchievementIds({ ...baseInput, quest });
    expect(ids).toContain("valley_hunter");
    expect(ids).toContain("chapter_one_clear");
    expect(ids).toContain("flawless_tracker");
    expect(ids).not.toContain("boss_slayer");
    expect(ids).not.toContain("stage_veteran");
  });

  it("收集類成就依實際圖鑑與套裝進度計算", () => {
    const collection = RELICS.slice(0, 5).reduce((current, relic) => recordRelic(current, relic.id, "2026-09-02T08:00:00.000Z"), emptyCollection());
    const view = evaluateAchievements({ ...baseInput, collection, equipment: ["trail-boots", "field-compass", "hunter-charm"] });
    expect(view.find(item => item.id === "relic_novice")!.unlocked).toBe(true);
    expect(view.find(item => item.id === "relic_curator")).toMatchObject({ progress: 5, target: 15, unlocked: false });
    expect(view.find(item => item.id === "relic_master")!.target).toBe(RELICS.length);
    expect(view.find(item => item.id === "set_collector")!.unlocked).toBe(true);
    expect(view.find(item => item.id === "chest_breaker")!.progress).toBe(0);
  });
});
