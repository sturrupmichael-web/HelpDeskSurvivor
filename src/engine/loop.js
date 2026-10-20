// Fixed-timestep game loop: the simulation always advances in STEP-sized ticks
// (deterministic, frame-rate independent); rendering happens once per animation frame.

export const STEP = 1 / 60;
const MAX_STEPS = 5; // cap catch-up work after a stall (e.g. tab switch)

export function startLoop(update, render) {
  let acc = 0;
  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;
    acc += dt;
    let steps = 0;
    while (acc >= STEP && steps < MAX_STEPS) {
      update(STEP);
      acc -= STEP;
      steps++;
    }
    if (steps === MAX_STEPS) acc = 0;
    render(dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
