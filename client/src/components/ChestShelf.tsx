import React from "react";
import { Gift, Lock, Sparkles } from "lucide-react";
import { CHEST_META, pendingChests, type ChestTier, type CollectionState } from "@shared/collection";

const SOURCE_LABEL: Record<string, string> = {
  "legacy-weekly": "舊版週結算",
  "legacy-milestone": "舊版里程碑",
  "legacy-study": "舊版教檢",
  weekly: "每週結算",
  milestone: "循環里程碑",
  study: "教檢連勝",
  daily: "每日支線",
  stage: "關卡掉落",
  chapter: "章節通關",
};

export function ChestShelf({ collection, onOpen }: { collection: CollectionState; onOpen: (chestId: string) => void }) {
  const pending = pendingChests(collection);
  return (
    <div className="chest-shelf">
      <div className="chest-shelf-head">
        <div><p className="eyebrow">CHEST SHELF</p><h3>未開啟的寶箱</h3></div>
        <span className="chest-count"><Gift size={14} /> {pending.length} 個待開・累計開過 {collection.openedCount} 個</span>
      </div>
      {pending.length === 0 ? (
        <div className="history-empty"><Lock size={18} /><p>目前沒有待開寶箱。通過關卡、完成每日支線或週結算都會送上新的箱子。</p></div>
      ) : (
        <div className="chest-grid">
          {pending.map(chest => (
            <button key={chest.id} className={`chest-card ${chest.tier}`} onClick={() => onOpen(chest.id)}>
              <span className="chest-emblem"><Gift size={22} /></span>
              <b>{CHEST_META[chest.tier as ChestTier].label}</b>
              <small>{SOURCE_LABEL[chest.source] ?? chest.source}</small>
              <span className="chest-open-hint"><Sparkles size={11} /> 點擊開啟</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
