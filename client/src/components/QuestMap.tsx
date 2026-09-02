import React, { useState } from "react";
import { Backpack, Check, Coins, Flame, Footprints, Gift, Lock, Map, Sparkles, Swords, Target } from "lucide-react";
import { RELIC_BY_ID, setProgress, type CollectionState } from "@shared/collection";
import { CHAPTERS, COMBAT_KCAL_RATIO, TRAIL_KCAL_RATIO, chapterProgress, currentStage, damagePerCycle, isChapterUnlocked, isDailyQuestComplete, kcalAttackDamage, stageHp, type Difficulty, type QuestState, type StageDef } from "@shared/questSystem";
import { EQUIPMENT_CATALOG, type Equipment } from "@/lib/gameCatalog";
import { mapUrl, monsterUrl } from "@/lib/gameAssets";
import { STAGE_KIND_META, Stars } from "@/lib/gameIcons";

type Props = {
  quest: QuestState;
  collection: CollectionState;
  difficulty: Difficulty;
  equipment: string[];
  kcalBalance: number;
  coins: number;
  trailCost: number;
  combatCost: number;
  onSpend: (kind: "trail" | "combat", amount: number) => void;
  onBuy: (item: Equipment) => void;
  onClaimDaily: () => void;
};

function nodePosition(index: number, total: number) {
  const left = total <= 1 ? 50 : 9 + index * (82 / (total - 1));
  const top = 69 - Math.sin(index * 0.85) * 18 - (index > 6 ? (index - 6) * 2 : 0);
  return { left: `${left}%`, top: `${top}%` };
}

function StageNode({ stage, state, stars }: { stage: StageDef; state: "cleared" | "current" | "locked"; stars: number }) {
  return (
    <div className={`map-node stage-node ${state}`} style={nodePosition(stage.index, 7)} title={`${stage.name}・${STAGE_KIND_META[stage.kind].label}`}>
      <span>{state === "cleared" ? <Check size={12} /> : stage.kind === "boss" ? <Swords size={12} /> : stage.index + 1}</span>
      {state === "cleared" && stars > 0 && <Stars value={stars} size={8} />}
    </div>
  );
}

export function QuestMapScreen({ quest, collection, difficulty, equipment, kcalBalance, coins, trailCost, combatCost, onSpend, onBuy, onClaimDaily }: Props) {
  const [viewChapter, setViewChapter] = useState(quest.chapter);
  const chapter = CHAPTERS.find(item => item.chapter === viewChapter) ?? CHAPTERS[0]!;
  const unlocked = isChapterUnlocked(quest, chapter.chapter);
  const progress = chapterProgress(quest, chapter.chapter);
  const stage = currentStage(quest);
  const isViewingActive = stage?.chapter === chapter.chapter;
  const hp = stage ? stageHp(stage, difficulty) : 0;
  const remaining = stage ? Math.max(0, hp - quest.damage) : 0;
  const perCycle = damagePerCycle(equipment);
  const trailDamage = kcalAttackDamage(trailCost, equipment, TRAIL_KCAL_RATIO);
  const combatDamage = kcalAttackDamage(combatCost, equipment, COMBAT_KCAL_RATIO);
  const daily = quest.daily;
  const dailyReady = isDailyQuestComplete(daily) && !daily?.claimed;
  const sets = setProgress(equipment);

  return (
    <>
      <section className="page-intro compact">
        <div>
          <p className="eyebrow">ADVENTURE MAP / CHAPTER {String(chapter.chapter).padStart(2, "0")}</p>
          <h1>{stage ? "下一個節點在等你。" : "全部章節已經走完。"}</h1>
          <p className="intro-copy">{stage ? `節點進度不會跨日歸零。打倒 ${stage.monster}，獵徑才會往前一格。` : "28 個節點全數點亮，這條獵徑已經完整屬於你。"}</p>
        </div>
        <div className="chapter-badge"><span>CH.</span><b>{String(chapter.chapter).padStart(2, "0")}</b></div>
      </section>

      <div className="chapter-tabs" role="tablist" aria-label="章節切換">
        {CHAPTERS.map(item => {
          const open = isChapterUnlocked(quest, item.chapter);
          const stats = chapterProgress(quest, item.chapter);
          return (
            <button key={item.chapter} role="tab" aria-selected={viewChapter === item.chapter} className={`${viewChapter === item.chapter ? "selected" : ""} ${open ? "" : "locked"}`} onClick={() => setViewChapter(item.chapter)}>
              {open ? <Map size={13} /> : <Lock size={13} />}
              <b>{item.name}</b>
              <small>{stats.cleared} / {stats.total}</small>
            </button>
          );
        })}
      </div>

      <section className="map-card" style={{ backgroundImage: `url(${mapUrl})` }}>
        <div className="map-wash" />
        <div className="map-title">
          <span className="quest-tag"><Map size={13} /> {chapter.subtitle}</span>
          <h2>{chapter.name}</h2>
          <p>{unlocked ? `本章 ${progress.total} 個節點・已取得 ${progress.stars} / ${progress.maxStars} 星` : `通過第 ${chapter.chapter - 1} 章全部節點後解鎖`}</p>
        </div>
        <div className="map-route">
          {chapter.stages.map(item => {
            const record = quest.cleared[item.id];
            const state = record ? "cleared" : stage?.id === item.id ? "current" : "locked";
            return <StageNode key={item.id} stage={item} state={state} stars={record?.stars ?? 0} />;
          })}
          <svg className="route-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M 9 69 C 18 55, 20 75, 27 59 S 38 79, 45 53 S 57 67, 63 54 S 75 35, 82 44 S 92 65, 91 37" /></svg>
        </div>
        <div className="map-caption"><div><span>本章進度</span><b>{progress.cleared} / {progress.total}</b></div><div className="progress-track"><div className="progress-fill" style={{ width: `${(progress.cleared / progress.total) * 100}%` }} /></div></div>
      </section>

      {stage && isViewingActive ? (
        <section className="panel stage-card">
          <div className="panel-heading">
            <div><p className="eyebrow">CURRENT NODE / {String(stage.index + 1).padStart(2, "0")} OF 07</p><h3>{stage.name}</h3></div>
            <span className={`stage-kind ${STAGE_KIND_META[stage.kind].tone}`}>{STAGE_KIND_META[stage.kind].label}</span>
          </div>
          <div className="stage-body">
            <div className="stage-monster"><img src={monsterUrl} alt={stage.monster} /><b>{stage.monster}</b></div>
            <div className="stage-stats">
              <div className="stage-hp-row"><span>剩餘生命</span><b>{remaining} <small>/ {hp}</small></b></div>
              <div className="hp-track"><span style={{ width: `${(remaining / Math.max(1, hp)) * 100}%` }} /></div>
              <div className="stage-hints">
                <span><Swords size={12} /> 每次循環 −{perCycle}</span>
                <span><Target size={12} /> 三星需 {Math.ceil(hp / perCycle)} 次內</span>
                <span><Flame size={12} /> 已投入 {quest.cycles} 次循環</span>
              </div>
              <div className="stage-drops">
                <p className="eyebrow">POSSIBLE DROPS</p>
                <div className="stage-drop-list">
                  {stage.drops.map(id => {
                    const relic = RELIC_BY_ID[id];
                    const owned = (collection.relics[id]?.count ?? 0) > 0;
                    return relic ? <span key={id} className={`drop-chip ${relic.rarity} ${owned ? "owned" : ""}`}>{owned ? relic.name : "？？？"}</span> : null;
                  })}
                  {stage.chestTier && <span className="drop-chip chest"><Gift size={11} /> 過關掉落{stage.chestTier === "gold" ? "金箱" : stage.chestTier === "silver" ? "銀箱" : "木箱"}</span>}
                </div>
              </div>
            </div>
          </div>
          <div className="economy-actions">
            <button onClick={() => onSpend("trail", trailCost)} disabled={kcalBalance < trailCost}><Footprints size={17} /><span><b>推進獵徑</b><small>消耗 {trailCost} 大卡，造成 {trailDamage} 傷害</small></span><strong>−{trailCost}</strong></button>
            <button onClick={() => onSpend("combat", combatCost)} disabled={kcalBalance < combatCost}><Swords size={17} /><span><b>發動攻擊</b><small>消耗 {combatCost} 大卡，造成 {combatDamage} 傷害</small></span><strong>−{combatCost}</strong></button>
          </div>
          <p className="panel-note"><Sparkles size={14} /> 用大卡加速可以壓低耗用循環數，換到更高的星等評價。</p>
        </section>
      ) : (
        <section className="panel stage-card empty">
          <div className="panel-heading"><div><p className="eyebrow">CHAPTER OVERVIEW</p><h3>{unlocked ? "本章節點一覽" : "尚未解鎖"}</h3></div></div>
          <div className="stage-list">
            {chapter.stages.map(item => {
              const record = quest.cleared[item.id];
              return (
                <div className={`stage-row ${record ? "cleared" : ""}`} key={item.id}>
                  <span className={`stage-kind ${STAGE_KIND_META[item.kind].tone}`}>{STAGE_KIND_META[item.kind].label}</span>
                  <b>{item.name}</b>
                  <small>{item.monster}</small>
                  {record ? <Stars value={record.stars} /> : <Lock size={13} />}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {daily && (
        <section className={`panel daily-quest-card ${dailyReady ? "ready" : ""} ${daily.claimed ? "claimed" : ""}`}>
          <div className="panel-heading"><div><p className="eyebrow">DAILY SIDE QUEST / {daily.date}</p><h3>{daily.title}</h3></div><Target size={20} className="heading-icon" /></div>
          <p className="daily-hint">{daily.hint}</p>
          <div className="daily-progress"><div className="progress-track"><div className="progress-fill" style={{ width: `${Math.min(100, (daily.progress / Math.max(1, daily.target)) * 100)}%` }} /></div><b>{daily.progress} / {daily.target}</b></div>
          <div className="daily-foot">
            <div className="daily-reward"><span><Coins size={12} /> +{daily.reward.coins} 金幣</span><span><Sparkles size={12} /> +{daily.reward.xp} XP</span><span><Gift size={12} /> {daily.reward.chest === "gold" ? "金箱" : daily.reward.chest === "silver" ? "銀箱" : "木箱"} ×1</span></div>
            <button onClick={onClaimDaily} disabled={!dailyReady}>{daily.claimed ? "今日已領取" : dailyReady ? "領取獎勵" : "尚未達標"}</button>
          </div>
        </section>
      )}

      <section className="panel economy-panel">
        <div className="panel-heading"><div><p className="eyebrow">FIELD GEAR SHOP / COIN MARKET</p><h3>把金幣換成長期加成</h3></div><span className="wallet-badge"><Flame size={14} /> {kcalBalance} 大卡・<Coins size={14} /> {coins} 金幣</span></div>
        <div className="set-progress">
          {sets.map(set => (
            <div className={`set-row ${set.complete ? "complete" : ""}`} key={set.id}>
              <div><b>{set.name}</b><small>{set.bonus}</small></div>
              <span>{set.owned} / {set.pieces.length}{set.complete && <Check size={13} />}</span>
            </div>
          ))}
        </div>
        <div className="equipment-shop">
          {EQUIPMENT_CATALOG.map(item => (
            <button key={item.id} className={equipment.includes(item.id) ? "owned" : ""} onClick={() => onBuy(item)} disabled={equipment.includes(item.id) || coins < item.cost}>
              <span><Backpack size={15} /><b>{item.name}</b><small>{item.bonus}</small></span>
              <strong>{equipment.includes(item.id) ? "已裝備" : `${item.cost} 金幣`}</strong>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
