// Office maps. Pick one on the title screen (Map button, L). Each map unlocks once you
// win a shift (close The Executive's ticket) on the map listed in `unlockAfter`.
//   floor       floor style drawn by src/game/floor.js
//   pay         multiplier on Overtime Pay earned on this map
//   hpMult      extra multiplier on enemy HP (on top of data/waves.js)
//   speedMult   extra multiplier on enemy speed
//   mixBoost    multiplies spawn weights per enemy id (see the `mix` in data/waves.js)
//   music       remix of the background track: transpose (semitones), tempo (x), lead
//               (oscillator type), cutoff (lead filter Hz)
//   twist       the map's special rule, handled in src/game/maps.js:
//               hotAisles  red strips on the floor: drain `drain` sanity/s, +`speed` move speed
//               phones     every `every` s a desk phone rings near you and goes off after
//                          `delay` s for `damage` (+`damagePerMin` per minute) in `radius`
//               dark       you only see `radius` px around you (`flicker` = light wobble)

export const MAPS = {
  office: {
    name: 'Open Office',
    floor: 'office',
    unlockAfter: null,
    blurb: 'Cubicles, a water cooler and 847 unread tickets. Where every career starts.',
    twistText: 'No surprises. Just users.',
    pay: 1,
    hpMult: 1,
    speedMult: 1,
    mixBoost: {},
    music: { transpose: 0, tempo: 1, lead: 'square', cutoff: 1400 },
  },
  server: {
    name: 'Server Room',
    floor: 'server',
    unlockAfter: 'office',
    blurb: 'Raised floor, roaring fans and racks nobody has labeled since 2014.',
    twistText: 'Hot aisles drain sanity but make you faster. More Shadow IT and phishers.',
    pay: 1.25,
    hpMult: 1.1,
    speedMult: 1,
    mixBoost: { steve: 1.6, phish: 1.6 },
    music: { transpose: -3, tempo: 1.06, lead: 'sawtooth', cutoff: 1100 },
    twist: { type: 'hotAisles', drain: 3, speed: 0.3 },
  },
  callcenter: {
    name: 'Call Center',
    floor: 'callcenter',
    unlockAfter: 'server',
    blurb: 'Headsets on. The queue never empties and the wallboard is always red.',
    twistText: 'All lines busy: desk phones go off around you. Reply-All storms everywhere.',
    pay: 1.25,
    hpMult: 1.15,
    speedMult: 1,
    mixBoost: { randy: 2, walkup: 1.4 },
    music: { transpose: 2, tempo: 1.1, lead: 'square', cutoff: 2000 },
    twist: { type: 'phones', every: 4, delay: 1.4, radius: 46, damage: 10, damagePerMin: 1.2 },
  },
  garage: {
    name: 'Night Shift: Parking Garage',
    floor: 'garage',
    unlockAfter: 'callcenter',
    blurb: "3 a.m. on-call. The exec's laptop won't connect and he is in the car.",
    twistText: 'Lights out: you only see what your phone flashlight shows. Users are 10% faster.',
    pay: 1.5,
    hpMult: 1.2,
    speedMult: 1.1,
    mixBoost: { phish: 1.3, vip: 1.5 },
    music: { transpose: -5, tempo: 0.92, lead: 'triangle', cutoff: 900 },
    twist: { type: 'dark', radius: 170, flicker: 0.06 },
  },
};

export const MAP_ORDER = ['office', 'server', 'callcenter', 'garage'];
