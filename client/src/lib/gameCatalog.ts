export type Equipment = { id: string; name: string; cost: number; bonus: string };

export const EQUIPMENT_CATALOG: Equipment[] = [
  { id: "trail-boots", name: "獵徑靴", cost: 120, bonus: "推進獵徑時少花 5 大卡" },
  { id: "ember-flask", name: "篝火水壺", cost: 240, bonus: "每次完成循環多存 5 大卡" },
  { id: "field-compass", name: "田野羅盤", cost: 420, bonus: "每週結算額外 +50 XP" },
  { id: "hunter-charm", name: "獵人護符", cost: 180, bonus: "每次循環額外 +4 金幣" },
  { id: "battle-bracer", name: "戰鬥護腕", cost: 260, bonus: "打怪攻擊少花 8 大卡" },
  { id: "study-satchel", name: "教檢書袋", cost: 300, bonus: "教檢答對額外 +5 金幣" },
];

export const EQUIPMENT_BY_ID: Record<string, Equipment> = Object.fromEntries(EQUIPMENT_CATALOG.map(item => [item.id, item]));
