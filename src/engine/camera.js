// Camera that follows a target with light smoothing and supports screen shake.

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.shakeAmount = 0;
    this.ox = 0; // current shake offset
    this.oy = 0;
    this.enabled = true; // screen shake on/off (settings)
  }
  snap(x, y) {
    this.x = x;
    this.y = y;
  }
  follow(x, y, dt) {
    const k = 1 - Math.exp(-12 * dt);
    this.x += (x - this.x) * k;
    this.y += (y - this.y) * k;
    if (this.shakeAmount > 0.05) {
      this.ox = (Math.random() * 2 - 1) * this.shakeAmount;
      this.oy = (Math.random() * 2 - 1) * this.shakeAmount;
      this.shakeAmount *= Math.exp(-10 * dt);
    } else {
      this.ox = this.oy = this.shakeAmount = 0;
    }
  }
  shake(amount) {
    if (!this.enabled) return;
    this.shakeAmount = Math.max(this.shakeAmount, amount);
  }
}
