import { describe, expect, it } from "vitest";
import { ALL_STAGES, CHAPTERS, advanceDailyQuest, applyStageDamage, chapterProgress, claimDailyQuest, currentStage, damagePerCycle, emptyQuest, ensureDailyQuest, isChapterUnlocked, isDailyQuestComplete, COMBAT_KCAL_RATIO, TRAIL_KCAL_RATIO, kcalAttackDamage, mergeQuests, questTotals, revertStageDamage, rollDailyQuest, stageHp, stageStars } from "./questSystem";

const standard = { difficulty: "standard" as const, equipment: [] as string[], at: "2026-09-02T08:00:00.000Z" };

describe("關卡地圖資料", () => {
  it("建立 4 章共 28 個節點，每章以 BOSS 收尾", () => {
    expect(CHAPTERS).toHaveLength(4);
    expect(ALL_STAGES).toHaveLength(28);
    CHAPTERS.forEach(chapter => {
      expect(chapter.stages).toHaveLength(7);
      expect(chapter.stages[6]!.kind).toBe("boss");
      expect(chapter.stages[6]!.guaranteedDrop).toBe(chapter.clearRelic);
    });
  });

  it("難度只改變關卡生命值倍率，不改變每次循環傷害", () => {
    const stage = CHAPTERS[0]!.stages[0]!;
    expect(stageHp(stage, "standard")).toBe(60);
    expect(stageHp(stage, "easy")).toBe(42);
    expect(stageHp(stage, "hard")).toBe(84);
    expect(damagePerCycle([])).toBe(10);
    expect(damagePerCycle(["ember-flask", "battle-bracer", "study-satchel"])).toBe(12);
    expect(kcalAttackDamage(30, [])).toBe(30);
    expect(kcalAttackDamage(30, ["ember-flask", "battle-bracer", "study-satchel"])).toBe(36);
  });
});

describe("關卡推進", () => {
  it("傷害會累積在同一節點上，不隨呼叫次數重置", () => {
    const first = applyStageDamage(emptyQuest(), 25, { ...standard, cycles: 1 });
    expect(first.clears).toHaveLength(0);
    expect(first.quest.damage).toBe(25);
    const second = applyStageDamage(first.quest, 25, { ...standard, cycles: 1 });
    expect(second.quest.damage).toBe(50);
    expect(second.quest.cycles).toBe(2);
  });

  it("擊倒節點後溢出傷害帶往下一節點，並記錄星等", () => {
    let quest = emptyQuest();
    quest = applyStageDamage(quest, 25, { ...standard, cycles: 1 }).quest;
    quest = applyStageDamage(quest, 25, { ...standard, cycles: 1 }).quest;
    const result = applyStageDamage(quest, 25, { ...standard, cycles: 1 });
    expect(result.clears).toHaveLength(1);
    expect(result.clears[0]!.stage.id).toBe("ch1-s1");
    expect(result.clears[0]!.stars).toBe(3);
    expect(result.quest.stageIndex).toBe(1);
    expect(result.quest.damage).toBe(15);
    expect(result.quest.cycles).toBe(0);
    expect(result.quest.cleared["ch1-s1"]).toMatchObject({ stars: 3, clearedAt: standard.at });
  });

  it("一次大量傷害可連鎖過關並在章末解鎖下一章", () => {
    const chapterHp = CHAPTERS[0]!.stages.reduce((sum, stage) => sum + stageHp(stage, "standard"), 0);
    const result = applyStageDamage(emptyQuest(), chapterHp, { ...standard, cycles: 1 });
    expect(result.clears).toHaveLength(7);
    expect(result.clears[6]!.chapterCleared).toBe(true);
    expect(result.clears[6]!.relicId).toBe(CHAPTERS[0]!.clearRelic);
    expect(result.quest.chapter).toBe(2);
    expect(result.quest.stageIndex).toBe(0);
    expect(isChapterUnlocked(result.quest, 2)).toBe(true);
    expect(chapterProgress(result.quest, 1)).toMatchObject({ cleared: 7, total: 7, complete: true });
    expect(questTotals(result.quest)).toMatchObject({ clearedStages: 7, bossesDefeated: 1 });
  });

  it("走完全部章節後不再有當前節點，額外傷害不會出錯", () => {
    const totalHp = ALL_STAGES.reduce((sum, stage) => sum + stageHp(stage, "standard"), 0);
    const done = applyStageDamage(emptyQuest(), totalHp + 500, { ...standard, cycles: 1 });
    expect(done.clears).toHaveLength(28);
    expect(currentStage(done.quest)).toBeNull();
    expect(applyStageDamage(done.quest, 100, standard).clears).toHaveLength(0);
  });

  it("星等依耗用循環數判定，用大卡加速可換高星", () => {
    const stage = CHAPTERS[0]!.stages[0]!;
    expect(stageStars(stage, "standard", 6)).toBe(3);
    expect(stageStars(stage, "standard", 9)).toBe(2);
    expect(stageStars(stage, "standard", 10)).toBe(1);
  });
});

describe("撤銷循環", () => {
  it("只回退尚未過關的傷害", () => {
    const quest = applyStageDamage(emptyQuest(), 30, { ...standard, cycles: 3 }).quest;
    const reverted = revertStageDamage(quest, 10, 1);
    expect(reverted.reverted).toBe(true);
    expect(reverted.quest.damage).toBe(20);
    expect(reverted.quest.cycles).toBe(2);
  });

  it("已過關的節點不會被撤銷收回", () => {
    const cleared = applyStageDamage(emptyQuest(), 60, { ...standard, cycles: 6 }).quest;
    const reverted = revertStageDamage(cleared, 10, 1);
    expect(reverted.reverted).toBe(false);
    expect(reverted.quest.cleared["ch1-s1"]).toBeTruthy();
    expect(reverted.quest.stageIndex).toBe(1);
  });
});

describe("每日支線關卡", () => {
  it("同一天同一使用者恆定，換日期才會換題", () => {
    const a = rollDailyQuest("2026-09-02", "user-1", 10);
    const b = rollDailyQuest("2026-09-02", "user-1", 10);
    expect(a).toEqual(b);
    expect(rollDailyQuest("2026-09-03", "user-1", 10).date).toBe("2026-09-03");
    expect(a.target).toBeGreaterThan(0);
    expect(["cycles", "kcal", "study", "combat"]).toContain(a.kind);
  });

  it("跨日自動換新任務，進度只在種類相符時累加", () => {
    const seeded = ensureDailyQuest(emptyQuest(), "2026-09-02", "user-1", 10);
    const daily = seeded.daily!;
    const wrongKind = daily.kind === "cycles" ? "study" : "cycles";
    expect(advanceDailyQuest(seeded, wrongKind, 99, "2026-09-02").daily!.progress).toBe(0);
    const advanced = advanceDailyQuest(seeded, daily.kind, daily.target, "2026-09-02");
    expect(advanced.daily!.progress).toBe(daily.target);
    expect(isDailyQuestComplete(advanced.daily)).toBe(true);
    const claimed = claimDailyQuest(advanced);
    expect(claimed.reward).toEqual(daily.reward);
    expect(claimDailyQuest(claimed.quest).reward).toBeNull();
    expect(ensureDailyQuest(claimed.quest, "2026-09-03", "user-1", 10).daily!.claimed).toBe(false);
  });
});

describe("雲端合併", () => {
  it("進度較前面的一方勝出，星等取較高者且不回退", () => {
    const local = applyStageDamage(emptyQuest(), 60, { ...standard, cycles: 9 }).quest;
    const remote = applyStageDamage(emptyQuest(), 130, { ...standard, cycles: 6 }).quest;
    const merged = mergeQuests(local, remote);
    expect(merged.stageIndex).toBe(remote.stageIndex);
    expect(merged.cleared["ch1-s1"]!.stars).toBe(3);
    expect(Object.keys(merged.cleared)).toHaveLength(2);
  });
});

describe("大卡換傷害", () => {
  it("推進獵徑 1:1、發動攻擊 1.5:1，套裝加成兩者都吃", () => {
    expect(kcalAttackDamage(20, [], TRAIL_KCAL_RATIO)).toBe(20);
    expect(kcalAttackDamage(30, [], COMBAT_KCAL_RATIO)).toBe(45);
    expect(kcalAttackDamage(30, ["ember-flask", "battle-bracer", "study-satchel"], COMBAT_KCAL_RATIO)).toBe(54);
  });
});
