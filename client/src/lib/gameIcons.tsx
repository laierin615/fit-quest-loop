import React from "react";
import { Backpack, BookOpen, Flame, Footprints, Gem, Gift, Map, Medal, Moon, Shield, Sparkles, Swords, Target, Trophy, Zap } from "lucide-react";
import type { Rarity } from "@shared/collection";
import type { StageKind } from "@shared/questSystem";

const ACHIEVEMENT_ICONS: Record<string, typeof Flame> = { flame: Flame, target: Target, footprints: Footprints, map: Map, medal: Medal, moon: Moon, swords: Swords, sparkles: Sparkles, trophy: Trophy, "book-open": BookOpen, zap: Zap, gem: Gem, shield: Shield, gift: Gift, backpack: Backpack };

export function AchievementIcon({ name, size = 22 }: { name: string; size?: number }) {
  const Icon = ACHIEVEMENT_ICONS[name] ?? Trophy;
  return <Icon size={size} />;
}

export const STAGE_KIND_META: Record<StageKind, { label: string; tone: string }> = {
  battle: { label: "遭遇", tone: "red" },
  elite: { label: "精英", tone: "gold" },
  study: { label: "知識關", tone: "green" },
  chest: { label: "藏寶", tone: "gold" },
  boss: { label: "首領", tone: "red" },
};

export const RARITY_TONE: Record<Rarity, string> = { common: "common", rare: "rare", epic: "epic", legendary: "legendary" };

export function Stars({ value, size = 11 }: { value: number; size?: number }) {
  return (
    <span className="stage-stars" aria-label={`${value} 星`}>
      {[1, 2, 3].map(index => <Sparkles key={index} size={size} className={index <= value ? "on" : ""} />)}
    </span>
  );
}
