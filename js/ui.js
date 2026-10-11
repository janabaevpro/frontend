import { t } from "./i18n.js";

const $ = (selector) => document.querySelector(selector);

const el = {
  panel: $("#start-panel"),
  button: $("#start-button"),
  label: $("#start-label"),
  spinner: $("#start-button .spinner"),
  error: $("#panel-error"),
  status: $("#status"),
  soundButton: $("#sound-button"),
  inapp: $("#inapp-warning"),
  copyButton: $("#copy-link"),
  chromeLink: $("#open-chrome")
};

/** Всё, что касается экрана. Остальные модули DOM напрямую не трогают. */
export const ui = {
  /** Плашка внизу экрана. Пустой текст скрывает её. */
  setStatus(text, busy = false) {
    if (!text) {
      el.status.hidden = true;
      el.status.textContent = "";
      return;
    }

    el.status.textContent = "";

    if (busy) {
      const spinner = document.createElement("span");
      spinner.className = "spinner";
      spinner.setAttribute("aria-hidden", "true");
      el.status.appendChild(spinner);
    }

    el.status.appendChild(document.createTextNode(text));
    el.status.hidden = false;
  },

  /** Ошибка в стартовой панели. Пустой текст скрывает её. */
  showError(text) {
    el.error.textContent = text;
    el.error.hidden = !text;
  },

  setButton(label, { disabled = false, busy = false } = {}) {
    el.label.textContent = label;
    el.button.disabled = disabled;
    el.spinner.hidden = !busy;
  },

  hidePanel() {
    el.panel.hidden = true;
  },

  showInApp(chromeHref) {
    el.inapp.hidden = false;
    if (chromeHref) {
      el.chromeLink.href = chromeHref;
      el.chromeLink.hidden = false;
    }
  },

  setCopyLabel(text) {
    el.copyButton.textContent = text;
  },

  showSoundButton() {
    el.soundButton.hidden = false;
  },

  setSoundLabel(on) {
    el.soundButton.textContent = t(on ? "sound.on" : "sound.off");
  },

  onStart(handler) {
    el.button.addEventListener("click", handler);
  },

  onSoundToggle(handler) {
    el.soundButton.addEventListener("click", handler);
  },

  onCopy(handler) {
    el.copyButton.addEventListener("click", handler);
  }
};
