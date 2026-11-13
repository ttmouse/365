// 365 年历 Service Worker
// 策略:页面导航先网后缓存(改版立即生效,离线兜底);其余同源资源缓存优先
const CACHE = '365-v9';
const PRECACHE = [
    './',
    './index.html',
    './manifest.json',
    './icon-180.png',
    './icon-192.png',
    './icon-512.png',
    './fonts/fraunces-latin-wght.woff2'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE)
            .then((c) => c.addAll(PRECACHE))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    const req = e.request;
    if (req.method !== 'GET') return;

    // 页面导航:在线时拿最新版,断网时回退到缓存
    if (req.mode === 'navigate') {
        e.respondWith(
            fetch(req)
                .then((res) => {
                    const copy = res.clone();
                    caches.open(CACHE).then((c) => c.put('./index.html', copy));
                    return res;
                })
                .catch(() => caches.match('./index.html'))
        );
        return;
    }

    // 其他同源资源:缓存优先
    if (req.url.startsWith(self.location.origin)) {
        e.respondWith(
            caches.match(req).then((hit) => hit || fetch(req).then((res) => {
                const copy = res.clone();
                caches.open(CACHE).then((c) => c.put(req, copy));
                return res;
            }))
        );
    }
    // CDN(农历库)等跨域请求不拦截,走正常网络
});
