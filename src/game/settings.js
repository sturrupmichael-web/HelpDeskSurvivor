// Player settings (volumes and comfort options), saved in localStorage separately from
// progress so wiping one never touches the other.

const KEY = 'helpdesk-survivors.settings.v1';

export const DEFAULT_SETTINGS = {
  music: 0.8, // 0..1, on top of data/audio.js musicVolume
  sfx: 0.8, // 0..1, on top of data/audio.js masterVolume
  shake: true, // screen shake
  numbers: true, // floating damage numbers
  stick: true, // on-screen touch joystick
  calm: false, // reduce flashing (starts on when the device asks for reduced motion)
  bigText: false, // larger menu and HUD text
};

export function loadSettings() {
  const s = { ...DEFAULT_SETTINGS };
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {};
  } catch {
    // Storage blocked or corrupt: defaults.
  }
  Object.assign(s, saved);
  if (!('calm' in saved) && typeof matchMedia === 'function') s.calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  return s;
}

export function saveSettings(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Not persisted; fine.
  }
}
