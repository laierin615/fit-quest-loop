import { describe, expect, it } from "vitest";
import { CHEST_META, RELICS, RELIC_BY_ID, activeSets, addChest, applyChestOpening, collectedRelicIds, emptyCollection, makeChest, mergeCollections, migrateLegacyChests, openChest, pendingChests, recordDefeat, recordRelic, rollDrop, setCycleCoinBonus, setDamageMultiplier, setProgress } from "./collection";

const now = "2026-09-02T08:00:00.000Z";

describe("戰利品圖鑑資料", () => {
  it("每章都有常見到傳說的完整梯度，id 不重複", () => {
    expect(new Set(RELICS.map(relic => relic.id)).size).toBe(RELICS.length);
    [1, 2, 3, 4].forEach(chapter => {
      const rarities = new Set(RELICS.filter(relic => relic.chapter === chapter).map(relic => relic.rarity));
      expect(rarities).toEqual(new Set(["common", "rare", "epic", "legendary"]));
    });
  });
});

describe("掉落規則", () => {
  it("同一 seed 掉落結果固定，換 seed 才可能改變", () => {
    const pool = RELICS.filter(relic => relic.chapter === 1 && relic.rarity === "common").map(relic => relic.id);
    expect(rollDrop(pool, "ch1-s1:2026-09-02")).toBe(rollDrop(pool, "ch1-s1:2026-09-02"));
    expect(RELIC_BY_ID[rollDrop(pool, "ch1-s1:2026-09-02")!]).toBeTruthy();
  });

  it("BOSS 以保底掉落指定遺物，機率為 0 時不掉落", () => {
    expect(rollDrop([], "seed", 1, "mossheart-core")).toBe("mossheart-core");
    expect(rollDrop(["ember-pebble"], "seed", 0)).toBeNull();
    expect(rollDrop([], "seed", 1)).toBeNull();
  });
});

describe("寶箱", () => {
  it("開箱結果由 seed 決定，金箱必定掉落遺物", () => {
    const chest = makeChest("gold", "boss", now, "chest-1");
    const first = openChest(chest, "seed-a");
    expect(openChest(chest, "seed-a")).toEqual(first);
    expect(first.relicId).not.toBeNull();
    expect(first.coins).toBeGreaterThanOrEqual(CHEST_META.gold.coins[0]);
    expect(first.coins).toBeLessThanOrEqual(CHEST_META.gold.coins[1]);
  });

  it("開箱只能開一次，會累加開箱數並登錄遺物", () => {
    const collection = addChest(emptyCollection(), makeChest("gold", "boss", now, "chest-1"));
    expect(pendingChests(collection)).toHaveLength(1);
    const opened = applyChestOpening(collection, "chest-1", now);
    expect(opened.reward).not.toBeNull();
    expect(opened.collection.openedCount).toBe(1);
    expect(pendingChests(opened.collection)).toHaveLength(0);
    expect(collectedRelicIds(opened.collection)).toContain(opened.reward!.relicId);
    expect(applyChestOpening(opened.collection, "chest-1", now).reward).toBeNull();
  });

  it("同一個寶箱 id 不會重複加入", () => {
    const chest = makeChest("wood", "daily", now, "chest-dup");
    const once = addChest(emptyCollection(), chest);
    expect(addChest(once, chest).chests).toHaveLength(1);
  });
});

describe("舊資料遷移", () => {
  it("把舊版三種寶箱計數轉成真正的箱子，且只遷移一次", () => {
    const migrated = migrateLegacyChests(emptyCollection(), { weekly: 2, rare: 1, study: 3 }, now);
    expect(migrated.chests).toHaveLength(6);
    expect(migrated.chests.filter(chest => chest.tier === "silver")).toHaveLength(2);
    expect(migrated.chests.filter(chest => chest.tier === "gold")).toHaveLength(1);
    expect(migrated.chests.filter(chest => chest.tier === "wood")).toHaveLength(3);
    expect(migrated.legacyMigrated).toBe(true);
    expect(migrateLegacyChests(migrated, { weekly: 2, rare: 1, study: 3 }, now).chests).toHaveLength(6);
  });
});

describe("裝備套裝", () => {
  it("集滿一套才觸發加成", () => {
    const partial = ["trail-boots", "field-compass"];
    const full = [...partial, "hunter-charm"];
    expect(activeSets(partial)).toHaveLength(0);
    expect(setCycleCoinBonus(partial)).toBe(0);
    expect(setCycleCoinBonus(full)).toBe(3);
    expect(setDamageMultiplier(full)).toBe(1);
    expect(setDamageMultiplier(["ember-flask", "battle-bracer", "study-satchel"])).toBeCloseTo(1.2);
    expect(setProgress(partial)[0]).toMatchObject({ owned: 2, complete: false });
  });
});

describe("雲端合併", () => {
  it("遺物與怪物取較高計數，已開啟的寶箱狀態不會被覆蓋回未開啟", () => {
    const local = recordRelic(emptyCollection(), "ember-pebble", now);
    const remote = recordDefeat(addChest(emptyCollection(), makeChest("wood", "daily", now, "chest-x")), "苔岩巨怪", now);
    const openedLocal = applyChestOpening(addChest(local, makeChest("wood", "daily", now, "chest-x")), "chest-x", now).collection;
    const merged = mergeCollections(openedLocal, remote);
    expect(merged.relics["ember-pebble"]!.count).toBe(1);
    expect(merged.bestiary["苔岩巨怪"]!.defeats).toBe(1);
    expect(merged.chests.find(chest => chest.id === "chest-x")!.openedAt).toBe(now);
    expect(merged.openedCount).toBe(1);
  });
});
