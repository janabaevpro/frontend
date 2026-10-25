/*
 * Service Worker для AR Виньетка.
 * Меняйте VERSION при каждом обновлении кода, targets.mind или библиотек,
 * чтобы у пользователей обновился кэш.
 *
 * Видео (/assets/videos/) здесь НЕ кэшируются: они грузятся через Range-запросы,
 * их кэширует сам браузер по заголовкам Cache-Control.
 */
const VERSION = "v5";
const CACHE = `ar-vinetka-${VERSION}`;

const PRECACHE = [
  "/",
  "/manifest.webmanifest",
  "/icon.svg",
  "/css/styles.css",
  "/js/main.js",
  "/js/config.js",
  "/js/i18n.js",
  "/js/lang/ru.js",
  "/js/ui.js",
  "/js/utils.js",
  "/js/camera.js",
  "/js/pwa.js",
  "/js/video-player.js",
  "/js/ar-scene.js",
  "/js/api.js",
  "/js/libs-fallback.js",
  "/assets/lib/aframe-1.4.2.min.js",
  "/assets/lib/mindar-image-aframe-1.2.5.prod.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // allSettled: отсутствующий файл не ломает установку
      Promise.allSettled(
        PRECACHE.map((url) => cache.add(new Request(url, { cache: "reload" })))
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k.startsWith("ar-vinetka-") && k !== CACHE)
              .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request, cacheKey) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(cacheKey || request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await cache.match(cacheKey || request);
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok && response.status === 200) {
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Админ-панель не кэшируем
  if (url.pathname.startsWith("/admin")) return;

  // Видео и Range-запросы пропускаем
  if (request.headers.has("range")) return;
  if (url.pathname.startsWith("/assets/videos/")) return;

  // Страница: сначала сеть, при отсутствии интернета — кэш
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "/"));
    return;
  }

  // Код (js, css) и метки: сначала сеть, чтобы обновления доходили сразу
  if (
    url.pathname.startsWith("/js/") ||
    url.pathname.startsWith("/css/") ||
    url.pathname.endsWith(".mind")
  ) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Библиотеки с версией в имени, иконка, manifest: сначала кэш
  if (
    url.pathname.startsWith("/assets/lib/") ||
    url.pathname === "/icon.svg" ||
    url.pathname === "/manifest.webmanifest"
  ) {
    event.respondWith(cacheFirst(request));
  }
});
