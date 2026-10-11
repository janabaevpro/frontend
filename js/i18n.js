import { CONFIG } from "./config.js";
import ru from "./lang/ru.js";

// Новый язык: import uz from "./lang/uz.js"; и добавьте в DICTS
const DICTS = { ru };
const dict = DICTS[CONFIG.lang] || ru;

/** Возвращает строку по ключу. Переменные: t("key", { n: 3 }) заменяет {n}. */
export function t(key, vars = {}) {
  let text = dict[key] ?? ru[key] ?? key;
  for (const [name, value] of Object.entries(vars)) {
    text = text.split(`{${name}}`).join(String(value));
  }
  return text;
}

/** Подставляет переводы в элементы с атрибутом data-i18n. */
export function translatePage(root = document) {
  document.documentElement.lang = CONFIG.lang;
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
}
