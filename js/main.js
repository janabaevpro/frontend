import { CONFIG } from "./config.js";
import { t, translatePage } from "./i18n.js";
import { ui } from "./ui.js";
import { VideoPlayer } from "./video-player.js";
import { ArScene } from "./ar-scene.js";
import { diagnoseCamera } from "./camera.js";
import { registerServiceWorker } from "./pwa.js";
import { syncTargets } from "./api.js";
import {
  isInApp,
  isAndroid,
  chromeIntentUrl,
  copyToClipboard,
  track,
  prefetch,
  onLoad,
  WakeLock
} from "./utils.js";

/* ================= Инициализация ================= */
translatePage();

const sceneEl = document.querySelector("#ar-scene");
const videoEl = document.querySelector(`#${CONFIG.videoElementId}`);

const player = new VideoPlayer(videoEl);
const ar = new ArScene(sceneEl);
const wakeLock = new WakeLock();

let isStarting = false;
let isStarted = false;
let isReady = false;
let current = -1; // индекс найденной метки
let hintTimer = null;

/* ================= Подсказка, если метка не найдена ================= */
function armHint() {
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => {
    if (isStarted && current === -1) ui.setStatus(t("status.hint"));
  }, CONFIG.hintDelayMs);
}

/* ================= Видео ================= */
player.onLoading = () => ui.setStatus(t("status.loadingVideo"), true);
player.onBuffering = () => ui.setStatus(t("status.loadingVideo"), true);
player.onPlaying = () => ui.setStatus("");
player.onSoundChange = (on) => ui.setSoundLabel(on);

ui.onSoundToggle(() => player.toggleSound());

/* ================= События меток ================= */
ar.onFound = async (index) => {
  clearTimeout(hintTimer);
  current = index;
  track("target_found", { index: index + 1 });

  ar.hidePlanes();

  try {
    const result = await player.play(index, CONFIG.targets[index].video);
    if (!result || current !== index) return;

    ar.showPlane(index, result.size, () => current === index);

    ui.setStatus(result.mutedFallback ? t("status.noSound") : "");
  } catch (error) {
    if (current !== index) return;

    console.error(`Ошибка видео ${index + 1} (${CONFIG.targets[index].video}):`, error);

    const kind = player.classifyError(error);
    if (kind === "notfound") ui.setStatus(t("status.videoNotFound", { n: index + 1 }));
    else if (kind === "timeout") ui.setStatus(t("status.videoTimeout"));
    else ui.setStatus(t("status.videoFailed"));
  }
};

ar.onLost = (index) => {
  if (current !== index) return;

  current = -1;
  player.stop();
  ar.hidePlane(index);

  ui.setStatus(t("status.point"));
  armHint();
};

/* ================= Встроенные браузеры ================= */
if (isInApp) ui.showInApp(isAndroid ? chromeIntentUrl() : null);

ui.onCopy(async () => {
  const copied = await copyToClipboard(location.href);
  if (copied) ui.setCopyLabel(t("inapp.copied"));
  else window.prompt(t("inapp.copyPrompt"), location.href);
});

/* ================= Готовность сцены ================= */
ui.setButton(t("button.loading"), { disabled: true, busy: true });

if (!window.AFRAME) {
  ui.setButton(t("button.unavailable"), { disabled: true });
  ui.showError(t("error.libs"));
} else {
  syncTargets()
    .then(() => ar.init())
    .then(() => {
      isReady = true;
      ui.setButton(t("button.start"));
    })
    .catch((error) => {
      console.error("Ошибка инициализации сцены:", error);
      ui.setButton(t("button.unavailable"), { disabled: true });
      ui.showError(t("error.libs"));
    });

  setTimeout(() => {
    if (!isReady) {
      ui.setButton(t("button.unavailable"), { disabled: true });
      ui.showError(t("error.sceneTimeout"));
    }
  }, CONFIG.sceneTimeoutMs);
}

/* ================= Запуск камеры ================= */
ui.onStart(async () => {
  if (isStarting || isStarted || !isReady) return;

  isStarting = true;
  ui.showError("");
  ui.setButton(t("button.starting"), { disabled: true, busy: true });

  // Важно: синхронно в клике, до любых await
  player.unlock();

  try {
    await ar.ready;
    await ar.start();

    isStarted = true;
    ui.hidePanel();
    ui.showSoundButton();
    player.setSound(CONFIG.startWithSound);
    player.pause();

    ui.setStatus(t("status.point"));
    armHint();
    wakeLock.request();
    track("start", { inapp: isInApp });
  } catch (error) {
    console.error("Ошибка запуска AR:", error);
    track("camera_error", { name: error && error.name });

    ar.stop();

    ui.showError(await diagnoseCamera(error));
    if (isInApp) ui.showInApp(isAndroid ? chromeIntentUrl() : null);
    ui.setButton(t("button.retry"));
  } finally {
    isStarting = false;
  }
});

/* ================= Системные события ================= */
document.addEventListener("visibilitychange", () => {
  if (!isStarted) return;

  if (document.visibilityState === "visible") {
    wakeLock.request();
    player.resume();
  } else {
    player.pause();
  }
});

window.addEventListener("pagehide", () => {
  if (isStarted) ar.stop();
});

onLoad(() => prefetch(CONFIG.targetsMindUrl));
registerServiceWorker(CONFIG.serviceWorkerUrl);
