// settings: part of the menu screens (src/ui/screens.js holds the shared Screens helpers).
// `scr` is the Screens instance.

import { sfx, isMuted, toggleMute } from '../../engine/audio.js';
import { VERSION } from '../../version.js';

// Settings: volumes and comfort toggles. `back` returns to the screen that opened it.
export function settings(scr, back) {
  const g = scr.game;
  const st = g.settings;
  const slider = (key, label) => `<div class="setting"><label for="set-${key}">${label}</label>
    <input type="range" id="set-${key}" data-key="${key}" min="0" max="100" step="5" value="${Math.round(st[key] * 100)}">
    <span class="val">${Math.round(st[key] * 100)}</span></div>`;
  const toggle = (key, label) => `<div class="setting"><label id="lbl-${key}">${label}</label>
    <button class="toggle ${st[key] ? 'on' : ''}" data-key="${key}" aria-labelledby="lbl-${key}" aria-pressed="${!!st[key]}">${st[key] ? 'ON' : 'OFF'}</button></div>`;
  scr.show(
    `<div class="panel">
      <h2>SETTINGS</h2>
      <div class="settings">
        <div class="setting"><label id="lbl-mute">Sound</label>
          <button class="toggle ${isMuted() ? '' : 'on'}" data-mute aria-labelledby="lbl-mute" aria-pressed="${!isMuted()}">${isMuted() ? 'OFF' : 'ON'}</button></div>
        ${slider('music', 'Music volume')}
        ${slider('sfx', 'Sound effects volume')}
        ${toggle('shake', 'Screen shake')}
        ${toggle('numbers', 'Damage numbers')}
        ${toggle('stick', 'Touch joystick')}
        ${toggle('calm', 'Reduce flashing')}
        ${toggle('bigText', 'Larger text')}
      </div>
      <button class="back" data-act="back">Back <kbd>Esc</kbd></button>
      <p class="tiny keys-only"><kbd>M</kbd> mutes everything at any time.</p>
      <p class="version">Version ${VERSION}</p>
    </div>`,
    (code) => {
      if (code === 'Escape' || code === 'Enter') back();
      else return false;
    },
  );
  scr.root.querySelectorAll('input[type=range]').forEach((el) =>
    el.addEventListener('input', () => {
      const v = Math.max(0, Math.min(100, Number(el.value)));
      st[el.dataset.key] = v / 100;
      el.nextElementSibling.textContent = v;
      g.applySettings();
      if (el.dataset.key === 'sfx') sfx('ticket');
    }),
  );
  scr.root.querySelector('[data-mute]').addEventListener('click', (e) => {
    const el = e.currentTarget;
    g.hud.setMuted(toggleMute());
    el.classList.toggle('on', !isMuted());
    el.textContent = isMuted() ? 'OFF' : 'ON';
    el.setAttribute('aria-pressed', !isMuted());
    sfx('click');
  });
  scr.root.querySelectorAll('button.toggle[data-key]').forEach((el) =>
    el.addEventListener('click', () => {
      const k = el.dataset.key;
      st[k] = !st[k];
      el.classList.toggle('on', st[k]);
      el.textContent = st[k] ? 'ON' : 'OFF';
      el.setAttribute('aria-pressed', st[k]);
      g.applySettings();
      sfx('click');
    }),
  );
  scr.bind('[data-act=back]', () => back());
}
