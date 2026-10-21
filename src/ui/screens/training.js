// trainingOffer, trainingDone: part of the menu screens (src/ui/screens.js holds the shared Screens helpers).
// `scr` is the Screens instance.

import { sfx } from '../../engine/audio.js';

// First Clock In ever: offer the training shift (once; it stays on the title screen).
export function trainingOffer(scr) {
  const m = scr.game.meta;
  m.data.offeredTraining = true;
  m.save();
  const go = (act) => {
    sfx('click');
    if (act === 'training') scr.game.startTutorial();
    else scr.shiftSetup();
  };
  scr.show(
    `<div class="panel training">
      <h2>FIRST DAY?</h2>
      <p class="sub">A two-minute training shift shows you how to move, close tickets and level up.</p>
      <button class="primary" data-act="training">Start Training <kbd>Enter</kbd></button>
      <button data-act="skip">Skip, I know the drill <kbd>Esc</kbd></button>
      <p class="tiny">You can take training any time from the title screen.</p>
    </div>`,
    (code) => {
      if (code === 'Enter' || code === 'Space' || code === 'KeyT') go('training');
      else if (code === 'Escape') go('skip');
      else return false;
    },
  );
  scr.bind('button', (i, el) => go(el.dataset.act));
}

// End of the training shift.
export function trainingDone(scr) {
  let ready = false;
  setTimeout(() => (ready = true), 600); // don't let a held key skip it
  const go = (act) => {
    if (!ready) return;
    sfx('click');
    // Reset the floor behind the menu (training ran on the Office).
    scr.game.newRun();
    scr.game.setState('title');
    if (act === 'start') scr.shiftSetup();
    else scr.title();
  };
  scr.show(
    `<div class="panel training">
      <h1>TRAINING<br>COMPLETE</h1>
      <p class="sub">You're ready for the floor. A few things to know:</p>
      <ul class="training-list">
        <li>Survive the 20-minute shift and beat The Executive to clock out.</li>
        <li>Every shift pays Overtime Pay, even a short one. Spend it in the Overtime Shop on permanent upgrades, or hire new technicians.</li>
        <li>Bosses drop a Change Approved chest. A maxed tool plus the right passive can evolve in one (the Wiki has hints).</li>
        <li><kbd>Esc</kbd> or the II button pauses. Training is always on the title screen if you want it again.</li>
      </ul>
      <button class="primary" data-act="start">Clock In <kbd>Enter</kbd></button>
      <button data-act="title">Title <kbd>Esc</kbd></button>
    </div>`,
    (code) => {
      if (code === 'Enter' || code === 'Space') go('start');
      else if (code === 'Escape') go('title');
      else return false;
    },
  );
  scr.bind('button', (i, el) => go(el.dataset.act));
}
