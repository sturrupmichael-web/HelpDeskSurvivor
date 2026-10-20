// Sprite drawing helpers. Positions are world pixels; the caller sets up the camera
// transform on the context.

// Draws frame `frame` of `anim` with the sprite's anchor (feet) at (x, y).
export function drawSprite(ctx, spr, anim, frame, x, y, flip, flash) {
  const a = spr.anims[anim];
  const list = flash && a.hit ? a.hit : a.frames;
  const f = list[frame % list.length];
  const dx = Math.round(x - spr.anchor[0]);
  const dy = Math.round(y - spr.anchor[1]);
  if (flip) {
    // Same frame read from the mirrored sheet (see assets.js).
    ctx.drawImage(spr.imageFlipped, spr.sheetWidth - f[0] - spr.w, f[1], spr.w, spr.h, Math.round(x - (spr.w - spr.anchor[0])), dy, spr.w, spr.h);
  } else {
    ctx.drawImage(spr.image, f[0], f[1], spr.w, spr.h, dx, dy, spr.w, spr.h);
  }
}

// Frame index for an animation running for `t` seconds.
export const frameAt = (spr, t) => Math.floor(t * spr.fps);

// Pre-rendered soft shadow ellipse, drawn under characters.
let shadowCanvas = null;
export function shadow() {
  if (!shadowCanvas) {
    shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 20;
    shadowCanvas.height = 6;
    const c = shadowCanvas.getContext('2d');
    c.fillStyle = 'rgba(10, 12, 24, 0.45)';
    c.beginPath();
    c.ellipse(10, 3, 10, 3, 0, 0, Math.PI * 2);
    c.fill();
  }
  return shadowCanvas;
}
