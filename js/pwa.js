import { onLoad } from "./utils.js";

/** Регистрирует Service Worker (только HTTPS или localhost). */
export function registerServiceWorker(url) {
  if (!("serviceWorker" in navigator)) return;

  const allowed = location.protocol === "https:" || location.hostname === "localhost";
  if (!allowed) return;

  onLoad(() => {
    navigator.serviceWorker.register(url).catch(() => {});
  });
}
