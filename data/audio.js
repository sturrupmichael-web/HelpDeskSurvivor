// Sound settings. All sounds are synthesized in src/engine/audio.js (no audio files).
export const AUDIO = {
  masterVolume: 0.35,
  musicVolume: 0.45, // background music, relative to the master volume (0 = off)
  musicTempo: 100, // beats per minute
  // Per-sound volume multipliers; set one to 0 to silence that sound.
  volume: {
    hit: 0.5, pop: 0.6, ticket: 0.5, levelup: 1, chest: 1, evolve: 1, hurt: 0.8, alarm: 0.9, siren: 1,
    boom: 0.9, heal: 0.8, pto: 0.8, bulk: 0.8, pulse: 0.35, ring: 0.7, whoosh: 0.7, victory: 1, burnout: 1, click: 0.5,
  },
};
