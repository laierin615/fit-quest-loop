/** 成就單一資料源：條件、進度與解鎖判定全部集中在這裡，畫面只負責渲染。 */
import { RELICS, activeSets, collectedRelicIds, type CollectionState } from "./collection";
import { questTotals, type QuestState } from "./questSystem";

export type AchievementCategory = "journey" | "combat" | "study" | "collection" | "streak";
export type AchievementInput = {
  totalCount: number;
  todayCount: number;
  dailyGoal: number;
  streak: number;
  kcalTotal: number;
  study: { solved: number; correct: number; bestStreak: number };
  quest: QuestState;
  collection: CollectionState;
  equipment: readonly string[];
};
export type AchievementDef = { id: string; name: string; goal: string; category: AchievementCategory; icon: string; target: (input: AchievementInput) => number; measure: (input: AchievementInput) => number };
export type AchievementView = { id: string; name: string; goal: string; category: AchievementCategory; icon: string; progress: number; target: number; unlocked: boolean };

export const ACHIEVEMENT_CATEGORY_LABEL: Record<AchievementCategory, string> = {
  journey: "旅程",
  combat: "戰鬥",
  study: "教檢",
  collection: "收集",
  streak: "連續",
};

const fixed = (value: number) => () => value;

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first_step", name: "第一枚火種", goal: "完成 1 次循環", category: "journey", icon: "flame", target: fixed(1), measure: input => input.totalCount },
  { id: "daily_trail", name: "每日獵徑", goal: "單日完成每日目標", category: "journey", icon: "target", target: input => Math.max(1, input.dailyGoal), measure: input => input.todayCount },
  { id: "long_walk", name: "長路旅人", goal: "累積 100 次循環", category: "journey", icon: "footprints", target: fixed(100), measure: input => input.totalCount },
  { id: "trail_marathon", name: "千里獵徑", goal: "累積 365 次循環", category: "journey", icon: "map", target: fixed(365), measure: input => input.totalCount },
  { id: "steady_pulse", name: "穩定脈搏", goal: "連續 7 日", category: "streak", icon: "medal", target: fixed(7), measure: input => input.streak },
  { id: "moon_walker", name: "月行者", goal: "連續 30 日", category: "streak", icon: "moon", target: fixed(30), measure: input => input.streak },
  { id: "warmstone_burner", name: "暖石燃燒者", goal: "累積 3,000 大卡", category: "journey", icon: "flame", target: fixed(3000), measure: input => input.kcalTotal },
  { id: "ember_furnace", name: "篝火熔爐", goal: "累積 10,000 大卡", category: "journey", icon: "flame", target: fixed(10000), measure: input => input.kcalTotal },
  { id: "valley_hunter", name: "谷地獵人", goal: "通過 10 個關卡節點", category: "combat", icon: "swords", target: fixed(10), measure: input => questTotals(input.quest).clearedStages },
  { id: "stage_veteran", name: "全線踏破", goal: "通過全部 28 個節點", category: "combat", icon: "map", target: fixed(28), measure: input => questTotals(input.quest).clearedStages },
  { id: "boss_slayer", name: "首領終結者", goal: "擊倒 4 隻章節首領", category: "combat", icon: "swords", target: fixed(4), measure: input => questTotals(input.quest).bossesDefeated },
  { id: "flawless_tracker", name: "無瑕獵手", goal: "以三星通過 5 個節點", category: "combat", icon: "sparkles", target: fixed(5), measure: input => questTotals(input.quest).threeStarStages },
  { id: "chapter_one_clear", name: "暖石谷地通關", goal: "完成第一章全部節點", category: "combat", icon: "trophy", target: fixed(7), measure: input => Object.keys(input.quest.cleared).filter(id => id.startsWith("ch1-")).length },
  { id: "study_scholar", name: "教檢苦讀生", goal: "教檢答對 50 題", category: "study", icon: "book-open", target: fixed(50), measure: input => input.study.correct },
  { id: "study_streak", name: "連勝十題", goal: "教檢最佳連勝 10 題", category: "study", icon: "zap", target: fixed(10), measure: input => input.study.bestStreak },
  { id: "relic_novice", name: "初次收藏", goal: "收集 5 件戰利品", category: "collection", icon: "gem", target: fixed(5), measure: input => collectedRelicIds(input.collection).length },
  { id: "relic_curator", name: "圖鑑管理員", goal: "收集 15 件戰利品", category: "collection", icon: "gem", target: fixed(15), measure: input => collectedRelicIds(input.collection).length },
  { id: "relic_master", name: "圖鑑全收", goal: `收集全部 ${RELICS.length} 件戰利品`, category: "collection", icon: "trophy", target: fixed(RELICS.length), measure: input => collectedRelicIds(input.collection).length },
  { id: "bestiary_keeper", name: "怪物編纂者", goal: "圖鑑登錄 10 種怪物", category: "collection", icon: "shield", target: fixed(10), measure: input => Object.keys(input.collection.bestiary).length },
  { id: "chest_breaker", name: "開箱老手", goal: "開啟 20 個寶箱", category: "collection", icon: "gift", target: fixed(20), measure: input => input.collection.openedCount },
  { id: "set_collector", name: "成套裝備", goal: "集齊任一套裝", category: "collection", icon: "backpack", target: fixed(1), measure: input => activeSets(input.equipment).length },
];

export function evaluateAchievements(input: AchievementInput): AchievementView[] {
  return ACHIEVEMENTS.map(definition => {
    const target = Math.max(1, definition.target(input));
    const progress = Math.max(0, definition.measure(input));
    return { id: definition.id, name: definition.name, goal: definition.goal, category: definition.category, icon: definition.icon, progress, target, unlocked: progress >= target };
  });
}

export function unlockedAchievementIds(input: AchievementInput) {
  return evaluateAchievements(input).filter(item => item.unlocked).map(item => item.id);
}
