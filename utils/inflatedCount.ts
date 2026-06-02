/**
 * "Social proof" enrollment number, intentionally inflated.
 *
 * displayed = base(120..180, stable per program) + drift(time-based) + realCount
 *
 *   - base    : deterministic from a stable seed (program id / concours name),
 *               so a given program always starts at the same number.
 *   - drift   : starts from INFLATION_START; every 6h that passes adds a
 *               deterministic pseudo-random value between 2 and 10. Fully
 *               computed in JS, no DB column needed.
 *   - realCount: the only truly dynamic part (actual enrolled users from DB).
 *
 * Same inputs always give the same output (no flicker between renders).
 */

// Day we started inflating. Drift is 0 before this, grows after.
const INFLATION_START = new Date("2026-06-02T00:00:00Z").getTime();
const PERIOD_MS = 6 * 60 * 60 * 1000; // every 6 hours

/** Stable string hash (djb2 variant). */
function hashString(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Deterministic pseudo-random in [0, 1) from a seed + step (mulberry32-ish). */
function seededUnit(seed: number, step: number): number {
  let t = (seed + step * 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function getInflatedEnrollmentCount(
  seedKey: string,
  realCount: number,
  now: number = Date.now()
): number {
  const seed = hashString(seedKey || "default");
  const base = 320 + (seed % 61); // 120..180, stable per program

  const periods = Math.max(0, Math.floor((now - INFLATION_START) / PERIOD_MS));
  let drift = 0;
  for (let i = 0; i < periods; i++) {
    drift += 2 + Math.floor(seededUnit(seed, i) * 9); // 2..10 per period
  }

  return base + drift + Math.max(0, realCount);
}
