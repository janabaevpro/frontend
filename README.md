# AR Виньетка

Веб-AR на A-Frame + MindAR: наведите камеру на изображение, и поверх него играет видео.

## Структура

```
index.html            только разметка
css/styles.css        все стили (цвета и размеры в переменных :root)
js/
  config.js           ВСЕ настройки: список меток и видео, таймауты, язык
  main.js             точка входа, связывает модули
  ar-scene.js         A-Frame + MindAR: создание меток, запуск камеры
  video-player.js     один общий видеоэлемент, звук, загрузка по требованию
  ui.js               всё, что связано с экраном (панель, статус, кнопки)
  camera.js           понятные сообщения об ошибках камеры
  utils.js            встроенные браузеры, статистика, wake lock
  pwa.js              регистрация Service Worker
  i18n.js, lang/ru.js переводы
  libs-fallback.js    запасная загрузка библиотек с CDN
sw.js                 Service Worker (кэш)
vercel.json           заголовки для Vercel
nginx.conf            конфиг для собственного сервера
scripts/              download-libs.sh, optimize-videos.sh
assets/               targets.mind, videos/, lib/
```

## Как добавить метку и видео

1. Добавьте изображение в targets.mind (компилятор MindAR) — порядок важен.
2. Положите видео в `assets/videos/`.
3. Добавьте строку в `targets` в `js/config.js`.

HTML и остальной код менять не нужно.

## Как добавить язык

Скопируйте `js/lang/ru.js` в `js/lang/uz.js`, переведите, подключите в `js/i18n.js`
и поставьте `lang: "uz"` в `config.js`.

## Важно

- Сайт нужно открывать по HTTP(S) (не двойным кликом по файлу): ES-модули и камера не работают с `file://`.
- После изменения кода увеличьте `VERSION` в `sw.js`.
- `imageTargetSrc` в `index.html` должен совпадать с `targetsMindUrl` в `config.js`.
- `.vercelignore`: добавьте строки `originals` и `scripts`.
"# frontend" 
