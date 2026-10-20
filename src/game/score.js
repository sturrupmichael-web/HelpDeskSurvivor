// Run statistics: tickets closed (kills) and the CSAT score with streak multiplier.

import { CSAT } from '../../data/scoring.js';

export class Score {
  constructor() {
    this.reset();
  }
  reset() {
    this.kills = 0;
    this.csat = 0;
    this.streak = 0;
    this.streakT = 0;
    this.mult = 1;
    this.bestStreak = 0;
  }
  onKill() {
    this.kills++;
    this.streak++;
    this.streakT = CSAT.streakWindow;
    this.mult = Math.min(CSAT.maxMultiplier, 1 + Math.floor(this.streak / CSAT.killsPerTier));
    this.csat += CSAT.pointsPerKill * this.mult;
    if (this.streak > this.bestStreak) this.bestStreak = this.streak;
  }
  onHurt() {
    if (CSAT.resetOnHit) this.breakStreak();
  }
  breakStreak() {
    this.streak = 0;
    this.mult = 1;
  }
  update(dt) {
    if (this.streakT > 0 && (this.streakT -= dt) <= 0) this.breakStreak();
  }
}
