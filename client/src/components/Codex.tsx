import React, { useState } from "react";
import { Check, Lock, Swords } from "lucide-react";
import { RARITY_META, RELICS, type CollectionState } from "@shared/collection";
import { CHAPTERS, chapterProgress, questTotals, type QuestState } from "@shared/questSystem";
import { ACHIEVEMENT_CATEGORY_LABEL, type AchievementView } from "@shared/achievements";
import { AchievementIcon, STAGE_KIND_META, Stars } from "@/lib/gameIcons";
import { ChestShelf } from "@/components/ChestShelf";

type Segment = "relics" | "bestiary" | "achievements" | "chests" | "chapters";

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: "relics", label: "戰利品" },
  { key: "bestiary", label: "怪物" },
  { key: "achievements", label: "成就" },
  { key: "chests", label: "寶箱" },
  { key: "chapters", label: "章節" },
];

export function Codex({ quest, collection, achievements, onOpenChest }: { quest: QuestState; collection: CollectionState; achievements: AchievementView[]; onOpenChest: (chestId: string) => void }) {
  const [segment, setSegment] = useState<Segment>("relics");
  const relicCount = RELICS.filter(relic => (collection.relics[relic.id]?.count ?? 0) > 0).length;
  const bestiaryEntries = CHAPTERS.flatMap(chapter => chapter.stages.filter(stage => stage.kind === "battle" || stage.kind === "elite" || stage.kind === "boss").map(stage => ({ stage, chapter })));
  const unlockedAchievements = achievements.filter(item => item.unlocked).length;
  const totals = questTotals(quest);
  const counts: Record<Segment, string> = {
    relics: `${relicCount} / ${RELICS.length}`,
    bestiary: `${Object.keys(collection.bestiary).length} / ${bestiaryEntries.length}`,
    achievements: `${unlockedAchievements} / ${achievements.length}`,
    chests: `${collection.chests.filter(chest => !chest.openedAt).length} 待開`,
    chapters: `${totals.totalStars} 星`,
  };

  return (
    <section className="panel codex-panel">
      <div className="panel-heading">
        <div><p className="eyebrow">FIELD CODEX / COLLECTION</p><h3>圖鑑</h3></div>
        <span className="badge-progress">{counts[segment]}</span>
      </div>
      <div className="segment-tabs" role="tablist" aria-label="圖鑑分頁">
        {SEGMENTS.map(item => (
          <button key={item.key} role="tab" aria-selected={segment === item.key} className={segment === item.key ? "selected" : ""} onClick={() => setSegment(item.key)}>{item.label}</button>
        ))}
      </div>

      {segment === "relics" && (
        <div className="relic-grid">
          {RELICS.map(relic => {
            const owned = collection.relics[relic.id];
            const has = (owned?.count ?? 0) > 0;
            return (
              <div className={`relic-card ${has ? "owned" : "locked"}`} data-rarity={relic.rarity} key={relic.id} title={has ? relic.lore : "尚未取得"}>
                <span className="relic-rarity">{RARITY_META[relic.rarity].label}</span>
                <div className="relic-shape" aria-hidden="true" />
                <b>{has ? relic.name : "？？？"}</b>
                <small>{has ? relic.from : `第 ${relic.chapter} 章`}</small>
                {has && owned!.count > 1 && <span className="relic-count">×{owned!.count}</span>}
              </div>
            );
          })}
        </div>
      )}

      {segment === "bestiary" && (
        <div className="bestiary-list">
          {bestiaryEntries.map(({ stage, chapter }) => {
            const record = collection.bestiary[stage.monster];
            return (
              <div className={`bestiary-row ${record ? "known" : "unknown"}`} key={stage.id}>
                <span className={`stage-kind ${STAGE_KIND_META[stage.kind].tone}`}>{STAGE_KIND_META[stage.kind].label}</span>
                <div><b>{record ? stage.monster : "？？？"}</b><small>{chapter.name}・{stage.name}</small></div>
                {record ? <span className="bestiary-meta"><Swords size={12} /> 擊倒 {record.defeats} 次・首次 {record.firstAt.slice(0, 10)}</span> : <span className="bestiary-meta"><Lock size={12} /> 尚未遭遇</span>}
              </div>
            );
          })}
        </div>
      )}

      {segment === "achievements" && (
        <div className="achievement-list">
          {achievements.map(item => (
            <div className={`achievement-row ${item.unlocked ? "unlocked" : ""}`} key={item.id}>
              <div className={`badge-medal ${item.unlocked ? "gold" : ""}`}><AchievementIcon name={item.icon} size={19} /></div>
              <div className="achievement-body">
                <b>{item.name}</b>
                <small>{ACHIEVEMENT_CATEGORY_LABEL[item.category]}・{item.goal}</small>
                <div className="progress-track"><div className="progress-fill" style={{ width: `${Math.min(100, (item.progress / item.target) * 100)}%` }} /></div>
              </div>
              <span className="achievement-state">{item.unlocked ? <><Check size={12} /> 已解鎖</> : `${Math.min(item.progress, item.target)} / ${item.target}`}</span>
            </div>
          ))}
        </div>
      )}

      {segment === "chests" && <ChestShelf collection={collection} onOpen={onOpenChest} />}

      {segment === "chapters" && (
        <div className="chapter-grid">
          {CHAPTERS.map(chapter => {
            const progress = chapterProgress(quest, chapter.chapter);
            return (
              <div className={`chapter-card ${progress.unlocked ? "unlocked" : "locked"}`} key={chapter.chapter}>
                <span className="chapter-number">CH. {String(chapter.chapter).padStart(2, "0")}</span>
                <b>{chapter.name}</b>
                <span className="chapter-monster">{progress.unlocked ? <Swords size={12} /> : <Lock size={12} />} {chapter.stages[6]!.monster}</span>
                <Stars value={Math.round(progress.stars / Math.max(1, progress.total))} />
                <small>{progress.unlocked ? `${progress.cleared} / ${progress.total} 節點・${progress.stars} / ${progress.maxStars} 星` : `通過第 ${chapter.chapter - 1} 章解鎖`}</small>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
