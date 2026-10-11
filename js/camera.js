import { t } from "./i18n.js";
import { isInApp } from "./utils.js";

/** Возвращает понятное объяснение, почему не открылась камера. */
export async function diagnoseCamera(error) {
  if (!window.isSecureContext) return t("error.https");

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return t("error.noCamera");
  }

  try {
    if (navigator.permissions && navigator.permissions.query) {
      const result = await navigator.permissions.query({ name: "camera" });
      if (result.state === "denied") return t("error.denied");
    }
  } catch (e) {
    /* Safari не поддерживает query для камеры */
  }

  const name = (error && error.name) || "";
  const message = String((error && error.message) || error || "");

  if (name === "NotAllowedError" || /permission|denied/i.test(message)) {
    return t("error.denied");
  }
  if (name === "NotFoundError") return t("error.notFound");
  if (name === "NotReadableError") return t("error.busy");

  return isInApp ? t("error.inapp") : t("error.generic");
}
