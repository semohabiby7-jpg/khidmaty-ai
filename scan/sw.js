/* ===== Scan Macaron AI — Service Worker (offline + auto-update) =====
   v36 — إصلاح: التطبيق المثبّت كان بيفضل على نسخة قديمة للأبد
   (cache-first على كل حاجة)، فأي تحديث مابيوصلش، ولو حصل خلل يبقى «ميّت».
   الاستراتيجية الجديدة:
   - صفحات HTML وملفات JS/CSS: من الشبكة الأول (وبنحدّث الكاش)، ولو مفيش نت نستخدم الكاش.
   - الصور والأيقونات: من الكاش مع تحديث في الخلفية.
   - أي مورد خارج الموقع (CDN): بيعدّي للشبكة مباشرة، مابنخزّنهوش.
*/
const CACHE = 'scan-macaron-v36';
const CORE = ['./', './index.html', './styles.css', './app.js', './manifest.json', './icon.svg', './icon-192.png', './icon-512.png', './icon-512-maskable.png'];
const NETWORK_FIRST = ['document', 'script', 'style'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(CORE.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
    return res;
  } catch (err) {
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  const net = fetch(req)
    .then((res) => {
      if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
      return res;
    })
    .catch(() => cached);
  return cached || net;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // CDN — مابنخزّنهوش
  const isNav = req.mode === 'navigate' || NETWORK_FIRST.includes(req.destination);
  e.respondWith(
    (isNav ? networkFirst(req) : cacheFirst(req)).catch(async () => {
      const cache = await caches.open(CACHE);
      return (await cache.match('./index.html')) || Response.error();
    })
  );
});
