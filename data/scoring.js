// CSAT (customer satisfaction) score. Every closed ticket earns points; quick
// successive closures build a streak that multiplies the points.
export const CSAT = {
  pointsPerKill: 1,
  streakWindow: 1.5, // seconds without a kill before the streak resets
  killsPerTier: 25, // every N kills in a streak adds +1 to the multiplier
  maxMultiplier: 5,
  resetOnHit: true, // taking sanity damage breaks the streak
};
