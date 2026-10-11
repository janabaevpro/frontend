import { CONFIG } from "./config.js";

const whenLoaded = (el) =>
  el.hasLoaded
    ? Promise.resolve()
    : new Promise((resolve) => el.addEventListener("loaded", resolve, { once: true }));

/**
 * Обёртка над A-Frame + MindAR.
 * Метки и плоскости для видео создаются по списку CONFIG.targets.
 */
export class ArScene {
  constructor(sceneEl) {
    this.scene = sceneEl;
    this.planes = [];
    this.cameraFailed = false;
    this.ready = null;

    // Колбэки (назначаются снаружи)
    this.onFound = null;
    this.onLost = null;
  }

  /** Создаёт метки. Возвращает Promise, который выполнится, когда сцена готова. */
  init() {
    const anchors = CONFIG.targets.map((target, index) => this._createTarget(target, index));

    this.scene.addEventListener("arError", () => {
      this.cameraFailed = true;
    });

    this.ready = Promise.all([whenLoaded(this.scene), ...anchors.map(whenLoaded)]);
    return this.ready;
  }

  _planeWidth(index) {
    return CONFIG.targets[index].width ?? CONFIG.planeWidth;
  }

  _createTarget(target, index) {
    const anchor = document.createElement("a-entity");
    anchor.setAttribute("mindar-image-target", `targetIndex: ${index}`);

    const plane = document.createElement("a-video");
    const width = this._planeWidth(index);
    plane.setAttribute("width", width);
    plane.setAttribute("height", width * 0.5625);
    plane.setAttribute("visible", "false");
    anchor.appendChild(plane);

    anchor.addEventListener("targetFound", () => this.onFound?.(index));
    anchor.addEventListener("targetLost", () => this.onLost?.(index));

    this.scene.appendChild(anchor);
    this.planes[index] = plane;
    return anchor;
  }

  async start() {
    this.cameraFailed = false;

    const system = this.scene.systems["mindar-image-system"];
    if (!system) throw new Error("mindar-missing");

    await system.start();

    if (this.cameraFailed) throw new Error("camera-failed");
  }

  stop() {
    try {
      this.scene.systems["mindar-image-system"].stop();
    } catch (e) {
      /* игнорируем */
    }
  }

  /**
   * Показывает видео на плоскости с оригинальными пропорциями.
   * guard() должна возвращать true, пока метка всё ещё актуальна.
   */
  showPlane(index, size, guard = () => true) {
    const plane = this.planes[index];
    if (!plane || !size.width || !size.height) return;

    const width = this._planeWidth(index);
    plane.setAttribute("width", width);
    plane.setAttribute("height", width * (size.height / size.width));

    if (plane.dataset.bound) {
      plane.setAttribute("visible", true);
      return;
    }

    plane.setAttribute("src", `#${CONFIG.videoElementId}`);
    plane.dataset.bound = "1";

    // Небольшая пауза: текстура успевает создаться (без чёрной вспышки)
    setTimeout(() => {
      if (guard()) plane.setAttribute("visible", true);
    }, 150);
  }

  hidePlane(index) {
    this.planes[index]?.setAttribute("visible", false);
  }

  hidePlanes() {
    this.planes.forEach((plane) => plane?.setAttribute("visible", false));
  }
}
