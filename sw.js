/* ============ 工作台 Service Worker：实现可安装 + 离线可用 ============ */
const CACHE = "wb-workbench-v24";
const SHELL = [
  "./",
  "index.html",
  "app.js",
  "travel.js",
  "foods.js",
  "recipes.js",
  "xhs.js",
  "style.css",
  "manifest.json",
  "icon-192.png",
  "icon-512.png",
  "fitness/fit/index.html",
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // 本地静态资源：缓存优先（保证离线 App 体验）
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match("./index.html")))
    );
    return;
  }
  // 外部 API（热点/AI/云同步）：网络优先，失败不影响本地
  e.respondWith(fetch(req).catch(() => new Response("", { status: 503 })));
});
