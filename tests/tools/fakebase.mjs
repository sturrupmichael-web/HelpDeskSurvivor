// A stand-in for the game's Supabase project, for browser tests: answers the auth and
// REST calls the game makes (src/game/account.js, cloudsave.js, leaderboard.js,
// src/ui/bugreport.js) from memory, with the same rules the real database enforces
// (supabase/*.sql): you only see and change your own player, save and nothing else, names
// are unique, scores get their name from your player. Nothing leaves the test.
//
//   const db = fakeSupabase();
//   await db.attach(page);        // the page's Supabase requests now go to `db`
//   db.saves, db.scores, ...      // what the game wrote
//   db.offline = true;            // every request fails as if there were no network

import { LEADERBOARD as LB } from '../../data/leaderboard.js';

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

export function fakeSupabase() {
  let n = 0;
  let clock = Date.parse('2026-01-01T00:00:00Z');
  const db = {
    offline: false,
    users: {}, // id -> { id, email, guest }
    tokens: {}, // access token -> user id
    refresh: {}, // refresh token -> user id
    players: [], // { user_id, name, banned }
    saves: [], // { user_id, data, updated_at }
    scores: [], // rows as posted, plus name and score
    bugs: [], // { user_id, message, version, context }
    calls: [], // 'METHOD /path' for every request, in order
    tokenLife: 3600, // seconds a new access token lasts
    beforeSavePatch: null, // runs just before a save PATCH is applied (to race it)

    // Signs a user in: { access_token, refresh_token, expires_at }, as Supabase returns.
    issue(userId, life = db.tokenLife) {
      const u = db.users[userId];
      const exp = Math.floor(Date.now() / 1000) + life;
      const access = `${b64({ alg: 'none' })}.${b64({ sub: u.id, email: u.email, is_anonymous: u.guest, exp, n: ++n })}.x`;
      const refresh = `r${++n}`;
      db.tokens[access] = u.id;
      db.refresh[refresh] = u.id;
      return { access_token: access, refresh_token: refresh, expires_at: exp, token_type: 'bearer' };
    },
    addUser(guest = true, email = '') {
      const id = `u${++n}`;
      db.users[id] = { id, email, guest };
      return id;
    },
    // A save timestamp that is always newer than the last one.
    stamp: () => new Date((clock += 1000)).toISOString(),

    async attach(page) {
      await page.route(/supabase\.co/, (route) => db.handle(route));
    },

    async handle(route) {
      const req = route.request();
      if (db.offline) return route.abort();
      const cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PATCH,HEAD,OPTIONS',
        'Access-Control-Expose-Headers': 'Content-Range',
      };
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
      const url = new URL(req.url());
      db.calls.push(`${req.method()} ${url.pathname}`);
      const headers = req.headers();
      const auth = (headers.authorization ?? '').replace(/^Bearer /, '');
      const me = db.tokens[auth] ? db.users[db.tokens[auth]] : null;
      const body = (() => {
        try {
          return JSON.parse(req.postData() ?? 'null');
        } catch {
          return null;
        }
      })();
      const reply = (status, json, extra = {}) =>
        route.fulfill({ status, headers: { ...cors, 'Content-Type': 'application/json', ...extra }, body: json === undefined ? '' : JSON.stringify(json) });
      if (headers.apikey !== LB.key) return reply(401, { message: 'bad apikey' });
      const q = Object.fromEntries(url.searchParams);
      const eq = (k) => q[k]?.replace(/^eq\./, '');
      const path = url.pathname;

      // Auth
      if (path === '/auth/v1/signup') return reply(200, db.issue(db.addUser(true)));
      if (path === '/auth/v1/token') {
        const id = db.refresh[body?.refresh_token];
        if (!id) return reply(400, { error_code: 'refresh_token_not_found' });
        delete db.refresh[body.refresh_token];
        return reply(200, db.issue(id));
      }
      if (path === '/auth/v1/logout') return reply(204);

      // Public reads
      if (path === `/rest/v1/${LB.table}` && (req.method() === 'GET' || req.method() === 'HEAD')) {
        let rows = db.scores.filter((r) => r.map === eq('map'));
        if (q.name) rows = rows.filter((r) => r.name === eq('name'));
        if (q.score) rows = rows.filter((r) => r.score > Number(q.score.replace(/^gt\./, '')));
        if (q.mods === 'eq.') rows = rows.filter((r) => !r.mods);
        rows.sort((a, b) => b.score - a.score || b.seconds - a.seconds);
        if (req.method() === 'HEAD') return route.fulfill({ status: 200, headers: { ...cors, 'Content-Range': `*/${rows.length}` } });
        return reply(200, rows.slice(0, Number(q.limit) || 1000));
      }
      if (path === '/rest/v1/rpc/player_profile') return reply(200, db.profiles?.[body?.p_name] ?? null);

      // Everything else is per player
      if (!me) return reply(401, { message: 'JWT expired' });
      const mine = (rows) => rows.filter((r) => r.user_id === me.id);
      if (path === '/rest/v1/players') {
        if (req.method() === 'GET') return reply(200, mine(db.players).map(({ name }) => ({ name })));
        if (db.players.some((p) => p.name.toLowerCase() === body.name.toLowerCase() && p.user_id !== me.id)) return reply(409, { code: '23505' });
        if (req.method() === 'POST') {
          if (mine(db.players).length) return reply(409, { code: '23505' });
          db.players.push({ user_id: me.id, name: body.name, banned: false });
          return reply(201);
        }
        if (req.method() === 'PATCH' && eq('user_id') === me.id) {
          for (const p of mine(db.players)) p.name = body.name;
          return reply(204);
        }
      }
      if (path === '/rest/v1/saves') {
        if (req.method() === 'GET') return reply(200, mine(db.saves).map(({ data, updated_at }) => ({ data, updated_at })));
        if (req.method() === 'POST') {
          if (mine(db.saves).length) return reply(409, { code: '23505' });
          const row = { user_id: me.id, data: body.data, updated_at: db.stamp() };
          db.saves.push(row);
          return reply(201, [{ data: row.data, updated_at: row.updated_at }]);
        }
        if (req.method() === 'PATCH') {
          db.beforeSavePatch?.();
          db.beforeSavePatch = null;
          const row = mine(db.saves).find((r) => eq('user_id') === me.id && (!q.updated_at || r.updated_at === eq('updated_at')));
          if (!row) return reply(200, []);
          row.data = body.data;
          row.updated_at = db.stamp();
          return reply(200, [{ data: row.data, updated_at: row.updated_at }]);
        }
      }
      if (path === `/rest/v1/${LB.table}` && req.method() === 'POST') {
        const player = mine(db.players)[0];
        if (!player || player.banned) return reply(403, { message: 'no player' });
        db.scores.push({ ...body, name: player.name, score: Math.round(body.csat * (body.mult ?? 1)) });
        return reply(201);
      }
      if (path === '/rest/v1/bug_reports' && req.method() === 'POST') {
        db.bugs.push({ user_id: me.id, ...body });
        return reply(201);
      }
      return reply(404, { message: `fake Supabase has no ${req.method()} ${path}` });
    },
  };
  return db;
}
