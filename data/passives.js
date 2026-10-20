// Passive items. Each level adds `perLevel` to the stat multiplier:
//   final multiplier = 1 + perLevel * level   (negative perLevel reduces the stat)
// Stats: moveSpeed, attackSpeed, area, damage, growth (XP gain), damageTaken,
//        cooldown, pickupRadius.

export const PASSIVES = {
  coldBrew: {
    name: 'Cold Brew', icon: 'coffee', stat: 'moveSpeed', perLevel: 0.08, maxLevel: 5, weight: 8,
    desc: '+8% move speed per level.',
    flavor: 'Iced. Black. Third one today.',
  },
  mechKeyboard: {
    name: 'Mechanical Keyboard', icon: 'keyboard', stat: 'attackSpeed', perLevel: 0.1, maxLevel: 5, weight: 8,
    desc: '+10% attack speed: shockwaves and projectiles travel faster.',
    flavor: 'Clicky switches. Your cubicle neighbours love it.',
  },
  secondMonitor: {
    name: 'Second Monitor', icon: 'monitor', stat: 'area', perLevel: 0.1, maxLevel: 5, weight: 8,
    desc: '+10% area per level.',
    flavor: 'One for the queue, one for the other queue.',
  },
  domainAdmin: {
    name: 'Domain Admin Rights', icon: 'key', stat: 'damage', perLevel: 0.1, maxLevel: 5, weight: 8,
    desc: '+10% damage per level.',
    flavor: 'With great power comes a very long audit log.',
  },
  itil: {
    name: 'ITIL Certification', icon: 'cert', stat: 'growth', perLevel: 0.1, maxLevel: 5, weight: 8,
    desc: '+10% XP from Closed Tickets per level.',
    flavor: 'You now know there is a process for that. There is always a process.',
  },
  headphones: {
    name: 'Noise-Cancelling Headphones', icon: 'headphones', stat: 'damageTaken', perLevel: -0.07, maxLevel: 5, weight: 8,
    desc: '-7% sanity loss per level.',
    flavor: 'Sorry, can\'t hear you. Please submit a ticket.',
  },
  runbook: {
    name: 'Runbook', icon: 'book', stat: 'cooldown', perLevel: -0.07, maxLevel: 5, weight: 8,
    desc: '-7% weapon cooldowns per level.',
    flavor: 'Step 1: Don\'t panic. Step 2: See step 1.',
  },
  queueFilter: {
    name: 'Ticket Queue Filter', icon: 'filter', stat: 'pickupRadius', perLevel: 0.25, maxLevel: 5, weight: 8,
    desc: '+25% pickup radius per level.',
    flavor: 'Auto-sorts the urgent from the "urgent".',
  },
};

// Offered when every slot is full and everything is maxed.
export const FALLBACK_REWARDS = {
  pizza: {
    name: 'Leftover Vendor-Lunch Pizza', icon: 'pizza', heal: 30, desc: 'Restore 30 sanity.',
    flavor: 'Cold, slightly mysterious, absolutely free.',
  },
};

export const MAX_WEAPONS = 6;
export const MAX_PASSIVES = 6;
