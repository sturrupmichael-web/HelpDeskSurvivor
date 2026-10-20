// Service worker: lets the installed game start and play offline.
// Network first, so every update reaches players as soon as they are online; whatever
// was last loaded is kept in the cache for when they are not. The online leaderboard
// (another site) is never cached.

const CACHE = 'helpdesk-survivors';
const CORE = ['./', 'manifest.webmanifest', 'sprites/out/manifest.json', 'icons/icon-192.png'];

// Caches the page, then every sprite sheet listed in the sprite manifest.
async function precache() {
  const c = await caches.open(CACHE);
  await c.addAll(CORE);
  const manifest = await (await c.match('sprites/out/manifest.json')).json();
  await c.addAll(Object.values(manifest.sheets).map((f) => 'sprites/out/' + f));
}

self.addEventListener('install', (e) => e.waitUntil(precache().then(() => self.skipWaiting())));

self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(async () => {
        const hit = await caches.match(req, { ignoreSearch: true });
        if (hit) return hit;
        // Offline and opened by another address (e.g. index.html): serve the game page.
        if (req.mode === 'navigate') return (await caches.match('./')) ?? Response.error();
        return Response.error();
      }),
  );
});
