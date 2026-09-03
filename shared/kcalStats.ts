/** 每日燃燒大卡統計。純函式，與畫面無關，方便測試。 */

export type KcalDay = { key: string; label: string; count: number; kcal: number; isToday: boolean };

export const KCAL_RANGES = [7, 14, 30] as const;
export type KcalRange = (typeof KCAL_RANGES)[number];

/** 每日燃燒目標＝每日目標循環次數 × 每次循環大卡。 */
export function dailyKcalGoal(dailyGoal: number, kcalPerCycle: number) {
  return Math.max(0, Math.round(dailyGoal * kcalPerCycle));
}

/** 尾端 window 天的移動平均；資料不足時以已有天數平均，開頭不會出現空洞。 */
export function movingAverage(values: number[], window = 7) {
  return values.map((_, index) => {
    const start = Math.max(0, index - window + 1);
    const slice = values.slice(start, index + 1);
    return Math.round(slice.reduce((sum, value) => sum + value, 0) / slice.length);
  });
}

export type KcalPoint = KcalDay & { goalPct: number; metGoal: boolean; average: number };

export function buildKcalSeries(days: KcalDay[], goalKcal: number, window = 7): KcalPoint[] {
  const averages = movingAverage(days.map(day => day.kcal), window);
  return days.map((day, index) => ({
    ...day,
    goalPct: goalKcal > 0 ? Math.round((day.kcal / goalKcal) * 100) : 0,
    metGoal: goalKcal > 0 && day.kcal >= goalKcal,
    average: averages[index] ?? 0,
  }));
}

export type KcalSummary = {
  span: number;
  total: number;
  average: number;
  activeDays: number;
  goalHitDays: number;
  best: KcalDay | null;
  todayKcal: number;
  streak: number;
};

/** 燃燒連續日：從最後一天往前數，今天尚未開始（0 大卡）不算中斷。 */
export function kcalStreak(days: KcalDay[]) {
  let streak = 0;
  for (let index = days.length - 1; index >= 0; index -= 1) {
    const day = days[index]!;
    if (day.kcal > 0) { streak += 1; continue; }
    if (day.isToday && streak === 0) continue;
    break;
  }
  return streak;
}

export function summarizeKcal(days: KcalDay[], goalKcal: number): KcalSummary {
  const total = days.reduce((sum, day) => sum + day.kcal, 0);
  const best = days.reduce<KcalDay | null>((top, day) => (day.kcal > 0 && (!top || day.kcal >= top.kcal) ? day : top), null);
  return {
    span: days.length,
    total,
    average: days.length > 0 ? Math.round(total / days.length) : 0,
    activeDays: days.filter(day => day.kcal > 0).length,
    goalHitDays: goalKcal > 0 ? days.filter(day => day.kcal >= goalKcal).length : 0,
    best,
    todayKcal: days.find(day => day.isToday)?.kcal ?? 0,
    streak: kcalStreak(days),
  };
}

export type KcalTrend = { current: number; previous: number; delta: number; pct: number; direction: "up" | "down" | "flat" };

/** 把 2N 天切成前後兩段比較；資料不足 2N 天時，以實際可用的前段長度比較。 */
export function compareKcalWindows(days: KcalDay[], span: number): KcalTrend {
  const recent = days.slice(-span);
  const earlier = days.slice(Math.max(0, days.length - span * 2), days.length - span);
  const current = recent.reduce((sum, day) => sum + day.kcal, 0);
  const previous = earlier.reduce((sum, day) => sum + day.kcal, 0);
  const delta = current - previous;
  const pct = previous > 0 ? Math.round((delta / previous) * 100) : current > 0 ? 100 : 0;
  return { current, previous, delta, pct, direction: delta > 0 ? "up" : delta < 0 ? "down" : "flat" };
}

/** 依目前節奏推估還要幾天達到某個累積燃燒量；日均為 0 時回傳 null。 */
export function daysToReach(target: number, achieved: number, dailyAverage: number) {
  if (dailyAverage <= 0) return null;
  const remaining = target - achieved;
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / dailyAverage);
}
