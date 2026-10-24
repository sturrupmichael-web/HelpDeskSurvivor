// The online parts against a fake Supabase (tests/tools/fakebase.mjs): accounts, cloud
// saves, posting a score, bug reports and player profiles. The real database is never
// touched.

import { test, assert, openGame } from './harness.mjs';
import { fakeSupabase } from './tools/fakebase.mjs';

export const pages = ['dev.html'];

// The page's own modules, as the game uses them.
const MODULES = `
  const account = (await import('/src/game/account.js')).account;
  const lb = await import('/src/game/leaderboard.js');
`;

async function online(base, db = fakeSupabase(), query = '?debug') {
  const g = await openGame(base, 'dev.html', { supabase: db, query });
  return { ...g, db };
}

export function onlineTests(base) {
  test('online: a guest account is made for the first name, names are unique', async () => {
    const { page, errors, close, db } = await online(base);
    const r = await page.evaluate(`(async () => {${MODULES}
      const before = account.user;
      const first = await account.setName('Pam');
      const user = account.user;
      const named = await account.name();
      const rename = await account.setName('Pam B');
      await account.signOut();
      const other = await account.setName('pam b');
      return { before, first, user, named, rename, other, stored: !!localStorage.getItem('helpdesk-survivors.auth.v1') };
    })()`);
    assert(r.before === null, 'signed in before doing anything');
    assert(r.first.ok && r.user?.guest && r.named === 'Pam', 'first name: ' + JSON.stringify(r));
    assert(r.rename.ok && db.players.find((p) => p.user_id === r.user.id).name === 'Pam B', 'rename failed');
    assert(r.other.taken, 'a second player got the same name (any case)');
    assert(r.stored, 'session not kept in localStorage');
    assert(errors.length === 0, errors.join('\n'));
    await close();
  });

  test('online: expired sessions refresh, revoked ones sign out, offline keeps them', async () => {
    const { page, errors, close, db } = await online(base);
    db.tokenLife = 30; // inside ensure()'s 60 s margin, so every call refreshes first
    const r = await page.evaluate(`(async () => {${MODULES}
      await account.ensure(true);
      const id = account.user.id;
      const old = JSON.parse(localStorage.getItem('helpdesk-survivors.auth.v1')).access_token;
      const refreshed = await account.ensure();
      const now = JSON.parse(localStorage.getItem('helpdesk-survivors.auth.v1')).access_token;
      return { id, refreshed, changed: old !== now, same: account.user.id === id };
    })()`);
    assert(r.refreshed && r.changed && r.same, 'refresh failed: ' + JSON.stringify(r));
    db.offline = true;
    const off = await page.evaluate(`(async () => {${MODULES} return { ok: await account.ensure(), user: !!account.user }; })()`);
    assert(!off.ok && off.user, 'offline dropped the session');
    db.offline = false;
    db.refresh = {}; // revoked on the server
    const gone = await page.evaluate(`(async () => {${MODULES} return { ok: await account.ensure(), user: account.user }; })()`);
    assert(!gone.ok && gone.user === null, 'revoked session kept');
    assert(errors.length === 0, errors.join('\n'));
    await close();
  });

  test('online: coming back from Google signs in and clears the address', async () => {
    const db = fakeSupabase();
    const t = db.issue(db.addUser(false, 'pam@example.com'));
    const { page, errors, close } = await online(base, db, `?debug#access_token=${t.access_token}&refresh_token=${t.refresh_token}&expires_at=${t.expires_at}`);
    const r = await page.evaluate(`(async () => {${MODULES} return { user: account.user, hash: location.hash }; })()`);
    assert(r.user?.email === 'pam@example.com' && !r.user.guest, 'not signed in: ' + JSON.stringify(r.user));
    assert(r.hash === '', 'tokens left in the address bar');
    await close();
    const bad = await online(base, fakeSupabase(), '?debug#error=server_error&error_description=Unable+to+exchange+external+code');
    const e = await bad.page.evaluate(`(async () => {${MODULES} return { user: account.user, err: account.lastError }; })()`);
    assert(e.user === null && /exchange external code/.test(e.err), 'sign-in error not kept: ' + JSON.stringify(e));
    assert(errors.length === 0, errors.join('\n'));
    await bad.close();
  });

  test('online: cloud save uploads, downloads, guards races and asks on a conflict', async () => {
    const { page, errors, close, db } = await online(base);
    const steps = [];
    const sync = async (label, before = '') => {
      const r = await page.evaluate(`(async () => {${MODULES}
        const g = window.game;
        ${before}
        const status = await g.cloud.sync();
        return { status, pay: g.meta.data.pay, conflict: window.T_conflict ?? null };
      })()`);
      steps.push(`${label}: ${r.status}`);
      return r;
    };
    await page.evaluate(`(async () => {${MODULES}
      const g = window.game;
      g.meta.data.shifts = 3;
      g.meta.data.pay = 10;
      g.cloud.onConflict = (local, cloud, choose) => { window.T_conflict = { local, cloud }; window.T_choose = choose; };
      g.cloud.onChange = () => (window.T_changed = (window.T_changed ?? 0) + 1);
      await account.ensure(true);
    })()`);
    const me = () => db.saves[0];

    let r = await sync('first');
    assert(r.status === 'synced' && me()?.data.pay === 10, 'first upload: ' + steps);
    r = await sync('local change', 'g.meta.data.pay = 20;');
    assert(r.status === 'synced' && me().data.pay === 20, 'local change not uploaded: ' + steps);
    me().data = { ...me().data, pay: 99 };
    me().updated_at = db.stamp();
    r = await sync('cloud change');
    assert(r.status === 'synced' && r.pay === 99, 'cloud change not downloaded: ' + steps);
    assert((await page.evaluate(() => window.T_changed)) === 1, 'onChange not called');

    me().data = { ...me().data, pay: 500 };
    me().updated_at = db.stamp();
    r = await sync('both', 'g.meta.data.pay = 7;');
    assert(r.status === 'conflict' && r.conflict.local.pay === 7 && r.conflict.cloud.pay === 500, 'no conflict: ' + steps);
    await page.evaluate(() => window.T_choose('local'));
    await page.waitForFunction(() => window.game.cloud.status === 'synced');
    assert(me().data.pay === 7, 'keeping this device did not upload it');

    // Another device saves between our read and our write: the guarded write misses, and
    // the game looks again instead of overwriting.
    db.beforeSavePatch = () => {
      me().data = { ...me().data, pay: 1234 };
      me().updated_at = db.stamp();
    };
    r = await sync('race', 'window.T_conflict = null; g.meta.data.pay = 8;');
    assert(r.status === 'conflict' && me().data.pay === 1234, 'a racing save was overwritten: ' + steps);

    db.offline = true;
    r = await sync('offline');
    assert(r.status === 'offline', 'offline not reported: ' + steps);
    assert(errors.length === 0, errors.join('\n'));
    await close();
  });

  test('online: a new device takes the account progress without asking', async () => {
    const db = fakeSupabase();
    const id = db.addUser(false, 'pam@example.com');
    db.saves.push({ user_id: id, data: { shifts: 40, pay: 777, unlocked: ['tier1'] }, updated_at: db.stamp() });
    const t = db.issue(id);
    const { page, errors, close } = await online(base, db, `?debug#access_token=${t.access_token}&refresh_token=${t.refresh_token}`);
    await page.waitForFunction(() => window.game.cloud.status === 'synced');
    const pay = await page.evaluate(() => window.game.meta.data.pay);
    assert(pay === 777, `fresh device kept its own save (pay ${pay})`);
    assert(errors.length === 0, errors.join('\n'));
    await close();
  });

  test('online: posting a score from the end-of-shift screen', async () => {
    const { page, errors, close, db } = await online(base);
    db.addUser();
    db.scores.push({ map: 'office', name: 'Top', csat: 1e6, mult: 1, score: 1e6, seconds: 1200 });
    await page.evaluate(() => {
      const g = window.game;
      g.newRun();
      g.time = 125.4;
      g.score.csat = 4321;
      g.endRun(false);
    });
    await page.fill('.board-name', 'Dwight\u3164\u200b<script>');
    await page.click('.board-post [data-act=post]');
    await page.waitForFunction(() => /Posted/.test(document.querySelector('.board-post .board-msg')?.textContent));
    const msg = await page.textContent('.board-post .board-msg');
    const row = db.scores.at(-1);
    assert(row.name === 'Dwightscript' && row.map === 'office' && row.seconds === 125 && row.csat === 4321 && row.won === false, 'row: ' + JSON.stringify(row));
    assert(typeof row.version === 'string' && row.mult === 1 && row.mods === '', 'row fields: ' + JSON.stringify(row));
    assert(/#2/.test(msg), 'rank not shown: ' + msg);
    assert(errors.length === 0, errors.join('\n'));
    await close();
  });

  test('online: a bug report goes to the database with what the game was doing', async () => {
    const { page, errors, close, db } = await online(base);
    await page.evaluate(async () => {
      const g = window.game;
      g.newRun();
      g.time = 61;
      g.pause();
      const { bugScreen } = await import('/src/ui/bugreport.js');
      bugScreen(g.screens, 'pause', () => {});
    });
    await page.click('.bug [data-act=send]');
    assert(/Describe/.test(await page.textContent('.bug .board-msg')), 'empty report not stopped');
    await page.fill('.bug-text', 'The boss got stuck');
    await page.click('.bug [data-act=send]');
    await page.waitForSelector('text=TICKET RECEIVED');
    const b = db.bugs[0];
    assert(b?.message === 'The boss got stuck' && b.context.where === 'pause' && b.context.time === 61 && b.context.map, 'report: ' + JSON.stringify(b));
    assert(Array.isArray(b.context.tools) && b.version, 'report is missing details');
    db.offline = true;
    await page.evaluate(async () => {
      const { bugScreen } = await import('/src/ui/bugreport.js');
      bugScreen(window.game.screens, 'title', () => {});
    });
    await page.fill('.bug-text', 'again');
    await page.click('.bug [data-act=send]');
    await page.waitForFunction(() => /connection/.test(document.querySelector('.bug .board-msg').textContent));
    assert(errors.length === 0, errors.join('\n'));
    await close();
  });

  test('online: leaderboard and profiles show what players typed as text', async () => {
    const db = fakeSupabase();
    const evil = '<img src=x onerror="window.T_xss=1">';
    db.scores.push({ map: 'office', name: evil, character: evil, csat: 50, mult: 1, score: 50, seconds: 60, won: false, mods: '' });
    db.profiles = { [evil]: { since: evil, favourite: evil, shifts: evil, posted: 1, wins: 0, best: [{ map: 'office', score: evil, seconds: evil }], achievements: [evil, 'win'] } };
    const { page, errors, close } = await online(base, db);
    await page.evaluate(() => window.game.screens.leaderboard('office'));
    await page.waitForSelector('.name-link');
    await page.click('.name-link');
    await page.waitForSelector('.profile-best');
    const r = await page.evaluate(() => ({ xss: window.T_xss, imgs: document.querySelectorAll('.board img, .profile img').length, title: document.querySelector('.profile h2').textContent }));
    assert(!r.xss && r.imgs === 0, 'player text ran as HTML');
    assert(r.title === evil, 'name not shown as typed: ' + r.title);
    db.profiles = {};
    await page.evaluate(async () => {
      const { profileScreen } = await import('/src/ui/profile.js');
      profileScreen(window.game.screens, 'Nobody', () => {});
    });
    await page.waitForFunction(() => /No profile/.test(document.querySelector('.profile-body').textContent));
    assert(errors.length === 0, errors.join('\n'));
    await close();
  });
}
