/*
 * Все настройки проекта в одном месте.
 * Чтобы добавить метку: добавьте её изображение в targets.mind (порядок важен)
 * и добавьте строку в targets. Менять другие файлы не нужно.
 */
export const CONFIG = {
  // Язык интерфейса (словари в js/lang/)
  lang: "ru",

  // Порядок элементов = порядок изображений в targets.mind
  targets: [
    { video: "/assets/videos/video-1.mp4" },
    { video: "/assets/videos/video-2.mp4" },
    { video: "/assets/videos/video-3.mp4" },
    { video: "/assets/videos/video-4.mp4" },
    { video: "/assets/videos/video-5.mp4" }
    // Пример с индивидуальной шириной: { video: "/assets/videos/video-6.mp4", width: 1.4 }
  ],

  // Ширина видео в единицах MindAR (1 = ширина изображения-метки).
  // Высота считается автоматически по пропорциям видео.
  planeWidth: 1,

  // Должен совпадать с imageTargetSrc в index.html
  targetsMindUrl: "/assets/targets.mind",

  // Должен совпадать с id видеоэлемента в index.html
  videoElementId: "ar-video",

  startWithSound: true,

  // Таймауты (мс)
  hintDelayMs: 12000,
  sceneTimeoutMs: 25000,
  videoTimeoutMs: 25000,

  // Адрес backend (Render), например "https://ar-vinetka-api.onrender.com".
  // Пусто = backend выключен: сайт работает по списку targets выше, статистика не отправляется.
  apiUrl: "https://backend-1-gffb.onrender.com",

  serviceWorkerUrl: "/sw.js"
};
