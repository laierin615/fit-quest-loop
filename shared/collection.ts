/** 收集系統：戰利品圖鑑、怪物圖鑑、可開啟寶箱與裝備套裝。純資料與純函式，client 與 server 共用。 */
import { seededInt, seededPick, seededValue, seededWeightedPick } from "./rng";

export type Rarity = "common" | "rare" | "epic" | "legendary";
export type Relic = { id: string; name: string; rarity: Rarity; chapter: number; lore: string; from: string };
export type ChestTier = "wood" | "silver" | "gold";
export type Chest = { id: string; tier: ChestTier; source: string; createdAt: string; openedAt?: string };
export type ChestReward = { coins: number; kcal: number; xp: number; relicId: string | null };
export type CollectionState = {
  relics: Record<string, { count: number; firstAt: string }>;
  bestiary: Record<string, { defeats: number; firstAt: string }>;
  chests: Chest[];
  openedCount: number;
  legacyMigrated: boolean;
};

export const RARITY_META: Record<Rarity, { label: string; weight: number; order: number }> = {
  common: { label: "常見", weight: 100, order: 0 },
  rare: { label: "稀有", weight: 42, order: 1 },
  epic: { label: "史詩", weight: 14, order: 2 },
  legendary: { label: "傳說", weight: 4, order: 3 },
};

export const RELICS: Relic[] = [
  { id: "ember-pebble", name: "暖石礫", rarity: "common", chapter: 1, lore: "被谷地日照曬透的小石，握久了還留著溫度。", from: "暖石谷地" },
  { id: "moss-tuft", name: "苔絨簇", rarity: "common", chapter: 1, lore: "從岩縫剝下的一小撮苔，紀錄了濕氣與時間。", from: "暖石谷地" },
  { id: "bark-token", name: "樺皮記號", rarity: "common", chapter: 1, lore: "前人刻在樹皮上的方向記號，仍然可讀。", from: "暖石谷地" },
  { id: "flint-shard", name: "燧石碎片", rarity: "rare", chapter: 1, lore: "敲兩下就有火星，是篝火最原始的答案。", from: "暖石谷地" },
  { id: "hunter-knot", name: "獵人結繩", rarity: "rare", chapter: 1, lore: "一種只有走過長路的人才會綁的結。", from: "暖石谷地" },
  { id: "valley-horn", name: "谷地號角", rarity: "epic", chapter: 1, lore: "吹響時整片谷地都會回應你的位置。", from: "暖石谷地・精英" },
  { id: "mossheart-core", name: "苔心核", rarity: "legendary", chapter: 1, lore: "苔岩巨怪胸腔中仍在搏動的綠色核心。", from: "苔岩巨怪" },
  { id: "ridge-lichen", name: "脊背地衣", rarity: "common", chapter: 2, lore: "只長在稜線迎風面，是高度的證明。", from: "苔痕山脊" },
  { id: "wind-feather", name: "風稜羽", rarity: "common", chapter: 2, lore: "被山脊的風梳過無數次，邊緣已經磨白。", from: "苔痕山脊" },
  { id: "fog-bell", name: "霧鈴", rarity: "rare", chapter: 2, lore: "起霧時掛在腰間，聲音就是回家的線。", from: "苔痕山脊" },
  { id: "stone-compass", name: "石針羅盤", rarity: "rare", chapter: 2, lore: "指針是一根磁石，比任何電子訊號都固執。", from: "苔痕山脊" },
  { id: "guardian-mask", name: "守衛面具", rarity: "epic", chapter: 2, lore: "霧角守衛脫落的面甲，內側有無數道抓痕。", from: "苔痕山脊・精英" },
  { id: "foghorn-crown", name: "霧角冠", rarity: "legendary", chapter: 2, lore: "守衛頭頂的雙角，霧散時會泛出銅色。", from: "霧角守衛" },
  { id: "tide-shell", name: "潮聲貝", rarity: "common", chapter: 3, lore: "貼在耳邊，聽見的其實是你自己的血流。", from: "潮聲洞窟" },
  { id: "salt-crystal", name: "鹽晶", rarity: "common", chapter: 3, lore: "洞壁滲水結成的晶體，鹹得誠實。", from: "潮聲洞窟" },
  { id: "cave-moss", name: "洞窟苔", rarity: "common", chapter: 3, lore: "在幾乎沒有光的地方，它還是選擇長。", from: "潮聲洞窟" },
  { id: "echo-stone", name: "迴聲石", rarity: "rare", chapter: 3, lore: "丟進深處要數到七才會有回音。", from: "潮聲洞窟" },
  { id: "driftwood-charm", name: "漂木護符", rarity: "rare", chapter: 3, lore: "漂了很遠才靠岸，形狀因此變得溫柔。", from: "潮聲洞窟" },
  { id: "tidal-fang", name: "潮汐獠牙", rarity: "epic", chapter: 3, lore: "獵犬換牙時留下的，比石頭還硬。", from: "潮聲洞窟・精英" },
  { id: "abyss-pearl", name: "深淵珍珠", rarity: "legendary", chapter: 3, lore: "在最深的水位線下形成，光碰到它會慢下來。", from: "潮汐獵犬" },
  { id: "cloud-thistle", name: "雲頂薊", rarity: "common", chapter: 4, lore: "在缺氧的高度依然開花的倔強植物。", from: "雲頂關口" },
  { id: "summit-ash", name: "峰頂灰燼", rarity: "common", chapter: 4, lore: "上一個抵達這裡的人留下的火堆殘骸。", from: "雲頂關口" },
  { id: "ridge-talon", name: "稜線利爪", rarity: "rare", chapter: 4, lore: "能扣住垂直岩面的角度，只有牠算得出來。", from: "雲頂關口" },
  { id: "skyglass-shard", name: "天鏡碎片", rarity: "rare", chapter: 4, lore: "薄如冰的礦片，倒映的天空比真的更藍。", from: "雲頂關口" },
  { id: "stormquill", name: "風暴翎筆", rarity: "epic", chapter: 4, lore: "沾上水就能寫字的長羽，寫完自己會乾。", from: "雲頂關口・精英" },
  { id: "skyspine-eye", name: "雲脊之眼", rarity: "legendary", chapter: 4, lore: "巨鷹的瞳孔，據說能看見尚未走過的路。", from: "雲脊巨鷹" },
];

export const RELIC_BY_ID: Record<string, Relic> = Object.fromEntries(RELICS.map(relic => [relic.id, relic]));

export const CHEST_META: Record<ChestTier, { label: string; coins: [number, number]; kcal: number; xp: number; relicChance: number; rarityWeights: Partial<Record<Rarity, number>> }> = {
  wood: { label: "木箱", coins: [15, 30], kcal: 0, xp: 10, relicChance: 0.35, rarityWeights: { common: 80, rare: 20 } },
  silver: { label: "銀箱", coins: [40, 70], kcal: 10, xp: 30, relicChance: 0.6, rarityWeights: { common: 55, rare: 35, epic: 10 } },
  gold: { label: "金箱", coins: [90, 150], kcal: 25, xp: 80, relicChance: 1, rarityWeights: { common: 25, rare: 40, epic: 27, legendary: 8 } },
};

export function emptyCollection(): CollectionState {
  return { relics: {}, bestiary: {}, chests: [], openedCount: 0, legacyMigrated: false };
}

export function relicsByChapter(chapter: number, rarities?: Rarity[]) {
  return RELICS.filter(relic => relic.chapter === chapter && (!rarities || rarities.includes(relic.rarity)));
}

/** 依 seed 從掉落表挑一件；guaranteed 直接保底回傳（BOSS 用）。chance 為 0~1 的掉落機率。 */
export function rollDrop(dropIds: readonly string[], seed: string, chance = 1, guaranteed?: string): string | null {
  if (guaranteed) return guaranteed;
  if (dropIds.length === 0) return null;
  if (chance < 1 && seededValue(`${seed}:gate`) >= chance) return null;
  const pool = dropIds.filter(id => RELIC_BY_ID[id]);
  return seededWeightedPick(pool, id => RARITY_META[RELIC_BY_ID[id]!.rarity].weight, `${seed}:pick`);
}

export function openChest(chest: Chest, seed: string): ChestReward {
  const meta = CHEST_META[chest.tier];
  const coins = seededInt(`${seed}:coins`, meta.coins[0], meta.coins[1]);
  const hasRelic = meta.relicChance >= 1 || seededValue(`${seed}:relic-gate`) < meta.relicChance;
  const rarities = (Object.keys(meta.rarityWeights) as Rarity[]).filter(rarity => (meta.rarityWeights[rarity] ?? 0) > 0);
  const rarity = hasRelic ? seededWeightedPick(rarities, item => meta.rarityWeights[item] ?? 0, `${seed}:rarity`) : null;
  const candidates = rarity ? RELICS.filter(relic => relic.rarity === rarity) : [];
  return { coins, kcal: meta.kcal, xp: meta.xp, relicId: rarity ? seededPick(candidates, `${seed}:relic`)?.id ?? null : null };
}

export function makeChest(tier: ChestTier, source: string, createdAt: string, id?: string): Chest {
  return { id: id ?? `chest-${tier}-${source}-${createdAt}`, tier, source, createdAt };
}

export function recordRelic(collection: CollectionState, relicId: string | null, at: string): CollectionState {
  if (!relicId || !RELIC_BY_ID[relicId]) return collection;
  const existing = collection.relics[relicId];
  return { ...collection, relics: { ...collection.relics, [relicId]: { count: (existing?.count ?? 0) + 1, firstAt: existing?.firstAt ?? at } } };
}

export function recordDefeat(collection: CollectionState, monsterId: string, at: string): CollectionState {
  const existing = collection.bestiary[monsterId];
  return { ...collection, bestiary: { ...collection.bestiary, [monsterId]: { defeats: (existing?.defeats ?? 0) + 1, firstAt: existing?.firstAt ?? at } } };
}

export function addChest(collection: CollectionState, chest: Chest): CollectionState {
  if (collection.chests.some(item => item.id === chest.id)) return collection;
  return { ...collection, chests: [chest, ...collection.chests] };
}

const OPENED_CHEST_HISTORY = 40;

/** 開箱：標記 openedAt、累加開箱數、登錄掉落遺物，並修剪過長的已開啟紀錄。 */
export function applyChestOpening(collection: CollectionState, chestId: string, at: string, seed?: string): { collection: CollectionState; reward: ChestReward | null } {
  const chest = collection.chests.find(item => item.id === chestId && !item.openedAt);
  if (!chest) return { collection, reward: null };
  const reward = openChest(chest, seed ?? `${chest.id}:${chest.createdAt}`);
  const opened = collection.chests.map(item => (item.id === chestId ? { ...item, openedAt: at } : item));
  const pending = opened.filter(item => !item.openedAt);
  const history = opened.filter(item => item.openedAt).slice(0, OPENED_CHEST_HISTORY);
  const next = recordRelic({ ...collection, chests: [...pending, ...history], openedCount: collection.openedCount + 1 }, reward.relicId, at);
  return { collection: next, reward };
}

export function pendingChests(collection: CollectionState) {
  return collection.chests.filter(chest => !chest.openedAt);
}

export function collectedRelicIds(collection: CollectionState) {
  return Object.keys(collection.relics).filter(id => (collection.relics[id]?.count ?? 0) > 0 && RELIC_BY_ID[id]);
}

export type EquipmentSet = { id: string; name: string; pieces: string[]; bonus: string; cycleCoins: number; damageMultiplier: number };

export const EQUIPMENT_SETS: EquipmentSet[] = [
  { id: "trailblazer-set", name: "獵徑三件組", pieces: ["trail-boots", "field-compass", "hunter-charm"], bonus: "每次循環額外 +3 金幣", cycleCoins: 3, damageMultiplier: 0 },
  { id: "battlefield-set", name: "戰場三件組", pieces: ["ember-flask", "battle-bracer", "study-satchel"], bonus: "關卡傷害 +20%", cycleCoins: 0, damageMultiplier: 0.2 },
];

export function activeSets(equipment: readonly string[]) {
  return EQUIPMENT_SETS.filter(set => set.pieces.every(piece => equipment.includes(piece)));
}

export function setCycleCoinBonus(equipment: readonly string[]) {
  return activeSets(equipment).reduce((sum, set) => sum + set.cycleCoins, 0);
}

export function setDamageMultiplier(equipment: readonly string[]) {
  return 1 + activeSets(equipment).reduce((sum, set) => sum + set.damageMultiplier, 0);
}

export function setProgress(equipment: readonly string[]) {
  return EQUIPMENT_SETS.map(set => ({ ...set, owned: set.pieces.filter(piece => equipment.includes(piece)).length, complete: set.pieces.every(piece => equipment.includes(piece)) }));
}

/** 一次性把舊版三個寶箱計數轉成真正的箱子物件；固定 id 前綴 + legacyMigrated 旗標避免重複遷移。 */
export function migrateLegacyChests(collection: CollectionState, counts: { weekly: number; rare: number; study: number }, now: string): CollectionState {
  if (collection.legacyMigrated) return collection;
  const legacy: Chest[] = [
    ...Array.from({ length: Math.max(0, Math.floor(counts.weekly)) }, (_, index) => makeChest("silver", "legacy-weekly", now, `legacy-weekly-${index + 1}`)),
    ...Array.from({ length: Math.max(0, Math.floor(counts.rare)) }, (_, index) => makeChest("gold", "legacy-milestone", now, `legacy-rare-${index + 1}`)),
    ...Array.from({ length: Math.max(0, Math.floor(counts.study)) }, (_, index) => makeChest("wood", "legacy-study", now, `legacy-study-${index + 1}`)),
  ];
  const existingIds = new Set(collection.chests.map(chest => chest.id));
  return { ...collection, legacyMigrated: true, chests: [...legacy.filter(chest => !existingIds.has(chest.id)), ...collection.chests] };
}

export function mergeCollections(local: CollectionState, remote: CollectionState): CollectionState {
  const relicIds = Array.from(new Set([...Object.keys(local.relics), ...Object.keys(remote.relics)]));
  const monsterIds = Array.from(new Set([...Object.keys(local.bestiary), ...Object.keys(remote.bestiary)]));
  const chestMap = new Map<string, Chest>();
  [...remote.chests, ...local.chests].forEach(chest => {
    const existing = chestMap.get(chest.id);
    chestMap.set(chest.id, existing ? { ...existing, openedAt: existing.openedAt ?? chest.openedAt } : chest);
  });
  return {
    relics: Object.fromEntries(relicIds.map(id => {
      const a = local.relics[id];
      const b = remote.relics[id];
      const firstAt = [a?.firstAt, b?.firstAt].filter(Boolean).sort()[0] ?? "";
      return [id, { count: Math.max(a?.count ?? 0, b?.count ?? 0), firstAt }];
    })),
    bestiary: Object.fromEntries(monsterIds.map(id => {
      const a = local.bestiary[id];
      const b = remote.bestiary[id];
      const firstAt = [a?.firstAt, b?.firstAt].filter(Boolean).sort()[0] ?? "";
      return [id, { defeats: Math.max(a?.defeats ?? 0, b?.defeats ?? 0), firstAt }];
    })),
    chests: Array.from(chestMap.values()),
    openedCount: Math.max(local.openedCount, remote.openedCount),
    legacyMigrated: local.legacyMigrated || remote.legacyMigrated,
  };
}
