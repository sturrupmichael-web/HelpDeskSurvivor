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
    // Boss attacks (hurt the player).
    hazard_phone: one(['.kkk....kkk.', 'krrrk..krrrk', 'krrrkkkkrrrk', '.krrrrrrrrk.', '..kkkkkkkk..']),
    hazard_slide: one(['kkkkkkkkkkkk', 'kwwwwwwwwwwk', 'kwrrrrwwwwwk', 'kwwwwwwwBwwk', 'kwwwwwBwBwwk', 'kwwwBwBwBwwk', 'kwBwBwBwBwwk', 'kwwwwwwwwwwk', 'kkkkkkkkkkkk']),
    // Printer Jammer floor hazard.
    paperjam: one(PAPER_JAM, [32, 20]),
  },
};
