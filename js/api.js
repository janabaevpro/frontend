import { CONFIG } from "./config.js";

/**
 * Загружает список меток с backend и подменяет CONFIG.targets.
 * Если backend недоступен (или спит на бесплатном Render), остаётся список из config.js.
 */
export async function syncTargets(timeoutMs = 3000) {
  if (!CONFIG.apiUrl) return false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${CONFIG.apiUrl}/api/targets`, { signal: controller.signal });
    if (!response.ok) return false;

    const { targets } = await response.json();
    if (!Array.isArray(targets) || !targets.length) return false;

    // order = индекс изображения в targets.mind; должен идти 0,1,2... без пропусков
    const sorted = [...targets].sort((a, b) => a.order - b.order);
    if (!sorted.every((t, i) => t.order === i && typeof t.video === "string")) {
      console.warn("API: порядок меток нарушен, используется config.js");
      return false;
    }

    CONFIG.targets = sorted.map(({ video, width }) => (width ? { video, width } : { video }));
    return true;
  } catch (e) {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
