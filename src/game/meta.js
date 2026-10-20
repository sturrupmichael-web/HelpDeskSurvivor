// Meta progression: the save file (localStorage), Overtime Pay, the shop, character
// unlocks and personal records. If storage is unavailable (private window, sandbox),
// progress simply lasts until the page is closed.

import { SHOP, PAYOUT } from '../../data/meta.js';
import { CHARACTERS } from '../../data/player.js';
import { MAPS } from '../../data/maps.js';

const KEY = 'helpdesk-survivors.save.v1';

function fresh() {
  return {
    pay: 0, // Overtime Pay balance
    earned: 0, // lifetime Overtime Pay
    shop: {}, // shop item id -> level bought
    unlocked: ['tier1'],
    selected: 'tier1',
    best: { time: 0, tickets: 0, csat: 0 },
    shifts: 0,
    wins: 0,
    map: 'office', // selected map
    mapsWon: [], // maps with at least one won shift (each unlocks the next)
    mapBest: {}, // map id -> { time, tickets, wins }
  };
}

export class Meta {
  constructor() {
    this.onSave = null; // set by the cloud save (src/game/cloudsave.js)
    let saved = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) saved = JSON.parse(raw);
    } catch {
      // No storage, or a corrupt save: start fresh.
    }
    this.replace(saved);
  }

  // Swaps in a whole save (from storage or the cloud), filling in anything missing.
  replace(saved, store = false) {
    this.data = Object.assign(fresh(), saved);
    if (!CHARACTERS[this.data.selected]) this.data.selected = 'tier1';
    if (!this.mapUnlocked(this.data.map)) this.data.map = 'office';
    if (store) this.save(false);
  }

  save(sync = true) {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      // Storage blocked; progress lasts for this page only.
    }
    if (sync) this.onSave?.();
  }

  // Total bonus for one stat from everything bought in the shop.
  bonus(stat) {
    let total = 0;
    for (const [id, lvl] of Object.entries(this.data.shop)) if (SHOP[id]?.stat === stat) total += SHOP[id].perLevel * lvl;
    return total;
  }

  level(id) {
    return this.data.shop[id] ?? 0;
  }

  // Cost of the next level of a shop item, or null when maxed.
  nextCost(id) {
    const c = SHOP[id].costs[this.level(id)];
    return c ?? null;
  }

  buy(id) {
    const cost = this.nextCost(id);
    if (cost === null || this.data.pay < cost) return false;
    this.data.pay -= cost;
    this.data.shop[id] = this.level(id) + 1;
    this.save();
    return true;
  }

  isUnlocked(charId) {
    return this.data.unlocked.includes(charId);
  }

  unlock(charId) {
    const cost = CHARACTERS[charId].cost;
    if (this.isUnlocked(charId) || this.data.pay < cost) return false;
    this.data.pay -= cost;
    this.data.unlocked.push(charId);
    this.data.selected = charId;
    this.save();
    return true;
  }

  select(charId) {
    if (!this.isUnlocked(charId)) return false;
    this.data.selected = charId;
    this.save();
    return true;
  }

  mapUnlocked(id) {
    const m = MAPS[id];
    return !!m && (!m.unlockAfter || this.data.mapsWon.includes(m.unlockAfter));
  }

  selectMap(id) {
    if (!this.mapUnlocked(id)) return false;
    this.data.map = id;
    this.save();
    return true;
  }

  // Ends a shift on map `s.map`: pays out (with the map's pay bonus), updates records
  // and unlocks. Returns { pay, records: [names of new records], newMap: id or null }.
  finishShift(s) {
    const map = MAPS[s.map] ?? MAPS.office;
    const pay = Math.floor(
      ((s.time / 60) * PAYOUT.perMinute + s.kills * PAYOUT.perKill + s.csat * PAYOUT.perCsat + (s.won ? PAYOUT.winBonus : 0)) * map.pay,
    );
    const d = this.data;
    const mb = (d.mapBest[s.map] ??= { time: 0, tickets: 0, wins: 0 });
    mb.time = Math.max(mb.time, s.time);
    mb.tickets = Math.max(mb.tickets, s.kills);
    let newMap = null;
    if (s.won) {
      mb.wins++;
      if (!d.mapsWon.includes(s.map)) {
        d.mapsWon.push(s.map);
        newMap = Object.keys(MAPS).find((id) => MAPS[id].unlockAfter === s.map) ?? null;
      }
    }
    d.pay += pay;
    d.earned += pay;
    d.shifts++;
    if (s.won) d.wins++;
    const records = [];
    if (s.time > d.best.time) (d.best.time = s.time), records.push('time');
    if (s.kills > d.best.tickets) (d.best.tickets = s.kills), records.push('tickets');
    if (s.csat > d.best.csat) (d.best.csat = s.csat), records.push('csat');
    this.save();
    return { pay, records, newMap };
  }

  // Debug: wipe the save.
  reset() {
    this.data = fresh();
    this.save();
  }
}
