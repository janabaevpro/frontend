import { CONFIG } from "/js/config.js";

const API = CONFIG.apiUrl;
const $ = (s, r = document) => r.querySelector(s);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const MAX_TARGETS = 30;
const MAX_VIDEO_MB = 100; // server o'zi ham tekshiradi (bazada 25 MB, Bunny'da 100 MB)

/* ---------- Umumiy yordamchilar ---------- */
let token = sessionStorage.getItem("adminToken") || "";

function toast(msg, isErr = false) {
  const el = $("#toast");
  el.textContent = msg;
  el.className = isErr ? "err" : "";
  el.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (el.hidden = true), isErr ? 15000 : 2500);
}

async function api(path, { method = "GET", body } = {}) {
  let res;
  try {
    res = await fetch(`${API}/api/admin${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (e) {
    throw new Error(`Serverga ulanib bo'lmadi.\nManzil: ${API || "(apiUrl bo'sh!)"}\nBrauzer xatosi: ${e.message}\n(Render uxlab yotgan bo'lsa 30-40 soniya kuting va qayta urining; F12 → Console da sabab ko'rinadi)`);
  }
  if (res.status === 401) {
    logout();
    throw new Error("Token noto'g'ri");
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.errors?.join("\n") || { slug_exists: "Bunday havola (token) band", not_found: "Topilmadi" }[data.error] || `Xatolik (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

const run = async (fn) => {
  try { return await fn(); } catch (e) { toast(e.message, true); }
};

const groupUrl = (slug) => `${location.origin}/g/${slug}`;
const kb = (n) => (n ? `${Math.round(n / 1024)} KB` : "-");

/** Manbalarni birin-ketin sinaydi; `ready()` true qaytarsagina yuklangan deb hisoblaydi. */
function loadScript(srcs, ready) {
  return new Promise((resolve, reject) => {
    const next = (i) => {
      if (i >= srcs.length) return reject(new Error("Kutubxona yuklanmadi (internetni tekshiring)"));
      const s = document.createElement("script");
      s.src = srcs[i];
      s.onload = () => (ready() ? resolve() : next(i + 1));
      s.onerror = () => next(i + 1);
      document.head.appendChild(s);
    };
    next(0);
  });
}

/* ---------- Kirish ---------- */
function logout() {
  token = "";
  sessionStorage.removeItem("adminToken");
  $("#app").hidden = true;
  $("#login").hidden = false;
}

$("#login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  token = $("#token").value.trim();
  const err = $("#login-error");
  err.hidden = true;
  try {
    await api("/groups");
    sessionStorage.setItem("adminToken", token);
    start();
  } catch (ex) {
    err.textContent = ex.message;
    err.hidden = false;
  }
});
$("#logout").addEventListener("click", logout);

/* ---------- QR ---------- */
let qrState = null;

async function showQr(g) {
  await run(async () => {
    if (!window.qrcode) await loadScript(["/assets/lib/qrcode-generator-1.4.4.min.js", "https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js"], () => !!window.qrcode);
    const url = groupUrl(g.slug);
    const qr = window.qrcode(0, "M");
    qr.addData(url);
    qr.make();

    const n = qr.getModuleCount(), cell = Math.floor(1000 / (n + 8)), size = cell * (n + 8), cap = 90;
    const c = $("#qr-canvas");
    c.width = size;
    c.height = size + cap;
    const x = c.getContext("2d");
    x.fillStyle = "#fff";
    x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = "#000";
    for (let r = 0; r < n; r++) for (let q = 0; q < n; q++) if (qr.isDark(r, q)) x.fillRect((q + 4) * cell, (r + 4) * cell, cell, cell);
    x.textAlign = "center";
    x.font = "bold 44px system-ui, sans-serif";
    x.fillText(g.name.slice(0, 32), size / 2, size + 20);

    qrState = { url, name: g.name, slug: g.slug };
    $("#qr-title").textContent = g.name;
    $("#qr-url").textContent = url;
    $("#qr-dialog").showModal();
  });
}

$("#qr-close").onclick = () => $("#qr-dialog").close();
$("#qr-copy").onclick = async () => {
  try { await navigator.clipboard.writeText(qrState.url); toast("Havola nusxalandi"); } catch { prompt("Havola:", qrState.url); }
};
$("#qr-download").onclick = () => {
  $("#qr-canvas").toBlob((blob) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `qr-${qrState.slug}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
};

/* ---------- Guruhlar ro'yxati ---------- */
async function renderList() {
  const view = $("#view");
  view.innerHTML = `<p class="muted">Yuklanmoqda...</p>`;
  const groups = await api("/groups");

  view.innerHTML = `
    <div class="card">
      <h2>Yangi guruh</h2>
      <form id="new-group" class="fields">
        <label>Nomi<input type="text" name="name" placeholder="Masalan: 1-guruh" required /></label>
        <label>Havola tokeni (ixtiyoriy)<input type="text" name="slug" placeholder="bo'sh = avtomatik tasodifiy" pattern="[a-z0-9-]{3,40}" /></label>
        <button class="primary" type="submit">Yaratish</button>
      </form>
    </div>
    <div class="row space" style="margin-bottom:10px">
      <h2 style="margin:0">Guruhlar (${groups.length})</h2>
      <input id="search" type="search" placeholder="Qidirish..." style="max-width:240px" />
    </div>
    <div id="groups"></div>`;

  const draw = (q = "") => {
    const list = groups.filter((g) => (g.name + g.slug).toLowerCase().includes(q.toLowerCase()));
    $("#groups").innerHTML = list.length ? list.map((g) => `
      <div class="card group" data-id="${g.id}">
        <div>
          <strong>${esc(g.name)}</strong>
          <span class="badge ${g.mindUpdatedAt ? "ok" : "warn"}">${g.mindUpdatedAt ? `.mind ${kb(g.mindSize)}` : ".mind yo'q"}</span>
          ${g.isActive ? "" : `<span class="badge warn">o'chirilgan</span>`}
          <div><a class="slug" href="${esc(groupUrl(g.slug))}" target="_blank" rel="noopener">${esc(groupUrl(g.slug))}</a></div>
          <div class="muted">${g.targetsCount} ta marker · 7 kunda ${g.starts7d} ta ochilish</div>
        </div>
        <div class="row">
          <button data-act="qr">QR</button>
          <button data-act="edit" class="primary">Tahrirlash</button>
        </div>
      </div>`).join("") : `<p class="muted">Guruh topilmadi</p>`;
  };
  draw();

  $("#search").oninput = (e) => draw(e.target.value);
  $("#groups").onclick = (e) => {
    const act = e.target.dataset.act;
    const g = groups.find((x) => x.id === Number(e.target.closest(".group")?.dataset.id));
    if (act === "qr") showQr(g);
    if (act === "edit") location.hash = `#/g/${g.id}`;
  };
  $("#new-group").onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    run(async () => {
      const g = await api("/groups", { method: "POST", body: { name: f.get("name"), slug: f.get("slug") || undefined } });
      location.hash = `#/g/${g.id}`;
    });
  };
}

/* ---------- Guruh muharriri ---------- */
const arrayToB64 = (buf) => {
  let s = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

/** Fotoni 1280px gacha kichraytirib JPEG data URL qiladi. */
async function fileToDataUrl(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const k = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * k);
    c.height = Math.round(img.naturalHeight * k);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.9);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Kompilyatorni topadi: avval ES-modul sifatida, keyin oddiy skript sifatida (fayl turi noma'lum bo'lgani uchun). */
async function getCompiler() {
  const pick = (m) => m?.Compiler || m?.default?.Compiler || window.MINDAR?.IMAGE?.Compiler;
  if (pick()) return pick();

  const srcs = ["/assets/lib/mindar-image-1.2.5.prod.js", "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js"];
  for (const src of srcs) {
    try {
      const mod = await import(src);
      if (pick(mod)) return pick(mod);
    } catch (e) { console.warn("Modul sifatida yuklanmadi:", src, e); }
    try {
      await loadScript([src], () => !!window.MINDAR?.IMAGE?.Compiler);
      return window.MINDAR.IMAGE.Compiler;
    } catch (e) { console.warn("Skript sifatida yuklanmadi:", src); }
  }
  throw new Error("Kompilyator yuklanmadi. Zaxira yo'l: .mind faylni boshqa joyda kompilyatsiya qilib, «Tayyor .mind fayl yuklash» bo'limidan yuklang.");
}

async function compileMind(images, onProgress) {
  const Compiler = await getCompiler();
  const imgs = await Promise.all(images.map(async (src) => {
    const im = new Image();
    im.src = src;
    await im.decode();
    return im;
  }));
  const compiler = new Compiler();
  await compiler.compileImageTargets(imgs, onProgress);
  return compiler.exportData();
}

/** MP4 ni bazaga yuklaydi, "/api/videos/<id>" qaytaradi. */
async function uploadVideo(groupId, file) {
  if (!/\.mp4$/i.test(file.name) && file.type !== "video/mp4") throw new Error("Faqat MP4 fayl (H.264) yuklang");
  if (file.size > MAX_VIDEO_MB * 1024 * 1024) throw new Error(`Video ${MAX_VIDEO_MB} MB dan oshmasin (hozir ${(file.size / 1048576).toFixed(1)} MB). Siqing: 720p, ~2 Mbps`);
  let res;
  try {
    res = await fetch(`${API}/api/admin/groups/${groupId}/video`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "video/mp4", "X-Filename": encodeURIComponent(file.name) },
      body: file
    });
  } catch {
    throw new Error("Video yuklanmadi: serverga ulanib bo'lmadi");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.errors?.join("\n") || `Video yuklanmadi (${res.status})`);
  return data.url;
}

async function renderEditor(id) {
  const view = $("#view");
  view.innerHTML = `<p class="muted">Yuklanmoqda...</p>`;
  const g = await api(`/groups/${id}`);

  let rows = g.targets.map((t) => ({ id: t.id, title: t.title || "", videoUrl: t.videoUrl, width: t.width ?? "", image: t.image }));
  let photosDirty = false;
  let customMind = null; // tayyor .mind fayl (ArrayBuffer)

  view.innerHTML = `
    <p><a href="#/">← Guruhlar</a></p>
    <div class="card">
      <h2>Guruh</h2>
      <div class="fields">
        <label>Nomi<input id="g-name" type="text" value="${esc(g.name)}" /></label>
        <label>Havola tokeni (/g/...)<input id="g-slug" type="text" value="${esc(g.slug)}" pattern="[a-z0-9-]{3,40}" /></label>
        <label class="row"><input id="g-active" type="checkbox" ${g.isActive ? "checked" : ""} /> Faol</label>
      </div>
      <p class="muted" id="g-link"></p>
      <div class="row"><button id="g-qr" type="button">QR kod</button><button id="g-delete" class="danger" type="button">Guruhni o'chirish</button></div>
    </div>
    <div class="card">
      <div class="row space"><h2 style="margin:0">Fotolar va videolar</h2>
        <div class="row">
          <button id="add-photos" type="button">+ Foto qo'shish</button>
          <input id="photo-input" type="file" accept="image/*" multiple hidden />
        </div>
      </div>
      <p class="muted">Tartib muhim: 1-foto = 1-video. Foto qo'shilsa, o'chirilsa yoki tartibi o'zgarsa, .mind qayta kompilyatsiya qilinadi. Faqat video havolasi o'zgarsa, kompilyatsiya kerak emas.</p>
      <div id="rows"></div>
      <details style="margin-top:10px"><summary class="muted">Tayyor .mind fayl yuklash (ixtiyoriy)</summary>
        <p class="muted">Agar .mind faylni boshqa joyda kompilyatsiya qilgan bo'lsangiz. Rasmlar tartibi videolar tartibiga mos bo'lsin.</p>
        <input id="mind-input" type="file" accept=".mind" />
        <button id="add-empty" type="button">+ Fotosiz marker</button>
        <span id="mind-name" class="muted"></span>
      </details>
    </div>
    <div class="card">
      <div id="mind-status" class="muted"></div>
      <div class="progress" id="progress" hidden><i></i></div>
      <div class="row" style="margin-top:10px"><button id="save" class="primary" type="button">Saqlash</button></div>
    </div>`;

  const refreshInfo = () => {
    $("#g-link").textContent = groupUrl($("#g-slug").value);
    $("#mind-status").textContent = g.mindUpdatedAt
      ? `Joriy .mind: ${kb(g.mindSize)}, yangilangan: ${new Date(g.mindUpdatedAt).toLocaleString()}`
      : "Hali .mind yaratilmagan: foto qo'shib «Saqlash» bosing.";
  };
  $("#g-slug").oninput = refreshInfo;
  refreshInfo();

  const drawRows = () => {
    $("#rows").innerHTML = rows.length ? rows.map((r, i) => `
      <div class="target" data-i="${i}">
        ${r.image ? `<img src="${r.image}" alt="" />` : `<div class="noimg">foto yo'q</div>`}
        <div>
          <div class="row space"><strong>${i + 1}-marker</strong>
            <span class="row"><button data-act="up" ${i ? "" : "disabled"}>↑</button><button data-act="down" ${i < rows.length - 1 ? "" : "disabled"}>↓</button><button data-act="del" class="danger">✕</button></span>
          </div>
          <div class="inputs">
            <input class="wide" type="text" data-f="videoUrl" placeholder="Video havolasi (https://...mp4) yoki pastdan MP4 yuklang" value="${esc(r.videoUrl)}" />
            <div class="wide row">
              <button data-act="upload" type="button">📁 Video yuklash (MP4)</button>
              <input type="file" data-up accept="video/mp4,.mp4" hidden />
              ${r.videoUrl.startsWith("/api/videos/") ? `<span class="badge ok">bazada saqlangan</span>` : ""}
            </div>
            <input type="text" data-f="title" placeholder="Sarlavha (ixtiyoriy)" value="${esc(r.title)}" />
            <input type="number" data-f="width" step="0.1" min="0.1" max="10" placeholder="Kenglik" value="${esc(r.width)}" />
          </div>
        </div>
      </div>`).join("") : `<p class="muted">Hali foto yo'q. «+ Foto qo'shish» ni bosing.</p>`;
  };
  drawRows();

  $("#rows").oninput = (e) => {
    const f = e.target.dataset.f;
    if (f) rows[Number(e.target.closest(".target").dataset.i)][f] = e.target.value;
  };
  $("#rows").onclick = (e) => {
    const act = e.target.dataset.act;
    if (!act) return;
    const i = Number(e.target.closest(".target").dataset.i);
    if (act === "upload") return e.target.closest(".target").querySelector("[data-up]").click();
    if (act === "del") rows.splice(i, 1);
    else {
      const j = act === "up" ? i - 1 : i + 1;
      [rows[i], rows[j]] = [rows[j], rows[i]];
    }
    photosDirty = true;
    drawRows();
  };

  $("#rows").onchange = (e) => {
    if (!("up" in e.target.dataset)) return; // data-up qiymatsiz atribut: dataset.up == ""
    const file = e.target.files[0];
    const row = rows[Number(e.target.closest(".target").dataset.i)];
    e.target.value = ""; // bir xil faylni qayta tanlash mumkin bo'lsin
    if (!file) return;
    run(async () => {
      toast(`Yuklanmoqda: ${(file.size / 1048576).toFixed(1)} MB...`);
      row.videoUrl = await uploadVideo(id, file);
      drawRows();
      toast("Video yuklandi. «Saqlash» ni bosishni unutmang");
    });
  };

  $("#add-photos").onclick = () => $("#photo-input").click();
  $("#photo-input").onchange = (e) => run(async () => {
    for (const file of e.target.files) {
      if (rows.length >= MAX_TARGETS) break;
      rows.push({ title: "", videoUrl: "", width: "", image: await fileToDataUrl(file) });
    }
    e.target.value = "";
    photosDirty = true;
    drawRows();
  });
  $("#add-empty").onclick = () => { rows.push({ title: "", videoUrl: "", width: "", image: null }); photosDirty = true; drawRows(); };
  $("#mind-input").onchange = async (e) => {
    const f = e.target.files[0];
    customMind = f ? await f.arrayBuffer() : null;
    photosDirty = !!f || photosDirty;
    $("#mind-name").textContent = f ? `${f.name} (${kb(f.size)}) tanlandi` : "";
  };

  $("#g-qr").onclick = () => showQr({ name: $("#g-name").value, slug: $("#g-slug").value });
  $("#g-delete").onclick = () => {
    if (confirm(`"${g.name}" guruhi, uning markerlari va .mind fayli o'chiriladi. Davom etasizmi?`)) {
      run(async () => { await api(`/groups/${id}`, { method: "DELETE" }); location.hash = "#/"; });
    }
  };

  $("#save").onclick = () => run(async () => {
    const btn = $("#save"), bar = $("#progress");
    btn.disabled = true;
    try {
      if (!rows.length) throw new Error("Kamida 1 ta marker kerak");
      const payload = rows.map((r) => ({
        id: r.id, title: r.title.trim() || null, videoUrl: r.videoUrl.trim(),
        width: r.width === "" ? null : Number(r.width), image: r.image
      }));
      const bad = payload.findIndex((p) => !/^(https:\/\/|\/)/.test(p.videoUrl));
      if (bad >= 0) throw new Error(`${bad + 1}-marker: video havolasi https:// bilan boshlanishi kerak`);

      await api(`/groups/${id}`, { method: "PUT", body: { name: $("#g-name").value, slug: $("#g-slug").value.trim().toLowerCase(), isActive: $("#g-active").checked } });

      if (photosDirty || !g.mindUpdatedAt) {
        let mind = customMind;
        if (!mind) {
          if (payload.some((p) => !p.image)) throw new Error("Kompilyatsiya uchun hamma markerda foto bo'lishi kerak");
          bar.hidden = false;
          mind = await compileMind(payload.map((p) => p.image), (pct) => { bar.firstElementChild.style.width = `${Math.round(pct)}%`; });
        }
        await api(`/groups/${id}/content`, { method: "PUT", body: { mind: arrayToB64(mind), targets: payload.map(({ id: _id, ...t }) => t) } });
      } else {
        await api(`/groups/${id}/videos`, { method: "PUT", body: { targets: payload.map(({ image: _i, ...t }) => t) } });
      }
      toast("Saqlandi");
      await renderEditor(id);
    } finally {
      btn.disabled = false;
      bar.hidden = true;
    }
  });
}

/* ---------- Marshrutlash ---------- */
function route() {
  const m = location.hash.match(/^#\/g\/(\d+)$/);
  run(() => (m ? renderEditor(Number(m[1])) : renderList()));
}

function start() {
  $("#login").hidden = true;
  $("#app").hidden = false;
  route();
}

window.addEventListener("hashchange", () => { if (token) route(); });
if (token) start(); else $("#login").hidden = false;