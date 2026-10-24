// Sprite drawing helpers. Positions are world pixels; the caller sets up the camera
// transform on the context.

// Draws frame `f` ([x, y] on the sheet, from spr.anims) with its top-left corner at
// (x, y), rounded to whole pixels. `flip` mirrors it (same frame read from the mirrored
// sheet, see assets.js).
export function blit(ctx, spr, f, x, y, flip = false) {
  if (flip) ctx.drawImage(spr.imageFlipped, spr.sheetWidth - f[0] - spr.w, f[1], spr.w, spr.h, Math.round(x), Math.round(y), spr.w, spr.h);
  else ctx.drawImage(spr.image, f[0], f[1], spr.w, spr.h, Math.round(x), Math.round(y), spr.w, spr.h);
}

// Same, centered on (x, y).
export const blitCentered = (ctx, spr, f, x, y) => blit(ctx, spr, f, x - spr.w / 2, y - spr.h / 2);

// Same, with the sprite's anchor (its feet) at (x, y). A flipped sprite mirrors the anchor too.
export const blitFeet = (ctx, spr, f, x, y, flip = false) =>
  blit(ctx, spr, f, x - (flip ? spr.w - spr.anchor[0] : spr.anchor[0]), y - spr.anchor[1], flip);

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
