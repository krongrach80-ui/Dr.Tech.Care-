// Service Worker สำหรับ Dr.Tech.Care Models Caching
// แคชไฟล์โมเดลทั้งหมดใน /models/ โดยอ้างอิงจาก manifest.json และล้างแคชเก่าเมื่อ hash เปลี่ยน

const MANIFEST_URL = "/models/manifest.json";
const CACHE_PREFIX = "drtechcare-models-";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const response = await fetch(MANIFEST_URL, { cache: "no-store" });
        if (!response.ok) {
          console.warn("[SW] ไม่สามารถดึง manifest.json ได้ในขณะนี้");
          return self.skipWaiting();
        }

        const manifest = await response.json();
        const cacheVersion = manifest.version || "1.0.0";
        const cacheName = `${CACHE_PREFIX}v${cacheVersion}`;

        const cache = await caches.open(cacheName);
        const filesToCache = Object.keys(manifest.files || {}).map((relPath) => `/models/${relPath}`);

        // เพิ่ม manifest.json เข้าไปในแคชด้วย
        filesToCache.push(MANIFEST_URL);

        console.log(`[SW] กำลังพรีแคชไฟล์โมเดล ${filesToCache.length} ไฟล์ลงใน ${cacheName}`);
        
        // แคชทีละไฟล์เพื่อไม่ให้ล้มเหลวทั้งชุดหากมีไฟล์ใดไม่พร้อม
        await Promise.allSettled(
          filesToCache.map(async (url) => {
            try {
              const res = await fetch(url);
              if (res.ok) {
                await cache.put(url, res);
              }
            } catch (err) {
              console.warn(`[SW] ไม่สามารถแคช ${url}:`, err);
            }
          })
        );

        return self.skipWaiting();
      } catch (err) {
        console.warn("[SW] Install event error:", err);
        return self.skipWaiting();
      }
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const response = await fetch(MANIFEST_URL, { cache: "no-store" });
        let activeCacheName = `${CACHE_PREFIX}v1.0.0`;
        if (response.ok) {
          const manifest = await response.json();
          activeCacheName = `${CACHE_PREFIX}v${manifest.version || "1.0.0"}`;
        }

        const keys = await caches.keys();
        await Promise.all(
          keys.map((key) => {
            if (key.startsWith(CACHE_PREFIX) && key !== activeCacheName) {
              console.log(`[SW] กำลังลบแคชโมเดลเวอร์ชันเก่า: ${key}`);
              return caches.delete(key);
            }
            return Promise.resolve();
          })
        );

        return self.clients.claim();
      } catch (err) {
        console.warn("[SW] Activate event error:", err);
        return self.clients.claim();
      }
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // ดักจับเฉพาะคำขอที่เกี่ยวกับ /models/
  if (url.origin === self.location.origin && url.pathname.startsWith("/models/")) {
    event.respondWith(
      (async () => {
        // กลยุทธ์ Cache-First สำหรับโมเดล
        const cached = await caches.match(event.request);
        if (cached) {
          return cached;
        }

        try {
          const networkRes = await fetch(event.request);
          if (networkRes.ok) {
            const cache = await caches.open(`${CACHE_PREFIX}active`);
            cache.put(event.request, networkRes.clone());
          }
          return networkRes;
        } catch (fetchErr) {
          if (cached) return cached;
          throw fetchErr;
        }
      })()
    );
  }
});
