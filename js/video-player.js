import { CONFIG } from "./config.js";

/** Короткая «тишина» (WAV): нужна, чтобы разблокировать звук внутри клика. */
function makeSilentWav() {
  const sampleRate = 8000;
  const samples = 800;
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);
  const write = (offset, text) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  write(0, "RIFF");
  view.setUint32(4, 36 + samples * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, samples * 2, true);

  return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
}

/**
 * Один общий видеоэлемент для всех меток.
 * Загружает нужное видео только когда метка найдена, управляет звуком.
 */
export class VideoPlayer {
  constructor(video) {
    this.video = video;
    this.soundOn = true;
    this.active = false;   // сейчас показываем видео
    this.loadedIndex = -1; // какое видео загружено в элемент
    this.token = 0;        // защита от гонок при быстрой смене меток
    this.silentUrl = null;

    // Колбэки (назначаются снаружи)
    this.onLoading = null;
    this.onBuffering = null;
    this.onPlaying = null;
    this.onSoundChange = null;

    video.addEventListener("waiting", () => {
      if (this.active) this.onBuffering?.();
    });
    video.addEventListener("playing", () => {
      if (this.active && this.soundOn) this.onPlaying?.();
    });
  }

  /** Вызывать синхронно в обработчике клика (до любых await). */
  unlock() {
    try {
      if (!this.silentUrl) this.silentUrl = makeSilentWav();

      this.video.muted = false;
      this.video.src = this.silentUrl;
      this.loadedIndex = -1;

      const promise = this.video.play();
      if (promise && typeof promise.then === "function") {
        promise
          .then(() => {
            if (!this.active) this.video.pause();
          })
          .catch(() => {});
      }
    } catch (e) {
      /* не критично */
    }
  }

  setSound(on) {
    this.soundOn = on;
    this.video.muted = !on;
    this.onSoundChange?.(on);
  }

  toggleSound() {
    this.setSound(!this.soundOn);
    this.resume();
  }

  pause() {
    this.video.pause();
  }

  resume() {
    if (this.active && this.video.paused) {
      this.video.play().catch(() => {});
    }
  }

  stop() {
    this.token++;
    this.active = false;
    this.video.pause();
    try {
      this.video.currentTime = 0;
    } catch (e) {
      /* игнорируем */
    }
  }

  /**
   * Загружает (если нужно) и запускает видео.
   * Возвращает { size: {width, height}, mutedFallback } или null, если запрос устарел.
   * При ошибке бросает исключение: тип ошибки даёт classifyError().
   */
  async play(index, url) {
    const token = ++this.token;
    const video = this.video;
    this.active = true;

    try {
      if (this.loadedIndex !== index) {
        this.loadedIndex = -1;
        this.onLoading?.();

        // С preload="none" метаданные не грузятся, поэтому включаем загрузку
        video.preload = "auto";
        video.src = url;
        video.load();

        await this._waitMetadata();
        if (token !== this.token) return null;
        this.loadedIndex = index;
      } else {
        try {
          video.currentTime = 0;
        } catch (e) {
          /* игнорируем */
        }
      }

      const size = { width: video.videoWidth, height: video.videoHeight };
      const mutedFallback = await this._playWithFallback();
      if (token !== this.token) return null;

      return { size, mutedFallback };
    } catch (error) {
      if (token !== this.token) return null;
      if (error && error.name === "AbortError") return null;

      this.loadedIndex = -1;
      throw error;
    }
  }

  /** "notfound" | "timeout" | "failed" */
  classifyError(error) {
    const code = this.video.error ? this.video.error.code : 0;
    if (code === 4) return "notfound";
    if (error && error.message === "video-timeout") return "timeout";
    return "failed";
  }

  _waitMetadata() {
    const el = this.video;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error("video-timeout"));
      }, CONFIG.videoTimeoutMs);

      const ok = () => {
        cleanup();
        resolve();
      };
      const bad = () => {
        cleanup();
        reject(new Error("video-error"));
      };
      const cleanup = () => {
        clearTimeout(timer);
        el.removeEventListener("loadedmetadata", ok);
        el.removeEventListener("error", bad);
      };

      el.addEventListener("loadedmetadata", ok);
      el.addEventListener("error", bad);
    });
  }

  /** Возвращает true, если пришлось запустить без звука. */
  async _playWithFallback() {
    this.video.muted = !this.soundOn;

    try {
      await this.video.play();
      return false;
    } catch (error) {
      if (error && error.name === "AbortError") throw error;

      // Запасной вариант: без звука
      this.setSound(false);
      await this.video.play();
      return true;
    }
  }
}
