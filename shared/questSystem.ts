/** 關卡系統：長線章節關卡（跨日累積傷害）與每日支線關卡。純函式，client 與 server 共用。 */
import { type ChestTier, relicsByChapter, rollDrop, setDamageMultiplier } from "./collection";
import { seededInt, seededPick } from "./rng";

export type Difficulty = "easy" | "standard" | "hard";
export type StageKind = "battle" | "elite" | "study" | "chest" | "boss";
export type StageDef = { id: string; chapter: number; index: number; kind: StageKind; name: string; monster: string; hp: number; reward: { xp: number; coins: number }; drops: string[]; dropChance: number; guaranteedDrop?: string; chestTier: ChestTier | null };
export type ChapterDef = { chapter: number; name: string; subtitle: string; clearRelic: string; stages: StageDef[] };

export const DIFFICULTY_HP_MULTIPLIER: Record<Difficulty, number> = { easy: 0.7, standard: 1, hard: 1.4 };
export const BASE_CYCLE_DAMAGE = 10;
export const KCAL_PER_DAMAGE = 1;
export const STUDY_ANSWER_DAMAGE = 8;
/** 推進獵徑 1 大卡換 1 傷害；發動攻擊較貴但效率較高。 */
export const TRAIL_KCAL_RATIO = 1;
export const COMBAT_KCAL_RATIO = 1.5;

const STAGE_KINDS: StageKind[] = ["battle", "battle", "study", "elite", "chest", "battle", "boss"];
const KIND_HP_MULTIPLIER: Record<StageKind, number> = { battle: 1, study: 0.8, elite: 1.8, chest: 0.6, boss: 3.2 };
const KIND_DROP_CHANCE: Record<StageKind, number> = { battle: 0.45, study: 0.5, elite: 0.8, chest: 1, boss: 1 };
const KIND_CHEST: Record<StageKind, ChestTier | null> = { battle: null, study: null, elite: "wood", chest: "silver", boss: "gold" };

const CHAPTER_SPECS = [
  { chapter: 1, name: "暖石谷地", subtitle: "起點的篝火與苔痕", baseHp: 60, clearRelic: "mossheart-core",
    names: ["火種哨所", "碎石坡", "舊獵人營", "谷口守望", "藏物洞", "迴音石陣", "苔岩巨怪"],
    monsters: ["苔斑幼獸", "石喙鴉", "教檢殘卷", "苔紋熊", "上鎖的木箱", "迴音蝠群", "苔岩巨怪"] },
  { chapter: 2, name: "苔痕山脊", subtitle: "起霧的稜線與守衛", baseHp: 100, clearRelic: "foghorn-crown",
    names: ["霧線起點", "斷木橋", "苔痕書房", "脊背哨兵", "風化石窖", "雙叉稜線", "霧角守衛"],
    monsters: ["霧斑山羊", "銹角甲蟲", "風化的講義", "脊背哨兵", "風化石窖", "雙頭石獸", "霧角守衛"] },
  { chapter: 3, name: "潮聲洞窟", subtitle: "水位線下的迴音", baseHp: 160, clearRelic: "abyss-pearl",
    names: ["落水口", "鹽晶迴廊", "潮聲書桌", "洞窟守門", "沉船貨艙", "迴音深井", "潮汐獵犬"],
    monsters: ["水蝕蟹", "鹽晶蛞蝓", "泡水的筆記", "洞窟守門人", "沉船貨艙", "深井回聲", "潮汐獵犬"] },
  { chapter: 4, name: "雲頂關口", subtitle: "缺氧高度的最後一段", baseHp: 260, clearRelic: "skyspine-eye",
    names: ["風口台階", "碎雲岩壁", "雲上自習", "關口衛兵", "冰封補給", "最後稜線", "雲脊巨鷹"],
    monsters: ["冰稜狼", "碎雲蜥", "高山題本", "關口衛兵", "冰封補給箱", "稜線疾風", "雲脊巨鷹"] },
] as const;

function stageDrops(chapter: number, kind: StageKind, clearRelic: string) {
  if (kind === "boss") return [clearRelic];
  if (kind === "battle") return relicsByChapter(chapter, ["common"]).map(relic => relic.id);
  if (kind === "study") return relicsByChapter(chapter, ["common", "rare"]).map(relic => relic.id);
  return relicsByChapter(chapter, ["rare", "epic"]).map(relic => relic.id);
}

export const CHAPTERS: ChapterDef[] = CHAPTER_SPECS.map(spec => ({
  chapter: spec.chapter,
  name: spec.name,
  subtitle: spec.subtitle,
  clearRelic: spec.clearRelic,
  stages: STAGE_KINDS.map((kind, index) => {
    const hp = Math.round((spec.baseHp * KIND_HP_MULTIPLIER[kind]) / 2) * 2;
    return {
      id: `ch${spec.chapter}-s${index + 1}`,
      chapter: spec.chapter,
      index,
      kind,
      name: spec.names[index]!,
      monster: spec.monsters[index]!,
      hp,
      reward: { xp: Math.round(hp / 4), coins: Math.round(hp / 5) },
      drops: stageDrops(spec.chapter, kind, spec.clearRelic),
      dropChance: KIND_DROP_CHANCE[kind],
      guaranteedDrop: kind === "boss" ? spec.clearRelic : undefined,
      chestTier: KIND_CHEST[kind],
    };
  }),
}));

export const ALL_STAGES: StageDef[] = CHAPTERS.flatMap(chapter => chapter.stages);
export const STAGE_BY_ID: Record<string, StageDef> = Object.fromEntries(ALL_STAGES.map(stage => [stage.id, stage]));
export const LAST_CHAPTER = CHAPTERS[CHAPTERS.length - 1]!.chapter;

export type DailyQuestKind = "cycles" | "kcal" | "study" | "combat";
export type DailyQuest = { date: string; id: string; kind: DailyQuestKind; title: string; hint: string; target: number; progress: number; claimed: boolean; reward: { coins: number; xp: number; chest: ChestTier } };
export type StageClearRecord = { stars: 1 | 2 | 3; clearedAt: string; cycles: number };
export type QuestState = { chapter: number; stageIndex: number; damage: number; cycles: number; cleared: Record<string, StageClearRecord>; daily: DailyQuest | null };

export function emptyQuest(): QuestState {
  return { chapter: 1, stageIndex: 0, damage: 0, cycles: 0, cleared: {}, daily: null };
}

export function chapterAt(chapter: number) {
  return CHAPTERS.find(item => item.chapter === chapter) ?? null;
}

export function currentStage(quest: QuestState): StageDef | null {
  return chapterAt(quest.chapter)?.stages[quest.stageIndex] ?? null;
}

export function allStagesCleared(quest: QuestState) {
  return currentStage(quest) === null;
}

export function stageHp(stage: StageDef, difficulty: Difficulty) {
  return Math.max(10, Math.round(stage.hp * (DIFFICULTY_HP_MULTIPLIER[difficulty] ?? 1)));
}

/** 每次循環對關卡造成的傷害，含裝備套裝加成。 */
export function damagePerCycle(equipment: readonly string[]) {
  return Math.max(1, Math.round(BASE_CYCLE_DAMAGE * setDamageMultiplier(equipment)));
}

/** 花費大卡換算成關卡傷害，同樣吃套裝加成。ratio 區分推進獵徑與發動攻擊的效率。 */
export function kcalAttackDamage(kcal: number, equipment: readonly string[], ratio = KCAL_PER_DAMAGE) {
  return Math.max(0, Math.round(Math.max(0, kcal) * ratio * setDamageMultiplier(equipment)));
}

/** 3★：不超過理論所需循環數；2★：不超過 1.5 倍；其餘 1★。用大卡攻擊可壓低循環數換高星等。 */
export function stageStars(stage: StageDef, difficulty: Difficulty, cyclesSpent: number, perCycleDamage = BASE_CYCLE_DAMAGE): 1 | 2 | 3 {
  const baseline = Math.max(1, Math.ceil(stageHp(stage, difficulty) / Math.max(1, perCycleDamage)));
  if (cyclesSpent <= baseline) return 3;
  if (cyclesSpent <= Math.ceil(baseline * 1.5)) return 2;
  return 1;
}

export type StageClear = { stage: StageDef; stars: 1 | 2 | 3; cycles: number; rewards: { xp: number; coins: number }; relicId: string | null; chestTier: ChestTier | null; chapterCleared: boolean; chapterName: string };
export type DamageContext = { difficulty: Difficulty; equipment: readonly string[]; at: string; cycles?: number; perCycleDamage?: number };

/** 對當前節點造成傷害；擊倒後溢出傷害自動帶往下一節點，可連鎖過關。 */
export function applyStageDamage(quest: QuestState, amount: number, ctx: DamageContext): { quest: QuestState; clears: StageClear[] } {
  const clears: StageClear[] = [];
  let next: QuestState = { ...quest, cleared: { ...quest.cleared } };
  let remaining = Math.max(0, Math.floor(amount));
  let pendingCycles = Math.max(0, Math.floor(ctx.cycles ?? 0));
  let guard = 0;
  while (remaining > 0 && guard < ALL_STAGES.length + 1) {
    guard += 1;
    const stage = currentStage(next);
    if (!stage) break;
    const hp = stageHp(stage, ctx.difficulty);
    const missing = hp - next.damage;
    if (remaining < missing) {
      next = { ...next, damage: next.damage + remaining, cycles: next.cycles + pendingCycles };
      remaining = 0;
      break;
    }
    const cyclesSpent = next.cycles + pendingCycles;
    const stars = stageStars(stage, ctx.difficulty, Math.max(1, cyclesSpent), ctx.perCycleDamage ?? BASE_CYCLE_DAMAGE);
    const chapter = chapterAt(stage.chapter);
    const relicId = rollDrop(stage.drops, `${stage.id}:${ctx.at.slice(0, 10)}`, stage.dropChance, stage.guaranteedDrop);
    const isChapterEnd = stage.index === (chapter?.stages.length ?? 0) - 1;
    clears.push({ stage, stars, cycles: Math.max(1, cyclesSpent), rewards: stage.reward, relicId, chestTier: stage.chestTier, chapterCleared: isChapterEnd, chapterName: chapter?.name ?? "" });
    next = {
      ...next,
      cleared: { ...next.cleared, [stage.id]: { stars, clearedAt: ctx.at, cycles: Math.max(1, cyclesSpent) } },
      chapter: isChapterEnd ? stage.chapter + 1 : stage.chapter,
      stageIndex: isChapterEnd ? 0 : stage.index + 1,
      damage: 0,
      cycles: 0,
    };
    remaining -= missing;
    pendingCycles = 0;
  }
  return { quest: next, clears };
}

/** 撤銷用：只回退尚未過關的傷害；已過關的節點與已發放的獎勵不收回。 */
export function revertStageDamage(quest: QuestState, amount: number, cycles = 1): { quest: QuestState; reverted: boolean } {
  const value = Math.max(0, Math.floor(amount));
  if (value === 0 || quest.damage < value) return { quest, reverted: false };
  return { quest: { ...quest, damage: quest.damage - value, cycles: Math.max(0, quest.cycles - Math.max(0, Math.floor(cycles))) }, reverted: true };
}

export function questTotals(quest: QuestState) {
  const clearedIds = Object.keys(quest.cleared);
  return {
    clearedStages: clearedIds.length,
    bossesDefeated: clearedIds.filter(id => STAGE_BY_ID[id]?.kind === "boss").length,
    threeStarStages: clearedIds.filter(id => quest.cleared[id]?.stars === 3).length,
    totalStars: clearedIds.reduce((sum, id) => sum + (quest.cleared[id]?.stars ?? 0), 0),
  };
}

export function chapterProgress(quest: QuestState, chapter: number) {
  const def = chapterAt(chapter);
  if (!def) return { cleared: 0, total: 0, stars: 0, maxStars: 0, unlocked: false, complete: false };
  const cleared = def.stages.filter(stage => quest.cleared[stage.id]).length;
  const stars = def.stages.reduce((sum, stage) => sum + (quest.cleared[stage.id]?.stars ?? 0), 0);
  return { cleared, total: def.stages.length, stars, maxStars: def.stages.length * 3, unlocked: isChapterUnlocked(quest, chapter), complete: cleared === def.stages.length };
}

export function isChapterUnlocked(quest: QuestState, chapter: number) {
  if (chapter <= 1) return true;
  const previous = chapterAt(chapter - 1);
  return Boolean(previous && previous.stages.every(stage => quest.cleared[stage.id]));
}

const DAILY_QUEST_KINDS: DailyQuestKind[] = ["cycles", "kcal", "study", "combat"];
const DAILY_CHEST_POOL: ChestTier[] = ["wood", "wood", "silver"];

export function rollDailyQuest(dateKey: string, salt: string, dailyGoal: number): DailyQuest {
  const seed = `${dateKey}:${salt}`;
  const kind = seededPick(DAILY_QUEST_KINDS, `${seed}:kind`) ?? "cycles";
  const target =
    kind === "cycles" ? Math.max(3, Math.ceil(dailyGoal * 0.6))
    : kind === "kcal" ? seededInt(`${seed}:target`, 9, 15) * 10
    : kind === "study" ? seededInt(`${seed}:target`, 3, 5)
    : seededInt(`${seed}:target`, 4, 10) * 10;
  const title =
    kind === "cycles" ? `完成 ${target} 次循環`
    : kind === "kcal" ? `今日燃燒 ${target} 大卡`
    : kind === "study" ? `教檢答對 ${target} 題`
    : `對關卡造成 ${target} 點傷害`;
  const hint =
    kind === "cycles" ? "沿著獵徑走完今天該走的那幾步。"
    : kind === "kcal" ? "把身體暖起來，數字自然會累積。"
    : kind === "study" ? "順手把幾題教檢帶過，知識也是裝備。"
    : "用循環或大卡都算數，讓當前節點掉一段血。";
  return { date: dateKey, id: `daily-${dateKey}`, kind, title, hint, target, progress: 0, claimed: false, reward: { coins: seededInt(`${seed}:coins`, 20, 45), xp: 25, chest: seededPick(DAILY_CHEST_POOL, `${seed}:chest`) ?? "wood" } };
}

export function ensureDailyQuest(quest: QuestState, dateKey: string, salt: string, dailyGoal: number): QuestState {
  if (quest.daily && quest.daily.date === dateKey) return quest;
  return { ...quest, daily: rollDailyQuest(dateKey, salt, dailyGoal) };
}

export function advanceDailyQuest(quest: QuestState, kind: DailyQuestKind, amount: number, dateKey: string): QuestState {
  const daily = quest.daily;
  if (!daily || daily.date !== dateKey || daily.kind !== kind || daily.claimed) return quest;
  const progress = Math.min(daily.target, daily.progress + Math.max(0, Math.floor(amount)));
  if (progress === daily.progress) return quest;
  return { ...quest, daily: { ...daily, progress } };
}

export function isDailyQuestComplete(daily: DailyQuest | null) {
  return Boolean(daily && daily.progress >= daily.target);
}

export function claimDailyQuest(quest: QuestState): { quest: QuestState; reward: DailyQuest["reward"] | null } {
  const daily = quest.daily;
  if (!daily || daily.claimed || !isDailyQuestComplete(daily)) return { quest, reward: null };
  return { quest: { ...quest, daily: { ...daily, claimed: true } }, reward: daily.reward };
}

export function mergeQuests(local: QuestState, remote: QuestState): QuestState {
  const ids = Array.from(new Set([...Object.keys(local.cleared), ...Object.keys(remote.cleared)]));
  const cleared: Record<string, StageClearRecord> = Object.fromEntries(ids.map(id => {
    const a = local.cleared[id];
    const b = remote.cleared[id];
    const best = (a?.stars ?? 0) >= (b?.stars ?? 0) ? a ?? b! : b ?? a!;
    return [id, { ...best, stars: Math.max(a?.stars ?? 0, b?.stars ?? 0) as 1 | 2 | 3 }];
  }));
  const ahead = remote.chapter > local.chapter || (remote.chapter === local.chapter && remote.stageIndex > local.stageIndex);
  const leader = ahead ? remote : local;
  const samePosition = local.chapter === remote.chapter && local.stageIndex === remote.stageIndex;
  return {
    chapter: leader.chapter,
    stageIndex: leader.stageIndex,
    damage: samePosition ? Math.max(local.damage, remote.damage) : leader.damage,
    cycles: samePosition ? Math.max(local.cycles, remote.cycles) : leader.cycles,
    cleared,
    daily: local.daily ?? remote.daily,
  };
}
