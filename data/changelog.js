// Patch notes for the "What's new" screen (src/ui/news.js), newest first. Add an entry
// at the top with each update: players see the top entry once, the next time they open
// the game. `id` must be new for each entry; it's what the game remembers as "seen".

export const CHANGELOG = [
  {
    id: '2026-10-21-ux2',
    date: 'Oct 21, 2026',
    title: 'Quicker Clock In',
    items: [
      'Clock In now skips any step with nothing to pick. Until you can hire a second tech or open a second map, it takes you straight to work (or straight to Shift Policies).',
      'Techs you can\'t afford yet say "Need $300" instead of "Locked", and lock notes are worded the same way everywhere.',
      'Fixed two messages that said "scr" instead of "this".',
    ],
  },
  {
    id: '2026-10-21-ux1',
    date: 'Oct 21, 2026',
    title: 'Fewer lost shifts',
    items: [
      'The end-of-shift buttons now stay on screen while you scroll the summary, so Next Shift is always one tap away.',
      'The game pauses itself when you switch apps, take a call or pull down notifications.',
      'Restart Shift and Quit to Title ask for a second tap, so a slip no longer throws a shift away.',
      'Level-up cards ignore taps for a split second after they appear, so putting your thumb back down to steer no longer picks a card by accident.',
    ],
  },
  {
    id: '2026-10-21-policies',
    date: 'Oct 21, 2026',
    title: 'Shift Policies',
    items: [
      'New step when you Clock In: after the tech and the map, sign up to up to 3 Shift Policies. Optional, and they only appear once you have finished a shift.',
      'Bad policies make the shift harder and raise your Overtime Pay and leaderboard score. Perks make it easier and lower them. Mixed ones change how you play. 23 in all, from Casual Friday to Vendor Lock-In.',
      'Feeling lucky? The Reorg button picks 2 random bad policies for an extra +10%.',
      'The leaderboard now ranks by score: CSAT times your policies. Policy icons show next to each name, and "No policies only" shows the clean shifts.',
      'You start with 4 policies. Win shifts on each map to unlock more, and win without evolving a tool to unlock Change Freeze. The Help Desk Wiki has a new Policies tab.',
      'Two new achievements: Red Tape and Doing More With Less.',
    ],
  },
  {
    id: '2026-10-21-phase2',
    date: 'Oct 21, 2026',
    title: 'Bosses fight back harder',
    items: [
      'Every boss now has a second phase. When it switches you get a banner, a growl, a red glow under the boss and an orange ENRAGED boss bar.',
      'Major Incident (half health): SEV 0. Double rings, plus spirals of phones that sweep around it. Circle with them.',
      "The Rat's Nest (last quarter): Electrical Fire. The nests speed up and sparks run down every cable after it lands.",
      'The Angry Caller (half health): Escalated. It can transfer itself to a spot right behind you. Step out of the red circle.',
      "The Night Janitor (half health): Double Shift. Every charge comes straight back a second time, and he spins the buffer out around him.",
      'The Hostile Takeover (last quarter): Reorg. Memo lanes come down both ways at once. Stand in the squares between them.',
      'The Executive (final phase): Calendar Tetris. A checkerboard of meetings goes off in two waves. Hop to a free slot, then hop back.',
    ],
  },
  {
    id: '2026-10-21-groundwork',
    date: 'Oct 21, 2026',
    title: 'Under the hood',
    items: [
      'The game now tests itself: every map, every boss, the menus and the training shift are played automatically before each update goes out, so fewer bugs should reach you.',
      'Art is saved on your device after the first load, so the game opens faster, and after an update only changed art is downloaded again.',
      'Lots of behind-the-scenes tidying so new maps, bosses and pickups are quicker to add.',
    ],
  },
  {
    id: '2026-10-21-perf',
    date: 'Oct 21, 2026',
    title: 'Smoother on phones',
    items: [
      'The game now draws far fewer pixels each frame, so big late-game hordes should stay smooth on phones, with less heat and battery drain. It looks the same.',
      'Damage numbers and pickup labels use a crisp pixel font that matches the art.',
      'Menus, level-up cards and the pause screen no longer redraw the office 60 times a second while you read them.',
      'Merger Day no longer stutters when the parent company takes over more of the floor.',
      'Your save now has a version number, so future updates can rename or rework things without losing your progress.',
    ],
  },
  {
    id: '2026-10-21-clockin',
    date: 'Oct 21, 2026',
    title: 'Pick your tech and map when you Clock In',
    items: [
      'Clock In now walks you through it: pick your technician, then your map, then confirm. No more backing out of menus to switch.',
      'Your last tech and map are picked for you, so a repeat shift is still just two taps (or Enter, Enter, Enter).',
      'Locked techs and maps show what unlocks them, and you can hire a tech right from the picker.',
      'The end-of-shift screen has a new Change Tech or Map button.',
    ],
  },
  {
    id: '2026-10-21-merger',
    date: 'Oct 21, 2026',
    title: 'New map: Merger Day, unlocks and a rebalance',
    items: [
      "Congratulations, you've been acquired! Win the Night Shift in the Parking Garage to unlock Merger Day (1.5x Overtime Pay).",
      "The new parent company's navy-and-gold floor spreads every minute. Users who start on it are tougher, but every ticket closed there counts double.",
      'New users: Synergy Consultants (always in pairs; close one and the other gets angry), Duplicate Dave (comes back once as Dave (2)) and Badge Brenda (slows you down while she tailgates you).',
      'At 10:00 the Hostile Takeover tours the floor. It absorbs any user it touches to heal and grow, sends Restructuring memos down warned lanes, and spins off a Subsidiary at half HP.',
      'Smash Unclaimed Moving Boxes for a free pickup, and grab the Welcome Swag Bag for sanity and a burst of speed.',
      'Winning maps now unlocks new things. Server Room: five tools, the Network Engineer and The Intern. Call Center: four passives and the Help Desk Manager. Parking Garage: six evolutions and the Cloud Architect. Anything you have already used or hired stays yours.',
      'Rebalance: the Open Office is a little gentler, the Major Incident, Angry Caller and Call Center phones hit softer, and The Executive has 60,000 HP (was 80,000). Every map should now feel about as tough as the gear you have when you get there.',
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
