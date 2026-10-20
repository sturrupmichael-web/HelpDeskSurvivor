// Synthesized sound effects (WebAudio, no audio files). Every sound is a tiny recipe of
// oscillators and filtered noise. Browsers only allow audio after a key press or click,
// so initAudio() is called from the first input event. Volumes live in data/audio.js.

import { AUDIO } from '../../data/audio.js';

const MUTE_KEY = 'helpdesk-survivors.muted';

let ctx = null;
let master = null;
let sfxBus = null; // sound effects -> master
let sfxLevel = 1; // settings multipliers (0..1)
let musicLevel = 1;
let noise = null; // 1 s of white noise, reused by every noisy sound
let muted = false;
const lastPlayed = {};

// Minimum seconds between two plays of the same sound, so 300 hits a second don't
// turn into a wall of noise.
const THROTTLE = { hit: 0.05, pop: 0.035, ticket: 0.04, hurt: 0.3, pulse: 0.1, boom: 0.08, ring: 0.3, whoosh: 0.15 };

try {
  muted = localStorage.getItem(MUTE_KEY) === '1';
} catch {
  // Storage blocked (private window, sandbox): just start unmuted.
}

export function initAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : AUDIO.masterVolume;
    master.connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = sfxLevel;
    sfxBus.connect(master);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
  if (wantMusic && !musicTimer) startScheduler();
}

export const isMuted = () => muted;

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : AUDIO.masterVolume;
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // Not persisted; fine.
  }
  return muted;
}

// One oscillator note with a pitch slide and a fast attack / exponential decay.
function tone(type, f0, f1, start, dur, vol, out) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, start);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(out);
  o.start(start);
  o.stop(start + dur + 0.02);
}

// Filtered noise burst; the filter frequency slides from f0 to f1.
function hiss(filter, f0, f1, start, dur, vol, out) {
  const s = ctx.createBufferSource();
  s.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = filter;
  f.frequency.setValueAtTime(f0, start);
  f.frequency.exponentialRampToValueAtTime(f1, start + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  s.connect(f).connect(g).connect(out);
  s.start(start, Math.random() * 0.5);
  s.stop(start + dur + 0.02);
}

const arp = (type, notes, gap, len, vol, out, t) => notes.forEach((f, i) => tone(type, f, f, t + i * gap, len, vol, out));

const RECIPES = {
  hit: (t, o) => tone('square', 260 + Math.random() * 60, 120, t, 0.04, 0.08, o),
  pop: (t, o) => tone('triangle', 700 + Math.random() * 200, 180, t, 0.07, 0.25, o),
  ticket: (t, o) => tone('sine', 1100 + Math.random() * 300, 1700, t, 0.06, 0.18, o),
  pulse: (t, o) => tone('sine', 140, 45, t, 0.16, 0.5, o),
  levelup: (t, o) => arp('square', [523, 659, 784, 1047], 0.07, 0.12, 0.18, o, t),
  chest: (t, o) => {
    arp('triangle', [392, 523, 659, 784, 1047], 0.06, 0.2, 0.3, o, t);
    hiss('highpass', 6000, 9000, t + 0.3, 0.4, 0.08, o);
  },
  evolve: (t, o) => {
    tone('sawtooth', 110, 880, t, 0.6, 0.15, o);
    arp('square', [523, 659, 784, 1047, 1319, 1568], 0.08, 0.18, 0.15, o, t + 0.5);
  },
  hurt: (t, o) => {
    tone('sawtooth', 180, 60, t, 0.14, 0.3, o);
    hiss('lowpass', 1200, 200, t, 0.1, 0.2, o);
  },
  alarm: (t, o) => {
    for (let i = 0; i < 4; i++) tone('square', i % 2 ? 660 : 880, i % 2 ? 660 : 880, t + i * 0.18, 0.16, 0.15, o);
  },
  siren: (t, o) => {
    for (let i = 0; i < 3; i++) {
      tone('sawtooth', 300, 700, t + i * 0.7, 0.35, 0.18, o);
      tone('sawtooth', 700, 300, t + i * 0.7 + 0.35, 0.35, 0.18, o);
    }
  },
  boom: (t, o) => {
    hiss('lowpass', 900, 60, t, 0.45, 0.7, o);
    tone('sine', 90, 30, t, 0.35, 0.5, o);
  },
  heal: (t, o) => arp('sine', [440, 554, 659, 880], 0.05, 0.15, 0.3, o, t),
  pto: (t, o) => {
    for (const f of [523, 659, 784]) tone('triangle', f, f, t, 0.8, 0.15, o);
    arp('sine', [1047, 1319, 1568], 0.1, 0.4, 0.1, o, t + 0.1);
  },
  bulk: (t, o) => {
    for (let i = 0; i < 10; i++) tone('sine', 800 + i * 120, 1200 + i * 120, t + i * 0.03, 0.05, 0.12, o);
  },
  // The bridge call: two-tone office phone ring.
  ring: (t, o) => {
    for (let i = 0; i < 6; i++) {
      tone('sine', 440, 440, t + i * 0.05, 0.045, 0.12, o);
      tone('sine', 480, 480, t + i * 0.05, 0.045, 0.12, o);
    }
  },
  whoosh: (t, o) => hiss('bandpass', 400, 2400, t, 0.3, 0.5, o),
  victory: (t, o) => {
    arp('square', [523, 523, 523, 659, 784, 659, 784, 1047], 0.12, 0.2, 0.15, o, t);
    for (const f of [523, 659, 784, 1047]) tone('triangle', f, f, t + 1.0, 1.2, 0.12, o);
  },
  burnout: (t, o) => {
    [392, 370, 349, 262].forEach((f, i) => tone('sawtooth', f, i === 3 ? 196 : f, t + i * 0.35, i === 3 ? 0.9 : 0.3, 0.12, o));
  },
  click: (t, o) => tone('square', 900, 900, t, 0.03, 0.1, o),
};

// Plays a named sound if audio is running and the sound isn't throttled.
export function sfx(name) {
  if (!ctx || muted || sfxLevel <= 0 || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  const gap = THROTTLE[name];
  if (gap && now - (lastPlayed[name] ?? -1) < gap) return;
  lastPlayed[name] = now;
  const vol = AUDIO.volume[name] ?? 1;
  if (vol <= 0) return;
  const out = ctx.createGain();
  out.gain.value = vol;
  out.connect(sfxBus);
  RECIPES[name](now + 0.01, out);
}

// --- Background music -----------------------------------------------------------------
// An original, looping synth track in the spirit of 90s corporate hold music: mellow
// electric-piano chords, a walking synth bass, a soft drum machine and a lead through a
// tape-style echo. Written for this game (not a copy of any real hold tune). The
// sequencer schedules notes slightly ahead of time on the audio clock, so it stays in
// time even when frames drop.

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const STEPS_PER_BAR = 16;
// One chord per bar, looping every 4 bars: Dm9, G13, Cmaj9, Am7.
const CHORDS = [
  { bass: 38, notes: [53, 57, 60, 64] },
  { bass: 43, notes: [53, 59, 64, 65] },
  { bass: 36, notes: [52, 55, 59, 62] },
  { bass: 45, notes: [55, 60, 64, 67] },
];
// Lead melody, 8 bars (phrase A then phrase B): [step, note, length in steps].
const MELODY = [
  [[0, 69, 3], [3, 72, 3], [6, 74, 2], [8, 72, 2], [10, 69, 4], [14, 67, 2]],
  [[0, 65, 3], [3, 67, 3], [6, 69, 6], [12, 71, 2], [14, 72, 2]],
  [[0, 74, 4], [4, 76, 2], [6, 74, 2], [8, 71, 4], [12, 67, 4]],
  [[0, 69, 6], [6, 67, 2], [8, 64, 4], [12, 62, 4]],
  [[0, 77, 2], [2, 76, 2], [4, 74, 2], [6, 72, 4], [10, 74, 2], [12, 76, 4]],
  [[0, 74, 8], [8, 71, 2], [10, 72, 2], [12, 74, 4]],
  [[0, 76, 3], [3, 79, 3], [6, 76, 2], [8, 74, 4], [12, 71, 4]],
  [[0, 69, 8], [8, 72, 2], [10, 71, 2], [12, 69, 4]],
];
const CHORD_HITS = [0, 6, 10]; // syncopated electric-piano stabs within each bar
const BASS_LINE = [[0, 0], [3, 12], [8, 7], [11, 0], [14, 10]]; // [step, semitones above root]

let musicBus = null;
let echoIn = null;
let wantMusic = false;
let musicTimer = 0;
let nextStepTime = 0;
let step = 0;
let ducked = false;
let delayNode = null;
// Per-map remix (data/maps.js `music`).
let style = { transpose: 0, tempo: 1, lead: 'square', cutoff: 1400 };
const stepSec = () => 60 / (AUDIO.musicTempo * style.tempo) / 4;

export function setMusicStyle(s) {
  style = { ...style, ...s };
  if (delayNode) delayNode.delayTime.value = stepSec() * 3; // dotted eighth
}

function musicGain() {
  return (AUDIO.musicVolume ?? 0.5) * musicLevel * (ducked ? 0.35 : 1);
}

// Settings sliders (0..1). Safe to call before audio has started.
export function setVolumes(sfx, music) {
  sfxLevel = sfx;
  musicLevel = music;
  if (sfxBus) sfxBus.gain.value = sfx;
  if (musicBus && musicTimer) musicBus.gain.setTargetAtTime(Math.max(0.0001, musicGain()), ctx.currentTime, 0.05);
}

function buildMusicBus() {
  musicBus = ctx.createGain();
  musicBus.gain.value = musicGain();
  musicBus.connect(master);
  // Feedback echo for the lead.
  echoIn = ctx.createGain();
  echoIn.gain.value = 1;
  const delay = (delayNode = ctx.createDelay(1));
  delay.delayTime.value = stepSec() * 3; // dotted eighth
  const fb = ctx.createGain();
  fb.gain.value = 0.32;
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 2200;
  echoIn.connect(musicBus);
  echoIn.connect(delay);
  delay.connect(tone).connect(fb).connect(delay);
  tone.connect(musicBus);
}

// Soft note with attack/release, through an optional lowpass.
function synth(type, freq, t, dur, vol, out, cutoff, detune = 0) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  o.detune.value = detune;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(vol * 0.6, t + dur * 0.5);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  if (cutoff) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    o.connect(f).connect(g);
  } else o.connect(g);
  g.connect(out);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function scheduleStep(s, t) {
  const sec = stepSec();
  const tr = style.transpose;
  const bar = Math.floor(s / STEPS_PER_BAR);
  const inBar = s % STEPS_PER_BAR;
  const chord = CHORDS[bar % CHORDS.length];
  if (CHORD_HITS.includes(inBar)) {
    for (const n of chord.notes) {
      synth('triangle', midi(n + tr), t, sec * 5, 0.05, musicBus, 1800, -6);
      synth('sine', midi(n + tr), t, sec * 5, 0.04, musicBus, 0, 6);
    }
  }
  for (const [st, semi] of BASS_LINE) if (st === inBar) synth('sawtooth', midi(chord.bass + semi + tr), t, sec * 2.5, 0.12, musicBus, 500);
  for (const [st, n, len] of MELODY[bar % MELODY.length]) {
    if (st === inBar) synth(style.lead, midi(n + tr), t, sec * len, style.lead === 'sawtooth' ? 0.035 : 0.045, echoIn, style.cutoff);
  }
  // Drum machine: kick on 1 and 3, snare on 2 and 4, soft closed hats on eighths.
  if (inBar === 0 || inBar === 8) tone('sine', 110, 40, t, 0.18, 0.35, musicBus);
  if (inBar === 4 || inBar === 12) hiss('bandpass', 1800, 900, t, 0.14, 0.18, musicBus);
  if (inBar % 2 === 0) hiss('highpass', 8000, 9000, t, 0.03, 0.05, musicBus);
}

function scheduler() {
  if (!ctx || ctx.state !== 'running') return;
  const sec = stepSec();
  if (nextStepTime < ctx.currentTime) nextStepTime = ctx.currentTime + 0.05; // after a stall
  while (nextStepTime < ctx.currentTime + 0.25) {
    scheduleStep(step, nextStepTime);
    step = (step + 1) % (STEPS_PER_BAR * MELODY.length);
    nextStepTime += sec;
  }
}

function startScheduler() {
  if (!ctx || musicTimer) return;
  if (!musicBus) buildMusicBus();
  step = 0;
  nextStepTime = ctx.currentTime + 0.1;
  musicBus.gain.setTargetAtTime(musicGain(), ctx.currentTime, 0.05);
  musicTimer = setInterval(scheduler, 50);
}

// Starts the loop from the top (or as soon as audio is allowed to start).
export function startMusic() {
  wantMusic = true;
  ducked = false;
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = 0;
  }
  startScheduler();
}

export function stopMusic() {
  wantMusic = false;
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = 0;
  if (musicBus) musicBus.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.15);
}

// Quieter while paused.
export function duckMusic(on) {
  ducked = on;
  if (musicBus && musicTimer) musicBus.gain.setTargetAtTime(musicGain(), ctx.currentTime, 0.1);
}
