/*
 * Style reminder: 原野獵徑 neo-folk adventure。以 Signal Orange 篝火橘、炭黑、沙岩米白、苔蘚綠與黃銅金建立戶外手冊感；用不對稱任務版面、獵徑節點、篝火行動鈕與怪物圖鑑創造可見的累積感。文字採 Bree Serif + Noto Sans TC，互動短促、明確、可回溯。
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { isCloudEnabled, startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { applyStudyAnswer, buildJourneySyncPayload, canPurchaseEquipment, coinBalanceFromLedger, combatActionCost, cycleRewards, dailyMilestoneEvent, legacyCoinOpeningBalance, legacyCoinOpeningTransaction, mergeTransactionLedgers, remoteLegacyCoinOpeningAmount, removeCycleFromLedger, resourceBalanceFromLedger, routeActionCost, shouldResetDaily, studyCoinReward, weeklyRewardFromProgress } from "@shared/gameRules";
import { TEACHER_QUESTIONS, TEACHER_SUBJECTS, questionsBySubject, type TeacherQuestion, type TeacherSubject } from "@shared/teacherQuestions";
import { EXAM_FORMAT_NOTES, EXAM_SCOPE, EXAM_SCOPE_SOURCE, EXAM_SCOPE_URL, scopeFor } from "@shared/examScope";
import { STUDY_NOTES, STUDY_NOTES_ORIGIN, notePointCount, notesBySubject } from "@shared/studyNotes";
import { EXAM_DATE_LABEL, EXAM_NAME, EXAM_OFFICIAL_URL, EXAM_PASS_RULES, EXAM_PAST_PAPER_URL, EXAM_SUBJECTS, EXAM_YEAR_LABEL, dailyQuestionPace, examCountdown } from "@shared/examInfo";
import { gradeTeacherQuestion, nextQuestionIndex } from "@shared/studyFlow";
import { CHEST_META, RELIC_BY_ID, addChest, applyChestOpening, emptyCollection, makeChest, mergeCollections, migrateLegacyChests, recordDefeat, recordRelic, setCycleCoinBonus, type ChestReward, type ChestTier, type CollectionState } from "@shared/collection";
import { COMBAT_KCAL_RATIO, STUDY_ANSWER_DAMAGE, TRAIL_KCAL_RATIO, advanceDailyQuest, applyStageDamage, claimDailyQuest, currentStage, damagePerCycle, emptyQuest, ensureDailyQuest, kcalAttackDamage, mergeQuests, questTotals, revertStageDamage, stageHp, type QuestState, type StageClear } from "@shared/questSystem";
import { KCAL_RANGES, buildKcalSeries, compareKcalWindows, dailyKcalGoal, summarizeKcal, type KcalDay, type KcalRange } from "@shared/kcalStats";
import { evaluateAchievements, unlockedAchievementIds, type AchievementInput, type AchievementView } from "@shared/achievements";
import { QuestMapScreen } from "@/components/QuestMap";
import { Codex } from "@/components/Codex";
import { EQUIPMENT_CATALOG, type Equipment } from "@/lib/gameCatalog";
import { avatarUrl, logoUrl, mapUrl, monsterUrl } from "@/lib/gameAssets";
import { Stars } from "@/lib/gameIcons";
import {
  ArrowUpRight,
  Backpack,
  BookOpen,
  BarChart3,
  CalendarDays,
  Check,
  ExternalLink,
  ScrollText,
  Cloud,
  Download,
  LogIn,
  ChevronRight,
  Circle,
  Coins,
  Flame,
  Footprints,
  Gift,
  Lock,
  Map,
  Medal,
  Plus,
  RotateCcw,
  Share2,
  Shield,
  Sparkles,
  Swords,
  Target,
  Trophy,
  TrendingDown,
  TrendingUp,
  Minus,
  X,
  Settings,
  Bell,
  Clock3,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { playAchievementSound, playCycleSound, playDefeatSound } from "@/lib/gameAudio";

type TabKey = "home" | "stats" | "map" | "pack" | "settings" | "study";
type History = Record<string, number>;
type Difficulty = "easy" | "standard" | "hard";
type Settings = { dailyGoal: number; kcalPerCycle: number; difficulty: Difficulty; actions: string[]; soundEnabled: boolean; reminderEnabled: boolean; reminderTime: string };
type CycleEntry = { id: string; date: string; time: string; performedAt?: string; actions: string[]; kcal: number; xp: number; coins: number };
type WeeklySettlement = { weekKey: string; cycles: number; actualXp: number; bonusXp: number; chest: number; kcal: number };
type StudyProgress = { solved: number; correct: number; streak: number; bestStreak: number; chapter: number; chestCount: number };
type ResourceTransaction = { id: string; occurredAt: string; resource: "kcal" | "coins"; kind: "cycle" | "trail" | "combat" | "equipment" | "milestone" | "study"; amountDelta: number; balanceAfter: number; description: string; referenceId?: string };
type ProgressState = { history: History; totalCount: number; settings: Settings; entries: CycleEntry[]; transactions: ResourceTransaction[]; kcalBalance: number; kcalSpent: number; equipment: string[]; activeDate: string; currentWeekKey: string; lastSettledWeek?: string; weeklyChestCount: number; rareChestCount: number; milestonesClaimed: number[]; bonusXp: number; trailProgress: History; combatDamage: History; study: StudyProgress; quest: QuestState; collection: CollectionState; weeklySettlement?: WeeklySettlement | null };
type DayPoint = { key: string; label: string; count: number; kcal: number; isToday: boolean };

const DEFAULT_SETTINGS: Settings = { dailyGoal: 10, kcalPerCycle: 30, difficulty: "standard", actions: ["深蹲 12 次", "伏地挺身 8 次", "登山者 20 秒"], soundEnabled: true, reminderEnabled: false, reminderTime: "20:00" };
const DAILY_GOAL = DEFAULT_SETTINGS.dailyGoal;
const KCAL_PER_CYCLE = DEFAULT_SETTINGS.kcalPerCycle;
const XP_PER_CYCLE = 20;
const COINS_PER_CYCLE = 10;
const DIFFICULTY_META: Record<Difficulty, { label: string; hp: number; damage: number; description: string }> = {
  easy: { label: "漫步", hp: 60, damage: 10, description: "怪物生命較低，適合建立習慣" },
  standard: { label: "探險", hp: 100, damage: 10, description: "標準旅程，平衡的戰鬥節奏" },
  hard: { label: "遠征", hp: 150, damage: 10, description: "更長的戰鬥，獲得更多成就感" },
};
const STORAGE_KEY = "fit-quest-loop-progress-v1";
const DAILY_QUEST_SALT = "fit-quest-loop-trail";
const dayNames = ["日", "一", "二", "三", "四", "五", "六"];


function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekKey(date: Date) {
  const cursor = new Date(date);
  const day = cursor.getDay() || 7;
  cursor.setDate(cursor.getDate() - day + 1);
  return dateKey(cursor);
}

function dateFromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function shortDate(key: string) {
  const date = dateFromKey(key);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function getLastDays(span: number): DayPoint[] {
  const today = new Date();
  return Array.from({ length: span }, (_, index) => {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(today.getDate() - (span - 1 - index));
    const key = dateKey(date);
    return {
      key,
      label: dayNames[date.getDay()],
      count: 0,
      kcal: 0,
      isToday: index === 6,
    };
  });
}

function makeSeedState(): ProgressState {
  const week = getLastDays(7);
  const seedCounts = [5, 7, 6, 8, 4, 3, 0];
  const history: History = {};
  week.forEach((day, index) => { history[day.key] = seedCounts[index]; });
  const currentDate = dateKey(new Date());
  return { history, totalCount: 33, settings: { ...DEFAULT_SETTINGS }, entries: [], transactions: [], kcalBalance: 0, kcalSpent: 0, equipment: [], activeDate: currentDate, currentWeekKey: getWeekKey(new Date()), weeklyChestCount: 0, rareChestCount: 0, milestonesClaimed: [], bonusXp: 0, trailProgress: {}, combatDamage: {}, study: { solved: 0, correct: 0, streak: 0, bestStreak: 0, chapter: 1, chestCount: 0 }, quest: emptyQuest(), collection: emptyCollection() };
}

function hydrateQuest(stored: Partial<QuestState> | undefined): QuestState {
  if (!stored || typeof stored !== "object") return emptyQuest();
  return { ...emptyQuest(), ...stored, cleared: stored.cleared ?? {}, daily: stored.daily ?? null };
}

function hydrateCollection(stored: Partial<CollectionState> | undefined): CollectionState {
  if (!stored || typeof stored !== "object") return emptyCollection();
  return { ...emptyCollection(), ...stored, relics: stored.relics ?? {}, bestiary: stored.bestiary ?? {}, chests: Array.isArray(stored.chests) ? stored.chests : [] };
}

function loadState(): ProgressState {
  if (typeof window === "undefined") return makeSeedState();
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return makeSeedState();
    const parsed = JSON.parse(stored) as Partial<ProgressState>;
    if (!parsed.history || typeof parsed.totalCount !== "number") return makeSeedState();
    const storedSettings: Partial<Settings> = parsed.settings ?? {};
    const storedEntries = Array.isArray(parsed.entries) ? parsed.entries : [];
    const storedTransactions = Array.isArray(parsed.transactions) ? parsed.transactions : [];
    const hasCoinLedger = storedTransactions.some(transaction => transaction.resource === "coins");
    const legacyCoinBalance = legacyCoinOpeningBalance(parsed.totalCount, storedEntries.map(entry => typeof entry.coins === "number" ? entry.coins : 0));
    const legacyOpening = legacyCoinOpeningTransaction(legacyCoinBalance, hasCoinLedger, new Date().toISOString());
    const hydratedTransactions: ResourceTransaction[] = legacyOpening ? [legacyOpening, ...storedTransactions] : storedTransactions;
    const currentDate = dateKey(new Date());
    const hasActiveDate = typeof parsed.activeDate === "string" && parsed.activeDate.length > 0;
    const safeHistory = hasActiveDate ? parsed.history : { ...parsed.history, [currentDate]: 0 };
    return {
      history: safeHistory,
      totalCount: parsed.totalCount,
      settings: { ...DEFAULT_SETTINGS, ...storedSettings, actions: Array.isArray(storedSettings.actions) && storedSettings.actions.length > 0 ? storedSettings.actions : [...DEFAULT_SETTINGS.actions] },
      entries: storedEntries,
      transactions: hydratedTransactions,
      kcalBalance: typeof parsed.kcalBalance === "number" ? parsed.kcalBalance : 0,
      kcalSpent: typeof parsed.kcalSpent === "number" ? parsed.kcalSpent : 0,
      equipment: Array.isArray(parsed.equipment) ? parsed.equipment : [],
      activeDate: hasActiveDate ? parsed.activeDate as string : currentDate,
      currentWeekKey: typeof parsed.currentWeekKey === "string" ? parsed.currentWeekKey : getWeekKey(new Date()),
      lastSettledWeek: typeof parsed.lastSettledWeek === "string" ? parsed.lastSettledWeek : undefined,
      weeklyChestCount: typeof parsed.weeklyChestCount === "number" ? parsed.weeklyChestCount : 0,
      rareChestCount: typeof parsed.rareChestCount === "number" ? parsed.rareChestCount : 0,
      milestonesClaimed: Array.isArray(parsed.milestonesClaimed) ? parsed.milestonesClaimed : [],
      bonusXp: typeof parsed.bonusXp === "number" ? parsed.bonusXp : 0,
      trailProgress: parsed.trailProgress ?? {},
      combatDamage: parsed.combatDamage ?? {},
      study: { solved: 0, correct: 0, streak: 0, bestStreak: 0, chapter: 1, chestCount: 0, ...(parsed.study ?? {}) },
      quest: hydrateQuest(parsed.quest),
      collection: migrateLegacyChests(hydrateCollection(parsed.collection), { weekly: parsed.weeklyChestCount ?? 0, rare: parsed.rareChestCount ?? 0, study: parsed.study?.chestCount ?? 0 }, new Date().toISOString()),
    };
  } catch {
    return makeSeedState();
  }
}

function getStreak(history: History) {
  let count = 0;
  const cursor = new Date();
  while (count < 365) {
    if ((history[dateKey(cursor)] ?? 0) < 1) break;
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

function getChapter(totalCount: number) {
  if (totalCount >= 150) return 4;
  if (totalCount >= 75) return 3;
  if (totalCount >= 30) return 2;
  return 1;
}

export function achievementInput(state: ProgressState): AchievementInput {
  const today = dateKey(new Date());
  return {
    totalCount: state.totalCount,
    todayCount: state.history[today] ?? 0,
    dailyGoal: state.settings.dailyGoal,
    streak: getStreak(state.history),
    kcalTotal: state.entries.reduce((sum, entry) => sum + entry.kcal, 0),
    study: state.study,
    quest: state.quest,
    collection: state.collection,
    equipment: state.equipment,
  };
}

export function toCloudPayload(state: ProgressState) {
  return buildJourneySyncPayload({
    settings: state.settings,
    totalCount: state.totalCount,
    xp: state.totalCount * XP_PER_CYCLE + state.bonusXp,
    streak: getStreak(state.history),
    currentChapter: getChapter(state.totalCount),
    unlockedAchievements: unlockedAchievementIds(achievementInput(state)),
    kcalBalance: state.kcalBalance,
    kcalSpent: state.kcalSpent,
    equipment: state.equipment,
    activeDate: state.activeDate || dateKey(new Date()),
    currentWeekKey: state.currentWeekKey || getWeekKey(new Date()),
    lastSettledWeek: state.lastSettledWeek ?? null,
    weeklyChestCount: state.weeklyChestCount,
    rareChestCount: state.rareChestCount,
    milestonesClaimed: state.milestonesClaimed,
    study: state.study,
    quest: state.quest,
    collection: state.collection,
    transactions: state.transactions,
    entries: state.entries,
    fallbackCoins: state.entries.length > 0 ? state.entries.reduce((sum, entry) => sum + entry.coins, 0) : state.totalCount * COINS_PER_CYCLE,
    localDateFor: (occurredAt: string) => dateKey(new Date(occurredAt)),
    serializeEntry: (entry: CycleEntry) => ({ ...entry, performedAt: entry.performedAt ?? new Date(`${entry.date}T${entry.time}:00`).toISOString() }),
  });
}


function formatToday() {
  const today = new Date();
  return `${today.getMonth() + 1} 月 ${today.getDate()} 日・星期${dayNames[today.getDay()]}`;
}

function ProgressBar({ value, className = "" }: { value: number; className?: string }) {
  return (
    <div className={`progress-track ${className}`} aria-label={`進度 ${Math.round(value)}%`}>
      <div className="progress-fill" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

function Metric({ icon: Icon, label, value, accent }: { icon: typeof Flame; label: string; value: string; accent: string }) {
  return (
    <div className="metric-cell">
      <div className={`metric-icon ${accent}`}><Icon size={15} strokeWidth={2.4} /></div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function TrailMarkers({ count, goal }: { count: number; goal: number }) {
  return (
    <div className="trail-markers" aria-label={`今日獵徑 ${count} / ${goal}`}>
      <div className="trail-stroke" />
      {Array.from({ length: goal }, (_, index) => (
        <span key={index} className={`trail-marker ${index < count ? "marked" : ""} ${index === count ? "next" : ""}`}>
          {index < count ? <Check size={11} /> : index + 1}
        </span>
      ))}
    </div>
  );
}

function BottomNav({ activeTab, onChange }: { activeTab: TabKey; onChange: (tab: TabKey) => void }) {
  const items: { key: TabKey; label: string; icon: typeof Flame }[] = [
    { key: "home", label: "今日", icon: Flame },
    { key: "study", label: "教檢", icon: BookOpen },
    { key: "map", label: "獵徑", icon: Map },
    { key: "stats", label: "統計", icon: BarChart3 },
    { key: "pack", label: "背包", icon: Backpack },
    { key: "settings", label: "設定", icon: Settings },
  ];
  return (
    <nav className="bottom-nav" aria-label="主要導覽">
      {items.map(({ key, label, icon: Icon }) => (
        <button key={key} className={activeTab === key ? "active" : ""} onClick={() => onChange(key)} aria-current={activeTab === key ? "page" : undefined}>
          <Icon size={19} strokeWidth={activeTab === key ? 2.5 : 1.8} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

function LeftRail({ activeTab, onChange, level, streak }: { activeTab: TabKey; onChange: (tab: TabKey) => void; level: number; streak: number }) {
  return (
    <aside className="left-rail">
      <div className="rail-brand">
        <img src={logoUrl} alt="Fit Quest Loop 標誌" />
        <div><strong>FIT QUEST</strong><span>LOOP / 戶外循環</span></div>
      </div>
      <div className="rail-route">
        <div className="route-kicker"><span className="route-dot" />你的獵徑</div>
        <div className="route-level">Lv.{level}<span>・</span>第 01 章</div>
        <div className="route-line"><span style={{ height: `${Math.min(100, streak * 18)}%` }} /></div>
        <div className="route-note"><Flame size={14} /> {streak} 日火種</div>
      </div>
      <div className="rail-nav">
        <p className="eyebrow">BASE CAMP</p>
        <button className={activeTab === "home" ? "selected" : ""} onClick={() => onChange("home")}><Flame size={17} /> 今日任務 <span>⌘</span></button>
        <button className={activeTab === "map" ? "selected" : ""} onClick={() => onChange("map")}><Map size={17} /> 冒險地圖 <span>01</span></button>
        <button className={activeTab === "stats" ? "selected" : ""} onClick={() => onChange("stats")}><BarChart3 size={17} /> 進度統計 <span>↗</span></button>
        <button className={activeTab === "pack" ? "selected" : ""} onClick={() => onChange("pack")}><Backpack size={17} /> 我的背包 <span>03</span></button>
        <button className={activeTab === "settings" ? "selected" : ""} onClick={() => onChange("settings")}><Settings size={17} /> 設定頁 <span>⌘</span></button>
        <button className={activeTab === "study" ? "selected" : ""} onClick={() => onChange("study")}><BookOpen size={17} /> 教檢題庫 <span>NEW</span></button>
      </div>
      <div className="rail-footer">
        <div className="mini-avatar"><img src={avatarUrl} alt="探險者頭像" /></div>
        <div><strong>Trailblazer</strong><span>準備好再走一段</span></div>
        <ChevronRight size={16} />
      </div>
    </aside>
  );
}

function Header({ level, coins, onReset, isAuthenticated, cloudEnabled, onAuthAction }: { level: number; coins: number; onReset: () => void; isAuthenticated: boolean; cloudEnabled: boolean; onAuthAction: () => void }) {
  return (
    <header className="topbar">
      <div className="mobile-brand">
        <img src={logoUrl} alt="Fit Quest Loop" />
        <span>FIT QUEST <b>LOOP</b></span>
      </div>
      <div className="header-context"><span className="live-mark" />第 01 章・暖石谷地</div>
      <div className="header-actions">
        <div className="header-stat"><Coins size={15} /><b>{coins}</b><span>金幣</span></div>
        {cloudEnabled
          ? <button className={`cloud-button ${isAuthenticated ? "connected" : ""}`} onClick={onAuthAction} title={isAuthenticated ? "登出雲端旅程" : "登入並同步旅程"}>{isAuthenticated ? <Cloud size={15} /> : <LogIn size={15} />}<span>{isAuthenticated ? "已同步" : "登入"}</span></button>
          : <span className="cloud-button local" title="這個版本沒有連接雲端，旅程保存在這台裝置"><Download size={15} /><span>本機模式</span></span>}
        <button className="reset-button" onClick={onReset} aria-label="重置示範進度" title="重置示範進度"><RotateCcw size={16} /></button>
        <div className="header-level"><span>LV</span><b>{level}</b></div>
      </div>
    </header>
  );
}

function HomeScreen({ days, todayCount, totalCount, xp, level, coins, streak, settings, kcalBalance, todayKcal, quest, equipment, onAdd, onOpenMap }: { days: DayPoint[]; todayCount: number; totalCount: number; xp: number; level: number; coins: number; streak: number; settings: Settings; kcalBalance: number; todayKcal: number; quest: QuestState; equipment: string[]; onAdd: () => void; onOpenMap: () => void }) {
  const weeklyCycles = days.reduce((sum, day) => sum + day.count, 0);
  const stage = currentStage(quest);
  const perCycle = damagePerCycle(equipment);
  const stageMaxHp = stage ? stageHp(stage, settings.difficulty) : 0;
  const stageRemaining = stage ? Math.max(0, stageMaxHp - quest.damage) : 0;
  const stageDefeatCount = stage ? Math.max(1, Math.ceil(stageRemaining / perCycle)) : 0;
  const stageCleared = !stage;
  const isComplete = todayCount >= settings.dailyGoal;
  const levelXp = xp % 100;
  const nextReward = cycleRewards(XP_PER_CYCLE, settings.kcalPerCycle, COINS_PER_CYCLE, todayCount + 1, equipment);
  return (
    <>
      <section className="page-intro">
        <div>
          <p className="eyebrow">TODAY'S TRAIL / {formatToday()}</p>
          <h1>今天，往前走一點。</h1>
          <p className="intro-copy">篝火還在。完成一個循環，讓路徑再亮起一枚記號。</p>
        </div>
        <div className="streak-pill"><Flame size={16} fill="currentColor" /><span><b>{streak}</b> 日連續</span></div>
      </section>

      <section className="hero-quest" style={{ backgroundImage: `url(${mapUrl})` }}>
        <div className="hero-overlay" />
        <div className="hero-content">
          <div className="hero-topline"><span className="quest-tag"><Target size={13} /> 今日主線</span><span className="hero-date">{todayCount >= settings.dailyGoal ? "MISSION CLEAR" : "IN PROGRESS"}</span></div>
          <div className="hero-copy">
            <p className="eyebrow light">暖石谷地・第 01 節點</p>
            <h2>{isComplete ? "獵徑已點亮" : "穿過暖石谷地"}</h2>
            <p>{isComplete ? "今天的怪物已倒下，收下你的戰利品。" : `今日目標 ${settings.dailyGoal} 循環，剩下 ${Math.max(0, settings.dailyGoal - todayCount)} 次。`}</p>
          </div>
          <div className="hero-progress-row"><div><span>今日獵徑</span><b>{todayCount} <small>/ {settings.dailyGoal}</small></b></div><div className="hero-progress"><span style={{ width: `${Math.min(100, (todayCount / settings.dailyGoal) * 100)}%` }} /></div></div>
          <TrailMarkers count={todayCount} goal={settings.dailyGoal} />
          <div className="route-caption"><span>晨光營地</span><span>暖石谷地・{settings.dailyGoal} 枚記號</span><span>下一段路</span></div>
          <button className={`campfire-button ${isComplete ? "complete" : ""}`} onClick={onAdd} aria-label="完成一次健身循環">
            <span className="button-flame"><Flame size={22} fill="currentColor" /></span>
            <span><b>{isComplete ? "再走一段" : "完成一次循環"}</b><small>第 {todayCount + 1} 次：+{nextReward.kcal} 大卡 ・ +{nextReward.xp} XP ・ +{nextReward.coins} 金幣</small></span>
            <ArrowUpRight size={18} />
          </button>
        </div>
      </section>

      <section className="metric-grid">
        <Metric icon={Flame} label="篝火燃燒" value={`${todayKcal} kcal`} accent="orange" />
        <Metric icon={Zap} label="路程經驗" value={`${xp} XP`} accent="gold" />
        <Metric icon={Coins} label="沿途金幣" value={`${coins}`} accent="green" />
        <Metric icon={Footprints} label="總刻痕" value={`${totalCount} 次`} accent="red" />
      </section>
      <section className="panel kcal-wallet"><div><p className="eyebrow">KCAL WALLET / FIELD RESOURCE</p><h3>可支配大卡</h3><p>完成循環會存入資源；你可以拿來走捷徑、攻擊怪物或換取裝備。</p></div><strong>{kcalBalance} <small>大卡</small></strong></section>

      <div className="content-columns">
        <section className="panel progress-panel field-note">
          <div className="panel-heading"><div><p className="eyebrow">CURRENT NODE / FIELD NOTE {String((stage?.index ?? 6) + 1).padStart(2, "0")}</p><h3>{stage?.monster ?? "獵徑已走完"}</h3></div><span className={`status-chip ${stageCleared ? "cleared" : ""}`}>{stageCleared ? "全線通關" : "戰鬥中"}</span></div>
          <div className="field-note-strip"><span><Map size={12} /> {stage ? `第 ${stage.chapter} 章・${stage.name}` : "28 個節點全數點亮"}</span><span>每循環・{perCycle} 傷害</span></div>
          <div className="field-note-stamp">SPECIMEN {String((stage?.index ?? 6) + 1).padStart(2, "0")} <span>FIELD GUIDE</span></div>
          <div className="monster-stage">
            <div className="monster-backdrop" />
            <img src={monsterUrl} alt={stage?.monster ?? "已擊倒的怪物"} className={stageCleared ? "monster defeated" : "monster"} />
            <div className="damage-pop">{stageCleared ? "CLEARED" : `-${quest.damage} HP`}</div>
          </div>
          <div className="monster-stats"><div><span>剩餘生命</span><b>{stageRemaining} <small>/ {stageMaxHp}</small></b></div><div className="hp-track"><span style={{ width: `${stageMaxHp > 0 ? (stageRemaining / stageMaxHp) * 100 : 0}%` }} /></div></div>
          <p className="panel-note"><Swords size={14} /> {stage ? <>還差 <b>{stageDefeatCount} 次循環</b> 就能打倒牠。節點傷害<b>不會跨日歸零</b>，也可以在獵徑頁用大卡加速。</> : <>所有節點都已通過，回圖鑑看看你的收藏。</>}</p>
          <button className="text-button node-link" onClick={onOpenMap}>前往關卡地圖 <ChevronRight size={15} /></button>
        </section>

        <section className="panel level-panel">
          <div className="panel-heading"><div><p className="eyebrow">TRAILBLAZER / ROUTE MARK 08</p><h3>你的旅程</h3></div><Trophy size={20} className="heading-icon" /></div>
          <div className="level-orbit"><div className="orbit-ring"><span>LV</span><strong>{level}</strong></div><div className="level-copy"><span>下一級還差</span><b>{100 - levelXp} XP</b><ProgressBar value={levelXp} /><small>{levelXp} / 100 XP</small></div></div>
          <div className="milestone"><div className="milestone-icon"><Sparkles size={16} /></div><div><b>火種守護者</b><span>連續 3 日完成任務</span></div><Check size={16} /></div>
        </section>
      </div>

      <section className="panel week-panel">
        <div className="panel-heading"><div><p className="eyebrow">LAST 7 DAYS</p><h3>這週的獵徑</h3></div><button className="text-button" onClick={() => toast.info("已切換到完整統計視圖")}>查看完整統計 <ChevronRight size={15} /></button></div>
        <div className="week-summary"><div><b>{weeklyCycles}</b><span>循環完成</span></div><div><b>{days.reduce((sum, day) => sum + day.kcal, 0)}</b><span>大卡燃燒</span></div><div><b>{days.filter(day => day.count >= settings.dailyGoal).length}</b><span>日達成目標</span></div></div>
        <div className="week-route" aria-label="七日獵徑路線">{days.map((day, index) => <div className={`week-route-node ${day.count > 0 ? "marked" : ""} ${day.isToday ? "today" : ""}`} key={day.key}><span>{day.count > 0 ? <Check size={10} /> : index + 1}</span><b>{day.label}</b></div>)}</div>
        <div className="mini-bars" aria-label="最近七天循環次數">
          {days.map((day) => <div className={`mini-bar-day ${day.isToday ? "today" : ""}`} key={day.key}><div className="mini-bar-track"><span style={{ height: `${Math.min(100, day.count * 10)}%` }} /></div><b>{day.count}</b><span>{day.label}</span></div>)}
        </div>
      </section>
    </>
  );
}

function SettingsScreen({ settings, todayCount, onSave }: { settings: Settings; todayCount: number; onSave: (settings: Settings) => void }) {
  const [draft, setDraft] = useState<Settings>(settings);
  const [newAction, setNewAction] = useState("");

  useEffect(() => { setDraft(settings); }, [settings]);

  const updateDraft = <K extends keyof Settings>(key: K, value: Settings[K]) => setDraft(current => ({ ...current, [key]: value }));
  const addAction = () => {
    const next = newAction.trim();
    if (!next) return;
    if (draft.actions.includes(next)) { toast.info("這個動作已經在循環裡了。"); return; }
    setDraft(current => ({ ...current, actions: [...current.actions, next] }));
    setNewAction("");
  };
  const removeAction = (action: string) => {
    if (draft.actions.length <= 1) { toast.info("至少保留一個循環動作。"); return; }
    setDraft(current => ({ ...current, actions: current.actions.filter(item => item !== action) }));
  };
  const save = async () => {
    const next: Settings = { ...draft, dailyGoal: Math.min(30, Math.max(1, Math.round(Number(draft.dailyGoal) || 1))), kcalPerCycle: Math.min(500, Math.max(1, Math.round(Number(draft.kcalPerCycle) || 1))), actions: draft.actions.filter(Boolean) };
    if (next.reminderEnabled && "Notification" in window && Notification.permission === "default") await Notification.requestPermission();
    onSave(next);
    toast.success("獵徑設定已保存。", { description: `每日 ${next.dailyGoal} 循環・每次 ${next.kcalPerCycle} 大卡` });
  };
  return (
    <>
      <section className="page-intro compact"><div><p className="eyebrow">BASE CAMP / SETTINGS</p><h1>調整你的獵徑。</h1><p className="intro-copy">把任務難度調成適合現在的你，按下保存後就會留在這台裝置。</p></div><div className="settings-seal"><Settings size={18} /><span>LOCAL</span></div></section>
      <section className="settings-layout">
        <div className="settings-main">
          <section className="panel settings-section"><div className="settings-section-head"><div><p className="eyebrow">DAILY QUEST</p><h3>今日任務規則</h3></div><Target size={20} className="heading-icon" /></div>
            <div className="settings-fields">
              <label className="setting-field"><span>每日循環目標</span><small>每天走完幾枚獵徑記號？</small><div className="number-field"><input type="number" min="1" max="30" value={draft.dailyGoal} onChange={event => updateDraft("dailyGoal", Number(event.target.value))} /><b>次</b></div></label>
              <label className="setting-field"><span>每次消耗熱量</span><small>完成一次循環時加總的熱量</small><div className="number-field"><input type="number" min="1" max="500" value={draft.kcalPerCycle} onChange={event => updateDraft("kcalPerCycle", Number(event.target.value))} /><b>大卡</b></div></label>
            </div>
          </section>
          <section className="panel settings-section"><div className="settings-section-head"><div><p className="eyebrow">ENCOUNTER LEVEL</p><h3>怪物難度</h3></div><Swords size={20} className="heading-icon" /></div><div className="difficulty-options">{(Object.keys(DIFFICULTY_META) as Difficulty[]).map(key => { const meta = DIFFICULTY_META[key]; const defeatCount = Math.ceil(meta.hp / meta.damage); return <button key={key} className={`difficulty-option ${draft.difficulty === key ? "selected" : ""}`} onClick={() => updateDraft("difficulty", key)}><span className="difficulty-dot" /><span><b>{meta.label}・{key === "easy" ? "輕裝" : key === "standard" ? "標準" : "重裝"}</b><small>{meta.description}・{defeatCount} 次擊倒</small></span>{draft.difficulty === key && <Check size={16} />}</button>; })}</div></section>
          <section className="panel settings-section"><div className="settings-section-head"><div><p className="eyebrow">DAILY SIGNAL</p><h3>每日提醒</h3></div><Bell size={20} className="heading-icon" /></div><div className="reminder-setting"><label className="reminder-switch"><input type="checkbox" checked={draft.reminderEnabled} onChange={event => updateDraft("reminderEnabled", event.target.checked)} /><span className={`toggle ${draft.reminderEnabled ? "on" : ""}`}><i /></span><span><b>{draft.reminderEnabled ? "提醒已開啟" : "先不提醒"}</b><small>在你開啟 App 時，於設定時間提示今日還剩多少循環。</small></span></label><label className="reminder-time"><Clock3 size={15} /><span>提醒時間</span><input type="time" value={draft.reminderTime} onChange={event => updateDraft("reminderTime", event.target.value)} disabled={!draft.reminderEnabled} /></label><p className="settings-help">瀏覽器通知需要先授權；若瀏覽器或裝置完全關閉，提醒可能不會送達。</p></div></section>
          <section className="panel settings-section"><div className="settings-section-head"><div><p className="eyebrow">LOOP MOVES</p><h3>循環動作名稱</h3></div><Footprints size={20} className="heading-icon" /></div><p className="settings-help">這些動作會在你按下「完成一次循環」時一併寫入歷史紀錄。</p><div className="action-editor">{draft.actions.map((action, index) => <div className="action-row" key={`${action}-${index}`}><span className="action-index">{String(index + 1).padStart(2, "0")}</span><input value={action} onChange={event => setDraft(current => ({ ...current, actions: current.actions.map((item, itemIndex) => itemIndex === index ? event.target.value : item) }))} aria-label={`動作 ${index + 1}`} /><button onClick={() => removeAction(action)} aria-label={`刪除${action}`}><X size={15} /></button></div>)}<div className="add-action-row"><input placeholder="例如：平板支撐 30 秒" value={newAction} onChange={event => setNewAction(event.target.value)} onKeyDown={event => { if (event.key === "Enter") addAction(); }} /><button onClick={addAction}><Plus size={15} /> 新增動作</button></div></div></section>
          <button className="save-settings" onClick={save}><Check size={17} /> 保存獵徑設定</button>
        </div>
        <aside className="settings-side"><div className="settings-preview"><p className="eyebrow light">CURRENT QUEST</p><span className="preview-flame"><Flame size={22} fill="currentColor" /></span><b>你的下一步</b><strong>完成一次循環</strong><p>每次將記錄 {draft.actions.length} 個動作，獲得 {draft.kcalPerCycle} 大卡、{XP_PER_CYCLE} XP 與 {COINS_PER_CYCLE} 金幣。</p><div className="preview-route"><span style={{ width: `${Math.min(100, (todayCount / draft.dailyGoal) * 100)}%` }} /></div><small>每日 {draft.dailyGoal} 次目標</small></div><button className="sound-setting" onClick={() => updateDraft("soundEnabled", !draft.soundEnabled)}>{draft.soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}<span><b>遊戲音效</b><small>{draft.soundEnabled ? "完成、成就與擊倒音效已開啟" : "已靜音，仍保留動畫"}</small></span><span className={`toggle ${draft.soundEnabled ? "on" : ""}`}><i /></span></button></aside>
      </section>
    </>
  );
}


type StudySegment = "drill" | "scope" | "notes";

const STUDY_SEGMENTS: { key: StudySegment; label: string }[] = [
  { key: "drill", label: "題庫練習" },
  { key: "scope", label: "考科範圍" },
  { key: "notes", label: "重點筆記" },
];

function ScopePanel({ subject }: { subject: TeacherSubject | "all" }) {
  const shown = subject === "all" ? EXAM_SCOPE : EXAM_SCOPE.filter(item => item.subject === subject);
  return <section className="panel scope-panel"><div className="panel-heading"><div><p className="eyebrow">OFFICIAL SCOPE / 命題範圍</p><h3>國小類科教育專業科目細項</h3></div><ScrollText size={20} className="heading-icon" /></div>
    {shown.map((item, itemIndex) => <div key={item.subject} className="scope-block"><div className="scope-title"><span>{String(EXAM_SCOPE.indexOf(item) + 1).padStart(2, "0")}</span><b>{item.subject}</b></div><div className="scope-fields">{item.fields.map(field => <span key={field}>{field}</span>)}</div>{item.preamble && <p className="scope-preamble">{item.preamble}</p>}<ol className="scope-list">{item.indicators.map(indicator => <li key={indicator}>{indicator}</li>)}</ol>{itemIndex === shown.length - 1 && <></>}</div>)}
    <div className="scope-format"><b>命題形式</b><ul>{EXAM_FORMAT_NOTES.map(note => <li key={note}>{note}</li>)}</ul></div>
    <p className="study-source">指標文字逐字引自{EXAM_SCOPE_SOURCE}。<a href={EXAM_SCOPE_URL} target="_blank" rel="noreferrer">查看法規原文 <ExternalLink size={12} /></a></p>
  </section>;
}

function NotesPanel({ subject }: { subject: TeacherSubject | "all" }) {
  const notes = notesBySubject(subject);
  return <section className="panel notes-panel"><div className="panel-heading"><div><p className="eyebrow">SECOND BRAIN / 重點筆記</p><h3>{notes.length} 則筆記・{notes.reduce((sum, note) => sum + note.points.length, 0)} 個記憶點</h3></div><Sparkles size={20} className="heading-icon" /></div>
    <div className="note-grid">{notes.map(note => <article key={note.id} className="note-card"><div className="note-head"><span className="note-kind" data-kind={note.kind}>{note.kind}</span><span className="note-subject">{note.subject}</span></div><h4>{note.title}</h4><p className="note-hook">{note.hook}</p><dl className="note-points">{note.points.map(point => <div key={point.term}><dt>{point.term}</dt><dd>{point.detail}</dd></div>)}</dl><small className="note-source">{note.source}</small></article>)}</div>
    <p className="study-source">{STUDY_NOTES_ORIGIN}；全庫共 {STUDY_NOTES.length} 則、{notePointCount()} 個記憶點。原始筆記與圖卡仍在 Obsidian，這裡只放考前速記。</p>
  </section>;
}

export function TeacherPrepScreen({ progress, onAnswer }: { progress: StudyProgress; onAnswer: (correct: boolean) => void }) {
  const [segment, setSegment] = useState<StudySegment>("drill");
  const [subject, setSubject] = useState<TeacherSubject | "all">("all");
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const pool = useMemo(() => questionsBySubject(subject), [subject]);
  const countdown = useMemo(() => examCountdown(new Date()), []);
  const remaining = Math.max(0, TEACHER_QUESTIONS.length - progress.correct);
  const pace = dailyQuestionPace(countdown.days, remaining);
  const question: TeacherQuestion = pool[index % pool.length];
  const answered = selected !== null;
  const activeScope = subject === "all" ? null : scopeFor(subject);
  const pickSubject = (value: TeacherSubject | "all") => { setSubject(value); setIndex(0); setSelected(null); };
  const choose = (option: number) => { if (answered) return; const result = gradeTeacherQuestion(question, option); setSelected(option); onAnswer(result.correct); if (result.correct) toast.success("答對了，獲得 +15 XP。", { description: "把這枚知識記號收進你的教檢獵徑。" }); else toast.error("這一題先記下來。", { description: "看完詳解，再走下一題。" }); };
  const next = () => { setIndex(value => nextQuestionIndex(value, pool.length)); setSelected(null); };
  return <>
    <section className="page-intro compact"><div><p className="eyebrow">TEACHER CERTIFICATION / STUDY TRAIL</p><h1>教檢題庫，走一題算一題。</h1><p className="intro-copy">國民小學教育專業科目共三科、{EXAM_SCOPE.reduce((sum, item) => sum + item.indicators.length, 0)} 項命題指標；題庫收錄 {TEACHER_QUESTIONS.length} 題練習題與 {STUDY_NOTES.length} 則重點筆記。</p></div><div className="study-stamp"><BookOpen size={17} /><span>{progress.correct} 題答對・連勝 {progress.streak}</span></div></section>
    <section className={`panel exam-countdown ${countdown.state}`}><div className="exam-countdown-main"><p className="eyebrow">{EXAM_YEAR_LABEL}教師資格考試</p><strong className="exam-days">{countdown.state === "far" || countdown.state === "near" ? <>D-{countdown.days}</> : countdown.label}</strong><p className="exam-note">{countdown.note}</p></div><div className="exam-countdown-facts"><div><span><CalendarDays size={14} /> 考試日期</span><b>{EXAM_DATE_LABEL}</b></div><div><span><Target size={14} /> 建議節奏</span><b>{remaining > 0 ? `每天 ${pace} 題可走完題庫` : "題庫已全部答對過一輪"}</b></div><div><span><BookOpen size={14} /> 尚未答對</span><b>{remaining} / {TEACHER_QUESTIONS.length} 題</b></div></div></section>
    <div className="study-switch"><div className="segment-tabs">{STUDY_SEGMENTS.map(item => <button key={item.key} className={segment === item.key ? "selected" : ""} onClick={() => setSegment(item.key)}>{item.label}</button>)}</div><div className="subject-filter"><button className={subject === "all" ? "active" : ""} onClick={() => pickSubject("all")}>全部 {TEACHER_QUESTIONS.length}</button>{TEACHER_SUBJECTS.map(item => <button key={item} className={subject === item ? "active" : ""} onClick={() => pickSubject(item)}>{item} {questionsBySubject(item).length}</button>)}</div></div>
    {segment === "scope" && <ScopePanel subject={subject} />}
    {segment === "notes" && <NotesPanel subject={subject} />}
    {segment === "drill" && <section className="study-layout"><div className="panel study-card"><div className="study-meta"><span className="subject-chip">{question.subject}</span><span>第 {(index % pool.length) + 1} / {pool.length} 題</span></div><h2>{question.question}</h2><div className="study-options">{question.options.map((option, optionIndex) => <button key={option} className={selected === optionIndex ? (optionIndex === question.answer ? "correct" : "wrong") : answered && optionIndex === question.answer ? "correct" : ""} onClick={() => choose(optionIndex)}><span>{String.fromCharCode(65 + optionIndex)}</span><b>{option}</b></button>)}</div>{answered && <div className={`study-feedback ${selected === question.answer ? "correct" : "wrong"}`}><strong>{selected === question.answer ? "答對！知識獵徑亮起。" : `正解是 ${String.fromCharCode(65 + question.answer)}。`}</strong><p>{question.explanation}</p><small>題目依官方命題範圍編寫：{question.source}</small></div>}<div className="study-actions"><span>{answered ? "已完成本題" : "選一個答案開始"}</span><button onClick={next} disabled={!answered}>下一題 <ChevronRight size={16} /></button></div></div><aside className="panel study-guide"><p className="eyebrow">EXAM BRIEFING</p><div className="study-progress-badge">第 {progress.chapter} 章・寶箱 {progress.chestCount}</div>{activeScope ? <><h3>{activeScope.subject}</h3><div className="scope-fields">{activeScope.fields.map(field => <span key={field}>{field}</span>)}</div><ol className="scope-list compact">{activeScope.indicators.map(indicator => <li key={indicator}>{indicator}</li>)}</ol><button className="scope-jump" onClick={() => setSegment("scope")}>看完整考科範圍 <ChevronRight size={14} /></button></> : <><h3>國小類科應試科目</h3><div className="exam-subject-list">{EXAM_SUBJECTS.map((item, itemIndex) => <div key={item.name} className={`exam-subject ${item.covered ? "covered" : ""}`}><span>{String(itemIndex + 1).padStart(2, "0")}</span><b>{item.name}</b><small>{item.group === "common" ? "共同科目" : "本題庫涵蓋"}</small></div>)}</div><h3>及格標準</h3><ul className="exam-rules">{EXAM_PASS_RULES.map(rule => <li key={rule}>{rule}</li>)}</ul></>}<p className="study-source">{EXAM_NAME}。及格標準依《高級中等以下學校及幼兒園教師資格考試辦法》第 9 條；本題庫為依官方命題範圍編寫之練習題，非官方歷屆試題。報名日期與簡章以官方公告為準。</p><div className="exam-links"><a href={EXAM_OFFICIAL_URL} target="_blank" rel="noreferrer">官方最新消息 <ExternalLink size={13} /></a><a href={EXAM_PAST_PAPER_URL} target="_blank" rel="noreferrer">歷屆試題與參考答案 <ExternalLink size={13} /></a></div></aside></section>}
  </>;
}

function KcalBurnPanel({ history, dailyGoal, kcalPerCycle }: { history: KcalDay[]; dailyGoal: number; kcalPerCycle: number }) {
  const [range, setRange] = useState<KcalRange>(7);
  const goalKcal = dailyKcalGoal(dailyGoal, kcalPerCycle);
  const window = useMemo(() => history.slice(-range), [history, range]);
  const summary = useMemo(() => summarizeKcal(window, goalKcal), [window, goalKcal]);
  const trend = useMemo(() => compareKcalWindows(history, range), [history, range]);
  const series = useMemo(() => buildKcalSeries(window, goalKcal, Math.min(7, range)), [window, goalKcal, range]);
  const chartData = series.map(point => ({ name: range > 14 ? shortDate(point.key) : point.label, 大卡: point.kcal, 移動平均: point.average }));
  const TrendIcon = trend.direction === "up" ? TrendingUp : trend.direction === "down" ? TrendingDown : Minus;
  const trendLabel = trend.previous <= 0 ? `前 ${range} 天沒有紀錄，這是第一段燃燒` : trend.direction === "flat" ? `與前 ${range} 天持平` : `較前 ${range} 天 ${trend.delta > 0 ? "+" : ""}${trend.delta} 大卡（${trend.pct > 0 ? "+" : ""}${trend.pct}%）`;
  return (
    <section className="panel kcal-panel">
      <div className="panel-heading"><div><p className="eyebrow">DAILY BURN / KCAL</p><h3>每日燃燒大卡</h3></div><div className="range-tabs">{KCAL_RANGES.map(item => <button key={item} className={range === item ? "selected" : ""} onClick={() => setRange(item)}>近 {item} 天</button>)}</div></div>
      <div className={`kcal-trend ${trend.direction}`}><TrendIcon size={15} /><span>{trendLabel}</span>{summary.streak > 0 && <b>連續燃燒 {summary.streak} 日</b>}</div>
      <div className="kcal-stats">
        <div><span>區間總燃燒</span><b>{summary.total}</b><small>kcal</small></div>
        <div><span>日均燃燒</span><b>{summary.average}</b><small>kcal</small></div>
        <div><span>最高單日</span><b>{summary.best?.kcal ?? 0}</b><small>{summary.best ? `kcal・${shortDate(summary.best.key)}` : "尚無紀錄"}</small></div>
        <div><span>達標天數</span><b>{summary.goalHitDays}</b><small>/ {summary.span} 天</small></div>
      </div>
      <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={chartData} margin={{ top: 8, right: 0, left: -14, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e5dfd4" strokeDasharray="3 4" /><XAxis dataKey="name" axisLine={false} tickLine={false} interval={range > 14 ? 3 : 0} tick={{ fill: "#897f70", fontSize: 13, fontWeight: 700 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#b0a89c", fontSize: 13 }} allowDecimals={false} /><Tooltip cursor={{ fill: "#f3eee7" }} contentStyle={{ border: "1px solid #ded5c8", borderRadius: "12px", boxShadow: "0 10px 30px #2b292422", fontFamily: "Noto Sans TC", fontSize: 14 }} labelStyle={{ fontSize: 14 }} itemStyle={{ fontSize: 14 }} formatter={(value: number, name: string) => [`${value} kcal`, name]} />{goalKcal > 0 && <ReferenceLine y={goalKcal} stroke="#d9a441" strokeDasharray="4 4" />}<Bar dataKey="大卡" fill="#e86a33" radius={[5, 5, 1, 1]} maxBarSize={30} /><Line type="monotone" dataKey="移動平均" stroke="#7a9b64" strokeWidth={2} dot={false} /></ComposedChart></ResponsiveContainer></div>
      <div className="chart-foot"><span><i className="legend-dot orange-dot" />每日燃燒</span><span><i className="legend-dot moss-dot" />{Math.min(7, range)} 日移動平均</span><span><i className="legend-line" />每日目標 {goalKcal} kcal</span><span className="chart-foot-note">有訓練 {summary.activeDays} / {summary.span} 天</span></div>
      <p className="panel-note">燃燒大卡＝實際完成循環入帳的熱量，會隨遞增獎勵與裝備加成而高於「{kcalPerCycle} 大卡 × 次數」；花在推進獵徑、打怪與裝備的是可支配大卡，不會從這裡扣掉。</p>
    </section>
  );
}

function StatsScreen({ days, kcalHistory, totalCount, xp, streak, entries, transactions, kcalPerCycle, dailyGoal }: { days: DayPoint[]; kcalHistory: KcalDay[]; totalCount: number; xp: number; streak: number; entries: CycleEntry[]; transactions: ResourceTransaction[]; kcalPerCycle: number; dailyGoal: number }) {
  const chartData = days.map((day) => ({ name: day.label, 次數: day.count, 大卡: day.kcal }));
  const [resourceFilter, setResourceFilter] = useState<"all" | "kcal" | "coins">("all");
  const [kindFilter, setKindFilter] = useState<"all" | ResourceTransaction["kind"]>("all");
  const filteredTransactions = transactions.filter(transaction => (resourceFilter === "all" || transaction.resource === resourceFilter) && (kindFilter === "all" || transaction.kind === kindFilter));
  const average = Math.round(days.reduce((sum, day) => sum + day.count, 0) / 7);
  return (
    <>
      <section className="page-intro compact"><div><p className="eyebrow">FIELD NOTES / STATISTICS</p><h1>把進步畫出來。</h1><p className="intro-copy">不是追求每天完美，而是讓自己看見路徑真的在延伸。</p></div><div className="stat-stamp"><BarChart3 size={17} /><span>7 DAYS</span></div></section>
      <section className="stats-highlight"><div><span>本週總循環</span><b>{days.reduce((sum, day) => sum + day.count, 0)}</b><small>次</small></div><div><span>日均循環</span><b>{average}</b><small>次</small></div><div><span>目前連續</span><b>{streak}</b><small>日</small></div><div><span>累積 XP</span><b>{xp}</b><small>XP</small></div></section>
      <section className="panel chart-panel"><div className="panel-heading"><div><p className="eyebrow">CYCLE COUNT / KCAL</p><h3>每週循環節奏</h3></div><span className="goal-marker"><span />每日目標 {dailyGoal} 次</span></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 8, right: 0, left: -18, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e5dfd4" strokeDasharray="3 4" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#897f70", fontSize: 14, fontWeight: 700 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#b0a89c", fontSize: 13 }} allowDecimals={false} /><Tooltip cursor={{ fill: "#f3eee7" }} contentStyle={{ border: "1px solid #ded5c8", borderRadius: "12px", boxShadow: "0 10px 30px #2b292422", fontFamily: "Noto Sans TC", fontSize: 14 }} labelStyle={{ fontSize: 14 }} itemStyle={{ fontSize: 14 }} /><ReferenceLine y={dailyGoal} stroke="#d9a441" strokeDasharray="4 4" /><Bar dataKey="次數" fill="#e86a33" radius={[5, 5, 1, 1]} maxBarSize={34} /></BarChart></ResponsiveContainer></div><div className="chart-foot"><span><i className="legend-dot orange-dot" />循環次數</span><span><i className="legend-line" />目標線</span><span className="chart-foot-note">每次循環 = {kcalPerCycle} 大卡</span></div></section>
      <KcalBurnPanel history={kcalHistory} dailyGoal={dailyGoal} kcalPerCycle={kcalPerCycle} />
      <section className="panel journal-panel"><div className="panel-heading"><div><p className="eyebrow">SEVEN TRAIL MARKS</p><h3>每日記錄</h3></div><CalendarDays size={20} className="heading-icon" /></div><div className="journal-list">{days.map(day => <div className="journal-row" key={day.key}><div className="journal-date"><b>{day.label}</b><span>{shortDate(day.key)}</span></div><div className="journal-track"><span style={{ width: `${Math.min(100, (day.count / dailyGoal) * 100)}%` }} /><i style={{ left: `${Math.min(99, (day.count / dailyGoal) * 100)}%` }} /></div><div className="journal-value"><b>{day.count}</b><span>次</span></div><div className="journal-kcal"><b>{day.kcal}</b><span>kcal</span></div><div className={`journal-status ${day.count >= dailyGoal ? "done" : ""}`}>{day.count >= dailyGoal ? <Check size={13} /> : `差 ${dailyGoal - day.count} 次`}</div></div>)}</div></section>
      <section className="panel history-panel"><div className="panel-heading"><div><p className="eyebrow">LOOP LOG / DETAIL</p><h3>每次循環做了什麼？</h3></div><Footprints size={20} className="heading-icon" /></div>{entries.length === 0 ? <div className="history-empty"><Circle size={18} /><p>完成下一次循環後，時間、動作與獎勵會在這裡留下記號。</p></div> : <div className="history-list">{entries.slice(0, 12).map(entry => <article className="history-entry" key={entry.id}><div className="history-entry-time"><b>{shortDate(entry.date)}</b><span>{entry.time}</span></div><div className="history-entry-body"><div className="history-entry-rewards"><span><Flame size={12} /> {entry.kcal} kcal</span><span><Zap size={12} /> +{entry.xp} XP</span><span><Coins size={12} /> +{entry.coins}</span></div><div className="action-chips">{entry.actions.map((action, index) => <span key={`${entry.id}-${index}`}>{action}</span>)}</div></div><Check size={16} className="history-check" /></article>)}</div>}</section>
      <section className="panel transaction-panel"><div className="panel-heading"><div><p className="eyebrow">RESOURCE LEDGER / FIELD NOTES</p><h3>大卡與金幣交易紀錄</h3></div><Coins size={20} className="heading-icon" /></div><div className="transaction-filters"><label>資源<select value={resourceFilter} onChange={event => setResourceFilter(event.target.value as typeof resourceFilter)}><option value="all">全部</option><option value="kcal">大卡</option><option value="coins">金幣</option></select></label><label>用途<select value={kindFilter} onChange={event => setKindFilter(event.target.value as typeof kindFilter)}><option value="all">全部用途</option><option value="cycle">循環入帳</option><option value="trail">推進獵徑</option><option value="combat">打怪</option><option value="equipment">設備</option><option value="milestone">里程碑</option><option value="study">教檢答題</option></select></label></div><p className="transaction-note">每一筆入帳與花費都留下時間、來源與交易後餘額，讓你看見資源如何推動這趟旅程。</p>{filteredTransactions.length === 0 ? <div className="history-empty"><Circle size={18} /><p>{transactions.length === 0 ? "完成循環或使用地圖功能後，交易明細會出現在這裡。" : "目前篩選條件沒有交易紀錄。"}</p></div> : <div className="transaction-list">{filteredTransactions.slice(0, 24).map(transaction => <article className="transaction-row" key={transaction.id}><div className={`transaction-resource ${transaction.resource}`}><span>{transaction.resource === "kcal" ? <Flame size={14} /> : <Coins size={14} />}</span><b>{transaction.resource === "kcal" ? "大卡" : "金幣"}</b></div><div className="transaction-body"><b>{transaction.description}</b><small>{new Date(transaction.occurredAt).toLocaleString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}・{transaction.kind}</small></div><strong className={transaction.amountDelta >= 0 ? "positive" : "negative"}>{transaction.amountDelta >= 0 ? "+" : ""}{transaction.amountDelta}</strong><span className="transaction-balance">餘 {transaction.balanceAfter}</span></article>)}</div>}</section>
      <div className="stats-callout"><Shield size={19} /><div><b>給未來的自己</b><p>你不需要一次走完整座山。今天多完成一次，就是明天的起點。</p></div><ArrowUpRight size={17} /></div>
    </>
  );
}

async function shareTrailCard({ todayCount, dailyGoal, kcal, streak, totalCount }: { todayCount: number; dailyGoal: number; kcal: number; streak: number; totalCount: number }) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200; canvas.height = 630;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.fillStyle = "#37332e"; context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#e86a33"; context.fillRect(0, 0, 18, canvas.height);
  context.strokeStyle = "#d9a441"; context.lineWidth = 2; context.strokeRect(42, 42, canvas.width - 84, canvas.height - 84);
  context.strokeStyle = "#ffffff22"; context.lineWidth = 1; for (let x = 520; x < 1150; x += 70) { context.beginPath(); context.moveTo(x, 80); context.lineTo(x, 550); context.stroke(); }
  context.fillStyle = "#d9a441"; context.font = "700 20px 'Noto Sans TC', sans-serif"; context.fillText("FIT QUEST LOOP  /  TRAIL POSTCARD", 82, 105);
  context.fillStyle = "#fff4e7"; context.font = "400 70px 'Bree Serif', serif"; context.fillText("今天，往前走一點。", 82, 220);
  context.fillStyle = "#c6b9ab"; context.font = "500 24px 'Noto Sans TC', sans-serif"; context.fillText(`暖石谷地・今日獵徑 ${todayCount} / ${dailyGoal} 次`, 86, 270);
  const metrics = [[`${kcal}`, "大卡燃燒"], [`${streak}`, "日連續"], [`${totalCount}`, "總刻痕"]];
  metrics.forEach(([value, label], index) => { const x = 88 + index * 250; context.fillStyle = "#e86a33"; context.font = "400 45px 'Bree Serif', serif"; context.fillText(value, x, 395); context.fillStyle = "#c6b9ab"; context.font = "500 18px 'Noto Sans TC', sans-serif"; context.fillText(label, x, 430); });
  context.fillStyle = "#fff4e7"; context.font = "700 18px 'Noto Sans TC', sans-serif"; context.fillText("每一循環，都是一枚新的記號。", 82, 535);
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
  if (!blob) return;
  const file = new File([blob], `fit-quest-trail-${dateKey(new Date())}.png`, { type: "image/png" });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ title: "Fit Quest Loop 今日戰報", text: `我今天完成了 ${todayCount} 次健身循環。`, files: [file] });
    } catch (error) {
      if (!(error instanceof DOMException) || error.name !== "AbortError") toast.error("分享卡沒有送出，仍可重新嘗試。" );
    }
    return;
  }
  if (navigator.clipboard?.write && "ClipboardItem" in window) {
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast.success("戰報卡已複製。", { description: "可以直接貼到支援圖片的聊天視窗。" });
      return;
    } catch { /* fall through to text and download fallback */ }
  }
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(`Fit Quest Loop｜我今天完成了 ${todayCount} 次健身循環，燃燒 ${kcal} 大卡，累積 ${totalCount} 枚刻痕。`); } catch { /* download remains available */ }
  }
  const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = file.name; link.click(); URL.revokeObjectURL(url);
  toast.success("戰報卡已下載。", { description: "戰報文字也已嘗試複製到剪貼簿。" });
}

function PackScreen({ totalCount, coins, quest, collection, achievements, study, onReset, onShare, onOpenChest }: { totalCount: number; coins: number; quest: QuestState; collection: CollectionState; achievements: AchievementView[]; study: StudyProgress; onReset: () => void; onShare: () => void; onOpenChest: (chestId: string) => void }) {
  const totals = questTotals(quest);
  const relicCount = Object.values(collection.relics).filter(entry => entry.count > 0).length;
  return (
    <>
      <section className="page-intro compact"><div><p className="eyebrow">INVENTORY / TROPHIES</p><h1>你的戰利品。</h1><p className="intro-copy">每一次完成，都是可以帶走的證明。</p></div><div className="pack-total"><Coins size={16} /><b>{coins}</b></div></section>
      <section className="inventory-hero"><div className="inventory-copy"><span className="eyebrow light">CURRENT LOADOUT</span><h2>篝火行者</h2><p>你已經走了 {totalCount} 個循環，通過 {totals.clearedStages} 個節點，收集 {relicCount} 件戰利品。</p><div className="loadout-tags"><span><Flame size={13} /> 火種 x {Math.max(1, Math.floor(totalCount / 5))}</span><span><Coins size={13} /> {coins} 金幣</span><span><Sparkles size={13} /> {totals.totalStars} 星</span></div></div><img src={avatarUrl} alt="篝火行者角色" /></section>
      <section className="collection-summary">
        <div><span>通過節點</span><b>{totals.clearedStages}</b><small>/ 28</small></div>
        <div><span>擊倒首領</span><b>{totals.bossesDefeated}</b><small>/ 4</small></div>
        <div><span>三星節點</span><b>{totals.threeStarStages}</b><small>座</small></div>
        <div><span>開過寶箱</span><b>{collection.openedCount}</b><small>個</small></div>
      </section>
      <Codex quest={quest} collection={collection} achievements={achievements} onOpenChest={onOpenChest} />
      <section className="panel study-pack-panel"><div className="panel-heading"><div><p className="eyebrow">STUDY TRAIL / CERTIFICATION</p><h3>教檢獵徑</h3></div><BookOpen size={20} className="heading-icon" /></div><div className="study-pack-grid"><div><span>答對題數</span><b>{study.correct}</b></div><div><span>最佳連勝</span><b>{study.bestStreak}</b></div><div><span>目前章節</span><b>CH. {String(study.chapter).padStart(2, "0")}</b></div><div><span>知識寶箱</span><b>{study.chestCount}</b></div></div><p className="study-pack-note">每答對 3 題開一只知識寶箱；答對可獲得 +15 XP，在知識關卡還會對節點造成 {STUDY_ANSWER_DAMAGE} 點傷害。</p></section>
      <section className="share-card-panel"><div><p className="eyebrow light">TRAIL POSTCARD</p><h3>把今天的記號帶走。</h3><p>產生一張只屬於你的獵徑戰報，可用系統分享或下載保存。</p></div><button onClick={onShare}><Share2 size={16} /> 分享今日戰報</button></section>
      <section className="panel reset-panel"><div><p className="eyebrow">CLOUD + LOCAL SAVE</p><h3>旅程保存</h3><p>{isCloudEnabled ? "未登入時保存在這台裝置；登入後會自動同步到雲端，換裝置也能接回旅程。" : "這個版本以本機模式運作，旅程完整保存在這台裝置的瀏覽器裡。"}</p></div><button className="danger-outline" onClick={onReset}><RotateCcw size={15} /> 重置示範進度</button></section>
    </>
  );
}

export type GameEventType = "achievement" | "defeat" | "both" | "weekly" | "milestone" | "stage" | "chapter" | "chest";

function GameEventOverlay({ type, kcal, milestoneNumber, clear, chestReward, weeklyXp = 0, weeklyBonusXp = 0, weeklyKcal = 0, weeklyCycles = 0, weeklyChest = 0, onClose }: { type: GameEventType; kcal: number; milestoneNumber?: 5 | 10 | null; clear?: StageClear | null; chestReward?: ChestReward | null; weeklyXp?: number; weeklyBonusXp?: number; weeklyKcal?: number; weeklyCycles?: number; weeklyChest?: number; onClose: () => void }) {
  const weekly = type === "weekly";
  const milestone = type === "milestone";
  const stage = type === "stage" || type === "chapter";
  const chapter = type === "chapter";
  const chest = type === "chest";
  const defeated = type === "defeat" || type === "both";
  const combo = type === "both";
  const relic = clear?.relicId ? RELIC_BY_ID[clear.relicId] : null;
  const chestRelic = chestReward?.relicId ? RELIC_BY_ID[chestReward.relicId] : null;
  const variant = weekly ? "weekly-event" : milestone ? "milestone-event" : chapter ? "chapter-event" : stage ? "stage-event" : chest ? "chest-event" : defeated ? "defeat-event" : "achievement-event";
  const kicker = weekly ? "WEEKLY SETTLEMENT" : milestone ? "RARE MILESTONE CHEST" : chapter ? "CHAPTER COMPLETE" : stage ? "STAGE CLEARED" : chest ? "CHEST OPENED" : combo ? "CHAPTER COMPLETE" : defeated ? "ENCOUNTER CLEARED" : "ACHIEVEMENT UNLOCKED";
  const heading = weekly ? "本週獵徑結算！"
    : milestone ? `第 ${milestoneNumber} 次循環達成！`
    : chapter ? `${clear?.chapterName ?? ""} 全線通關！`
    : stage ? `${clear?.stage.monster ?? "節點"} 倒下了`
    : chest ? "寶箱開啟"
    : combo ? "章節完成！"
    : defeated ? "苔岩巨怪倒下了"
    : "火種守護者";
  const copy = weekly ? `你把這週 ${weeklyCycles} 次循環收進旅程，累積 ${weeklyXp} XP 與 ${weeklyKcal} 大卡，換得額外獎勵。`
    : milestone ? `關鍵里程碑已點亮。你獲得 1 個稀有寶箱與 ${milestoneNumber === 5 ? 60 : 140} 額外 XP，下一段路已經看得見。`
    : chapter ? `整章 7 個節點全部點亮，下一章已經為你打開。${relic ? `首領留下了「${relic.name}」。` : ""}`
    : stage ? `${clear?.stage.name ?? "這個節點"} 已經通過，獵徑往前推進一格。${relic ? `你撿到了「${relic.name}」。` : ""}`
    : chest ? `箱子裡是 ${chestReward?.coins ?? 0} 金幣${(chestReward?.kcal ?? 0) > 0 ? `、${chestReward?.kcal} 大卡` : ""}與 ${chestReward?.xp ?? 0} XP。${chestRelic ? `另外還有一件「${chestRelic.name}」。` : "這次沒有戰利品，下一箱再試。"}`
    : combo ? "每日成就解鎖，怪物也在同一刻倒下。這段路，正式屬於你。"
    : defeated ? "你用今天的循環擊穿了最後一格生命值。這段路，正式屬於你。"
    : "每日獵徑已完成。你留下的每一枚記號，正在變成新的習慣。";
  return (
    <div className={`game-event-overlay ${variant}`} role="dialog" aria-modal="true" aria-label={heading}>
      <div className="event-noise" />
      <div className="event-card">
        <div className="event-burst"><span /><span /><span /><span /><span /><span /></div>
        <div className="event-emblem">{weekly || milestone || chest ? <Gift size={31} /> : chapter ? <Trophy size={31} /> : stage || defeated ? <Swords size={31} /> : <Trophy size={31} />}</div>
        <p className="event-kicker">{kicker}</p>
        <h2>{heading}</h2>
        {stage && clear && <Stars value={clear.stars} size={17} />}
        <p className="event-copy">{copy}</p>
        <div className="event-rewards">
          {stage && clear ? <><span><Zap size={14} /> +{clear.rewards.xp} XP</span><span><Coins size={14} /> +{clear.rewards.coins} 金幣</span>{relic && <span className={`relic-chip ${relic.rarity}`}><Sparkles size={14} /> {relic.name}</span>}{clear.stage.chestTier && <span><Gift size={14} /> +1 {CHEST_META[clear.stage.chestTier].label}</span>}</>
          : chest ? <><span><Coins size={14} /> +{chestReward?.coins ?? 0} 金幣</span>{(chestReward?.kcal ?? 0) > 0 && <span><Flame size={14} /> +{chestReward?.kcal} 大卡</span>}<span><Zap size={14} /> +{chestReward?.xp ?? 0} XP</span>{chestRelic && <span className={`relic-chip ${chestRelic.rarity}`}><Sparkles size={14} /> {chestRelic.name}</span>}</>
          : milestone ? <><span><Gift size={14} /> +1 稀有寶箱</span><span><Sparkles size={14} /> +{milestoneNumber === 5 ? 60 : 140} XP</span><span><Flame size={14} /> 里程碑記號</span></>
          : weekly ? <><span><Gift size={14} /> +{weeklyChest} 寶箱</span><span><Zap size={14} /> {weeklyXp} XP 成果</span><span><Flame size={14} /> {weeklyKcal} 大卡成果</span><span><Sparkles size={14} /> +{weeklyBonusXp} XP 獎勵</span></>
          : <><span><Flame size={14} /> +{kcal} 大卡</span><span><Zap size={14} /> +{XP_PER_CYCLE} XP</span><span><Coins size={14} /> +{COINS_PER_CYCLE} 金幣</span></>}
        </div>
        <button onClick={onClose}>{weekly ? "打開週寶箱" : milestone ? "開啟稀有寶箱" : chapter ? "前往下一章" : stage ? "收下戰利品" : chest ? "收進圖鑑" : defeated ? "收下戰利品" : "繼續前進"} <ArrowUpRight size={16} /></button>
      </div>
    </div>
  );
}

type StageOutcome = { collection: CollectionState; transactions: ResourceTransaction[]; bonusXp: number };

/** 把一次或多次過關結果轉成獎勵入帳、圖鑑登錄與寶箱掉落。 */
function resolveStageClears(clears: StageClear[], collection: CollectionState, at: string, coinBalance: number): StageOutcome {
  let nextCollection = collection;
  const transactions: ResourceTransaction[] = [];
  let bonusXp = 0;
  let balance = coinBalance;
  clears.forEach(clear => {
    bonusXp += clear.rewards.xp;
    balance += clear.rewards.coins;
    transactions.push({ id: `stage-${clear.stage.id}`, occurredAt: at, resource: "coins", kind: "milestone", amountDelta: clear.rewards.coins, balanceAfter: balance, description: `通過關卡：${clear.stage.name}（${clear.stars} 星）`, referenceId: clear.stage.id });
    if (clear.stage.kind === "battle" || clear.stage.kind === "elite" || clear.stage.kind === "boss") nextCollection = recordDefeat(nextCollection, clear.stage.monster, at);
    if (clear.relicId) nextCollection = recordRelic(nextCollection, clear.relicId, at);
    if (clear.stage.chestTier) nextCollection = addChest(nextCollection, makeChest(clear.stage.chestTier, "stage", at, `chest-stage-${clear.stage.id}`));
    if (clear.chapterCleared) nextCollection = addChest(nextCollection, makeChest("gold", "chapter", at, `chest-chapter-${clear.stage.chapter}`));
  });
  return { collection: nextCollection, transactions, bonusXp };
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>(() => { const requested = typeof window !== "undefined" ? window.location.hash.slice(1) as TabKey : "home"; return ["home", "map", "stats", "pack", "settings", "study"].includes(requested) ? requested : "home"; });
  const [state, setState] = useState<ProgressState>(loadState);
  const [celebrate, setCelebrate] = useState(false);
  const [eventOverlay, setEventOverlay] = useState<GameEventType | null>(null);
  const [milestoneHit, setMilestoneHit] = useState<5 | 10 | null>(null);
  const [lastClear, setLastClear] = useState<StageClear | null>(null);
  const [chestReward, setChestReward] = useState<ChestReward | null>(null);
  const auth = useAuth();
  const journeyQuery = trpc.journey.get.useQuery(undefined, { enabled: isCloudEnabled && auth.isAuthenticated, retry: false });
  const syncJourney = trpc.journey.sync.useMutation();
  const hasHydratedRemote = useRef(false);
  const lastSyncedPayload = useRef("");
  const todayKey = dateKey(new Date());
  const todayCount = state.activeDate === todayKey ? (state.history[todayKey] ?? 0) : 0;
  const fillDay = (day: DayPoint): DayPoint => { const dayEntries = state.entries.filter(entry => entry.date === day.key); return { ...day, count: state.history[day.key] ?? 0, kcal: dayEntries.length > 0 ? dayEntries.reduce((sum, entry) => sum + entry.kcal, 0) : (state.history[day.key] ?? 0) * state.settings.kcalPerCycle }; };
  const days = useMemo(() => getLastDays(7).map(fillDay), [state.history, state.entries, state.settings.kcalPerCycle]);
  /* 統計頁最長看 30 天，並多取一段等長區間用來比較趨勢。 */
  const kcalHistory = useMemo(() => getLastDays(60).map(fillDay), [state.history, state.entries, state.settings.kcalPerCycle]);
  const xp = (state.entries.length > 0 ? state.entries.reduce((sum, entry) => sum + entry.xp, 0) : state.totalCount * XP_PER_CYCLE) + state.bonusXp;
  const level = Math.floor(xp / 100) + 1;
  const coins = coinBalanceFromLedger(state.transactions, state.entries.length > 0 ? state.entries.reduce((sum, entry) => sum + entry.coins, 0) : state.totalCount * COINS_PER_CYCLE);
  const todayEntries = useMemo(() => state.entries.filter(entry => entry.date === todayKey), [state.entries, todayKey]);
  const streak = useMemo(() => getStreak(state.history), [state.history]);
  const achievements = useMemo(() => evaluateAchievements(achievementInput(state)), [state]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    setState(current => {
      const ensured = ensureDailyQuest(current.quest, todayKey, DAILY_QUEST_SALT, current.settings.dailyGoal);
      return ensured === current.quest ? current : { ...current, quest: ensured };
    });
  }, [todayKey, state.settings.dailyGoal]);

  useEffect(() => {
    if (!shouldResetDaily(state.activeDate, todayKey)) return;
    setState(current => ({ ...current, activeDate: todayKey, currentWeekKey: getWeekKey(new Date()), history: { ...current.history, [todayKey]: 0 }, trailProgress: { ...current.trailProgress, [todayKey]: 0 }, combatDamage: { ...current.combatDamage, [todayKey]: 0 }, milestonesClaimed: [] }));
  }, [state.activeDate, todayKey]);

  useEffect(() => {
    const weekKey = getWeekKey(new Date());
    const previousWeek = state.currentWeekKey;
    if (!previousWeek || previousWeek === weekKey || state.lastSettledWeek === previousWeek) return;
    const weeklyEntries = state.entries.filter(entry => getWeekKey(dateFromKey(entry.date)) === previousWeek);
    const weeklyCycles = Object.entries(state.history).filter(([key]) => getWeekKey(dateFromKey(key)) === previousWeek).reduce((sum, [, count]) => sum + count, 0);
    const weeklyXp = weeklyEntries.reduce((sum, entry) => sum + entry.xp, 0);
    const weeklyKcal = weeklyEntries.reduce((sum, entry) => sum + entry.kcal, 0);
    const bonus = weeklyRewardFromProgress(weeklyXp, weeklyKcal, state.equipment);
    setState(current => ({ ...current, currentWeekKey: weekKey, lastSettledWeek: previousWeek, bonusXp: current.bonusXp + bonus, weeklyChestCount: current.weeklyChestCount + 1, collection: addChest(current.collection, makeChest("silver", "weekly", new Date().toISOString(), `chest-weekly-${previousWeek}`)), weeklySettlement: { weekKey: previousWeek, cycles: weeklyCycles, actualXp: weeklyXp, bonusXp: bonus, chest: 1, kcal: weeklyKcal } }));
    setEventOverlay("weekly");
    if (state.settings.soundEnabled) playAchievementSound();
    window.setTimeout(() => setEventOverlay(null), 2600);
  }, [state.currentWeekKey, state.lastSettledWeek]);

  useEffect(() => {
    if (!auth.isAuthenticated || !journeyQuery.data || hasHydratedRemote.current) return;
    hasHydratedRemote.current = true;
    const isDemoState = state.entries.length === 0 && state.totalCount === 33;
    if (journeyQuery.data.exists) {
      const remote = journeyQuery.data.profile;
      const remoteEntries: CycleEntry[] = journeyQuery.data.cycles.map(cycle => ({ id: cycle.localId, date: cycle.localDate, time: new Date(cycle.performedAt).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" }), performedAt: new Date(cycle.performedAt).toISOString(), kcal: cycle.kcal, xp: cycle.xp, coins: cycle.coins, actions: cycle.actions }));
      const localEntries = isDemoState ? [] : state.entries;
      const mergedById = new globalThis.Map<string, CycleEntry>([...localEntries, ...remoteEntries].map(entry => [entry.id, entry] as const));
      const mergedEntries: CycleEntry[] = Array.from(mergedById.values()) as CycleEntry[];
      mergedEntries.sort((a, b) => (b.performedAt ?? `${b.date}T${b.time}`).localeCompare(a.performedAt ?? `${a.date}T${a.time}`));
      const mergedHistory = isDemoState ? {} : { ...state.history };
      mergedEntries.forEach(entry => { mergedHistory[entry.date] = (mergedHistory[entry.date] ?? 0) + (localEntries.some(local => local.id === entry.id) ? 0 : 1); });
      const remoteStudy = remote.study ?? { solved: 0, correct: 0, streak: 0, bestStreak: 0, chapter: 1, chestCount: 0 };
      const remoteTransactions: ResourceTransaction[] = journeyQuery.data.transactions.map(transaction => ({ id: transaction.localId, occurredAt: new Date(transaction.occurredAt).toISOString(), resource: transaction.resource, kind: transaction.kind, amountDelta: transaction.amountDelta, balanceAfter: transaction.balanceAfter, description: transaction.description, referenceId: transaction.referenceId ?? undefined }));
      const remoteHasCoinLedger = remoteTransactions.some(transaction => transaction.resource === "coins");
      const localHasCoinLedger = state.transactions.some(transaction => transaction.resource === "coins");
      const localCoinBalance = resourceBalanceFromLedger(state.transactions, "coins");
      const remoteOpeningAmount = remoteLegacyCoinOpeningAmount(remote.coins, localCoinBalance, localHasCoinLedger, remoteHasCoinLedger);
      const remoteOpening = remoteOpeningAmount > 0 ? legacyCoinOpeningTransaction(remoteOpeningAmount, false, new Date().toISOString(), "legacy-coins-remote-opening-v1") : null;
      const hydratedRemoteTransactions = mergeTransactionLedgers(state.transactions, remoteOpening ? [remoteOpening, ...remoteTransactions] : remoteTransactions);
      setState({ ...state, history: mergedHistory, totalCount: Math.max(remote.totalCount, state.totalCount, mergedEntries.length), settings: { dailyGoal: remote.dailyGoal, kcalPerCycle: remote.kcalPerCycle, difficulty: remote.difficulty, actions: remote.actions, soundEnabled: remote.soundEnabled, reminderEnabled: remote.reminderEnabled, reminderTime: remote.reminderTime }, entries: mergedEntries, kcalBalance: Math.max(remote.kcalBalance, state.kcalBalance), kcalSpent: Math.max(remote.kcalSpent, state.kcalSpent), equipment: remote.equipment, activeDate: remote.activeDate || todayKey, currentWeekKey: remote.currentWeekKey || getWeekKey(new Date()), lastSettledWeek: remote.lastSettledWeek ?? undefined, weeklyChestCount: remote.weeklyChestCount, rareChestCount: remote.rareChestCount ?? state.rareChestCount, milestonesClaimed: remote.milestonesClaimed ?? state.milestonesClaimed, transactions: hydratedRemoteTransactions, bonusXp: remote.xp - remote.totalCount * XP_PER_CYCLE, study: { solved: Math.max(state.study.solved, remoteStudy.solved), correct: Math.max(state.study.correct, remoteStudy.correct), streak: Math.max(state.study.streak, remoteStudy.streak), bestStreak: Math.max(state.study.bestStreak, remoteStudy.bestStreak), chapter: Math.max(state.study.chapter, remoteStudy.chapter), chestCount: Math.max(state.study.chestCount, remoteStudy.chestCount) }, quest: mergeQuests(state.quest, hydrateQuest(remote.quest)), collection: mergeCollections(state.collection, hydrateCollection(remote.collection)), trailProgress: state.trailProgress, combatDamage: state.combatDamage, weeklySettlement: null });
      toast.success("雲端旅程已合併。", { description: `本機與雲端共 ${mergedEntries.length} 筆循環，重複記號已去除` });
    } else {
      const initialState = isDemoState ? { ...state, history: { [todayKey]: 0 }, totalCount: 0, entries: [] } : state;
      if (isDemoState) setState(initialState);
      syncJourney.mutate(toCloudPayload(initialState));
      toast.info("已將這台裝置的旅程保存到雲端。");
    }
  }, [auth.isAuthenticated, journeyQuery.data]);

  useEffect(() => {
    if (!state.settings.reminderEnabled || typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
    const now = new Date();
    const [hour, minute] = state.settings.reminderTime.split(":").map(Number);
    const target = new Date(now); target.setHours(hour, minute, 0, 0);
    const reminderKey = `fit-quest-reminded-${todayKey}`;
    if (now >= target && todayCount < state.settings.dailyGoal && !window.localStorage.getItem(reminderKey)) {
      new Notification("Fit Quest Loop｜獵徑還在等你", { body: `今天還差 ${state.settings.dailyGoal - todayCount} 次循環，回來點亮下一枚記號吧。` });
      window.localStorage.setItem(reminderKey, "1");
    }
  }, [state.settings.reminderEnabled, state.settings.reminderTime, state.settings.dailyGoal, todayCount, todayKey]);

  useEffect(() => {
    if (!auth.isAuthenticated || !hasHydratedRemote.current) return;
    const payload = toCloudPayload(state);
    const serialized = JSON.stringify(payload);
    if (serialized === lastSyncedPayload.current) return;
    lastSyncedPayload.current = serialized;
    syncJourney.mutate(payload);
  }, [auth.isAuthenticated, state]);

  const addCycle = () => {
    const previousCount = todayCount;
    const now = new Date();
    const occurredAt = now.toISOString();
    const rewards = cycleRewards(XP_PER_CYCLE, state.settings.kcalPerCycle, COINS_PER_CYCLE, previousCount + 1, state.equipment);
    const earnedKcal = rewards.kcal;
    const earnedCoins = rewards.coins + setCycleCoinBonus(state.equipment);
    const entry: CycleEntry = { id: `${now.getTime()}`, date: todayKey, time: now.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" }), performedAt: occurredAt, actions: [...state.settings.actions], kcal: earnedKcal, xp: rewards.xp, coins: earnedCoins };
    const milestoneEvent = dailyMilestoneEvent(previousCount + 1, state.milestonesClaimed);
    const milestone = milestoneEvent?.milestone ?? null;
    const milestoneXp = milestoneEvent?.bonusXp ?? 0;
    const targetStage = currentStage(state.quest);
    const stageDamage = damagePerCycle(state.equipment);
    const damaged = applyStageDamage(state.quest, stageDamage, { difficulty: state.settings.difficulty, equipment: state.equipment, at: occurredAt, cycles: 1 });
    const outcome = resolveStageClears(damaged.clears, state.collection, occurredAt, coins + earnedCoins);
    const questWithDaily = advanceDailyQuest(advanceDailyQuest(advanceDailyQuest(damaged.quest, "cycles", 1, todayKey), "kcal", earnedKcal, todayKey), "combat", stageDamage, todayKey);
    const transaction: ResourceTransaction = { id: `cycle-${entry.id}`, occurredAt, resource: "kcal", kind: "cycle", amountDelta: earnedKcal, balanceAfter: state.kcalBalance + earnedKcal, description: `第 ${previousCount + 1} 次循環入帳`, referenceId: entry.id };
    const coinTransaction: ResourceTransaction = { id: `cycle-coins-${entry.id}`, occurredAt, resource: "coins", kind: "cycle", amountDelta: earnedCoins, balanceAfter: coins + earnedCoins, description: `第 ${previousCount + 1} 次循環金幣獎勵`, referenceId: entry.id };
    const milestoneTransactions: ResourceTransaction[] = milestone ? [{ id: `milestone-${entry.id}`, occurredAt, resource: "kcal", kind: "milestone", amountDelta: 0, balanceAfter: state.kcalBalance + earnedKcal, description: `第 ${milestone} 次循環稀有寶箱`, referenceId: entry.id }] : [];
    setState(current => ({
      ...current,
      history: { ...current.history, [todayKey]: (current.history[todayKey] ?? 0) + 1 },
      totalCount: current.totalCount + 1,
      bonusXp: current.bonusXp + milestoneXp + outcome.bonusXp,
      kcalBalance: current.kcalBalance + earnedKcal,
      activeDate: todayKey,
      entries: [entry, ...current.entries],
      transactions: [...outcome.transactions.slice().reverse(), coinTransaction, transaction, ...milestoneTransactions, ...current.transactions],
      milestonesClaimed: milestone ? [...current.milestonesClaimed, milestone] : current.milestonesClaimed,
      rareChestCount: current.rareChestCount + (milestone ? 1 : 0),
      quest: questWithDaily,
      collection: milestone ? addChest(outcome.collection, makeChest("gold", "milestone", occurredAt, `chest-milestone-${todayKey}-${milestone}`)) : outcome.collection,
    }));
    setCelebrate(true);
    window.setTimeout(() => setCelebrate(false), 540);
    const nextCount = previousCount + 1;
    const dailyCleared = nextCount >= state.settings.dailyGoal && previousCount < state.settings.dailyGoal;
    const chapterClear = damaged.clears.find(clear => clear.chapterCleared) ?? null;
    const stageClear = damaged.clears[damaged.clears.length - 1] ?? null;
    if (state.settings.soundEnabled) {
      if (stageClear && dailyCleared) { playDefeatSound(); window.setTimeout(playAchievementSound, 190); } else if (stageClear) playDefeatSound(); else if (dailyCleared) playAchievementSound(); else playCycleSound();
    }
    if (chapterClear) { setLastClear(chapterClear); setEventOverlay("chapter"); }
    else if (stageClear) { setLastClear(stageClear); setEventOverlay("stage"); }
    else if (milestone) { setMilestoneHit(milestone); setEventOverlay("milestone"); }
    else if (dailyCleared) setEventOverlay("achievement");
    if (stageClear) window.setTimeout(() => { setEventOverlay(null); setLastClear(null); }, 2800);
    else if (milestone) window.setTimeout(() => { setEventOverlay(null); setMilestoneHit(null); }, 2600);
    else if (dailyCleared) window.setTimeout(() => setEventOverlay(null), 1800);
    toast.success(dailyCleared ? "今天任務完成！" : "獵徑向前延伸了一格。", {
      description: `+${earnedKcal} 大卡 · +${rewards.xp} XP · +${earnedCoins} 金幣 · 對${targetStage?.monster ?? "獵徑"}造成 ${stageDamage} 傷害`,
      action: { label: "撤銷", onClick: () => setState(current => {
        const rollback = removeCycleFromLedger(current.entries, entry.id);
        const restored = revertStageDamage(current.quest, stageDamage, 1);
        if (!restored.reverted) toast.info("已過關的節點不會收回。", { description: "循環紀錄與獎勵已撤銷，關卡進度保留。" });
        return { ...current, history: { ...current.history, [todayKey]: previousCount }, totalCount: Math.max(0, current.totalCount - 1), kcalBalance: Math.max(0, current.kcalBalance - rollback.removedRewards.kcal), entries: rollback.entries, quest: restored.quest, transactions: current.transactions.filter(item => item.id !== `cycle-${entry.id}` && item.id !== `cycle-coins-${entry.id}`) };
      }) },
    });
  };

  const spendKcal = (kind: "trail" | "combat", amount: number) => {
    if (state.kcalBalance < amount) { toast.info(`還需要 ${amount - state.kcalBalance} 大卡，先完成更多循環吧。`); return; }
    const stage = currentStage(state.quest);
    if (!stage) { toast.info("28 個節點都已經走完，這條獵徑不再需要大卡了。"); return; }
    const now = new Date();
    const occurredAt = now.toISOString();
    const damage = kcalAttackDamage(amount, state.equipment, kind === "trail" ? TRAIL_KCAL_RATIO : COMBAT_KCAL_RATIO);
    const damaged = applyStageDamage(state.quest, damage, { difficulty: state.settings.difficulty, equipment: state.equipment, at: occurredAt, cycles: 0 });
    const outcome = resolveStageClears(damaged.clears, state.collection, occurredAt, coins);
    const questWithDaily = advanceDailyQuest(damaged.quest, "combat", damage, todayKey);
    const transaction: ResourceTransaction = { id: `${kind}-${now.getTime()}`, occurredAt, resource: "kcal", kind, amountDelta: -amount, balanceAfter: state.kcalBalance - amount, description: kind === "trail" ? `推進獵徑：${stage.name}` : `發動攻擊：${stage.monster}`, referenceId: stage.id };
    setState(current => ({
      ...current,
      kcalBalance: current.kcalBalance - amount,
      kcalSpent: current.kcalSpent + amount,
      bonusXp: current.bonusXp + outcome.bonusXp,
      transactions: [...outcome.transactions.slice().reverse(), transaction, ...current.transactions],
      quest: questWithDaily,
      collection: outcome.collection,
      trailProgress: kind === "trail" ? { ...current.trailProgress, [todayKey]: (current.trailProgress[todayKey] ?? 0) + damage } : current.trailProgress,
      combatDamage: kind === "combat" ? { ...current.combatDamage, [todayKey]: (current.combatDamage[todayKey] ?? 0) + damage } : current.combatDamage,
    }));
    const chapterClear = damaged.clears.find(clear => clear.chapterCleared) ?? null;
    const stageClear = damaged.clears[damaged.clears.length - 1] ?? null;
    if (stageClear) {
      if (state.settings.soundEnabled) playDefeatSound();
      setLastClear(chapterClear ?? stageClear);
      setEventOverlay(chapterClear ? "chapter" : "stage");
      window.setTimeout(() => { setEventOverlay(null); setLastClear(null); }, 2800);
    }
    toast.success(kind === "trail" ? "獵徑向前亮起一段。" : "重擊命中，怪物退後了。", { description: `−${amount} 大卡換成 ${damage} 點傷害。` });
  };

  const openChestById = (chestId: string) => {
    const occurredAt = new Date().toISOString();
    const result = applyChestOpening(state.collection, chestId, occurredAt);
    if (!result.reward) { toast.info("這個寶箱已經開過了。"); return; }
    const reward = result.reward;
    const coinTransaction: ResourceTransaction = { id: `chest-coins-${chestId}`, occurredAt, resource: "coins", kind: "milestone", amountDelta: reward.coins, balanceAfter: coins + reward.coins, description: `開啟寶箱：+${reward.coins} 金幣`, referenceId: chestId };
    const kcalTransactions: ResourceTransaction[] = reward.kcal > 0 ? [{ id: `chest-kcal-${chestId}`, occurredAt, resource: "kcal", kind: "milestone", amountDelta: reward.kcal, balanceAfter: state.kcalBalance + reward.kcal, description: `開啟寶箱：+${reward.kcal} 大卡`, referenceId: chestId }] : [];
    setState(current => ({ ...current, collection: result.collection, bonusXp: current.bonusXp + reward.xp, kcalBalance: current.kcalBalance + reward.kcal, transactions: [coinTransaction, ...kcalTransactions, ...current.transactions] }));
    if (state.settings.soundEnabled) playAchievementSound();
    setChestReward(reward);
    setEventOverlay("chest");
    window.setTimeout(() => { setEventOverlay(null); setChestReward(null); }, 3000);
  };

  const claimDaily = () => {
    const claimed = claimDailyQuest(state.quest);
    if (!claimed.reward) { toast.info("每日支線還沒完成，先把進度走完吧。"); return; }
    const occurredAt = new Date().toISOString();
    const reward = claimed.reward;
    const transaction: ResourceTransaction = { id: `daily-${todayKey}`, occurredAt, resource: "coins", kind: "milestone", amountDelta: reward.coins, balanceAfter: coins + reward.coins, description: `每日支線獎勵 +${reward.coins} 金幣`, referenceId: `daily-${todayKey}` };
    setState(current => ({ ...current, quest: claimed.quest, bonusXp: current.bonusXp + reward.xp, transactions: [transaction, ...current.transactions], collection: addChest(current.collection, makeChest(reward.chest, "daily", occurredAt, `chest-daily-${todayKey}`)) }));
    toast.success("每日支線完成！", { description: `+${reward.coins} 金幣・+${reward.xp} XP・獲得一個${CHEST_META[reward.chest].label}` });
  };

  const answerStudyQuestion = (correct: boolean) => {
    const occurredAt = new Date().toISOString();
    const studyCoins = correct ? studyCoinReward(8, state.equipment) : 0;
    const stage = currentStage(state.quest);
    const studyDamage = correct && stage?.kind === "study" ? STUDY_ANSWER_DAMAGE : 0;
    const damaged = studyDamage > 0 ? applyStageDamage(state.quest, studyDamage, { difficulty: state.settings.difficulty, equipment: state.equipment, at: occurredAt, cycles: 0 }) : { quest: state.quest, clears: [] as StageClear[] };
    const outcome = resolveStageClears(damaged.clears, state.collection, occurredAt, coins + studyCoins);
    const questWithDaily = correct ? advanceDailyQuest(damaged.quest, "study", 1, todayKey) : damaged.quest;
    setState(current => {
      const nextStudy = applyStudyAnswer(current.study, correct);
      const earnedChest = nextStudy.chestCount > current.study.chestCount;
      const collection = earnedChest ? addChest(outcome.collection, makeChest("wood", "study", occurredAt, `chest-study-${nextStudy.chestCount}`)) : outcome.collection;
      return {
        ...current,
        bonusXp: current.bonusXp + (correct ? 15 : 0) + outcome.bonusXp,
        transactions: correct
          ? [...outcome.transactions.slice().reverse(), { id: `study-coins-${Date.now()}`, occurredAt, resource: "coins" as const, kind: "study" as const, amountDelta: studyCoins, balanceAfter: coins + studyCoins, description: `教檢答對獎勵 +${studyCoins} 金幣`, referenceId: "teacher-certification" }, ...current.transactions]
          : current.transactions,
        study: nextStudy,
        quest: questWithDaily,
        collection,
      };
    });
    const stageClear = damaged.clears[damaged.clears.length - 1] ?? null;
    if (stageClear) {
      if (state.settings.soundEnabled) playDefeatSound();
      setLastClear(damaged.clears.find(clear => clear.chapterCleared) ?? stageClear);
      setEventOverlay(damaged.clears.some(clear => clear.chapterCleared) ? "chapter" : "stage");
      window.setTimeout(() => { setEventOverlay(null); setLastClear(null); }, 2800);
    }
  };

  const buyEquipment = (item: Equipment) => {
    if (!canPurchaseEquipment(coins, item.cost, item.id, state.equipment)) return;
    if (coins < item.cost) { toast.info(`還差 ${item.cost - coins} 金幣才能換取${item.name}。`); return; }
    const now = new Date();
    const transaction: ResourceTransaction = { id: `equipment-${item.id}-${now.getTime()}`, occurredAt: now.toISOString(), resource: "coins", kind: "equipment", amountDelta: -item.cost, balanceAfter: coins - item.cost, description: `購買裝備：${item.name}`, referenceId: item.id };
    setState(current => ({ ...current, transactions: [transaction, ...current.transactions], equipment: [...current.equipment, item.id] }));
    toast.success(`${item.name} 已加入裝備。`, { description: item.bonus });
  };

  const resetProgress = () => {
    setState(makeSeedState());
    setActiveTab("home");
    toast.info("已重新點燃示範旅程。你可以從今天開始記錄。", { icon: <RotateCcw size={16} /> });
  };

  return (
    <div className={`app-shell ${celebrate ? "celebrating" : ""}`}>
      <LeftRail activeTab={activeTab} onChange={setActiveTab} level={level} streak={streak} />
      <div className="app-body">
        <Header level={level} coins={coins} onReset={resetProgress} isAuthenticated={auth.isAuthenticated} cloudEnabled={isCloudEnabled} onAuthAction={() => { if (auth.isAuthenticated) { void auth.logout(); } else { startLogin(); } }} />
        <main className="main-content">
          {activeTab === "home" && <HomeScreen days={days} todayCount={todayCount} totalCount={state.totalCount} xp={xp} level={level} coins={coins} streak={streak} settings={state.settings} kcalBalance={state.kcalBalance} todayKcal={todayEntries.length > 0 ? todayEntries.reduce((sum, entry) => sum + entry.kcal, 0) : todayCount * state.settings.kcalPerCycle} equipment={state.equipment} quest={state.quest} onAdd={addCycle} onOpenMap={() => setActiveTab("map")} />}
          {activeTab === "stats" && <StatsScreen days={days} kcalHistory={kcalHistory} totalCount={state.totalCount} xp={xp} streak={streak} entries={state.entries} transactions={state.transactions} kcalPerCycle={state.settings.kcalPerCycle} dailyGoal={state.settings.dailyGoal} />}
          {activeTab === "map" && <QuestMapScreen quest={state.quest} collection={state.collection} difficulty={state.settings.difficulty} equipment={state.equipment} kcalBalance={state.kcalBalance} coins={coins} trailCost={routeActionCost(20, state.equipment)} combatCost={combatActionCost(30, state.equipment)} onSpend={spendKcal} onBuy={buyEquipment} onClaimDaily={claimDaily} />}
          {activeTab === "pack" && <PackScreen totalCount={state.totalCount} coins={coins} quest={state.quest} collection={state.collection} achievements={achievements} study={state.study} onReset={resetProgress} onOpenChest={openChestById} onShare={() => shareTrailCard({ todayCount, dailyGoal: state.settings.dailyGoal, kcal: todayEntries.length > 0 ? todayEntries.reduce((sum, entry) => sum + entry.kcal, 0) : todayCount * state.settings.kcalPerCycle, streak, totalCount: state.totalCount })} />}
          {activeTab === "settings" && <SettingsScreen settings={state.settings} todayCount={todayCount} onSave={nextSettings => setState(current => ({ ...current, settings: nextSettings }))} />}
          {activeTab === "study" && <TeacherPrepScreen progress={state.study} onAnswer={answerStudyQuestion} />}
        </main>
        <footer className="desktop-footer"><span>FIT QUEST LOOP</span><span>每一循環，都是一枚新的記號。</span><span>v0.1 / LOCAL TRAIL</span></footer>
      </div>
      <BottomNav activeTab={activeTab} onChange={setActiveTab} />
      <div className="celebration-spark spark-one"><Plus size={15} /></div><div className="celebration-spark spark-two"><Sparkles size={15} /></div><div className="celebration-spark spark-three"><Circle size={9} fill="currentColor" /></div>
      {eventOverlay && <GameEventOverlay type={eventOverlay} kcal={state.settings.kcalPerCycle} milestoneNumber={milestoneHit} clear={lastClear} chestReward={chestReward} weeklyXp={state.weeklySettlement?.actualXp} weeklyBonusXp={state.weeklySettlement?.bonusXp} weeklyKcal={state.weeklySettlement?.kcal} weeklyCycles={state.weeklySettlement?.cycles} weeklyChest={state.weeklySettlement?.chest} onClose={() => { setEventOverlay(null); setLastClear(null); setChestReward(null); setMilestoneHit(null); }} />}
    </div>
  );
}
