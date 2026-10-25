import { CONFIG } from "./config.js";

/** Токен группы из адреса: /g/<slug> */
export function getGroupSlug() {
  const m = location.pathname.match(/^\/g\/([a-z0-9-]{3,40})\/?$/i);
  return m ? m[1].toLowerCase() : null;
}

/**
 * Загружает ТОЛЬКО данные этой группы: .mind и список видео.
 * Заполняет CONFIG.targets и возвращает { name, mind } (mind = полный URL).
 * Ошибка: err.code = "not_found" | "network" | "bad_data".
 */
export async function loadGroup(slug, timeoutMs = 40000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const fail = (code) => Object.assign(new Error(code), { code });

  let response;
  try {
    response = await fetch(`${CONFIG.apiUrl}/api/groups/${slug}`, { signal: controller.signal });
  } catch (e) {
    throw fail("network");
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 404) throw fail("not_found");
  if (!response.ok) throw fail("network");

  const data = await response.json();
  const sorted = Array.isArray(data.targets) ? [...data.targets].sort((a, b) => a.order - b.order) : [];

  // order = индекс изображения в .mind; должен идти 0,1,2... без пропусков
  if (!data.mind || !sorted.length || !sorted.every((t, i) => t.order === i && typeof t.video === "string")) {
    throw fail("bad_data");
  }

  // Bazadagi video: "/api/videos/5" -> backend manzili bilan
  const abs = (v) => (v.startsWith("/api/") ? `${CONFIG.apiUrl}${v}` : v);
  CONFIG.targets = sorted.map(({ video, width }) => (width ? { video: abs(video), width } : { video: abs(video) }));
  return { name: data.name, mind: `${CONFIG.apiUrl}${data.mind}` };
}
