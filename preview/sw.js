// Service worker: lets the installed game start and play offline, and start fast on a
// weak signal.
//   - Sprite sheets carry a ?v= tag that changes with their pixels (sprites/build.js), and
//     icons rarely change: both come straight from the cache, fetched only when missing.
//   - Everything else (the page, the sprite manifest) is network-first, so updates reach
//     players as soon as they are online, but falls back to the cached copy if the
//     network hasn't answered within NETWORK_WAIT (or is down).
// The online leaderboard (another site) is never cached. The live game and the preview
// each have their own caches (named after the folder they run from).

const SCOPE = new URL(self.registration.scope).pathname;
const PAGES = `hds-pages:${SCOPE}`;
const ASSETS = `hds-assets:${SCOPE}`;
const NETWORK_WAIT = 3000; // ms
const CORE = ['./', 'manifest.webmanifest', 'sprites/out/manifest.json', 'icons/icon-192.png'];

// Caches the page, then every sprite sheet listed in the sprite manifest.
async function precache() {
  const pages = await caches.open(PAGES);
  await pages.addAll(CORE);
  const manifest = await (await pages.match('sprites/out/manifest.json')).json();
  const assets = await caches.open(ASSETS);
  await assets.addAll(Object.values(manifest.sheets).map((f) => 'sprites/out/' + f));
}

self.addEventListener('install', (e) => e.waitUntil(precache().then(() => self.skipWaiting())));

// Drop the cache older versions of this file used (one shared by live and preview).
self.addEventListener('activate', (e) => e.waitUntil(caches.delete('helpdesk-survivors').then(() => self.clients.claim())));

const isAsset = (url) => url.searchParams.has('v') || url.pathname.includes('/icons/');

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(isAsset(url) ? cacheFirst(req, url) : networkFirst(req));
});

async function cacheFirst(req, url) {
  const cache = await caches.open(ASSETS);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) {
    await cache.put(req, res.clone());
    // Forget older versions of the same file.
    for (const old of await cache.keys()) {
      const o = new URL(old.url);
      if (o.pathname === url.pathname && o.search !== url.search) cache.delete(old);
    }
  }
  return res;
}

async function networkFirst(req) {
  const cache = await caches.open(PAGES);
  const net = fetch(req).then((res) => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  });
  net.catch(() => {}); // a late failure after a cache answer is fine
  const slow = new Promise((resolve) => setTimeout(resolve, NETWORK_WAIT, null));
  try {
    const res = await Promise.race([net, slow]);
    if (res) return res;
  } catch {
    // Offline: fall through to the cache.
  }
  const hit = (await cache.match(req, { ignoreSearch: true })) ?? (req.mode === 'navigate' ? await cache.match('./') : null);
  if (hit) return hit;
  return net.catch(() => Response.error()); // nothing cached: keep waiting for the network
}
