// Weapon projectiles, deployables and floor effects (16x16 unless noted).

const PAPER_JAM = (() => {
  // A scatter of jammed printouts on the floor, 32x20.
  const g = Array.from({ length: 20 }, () => Array(32).fill('.'));
  const box = (x, y, w, h) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) g[j][i] = j === y || j === y + h - 1 || i === x || i === x + w - 1 ? 'k' : 'w';
    for (let j = y + 2; j < y + h - 1; j += 2) for (let i = x + 2; i < x + w - 3; i++) g[j][i] = 'g';
  };
  box(2, 6, 12, 10);
  box(16, 2, 13, 9);
  box(10, 9, 12, 10);
  box(22, 10, 9, 8);
  return g.map((r) => r.join(''));
})();

// Rat's Nest floor hazard: a snarl of loose cable, 24x20.
const CABLE_LOOP = (() => {
  const g = Array.from({ length: 20 }, () => Array(24).fill('.'));
  const put = (x, y, c) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < 24 && y < 20) g[y][x] = c;
  };
  [['B', 12, 10, 9, 6, 0], ['y', 10, 11, 7, 5, 1.3], ['e', 14, 9, 6, 6, 2.6]].forEach(([c, cx, cy, rx, ry, a0]) => {
    for (let a = 0; a < Math.PI * 2; a += 0.05) put(cx + Math.cos(a + a0) * rx, cy + Math.sin(a) * ry, c);
  });
  put(2, 16, 'w'); put(3, 16, 'w'); put(2, 17, 'w'); put(3, 17, 'w'); // plugs
  put(21, 3, 'w'); put(22, 3, 'w'); put(21, 4, 'w'); put(22, 4, 'w');
  return g.map((r) => r.join(''));
})();

// Night Janitor floor hazard: a shiny wet patch, 36x18.
const WET_FLOOR = (() => {
  const g = Array.from({ length: 18 }, () => Array(36).fill('.'));
  for (let y = 0; y < 18; y++)
    for (let x = 0; x < 36; x++) {
      const d = ((x - 17.5) / 17) ** 2 + ((y - 8.5) / 8) ** 2 + 0.12 * Math.sin(x * 0.9 + y * 0.6);
      if (d <= 1) g[y][x] = d > 0.8 ? 'g' : 'B';
    }
  for (const [x, y] of [[10, 5], [11, 5], [12, 5], [11, 4], [24, 10], [25, 10], [20, 6]]) g[y][x] = 'w';
  return g.map((r) => r.join(''));
})();

const one = (frame, size = [16, 16]) => ({ size, anims: { idle: [frame] }, hitFlash: false });

export default {
  sheet: 'projectiles',
  sprites: {
    // Auto-Scaling: a little cloud instance.
    proj_cloud: one(['..kkkk....', '.kwwwwk.k.', 'kwwwwwwkwk', 'kwwqwwwwwk', 'kwqqwwwwqk', '.kkkkkkkk.']),
    // Ticket Auto-Close: a ticket stamped CLOSED.
    proj_ticket: one(['kkkkkkkkkk', 'kwwwwwwwwk', 'kwrrrrrrwk', 'kwrwwwwrwk', 'kwrrrrrrwk', 'kwwwwwwwwk', 'kkkkkkkkkk']),
    // KB Article: a page with a folded corner and a blue header.
    proj_kb: one(['kkkkkkk..', 'kwwwwwkk.', 'kBBBwwwkk', 'kwwwwwwwk', 'kwgggggwk', 'kwwwwwwwk', 'kwggggwwk', 'kwwwwwwwk', 'kwgggggwk', 'kwwwwwwwk', 'kkkkkkkkk']),
    // Firewall: a block of bricks.
    proj_firewall: one(['kkkkkkkkkkkk', 'krrrrkrrrrrk', 'kkkkkkkkkkkk', 'krrkrrrrkrrk', 'kkkkkkkkkkkk', 'krrrrkrrrrrk', 'kkkkkkkkkkkk', 'krrkrrrrkrrk', 'kkkkkkkkkkkk']),
    // Remote Desktop Session: somebody else's mouse cursor.
    proj_rdp: one(['k.......', 'kk......', 'kBk.....', 'kBBk....', 'kBBBk...', 'kBBBBk..', 'kBBBBBk.', 'kBBBkkkk', 'kBkBk...', 'kk.kBk..', 'k...kk..']),
    // PowerShell Script turret: a terminal on a tripod, and its bolts.
    turret: one(['kkkkkkkkkkkkkk', 'kbbbbbbbbbbbbk', 'kbwbbbbbbbbbbk', 'kbbwbbbbbbbbbk', 'kbwbbwwwbbbbbk', 'kbbbbbbbbbbbbk', 'kkkkkkkkkkkkkk', '......kk......', '.....kGGk.....', '....kk..kk....', '...kk....kk...']),
    proj_bolt: one(['.kk.', 'kBBk', 'kBBk', '.kk.']),
    // Evolved variants.
    proj_ticket_gold: one(['kkkkkkkkkk', 'kyyyyyyyyk', 'kyrrrrrryk', 'kyrwwwwryk', 'kyrrrrrryk', 'kyyyyyyyyk', 'kkkkkkkkkk']),
    turret_evo: one(['kkkkkkkkkkkkkk', 'keeeeeeeeeeeek', 'kewEeeeeeeeeek', 'keewEeeeeeeeek', 'kewEewwweeeeek', 'keeeeeeeeeeeek', 'kkkkkkkkkkkkkk', '......kk......', '.....kGGk.....', '....kk..kk....', '...kk....kk...'].map((r) => r.replaceAll('E', 'e'))),
    proj_bolt_evo: one(['.kk.', 'keek', 'keek', '.kk.']),
    // Reply-All Storm and Sabbatical replies: an envelope.
    proj_email: one(['kkkkkkkkkk', 'kwkwwwwkwk', 'kwwkwwkwwk', 'kwwwkkwwwk', 'kwwwwwwwwk', 'kkkkkkkkkk']),
    // Rubber Duck.
    duck: one([
      '...kkkk.....',
      '..kyyyyk....',
      '..kykyyykk..',
      '..kyyyyyook.',
      '...kyyykkk..',
      'kk.kyyyk....',
      'kykkyyyykk..',
      'kyyyyywwyyk.',
      'kyyyywwyyyk.',
      '.kyyyyyyyyk.',
      '..kkkkkkkk..',
    ]),
    // Boss attacks (hurt the player).
    hazard_phone: one(['.kkk....kkk.', 'krrrk..krrrk', 'krrrkkkkrrrk', '.krrrrrrrrk.', '..kkkkkkkk..']),
    hazard_slide: one(['kkkkkkkkkkkk', 'kwwwwwwwwwwk', 'kwrrrrwwwwwk', 'kwwwwwwwBwwk', 'kwwwwwBwBwwk', 'kwwwBwBwBwwk', 'kwBwBwBwBwwk', 'kwwwwwwwwwwk', 'kkkkkkkkkkkk']),
    // Printer Jammer floor hazard.
    paperjam: one(PAPER_JAM, [32, 20]),
    cable_loop: one(CABLE_LOOP, [24, 20]),
    wet_floor: one(WET_FLOOR, [36, 18]),
  },
};
