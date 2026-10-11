/*
 * Запасная загрузка библиотеки с CDN, если локальный файл не загрузился.
 * Подключается обычным (блокирующим) script сразу после локальной библиотеки.
 * Параметры берутся из атрибутов тега: data-check ("aframe" | "mindar") и data-cdn (URL).
 */
(function () {
  var script = document.currentScript;
  if (!script) return;

  var check = script.getAttribute("data-check");
  var cdn = script.getAttribute("data-cdn");

  var loaded =
    check === "aframe"
      ? !!window.AFRAME
      : !!(window.AFRAME && AFRAME.systems && AFRAME.systems["mindar-image-system"]);

  if (!loaded && cdn) {
    document.write('<script src="' + cdn + '"><\/script>');
  }
})();
