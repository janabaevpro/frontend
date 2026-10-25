/*
 * Все настройки проекта в одном месте.
 * Чтобы добавить метку: добавьте её изображение в targets.mind (порядок важен)
 * и добавьте строку в targets. Менять другие файлы не нужно.
 */

export const CONFIG = {
  // Язык интерфейса (словари в js/lang/)
  lang: "ru",

  // Заполняется из backend для группы (/g/<токен>); порядок = порядок изображений в .mind группы
  targets: [],

  // Ширина видео в единицах MindAR (1 = ширина изображения-метки).
  // Высота считается автоматически по пропорциям видео.
  planeWidth: 1,

  // Должен совпадать с id видеоэлемента в index.html
  videoElementId: "ar-video",

  startWithSound: true,

  // Таймауты (мс)
  hintDelayMs: 12000,
  sceneTimeoutMs: 45000, // бесплатный Render может просыпаться до 40 с
  videoTimeoutMs: 25000,

  // Адрес backend (Render). Обязателен: группа, .mind и видео приходят оттуда.
  apiUrl: "https://backend-1-gffb.onrender.com",

  serviceWorkerUrl: "/sw.js"
};
