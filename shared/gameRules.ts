export type GameEquipmentId = "trail-boots" | "ember-flask" | "field-compass" | "hunter-charm" | "battle-bracer" | "study-satchel";
export type StudyProgressShape = { solved: number; correct: number; streak: number; bestStreak: number; chapter: number; chestCount: number };

export const EQUIPMENT_RULES = {
  "trail-boots": { routeDiscount: 5 },
  "ember-flask": { cycleKcalBonus: 5 },
  "field-compass": { weeklyXpBonus: 50 },
  "hunter-charm": { cycleCoinsBonus: 4 },
  "battle-bracer": { combatDiscount: 8 },
  "study-satchel": { studyCoinsBonus: 5 },
} as const;

export const DAILY_REWARD_STEP = 0.1;
export const DAILY_REWARD_CAP_MULTIPLIER = 2;

export function progressiveReward(base: number, cycleNumber: number) {
  const safeCycle = Math.max(1, Math.floor(cycleNumber));
  const multiplier = Math.min(DAILY_REWARD_CAP_MULTIPLIER, 1 + (safeCycle - 1) * DAILY_REWARD_STEP);
  return Math.max(1, Math.floor(base * multiplier));
}

export function cycleRewards(baseXp: number, baseKcal: number, baseCoins: number, cycleNumber: number, equipment: string[]) {
  return {
    xp: progressiveReward(baseXp, cycleNumber),
    kcal: cycleKcalGain(progressiveReward(baseKcal, cycleNumber), equipment),
    coins: progressiveReward(baseCoins, cycleNumber) + (equipment.includes("hunter-charm") ? EQUIPMENT_RULES["hunter-charm"].cycleCoinsBonus : 0),
  };
}

export function cycleKcalGain(baseKcal: number, equipment: string[]) {
  return baseKcal + (equipment.includes("ember-flask") ? EQUIPMENT_RULES["ember-flask"].cycleKcalBonus : 0);
}

export function routeActionCost(baseCost: number, equipment: string[]) {
  return Math.max(0, baseCost - (equipment.includes("trail-boots") ? EQUIPMENT_RULES["trail-boots"].routeDiscount : 0));
}

export function combatActionCost(baseCost: number, equipment: string[]) {
  return Math.max(0, baseCost - (equipment.includes("battle-bracer") ? EQUIPMENT_RULES["battle-bracer"].combatDiscount : 0));
}

export function studyCoinReward(baseCoins: number, equipment: string[]) {
  return baseCoins + (equipment.includes("study-satchel") ? EQUIPMENT_RULES["study-satchel"].studyCoinsBonus : 0);
}

export function legacyCoinOpeningBalance(totalCount: number, entryCoins: number[]) {
  if (entryCoins.length > 0) return Math.max(0, entryCoins.reduce((sum, coins) => sum + Math.max(0, coins), 0));
  return Math.max(0, Math.floor(totalCount) * 10);
}

export function legacyCoinOpeningTransaction(balance: number, hasCoinLedger: boolean, occurredAt: string, id = "legacy-coins-opening-v1") {
  if (hasCoinLedger || balance <= 0) return null;
  return { id, occurredAt, resource: "coins" as const, kind: "milestone" as const, amountDelta: Math.floor(balance), balanceAfter: Math.floor(balance), description: "舊版旅程金幣轉入", referenceId: "legacy-migration" };
}

export function remoteLegacyCoinOpeningAmount(profileCoins: number, localCoinBalance: number, localHasCoinLedger: boolean, remoteHasCoinLedger: boolean) {
  if (remoteHasCoinLedger || profileCoins <= localCoinBalance) return 0;
  return Math.max(0, Math.floor(profileCoins) - (localHasCoinLedger ? Math.floor(localCoinBalance) : 0));
}

export function canPurchaseEquipment(balance: number, cost: number, equipmentId: string, owned: string[]) {
  return balance >= cost && !owned.includes(equipmentId);
}

export function mergeTransactionLedgers<T extends { id: string; occurredAt: string }>(local: T[], remote: T[]) {
  const merged = new Map<string, T>([...local, ...remote].map(transaction => [transaction.id, transaction] as const));
  return Array.from(merged.values()).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

export function resourceBalanceFromLedger<T extends { resource: string; amountDelta: number }>(transactions: T[], resource: string) {
  return transactions.filter(transaction => transaction.resource === resource).reduce((sum, transaction) => sum + transaction.amountDelta, 0);
}

export function coinBalanceFromLedger<T extends { resource: string; amountDelta: number }>(transactions: T[], fallbackBalance: number) {
  const hasCoinLedger = transactions.some(transaction => transaction.resource === "coins");
  return hasCoinLedger ? resourceBalanceFromLedger(transactions, "coins") : Math.max(0, fallbackBalance);
}

export function buildResourceSyncSnapshot<T extends { id: string; occurredAt: string; resource: string; amountDelta: number; balanceAfter: number; description: string; referenceId?: string }>(transactions: T[], fallbackCoins: number, localDateFor: (occurredAt: string) => string = occurredAt => occurredAt.slice(0, 10), additionalTransactions: T[] = []) {
  const dedupedTransactions = mergeTransactionLedgers(transactions, additionalTransactions);
  return {
    coins: coinBalanceFromLedger(dedupedTransactions, fallbackCoins),
    transactions: dedupedTransactions.map(transaction => ({ ...transaction, localDate: localDateFor(transaction.occurredAt) })),
  };
}

export function buildJourneySyncPayload<TSetting, TStudy, TQuest, TCollection, TEntry, TEntryOut, TTransaction extends { id: string; occurredAt: string; resource: string; amountDelta: number; balanceAfter: number; description: string; referenceId?: string }>(input: {
  settings: TSetting; totalCount: number; xp: number; streak: number; currentChapter: number; unlockedAchievements: string[]; kcalBalance: number; kcalSpent: number; equipment: string[]; activeDate: string; currentWeekKey: string; lastSettledWeek: string | null; weeklyChestCount: number; rareChestCount: number; milestonesClaimed: number[]; study: TStudy; quest: TQuest; collection: TCollection; entries: TEntry[]; transactions: TTransaction[]; additionalTransactions?: TTransaction[]; fallbackCoins: number; localDateFor?: (occurredAt: string) => string; serializeEntry: (entry: TEntry) => TEntryOut;
}) {
  const resourceSnapshot = buildResourceSyncSnapshot(input.transactions, input.fallbackCoins, input.localDateFor, input.additionalTransactions);
  return {
    settings: input.settings,
    totalCount: input.totalCount,
    xp: input.xp,
    coins: resourceSnapshot.coins,
    streak: input.streak,
    currentChapter: input.currentChapter,
    unlockedAchievements: input.unlockedAchievements,
    kcalBalance: input.kcalBalance,
    kcalSpent: input.kcalSpent,
    equipment: input.equipment,
    activeDate: input.activeDate,
    currentWeekKey: input.currentWeekKey,
    lastSettledWeek: input.lastSettledWeek,
    weeklyChestCount: input.weeklyChestCount,
    rareChestCount: input.rareChestCount,
    milestonesClaimed: input.milestonesClaimed,
    study: input.study,
    quest: input.quest,
    collection: input.collection,
    transactions: resourceSnapshot.transactions,
    entries: input.entries.map(input.serializeEntry),
  };
}

export function weeklyReward(cycles: number, equipment: string[]) {
  return 100 + Math.min(200, Math.max(0, cycles) * 5) + (equipment.includes("field-compass") ? EQUIPMENT_RULES["field-compass"].weeklyXpBonus : 0);
}

export function weeklyRewardFromProgress(weeklyXp: number, weeklyKcal: number, equipment: string[]) {
  const xpBonus = Math.min(200, Math.max(0, Math.floor(weeklyXp * 0.2)));
  const kcalBonus = Math.min(200, Math.max(0, Math.floor(weeklyKcal * 0.05)));
  return 100 + xpBonus + kcalBonus + (equipment.includes("field-compass") ? EQUIPMENT_RULES["field-compass"].weeklyXpBonus : 0);
}

export function weeklyRewardFromXp(weeklyXp: number, equipment: string[]) {
  return weeklyRewardFromProgress(weeklyXp, 0, equipment);
}

export type CycleRewardEntry = { id: string; xp: number; kcal: number; coins: number };

export function removeCycleFromLedger<T extends CycleRewardEntry>(entries: T[], id: string) {
  const removed = entries.find(entry => entry.id === id);
  return { entries: entries.filter(entry => entry.id !== id), removedRewards: removed ? { xp: removed.xp, kcal: removed.kcal, coins: removed.coins } : { xp: 0, kcal: 0, coins: 0 } };
}

export function applyStudyAnswer(progress: StudyProgressShape, correct: boolean): StudyProgressShape {
  const streak = correct ? progress.streak + 1 : 0;
  const correctTotal = progress.correct + (correct ? 1 : 0);
  return { ...progress, solved: progress.solved + 1, correct: correctTotal, streak, bestStreak: Math.max(progress.bestStreak, streak), chapter: Math.min(3, Math.floor(correctTotal / 3) + 1), chestCount: progress.chestCount + (correct && streak > 0 && streak % 3 === 0 ? 1 : 0) };
}

export function shouldResetDaily(activeDate: string, today: string) {
  return Boolean(activeDate) && activeDate !== today;
}

export type DailyMilestone = 5 | 10;

export function dailyMilestoneAt(cycleNumber: number, claimed: number[] = []): DailyMilestone | null {
  const normalized = Math.floor(cycleNumber);
  if ((normalized === 5 || normalized === 10) && !claimed.includes(normalized)) return normalized;
  return null;
}

export function dailyMilestoneReward(milestone: DailyMilestone) {
  return { rareChest: 1, bonusXp: milestone === 5 ? 60 : 140 };
}

export function dailyMilestoneEvent(cycleNumber: number, claimed: number[] = []) {
  const milestone = dailyMilestoneAt(cycleNumber, claimed);
  if (!milestone) return null;
  return { milestone, ...dailyMilestoneReward(milestone), animation: milestone === 5 ? "fifth-cycle" as const : "tenth-cycle" as const };
}
