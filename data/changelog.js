// Patch notes for the "What's new" screen (src/ui/news.js), newest first. Add an entry
// at the top with each update: players see the top entry once, the next time they open
// the game. `id` must be new for each entry; it's what the game remembers as "seen".

export const CHANGELOG = [
  {
    id: '2026-10-21-merger',
    date: 'Oct 21, 2026',
    title: 'New map: Merger Day',
    items: [
      "Congratulations, you've been acquired! Win the Night Shift in the Parking Garage to unlock Merger Day (1.5x Overtime Pay).",
      "The new parent company's navy-and-gold floor spreads every minute. Users who start on it are tougher, but every ticket closed there counts double.",
      'New users: Synergy Consultants (always in pairs; close one and the other gets angry), Duplicate Dave (comes back once as Dave (2)) and Badge Brenda (slows you down while she tailgates you).',
      'At 10:00 the Hostile Takeover tours the floor. It absorbs any user it touches to heal and grow, sends Restructuring memos down warned lanes, and spins off a Subsidiary at half HP.',
      'Smash Unclaimed Moving Boxes for a free pickup, and grab the Welcome Swag Bag for sanity and a burst of speed.',
    ],
  },
  {
    id: '2026-10-21-tools',
    date: 'Oct 21, 2026',
    title: '5 new tools, 4 passives, 6 evolutions',
    items: [
      'New tools: Reply-All Storm (a ring of emails), Zip Ties (traps that tie users down), Password Expired (users wander off confused), Screen Share (a projector beam the way you face) and Rubber Duck (users it quacks at take extra damage).',
      'New passives: Spare Charger (+1 projectile on your tools), Extended Warranty (survive one burnout), Snack Drawer (sanity regen) and Lucky Lanyard (more drops, rarer cards, bigger chests).',
      'Six tools can now evolve: KB Article into Confluence Space, MFA Prompt into Passwordless, Group Policy Push into Domain Lockdown, Remote Desktop into Remote Wipe, Out-of-Office Reply into Sabbatical and Ping Sweep into SIEM. The Help Desk Wiki says which passive each one needs.',
    ],
  },
  {
    id: '2026-10-20-training',
    date: 'Oct 20, 2026',
    title: 'Training Shift',
    items: [
      'New to the help desk? "Training Shift" on the title screen (T) walks you through moving, closing tickets, levelling up and staying sane, in about two minutes.',
      'Brand-new players are offered it the first time they clock in. It never costs you anything: no burnout, no pay, no leaderboard.',
      'Level-up cards can now be picked with keys 1 to 4 (the fourth card had no key).',
    ],
  },
  {
    id: '2026-10-20-bugs',
    date: 'Oct 20, 2026',
    title: 'Report a Bug',
    items: [
      'Found something broken? Tap "Report a Bug" on the title screen, or in the pause menu (B) mid-shift.',
      'Your report includes the game version and what was happening, so you only need to say what went wrong.',
    ],
  },
  {
    id: '2026-10-20-news',
    date: 'Oct 20, 2026',
    title: "Player profiles and What's new",
    items: [
      "Tap any name on the leaderboard to see that player's profile: best shifts, favourite technician and achievements. Yours is under Account, My profile.",
      'The version number now shows at the bottom of the title and Settings screens. Testers: mention it when you report a problem.',
      "This screen! It shows once after each update. Open it again any time from \"What's new\" next to the version.",
    ],
  },
  {
    id: '2026-10-20-accounts',
    date: 'Oct 20, 2026',
    title: 'Accounts and cloud saves',
    items: [
      'Posting a score now claims your leaderboard name, so nobody else can post as you.',
      'Sign in with Google (Account, on the title screen) to back up your progress and play on other devices.',
      'If two devices both have progress, you pick which one to keep.',
    ],
  },
  {
    id: '2026-10-20-review',
    date: 'Oct 20, 2026',
    title: 'Performance reviews',
    items: ['Every shift now ends with an HR performance review: a rating, three comments from your manager and a goal for next quarter.'],
  },
  {
    id: '2026-10-20-wiki',
    date: 'Oct 20, 2026',
    title: 'Help Desk Wiki and a sound overhaul',
    items: [
      'The Help Desk Wiki (K on the title screen) fills in with every user, boss, tool and passive you meet.',
      'Louder, clearer sound, with stereo, boss warnings and sounds for tools that used to be silent.',
    ],
  },
  {
    id: '2026-10-20-balance',
    date: 'Oct 20, 2026',
    title: 'Difficulty pass',
    items: [
      'Level-ups now offer 4 choices instead of 3.',
      'Weaker tools got stronger, and helpers aim at bosses.',
      'Fixed tickets sometimes vanishing when the floor was full.',
    ],
  },
];
