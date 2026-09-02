/** 決定性亂數工具：同一組 seed 永遠得到同一結果，讓掉落與每日任務可測試、可稽核。 */

export function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededRandom(seed: string) {
  return mulberry32(hashString(seed));
}

export function seededValue(seed: string) {
  return seededRandom(seed)();
}

export function seededInt(seed: string, min: number, max: number) {
  if (max <= min) return min;
  return min + Math.floor(seededValue(seed) * (max - min + 1));
}

export function seededPick<T>(items: readonly T[], seed: string): T | null {
  if (items.length === 0) return null;
  return items[Math.min(items.length - 1, Math.floor(seededValue(seed) * items.length))] ?? null;
}

export function seededWeightedPick<T>(items: readonly T[], weightOf: (item: T) => number, seed: string): T | null {
  const weights = items.map(item => Math.max(0, weightOf(item)));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) return null;
  let cursor = seededValue(seed) * total;
  for (let index = 0; index < items.length; index += 1) {
    cursor -= weights[index]!;
    if (cursor < 0) return items[index]!;
  }
  return items[items.length - 1] ?? null;
}
