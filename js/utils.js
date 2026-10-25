import { CONFIG } from "./config.js";

const UA = navigator.userAgent || "";

/** Встроенный браузер приложения (Telegram, Instagram и т. п.), где камера часто заблокирована. */
export const isInApp =
  /FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|Telegram|TikTok|musical_ly|Snapchat|Twitter|VKApp|OKApp|; wv\)/i.test(UA);

export const isAndroid = /Android/i.test(UA);

/** Ссылка, открывающая текущую страницу в Chrome на Android. */
export function chromeIntentUrl() {
  const scheme = location.protocol.replace(":", "");
  return (
    `intent://${location.host}${location.pathname}${location.search}` +
    `#Intent;scheme=${scheme};package=com.android.chrome;end`
  );
}

/** Отправка события статистики (если задан CONFIG.apiUrl). */
export function track(event, data = {}) {
  if (!CONFIG.apiUrl) return;
  try {
    const group = location.pathname.match(/^\/g\/([a-z0-9-]+)/i)?.[1]?.toLowerCase();
    const body = JSON.stringify({ event, group, ...data, t: Date.now() });
    // text/plain: простой запрос без CORS preflight; сервер читает его как JSON
    navigator.sendBeacon(`${CONFIG.apiUrl}/api/track`, new Blob([body], { type: "text/plain" }));
  } catch (e) {
    /* не критично */
  }
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    return false;
  }
}

/** Выполнить функцию после полной загрузки страницы. */
export function onLoad(fn) {
  if (document.readyState === "complete") fn();
  else window.addEventListener("load", fn, { once: true });
}

/** Тихая предзагрузка файла в HTTP-кэш в свободное время браузера. */
export function prefetch(url) {
  const run = () => fetch(url).catch(() => {});
  if ("requestIdleCallback" in window) requestIdleCallback(run);
  else setTimeout(run, 1500);
}

/** Не даёт экрану гаснуть во время AR (если поддерживается). */
export class WakeLock {
  constructor() {
    this.lock = null;
  }

  async request() {
    try {
      if ("wakeLock" in navigator && !this.lock) {
        this.lock = await navigator.wakeLock.request("screen");
        this.lock.addEventListener("release", () => {
          this.lock = null;
        });
      }
    } catch (e) {
      /* не поддерживается или отклонено */
    }
  }
}
