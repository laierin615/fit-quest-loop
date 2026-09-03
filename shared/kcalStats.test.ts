import { describe, expect, it } from "vitest";
import { buildKcalSeries, compareKcalWindows, dailyKcalGoal, daysToReach, kcalStreak, movingAverage, summarizeKcal, type KcalDay } from "./kcalStats";

const day = (key: string, kcal: number, count = 0, isToday = false): KcalDay => ({ key, label: "一", count, kcal, isToday });

const week: KcalDay[] = [
  day("2026-08-28", 120, 4),
  day("2026-08-29", 0),
  day("2026-08-30", 300, 10),
  day("2026-08-31", 90, 3),
  day("2026-09-01", 300, 10),
  day("2026-09-02", 150, 5),
  day("2026-09-03", 60, 2, true),
];

describe("daily kcal goal", () => {
  it("multiplies the daily cycle goal by kcal per cycle", () => {
    expect(dailyKcalGoal(10, 30)).toBe(300);
    expect(dailyKcalGoal(0, 30)).toBe(0);
    expect(dailyKcalGoal(-3, 30)).toBe(0);
  });
});

describe("moving average", () => {
  it("averages over the trailing window and never leaves a gap at the start", () => {
    expect(movingAverage([10, 20, 30, 40], 2)).toEqual([10, 15, 25, 35]);
    expect(movingAverage([], 7)).toEqual([]);
  });
});

describe("summarizeKcal", () => {
  const summary = summarizeKcal(week, 300);

  it("totals and averages the window", () => {
    expect(summary.total).toBe(1020);
    expect(summary.average).toBe(146);
    expect(summary.span).toBe(7);
  });

  it("counts active days and goal hits separately", () => {
    expect(summary.activeDays).toBe(6);
    expect(summary.goalHitDays).toBe(2);
  });

  it("reports the most recent best day and today's burn", () => {
    expect(summary.best?.key).toBe("2026-09-01");
    expect(summary.best?.kcal).toBe(300);
    expect(summary.todayKcal).toBe(60);
  });

  it("returns an empty summary rather than NaN for no data", () => {
    const empty = summarizeKcal([], 300);
    expect(empty).toMatchObject({ total: 0, average: 0, activeDays: 0, goalHitDays: 0, best: null, todayKcal: 0, streak: 0 });
  });

  it("treats a zero goal as having no goal to hit", () => {
    expect(summarizeKcal(week, 0).goalHitDays).toBe(0);
  });
});

describe("kcalStreak", () => {
  it("counts consecutive burning days back from the latest day", () => {
    expect(kcalStreak(week)).toBe(5);
  });

  it("does not break the streak when today has not started yet", () => {
    const pending = [...week.slice(0, 6), day("2026-09-03", 0, 0, true)];
    expect(kcalStreak(pending)).toBe(4);
  });

  it("returns zero when the latest completed day is empty", () => {
    expect(kcalStreak([day("2026-09-02", 0), day("2026-09-03", 0, 0, true)])).toBe(0);
  });
});

describe("compareKcalWindows", () => {
  it("compares the latest span against the preceding span", () => {
    const days = [...Array(4)].map((_, i) => day(`2026-08-0${i + 1}`, 100)).concat([...Array(4)].map((_, i) => day(`2026-08-1${i}`, 150)));
    expect(compareKcalWindows(days, 4)).toMatchObject({ current: 600, previous: 400, delta: 200, pct: 50, direction: "up" });
  });

  it("reports a drop and a flat run", () => {
    const dropping = [day("a", 200), day("b", 200), day("c", 50), day("d", 50)];
    expect(compareKcalWindows(dropping, 2)).toMatchObject({ delta: -300, pct: -75, direction: "down" });
    const flat = [day("a", 100), day("b", 100)];
    expect(compareKcalWindows(flat, 1)).toMatchObject({ delta: 0, pct: 0, direction: "flat" });
  });

  it("treats a first-ever span as +100% instead of dividing by zero", () => {
    expect(compareKcalWindows([day("a", 250)], 1)).toMatchObject({ previous: 0, pct: 100, direction: "up" });
    expect(compareKcalWindows([], 7)).toMatchObject({ current: 0, previous: 0, pct: 0, direction: "flat" });
  });
});

describe("buildKcalSeries", () => {
  it("annotates each day with goal progress and a trailing average", () => {
    const series = buildKcalSeries(week, 300, 7);
    expect(series[2]).toMatchObject({ kcal: 300, goalPct: 100, metGoal: true });
    expect(series[1]).toMatchObject({ kcal: 0, goalPct: 0, metGoal: false });
    expect(series.at(-1)?.average).toBe(146);
  });

  it("never divides by a zero goal", () => {
    expect(buildKcalSeries(week, 0).every(point => point.goalPct === 0 && !point.metGoal)).toBe(true);
  });
});

describe("daysToReach", () => {
  it("projects remaining days from the current daily average", () => {
    expect(daysToReach(1000, 400, 150)).toBe(4);
    expect(daysToReach(1000, 1000, 150)).toBe(0);
    expect(daysToReach(1000, 400, 0)).toBeNull();
  });
});
