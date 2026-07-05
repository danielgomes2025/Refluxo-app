/* =========================================================
   GastroCuida — lógica do aplicativo
   Vanilla JS · localStorage · sem dependências
   ========================================================= */
"use strict";

/* ---------------- estado ---------------- */
const STORE_KEY = "gastrocuida:v1";

const defaultState = () => ({
  settings: { name: "", sleepTime: "22:30", goalWeight: null, theme: null, notif: false, onboarded: false },
  meals: JSON.parse(JSON.stringify(DEFAULT_MEALS)),
  meds: [],
  days: {},     // "2026-07-05": { meals:{id:{done,note}}, symptoms:[], water:0, notes:"", meds:{} }
  weights: [],  // [{date,kg}]
  goals: [],    // [{id,title,checkins:{date:true}}]
  firedAlarms: {}, // "date|HH:MM|id": true
});

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return defaultState();
    const s = JSON.parse(raw);
    return Object.assign(defaultState(), s, {
      settings: Object.assign(defaultState().settings, s.settings || {}),
    });
  } catch { return defaultState(); }
}
function save() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }

/* ---------------- utilidades ---------------- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = (n) => String(n).padStart(2, "0");
const uid = () => Math.random().toString(36).slice(2, 9);

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const WEEKDAYS_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function dateKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function keyToDate(k) { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); }
function fmtDateLong(d) {
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTH_NAMES[d.getMonth()].toLowerCase()}`;
}
function timeToMin(t) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }

function getDay(key) {
  if (!state.days[key]) state.days[key] = { meals: {}, symptoms: [], water: 0, notes: "", meds: {} };
  // dias antigos podem não ter todos os campos
  const day = state.days[key];
  day.meals ??= {}; day.symptoms ??= []; day.water ??= 0; day.notes ??= ""; day.meds ??= {};
  return day;
}

function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 2600);
}

/* ---------------- relógio sincronizado com a internet ---------------- */
let clockOffset = 0;     // ms a somar em Date.now()
let clockSynced = false;

function now() { return new Date(Date.now() + clockOffset); }

async function syncClock() {
  const apis = [
    { url: "https://worldtimeapi.org/api/timezone/America/Sao_Paulo", pick: (j) => j.unixtime * 1000 },
    { url: "https://timeapi.io/api/Time/current/zone?timeZone=America/Sao_Paulo", pick: (j) => new Date(j.dateTime).getTime() },
  ];
  for (const api of apis) {
    try {
      const t0 = Date.now();
      const res = await fetch(api.url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const j = await res.json();
      const t1 = Date.now();
      const serverMs = api.pick(j) + (t1 - t0) / 2; // compensa a viagem da rede
      clockOffset = serverMs - t1;
      clockSynced = true;
      updateClockUI();
      return;
    } catch { /* tenta a próxima API */ }
  }
  clockSynced = false;
  updateClockUI();
}

function updateClockUI() {
  const d = now();
  $("#clock-time").textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const syncEl = $("#clock-sync");
  if (clockSynced) { syncEl.textContent = "● horário oficial"; syncEl.classList.add("on"); }
  else { syncEl.textContent = "relógio do aparelho"; syncEl.classList.remove("on"); }
}

/* ---------------- tema ---------------- */
function applyTheme() {
  const t = state.settings.theme;
  if (t) document.documentElement.setAttribute("data-theme", t);
  else document.documentElement.removeAttribute("data-theme");
}
$("#theme-btn").addEventListener("click", () => {
  const cur = state.settings.theme ||
    (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  state.settings.theme = cur === "dark" ? "light" : "dark";
  save(); applyTheme(); renderAll();
});

/* ---------------- navegação ---------------- */
let currentView = "inicio";
const SUBVIEWS = ["rotina", "remedios", "peso", "dicas", "safra", "sobre", "relatorio"];

function goto(view) {
  currentView = view;
  $$(".view").forEach((v) => v.classList.remove("active"));
  const el = $(`#view-${view}`);
  if (el) el.classList.add("active");
  $$("nav.bottom button").forEach((b) => {
    const owns = b.dataset.view === view || (b.dataset.view === "mais" && SUBVIEWS.includes(view));
    b.classList.toggle("active", owns);
  });
  window.scrollTo({ top: 0 });
  renderView(view);
}

$$("nav.bottom button").forEach((b) => b.addEventListener("click", () => goto(b.dataset.view)));
$$("[data-goto]").forEach((b) => b.addEventListener("click", () => goto(b.dataset.goto)));
$$("#view-mais [data-sub]").forEach((r) => r.addEventListener("click", () => goto(r.dataset.sub)));
$("#quick-rotina").addEventListener("click", () => goto("rotina"));
$("#quick-cha").addEventListener("click", () => { goto("guia"); setFoodFilter("chas"); });

function renderView(view) {
  ({ inicio: renderHome, guia: renderGuide, receitas: renderRecipes, diario: renderDiary,
     rotina: renderRoutine, remedios: renderMeds, peso: renderWeight, dicas: renderTips,
     safra: renderSeason, sobre: renderAbout, relatorio: renderReport }[view] || (() => {}))();
}
function renderAll() { renderView(currentView); }

/* ---------------- modal ---------------- */
function openModal(html) {
  $("#modal").innerHTML = `<button class="close" aria-label="Fechar">✕</button>` + html;
  $("#modal-backdrop").classList.add("open");
  $("#modal .close").addEventListener("click", closeModal);
}
function closeModal() { $("#modal-backdrop").classList.remove("open"); }
$("#modal-backdrop").addEventListener("click", (e) => { if (e.target.id === "modal-backdrop") closeModal(); });

/* =========================================================
   INÍCIO
   ========================================================= */
function greeting(d) {
  const h = d.getHours();
  const name = state.settings.name ? `, ${state.settings.name}` : "";
  if (h < 12) return `Bom dia${name}! ☀️`;
  if (h < 18) return `Boa tarde${name}! 🌤️`;
  return `Boa noite${name}! 🌙`;
}

function nextMeal() {
  const d = now();
  const nowMin = d.getHours() * 60 + d.getMinutes();
  const sorted = [...state.meals].sort((a, b) => timeToMin(a.time) - timeToMin(b.time));
  for (const m of sorted) if (timeToMin(m.time) > nowMin) return { meal: m, tomorrow: false };
  return sorted.length ? { meal: sorted[0], tomorrow: true } : null;
}

function renderHome() {
  const d = now();
  $("#hero-hello").textContent = greeting(d);

  const nm = nextMeal();
  if (nm) {
    $("#hero-next").textContent = `${nm.meal.icon || "🍽️"} ${nm.meal.name} às ${nm.meal.time}`;
    const target = timeToMin(nm.meal.time) + (nm.tomorrow ? 24 * 60 : 0);
    const diff = target - (d.getHours() * 60 + d.getMinutes());
    const h = Math.floor(diff / 60), mi = diff % 60;
    $("#hero-countdown").textContent =
      diff <= 0 ? "É agora!" : `faltam ${h ? h + "h " : ""}${mi} min ${nm.tomorrow ? "(amanhã)" : ""}`;
  } else {
    $("#hero-next").textContent = "Configure suas refeições";
    $("#hero-countdown").textContent = "";
  }

  // refeições de hoje
  const key = dateKey(d);
  const day = getDay(key);
  $("#home-meals").innerHTML = [...state.meals]
    .sort((a, b) => timeToMin(a.time) - timeToMin(b.time))
    .map((m) => {
      const done = day.meals[m.id]?.done;
      return `<div class="check-row ${done ? "done" : ""}">
        <button class="checkbox ${done ? "on" : ""}" data-meal="${m.id}" aria-label="Marcar ${esc(m.name)}">✓</button>
        <span class="t">${m.time}</span>
        <span class="n">${m.icon || "🍽️"} ${esc(m.name)}</span>
      </div>`;
    }).join("");
  $$("#home-meals [data-meal]").forEach((b) => b.addEventListener("click", () => {
    const rec = day.meals[b.dataset.meal] || (day.meals[b.dataset.meal] = {});
    rec.done = !rec.done; save(); renderHome();
  }));

  // remédios de hoje
  const medCard = $("#home-meds-card");
  if (!state.meds.length) {
    medCard.style.display = "none";
  } else {
    medCard.style.display = "";
    const rows = [];
    for (const med of state.meds) for (const t of med.times) {
      const taken = day.meds[med.id]?.[t];
      rows.push({ med, t, taken });
    }
    rows.sort((a, b) => timeToMin(a.t) - timeToMin(b.t));
    $("#home-meds").innerHTML = rows.map(({ med, t, taken }) =>
      `<div class="check-row ${taken ? "done" : ""}">
        <button class="checkbox ${taken ? "on" : ""}" data-med="${med.id}" data-t="${t}" aria-label="Marcar ${esc(med.name)}">✓</button>
        <span class="t">${t}</span>
        <span class="n">💊 ${esc(med.name)}${med.dose ? ` <span class="muted">· ${esc(med.dose)}</span>` : ""}</span>
      </div>`).join("");
    $$("#home-meds [data-med]").forEach((b) => b.addEventListener("click", () => {
      const m = day.meds[b.dataset.med] || (day.meds[b.dataset.med] = {});
      m[b.dataset.t] = !m[b.dataset.t]; save(); renderHome();
    }));
  }

  // água
  const goal = 8;
  $("#water-count").textContent = `— ${day.water}/${goal} copos`;
  $("#water-dots").innerHTML = Array.from({ length: goal }, (_, i) =>
    `<button class="wdot ${i < day.water ? "on" : ""}" data-i="${i}" aria-label="Copo ${i + 1}">💧</button>`).join("");
  $$("#water-dots .wdot").forEach((b) => b.addEventListener("click", () => {
    const i = Number(b.dataset.i);
    day.water = (i + 1 === day.water) ? i : i + 1;
    save(); renderHome();
  }));

  // dica do dia (gira com a data)
  const tip = TIPS[(d.getDate() + d.getMonth()) % TIPS.length];
  $("#home-tip").innerHTML = `<h4>${tip.icon} Dica do dia: ${esc(tip.title)}</h4><p>${esc(tip.text)}</p>`;

  // aviso jantar × sono
  const dinner = [...state.meals].sort((a, b) => timeToMin(a.time) - timeToMin(b.time))
    .filter((m) => timeToMin(m.time) >= 17 * 60)[0];
  const warnEl = $("#home-sleep-warning");
  if (dinner && state.settings.sleepTime) {
    const gap = timeToMin(state.settings.sleepTime) - timeToMin(dinner.time);
    if (gap > 0 && gap < 180) {
      warnEl.style.display = "";
      warnEl.innerHTML = `🛏️ Seu <b>${esc(dinner.name)}</b> (${dinner.time}) está a menos de 3h do seu horário de deitar (${state.settings.sleepTime}). Para o refluxo noturno, o ideal é jantar mais cedo ou deitar mais tarde.`;
    } else warnEl.style.display = "none";
  } else warnEl.style.display = "none";
}

/* =========================================================
   GUIA DE ALIMENTOS
   ========================================================= */
let foodFilter = "all";
let foodQuery = "";

function setFoodFilter(id) { foodFilter = id; renderGuide(); }

function renderGuide() {
  const chips = [{ id: "all", name: "Todos", icon: "🍽️" }, ...FOOD_CATEGORIES];
  $("#food-chips").innerHTML = chips.map((c) =>
    `<button class="chip ${foodFilter === c.id ? "active" : ""}" data-id="${c.id}">${c.icon} ${c.name}</button>`).join("");
  $$("#food-chips .chip").forEach((c) => c.addEventListener("click", () => setFoodFilter(c.dataset.id)));

  const q = foodQuery.trim().toLowerCase();
  const items = FOODS.filter((f) =>
    (foodFilter === "all" || f.cat === foodFilter) &&
    (!q || f.name.toLowerCase().includes(q) || f.note.toLowerCase().includes(q)));

  if (!items.length) {
    $("#food-list").innerHTML = `<div class="card"><p>Nada encontrado 😕 — tente outro termo.</p></div>`;
    return;
  }

  const byCat = {};
  for (const f of items) (byCat[f.cat] ??= []).push(f);
  const order = { ok: 0, mod: 1, care: 2, no: 3 };

  $("#food-list").innerHTML = FOOD_CATEGORIES.filter((c) => byCat[c.id]).map((c) => {
    const rows = byCat[c.id].sort((a, b) => order[a.status] - order[b.status]).map((f) => {
      const st = STATUS[f.status];
      return `<div class="food-item">
        <div style="flex:1">
          <div class="name">${esc(f.name)}</div>
          <div class="note">${esc(f.note)}</div>
        </div>
        <span class="status ${f.status}">${st.icon} ${st.label}</span>
      </div>`;
    }).join("");
    return `<div class="food-head"><span style="font-size:20px">${c.icon}</span><h3>${c.name}</h3></div>
      <div class="card flat" style="padding:2px 16px">${rows}</div>`;
  }).join("");
}

$("#food-search").addEventListener("input", (e) => { foodQuery = e.target.value; renderGuide(); });

/* =========================================================
   RECEITAS
   ========================================================= */
let recipeFilter = "all";
let recipeQuery = "";

function renderRecipes() {
  const chips = [{ id: "all", name: "Todas", icon: "🍴" }, ...MEAL_TYPES];
  $("#recipe-chips").innerHTML = chips.map((c) =>
    `<button class="chip ${recipeFilter === c.id ? "active" : ""}" data-id="${c.id}">${c.icon} ${c.name}</button>`).join("");
  $$("#recipe-chips .chip").forEach((c) => c.addEventListener("click", () => { recipeFilter = c.dataset.id; renderRecipes(); }));

  const q = recipeQuery.trim().toLowerCase();
  const items = RECIPES.filter((r) =>
    (recipeFilter === "all" || r.meal === recipeFilter) &&
    (!q || r.name.toLowerCase().includes(q) ||
      r.tags.some((t) => t.toLowerCase().includes(q)) ||
      r.ing.some((i) => i.toLowerCase().includes(q))));
  if (!items.length) {
    $("#recipe-grid").innerHTML = `<div class="card"><p>Nenhuma receita encontrada 😕 — tente outro termo.</p></div>`;
    return;
  }
  $("#recipe-grid").innerHTML = items.map((r) => {
    const mt = MEAL_TYPES.find((m) => m.id === r.meal);
    return `<div class="recipe-card" data-id="${r.id}">
      <h4>${esc(r.name)}</h4>
      <div class="recipe-meta">
        <span>${mt.icon} ${mt.name}</span><span>⏱️ ${r.time} min</span><span>🍽️ ${r.portions} porç${r.portions > 1 ? "ões" : "ão"}</span>
      </div>
      <div class="tags">${r.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
    </div>`;
  }).join("");
  $$(".recipe-card").forEach((c) => c.addEventListener("click", () => openRecipe(c.dataset.id)));
}

function openRecipe(id) {
  const r = RECIPES.find((x) => x.id === id);
  if (!r) return;
  const mt = MEAL_TYPES.find((m) => m.id === r.meal);
  openModal(`
    <h3>${esc(r.name)}</h3>
    <div class="recipe-meta" style="margin-bottom:10px">
      <span>${mt.icon} ${mt.name}</span><span>⏱️ ${r.time} min</span><span>🍽️ ${r.portions} porç${r.portions > 1 ? "ões" : "ão"}</span>
    </div>
    <div class="tags" style="margin-bottom:14px">${r.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
    <h4>Ingredientes</h4>
    <ul>${r.ing.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
    <h4>Modo de preparo</h4>
    <ol>${r.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
    <div class="notice info">💡 ${esc(r.tip)}</div>
  `);
}

$("#recipe-search").addEventListener("input", (e) => { recipeQuery = e.target.value; renderRecipes(); });

/* =========================================================
   DIÁRIO
   ========================================================= */
let diaryDate = null; // Date

function renderDiary() {
  if (!diaryDate) diaryDate = now();
  const key = dateKey(diaryDate);
  const day = getDay(key);
  const isToday = key === dateKey(now());
  $("#day-label").textContent = isToday ? `Hoje · ${fmtDateLong(diaryDate)}` : fmtDateLong(diaryDate);

  // refeições com anotação
  $("#diary-meals").innerHTML = [...state.meals]
    .sort((a, b) => timeToMin(a.time) - timeToMin(b.time))
    .map((m) => {
      const rec = day.meals[m.id] || {};
      return `<div style="padding:8px 0;border-bottom:1px solid var(--line)">
        <div class="check-row" style="border:none;padding:0 0 6px">
          <button class="checkbox ${rec.done ? "on" : ""}" data-meal="${m.id}">✓</button>
          <span class="t">${m.time}</span>
          <span class="n ${rec.done ? "done" : ""}">${m.icon || "🍽️"} ${esc(m.name)}</span>
        </div>
        <input data-meal-note="${m.id}" placeholder="O que você comeu?" value="${esc(rec.note || "")}" />
      </div>`;
    }).join("");
  $$("#diary-meals [data-meal]").forEach((b) => b.addEventListener("click", () => {
    const rec = day.meals[b.dataset.meal] || (day.meals[b.dataset.meal] = {});
    rec.done = !rec.done; save(); renderDiary();
  }));
  $$("#diary-meals [data-meal-note]").forEach((inp) => inp.addEventListener("change", () => {
    const rec = day.meals[inp.dataset.mealNote] || (day.meals[inp.dataset.mealNote] = {});
    rec.note = inp.value; save();
  }));

  // sintomas do dia
  $("#diary-symptoms").innerHTML = day.symptoms.length
    ? day.symptoms.map((s, i) => {
        const sym = SYMPTOMS.find((x) => x.id === s.type) || { icon: "❓", name: s.type };
        return `<div class="sym-row">
          <span class="when">${s.t}</span>
          <span>${sym.icon} ${esc(sym.name)}</span>
          <span class="intensity">${[1, 2, 3].map((v) => `<i class="${v <= s.intensity ? "on" : ""}"></i>`).join("")}</span>
          <button class="icon-btn" data-del="${i}" aria-label="Remover">🗑️</button>
        </div>`;
      }).join("")
    : `<p class="muted">Nenhum sintoma registrado ${isToday ? "hoje — ótimo sinal! 🎉" : "neste dia."}</p>`;
  $$("#diary-symptoms [data-del]").forEach((b) => b.addEventListener("click", () => {
    day.symptoms.splice(Number(b.dataset.del), 1); save(); renderDiary();
  }));

  // formulário
  const sel = $("#sym-type");
  if (!sel.options.length) sel.innerHTML = SYMPTOMS.map((s) => `<option value="${s.id}">${s.icon} ${s.name}</option>`).join("");
  const d = now();
  $("#sym-time").value = `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  renderSymptomChart();
  $("#diary-notes").value = day.notes || "";
}

$("#day-prev").addEventListener("click", () => { diaryDate.setDate(diaryDate.getDate() - 1); renderDiary(); });
$("#day-next").addEventListener("click", () => { diaryDate.setDate(diaryDate.getDate() + 1); renderDiary(); });
$("#diary-notes").addEventListener("change", (e) => { getDay(dateKey(diaryDate)).notes = e.target.value; save(); });
$$("#sym-intensity button").forEach((b) => b.addEventListener("click", () => {
  $$("#sym-intensity button").forEach((x) => x.classList.remove("active"));
  b.classList.add("active");
}));
$("#sym-add").addEventListener("click", () => {
  const day = getDay(dateKey(diaryDate));
  day.symptoms.push({
    type: $("#sym-type").value,
    t: $("#sym-time").value || "12:00",
    intensity: Number($("#sym-intensity .active")?.dataset.v || 1),
  });
  day.symptoms.sort((a, b) => timeToMin(a.t) - timeToMin(b.t));
  save(); renderDiary(); toast("Sintoma registrado 📔");
});

/* gráfico de colunas — sintomas nos últimos 7 dias (série única, azul sequencial) */
function renderSymptomChart() {
  const container = $("#sym-chart");
  const days = [];
  const base = now();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(base); d.setDate(d.getDate() - i);
    const k = dateKey(d);
    days.push({ d, count: (state.days[k]?.symptoms || []).length });
  }
  const max = Math.max(...days.map((x) => x.count), 1);
  const total = days.reduce((a, b) => a + b.count, 0);
  if (!total) {
    container.innerHTML = `<p class="muted">Sem registros na última semana. Os dados aparecem aqui conforme você usa o diário.</p>`;
    return;
  }

  const W = 320, H = 130, padL = 8, padB = 20, padT = 14;
  const bw = 22, band = (W - padL * 2) / 7;
  const y = (v) => H - padB - (v / max) * (H - padB - padT);
  const todayIdx = 6, maxIdx = days.findIndex((x) => x.count === Math.max(...days.map((y2) => y2.count)));

  const bars = days.map((x, i) => {
    const cx = padL + band * i + band / 2;
    const h = x.count ? (H - padB - y(x.count)) : 0;
    const top = y(x.count);
    // coluna com topo arredondado (4px) e base reta
    const r = Math.min(4, h);
    const path = x.count ? `M ${cx - bw / 2} ${H - padB} L ${cx - bw / 2} ${top + r} Q ${cx - bw / 2} ${top} ${cx - bw / 2 + r} ${top} L ${cx + bw / 2 - r} ${top} Q ${cx + bw / 2} ${top} ${cx + bw / 2} ${top + r} L ${cx + bw / 2} ${H - padB} Z` : "";
    const label = (i === todayIdx || i === maxIdx) && x.count
      ? `<text x="${cx}" y="${top - 4}" text-anchor="middle" font-size="10" fill="var(--viz-ink-2)">${x.count}</text>` : "";
    return `<g class="sym-bar" data-i="${i}">
      ${path ? `<path d="${path}" fill="var(--viz-series)"></path>` : ""}
      <rect x="${cx - band / 2}" y="0" width="${band}" height="${H}" fill="transparent"></rect>
      ${label}
      <text x="${cx}" y="${H - 6}" text-anchor="middle" font-size="9.5" fill="var(--viz-muted)">${WEEKDAYS_SHORT[x.d.getDay()]}</text>
    </g>`;
  }).join("");

  container.innerHTML = `<div class="viz-root">
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Sintomas por dia na última semana">
      <line x1="${padL}" y1="${H - padB}" x2="${W - padL}" y2="${H - padB}" stroke="var(--viz-axis)" stroke-width="1"/>
      ${bars}
    </svg>
    <div class="viz-tooltip" id="sym-tt"></div>
  </div>`;

  const tt = $("#sym-tt");
  $$(".sym-bar").forEach((g) => {
    g.addEventListener("mouseenter", () => {
      const x = days[Number(g.dataset.i)];
      tt.innerHTML = `${WEEKDAYS_SHORT[x.d.getDay()]} ${x.d.getDate()}/${x.d.getMonth() + 1} — <b>${x.count}</b> sintoma${x.count === 1 ? "" : "s"}`;
      tt.style.display = "block";
    });
    g.addEventListener("mousemove", (e) => {
      const r = container.firstElementChild.getBoundingClientRect();
      tt.style.left = Math.min(e.clientX - r.left + 10, r.width - tt.offsetWidth - 4) + "px";
      tt.style.top = (e.clientY - r.top - 34) + "px";
    });
    g.addEventListener("mouseleave", () => { tt.style.display = "none"; });
  });
}

/* =========================================================
   ROTINA & ALARMES
   ========================================================= */
function renderRoutine() {
  $("#meal-editor").innerHTML = [...state.meals]
    .sort((a, b) => timeToMin(a.time) - timeToMin(b.time))
    .map((m) => `<div class="edit-row">
      <input type="time" value="${m.time}" data-time="${m.id}" />
      <input class="grow" value="${esc(m.name)}" data-name="${m.id}" />
      <label class="switch" title="Alarme"><input type="checkbox" ${m.alarm ? "checked" : ""} data-alarm="${m.id}"><span class="sl"></span></label>
      <button class="icon-btn" data-del="${m.id}" aria-label="Remover refeição">🗑️</button>
    </div>`).join("");

  $$("#meal-editor [data-time]").forEach((i) => i.addEventListener("change", () => {
    const m = state.meals.find((x) => x.id === i.dataset.time);
    if (m && i.value) { m.time = i.value; save(); renderRoutine(); }
  }));
  $$("#meal-editor [data-name]").forEach((i) => i.addEventListener("change", () => {
    const m = state.meals.find((x) => x.id === i.dataset.name);
    if (m) { m.name = i.value || m.name; save(); }
  }));
  $$("#meal-editor [data-alarm]").forEach((i) => i.addEventListener("change", () => {
    const m = state.meals.find((x) => x.id === i.dataset.alarm);
    if (m) { m.alarm = i.checked; save(); }
  }));
  $$("#meal-editor [data-del]").forEach((b) => b.addEventListener("click", () => {
    state.meals = state.meals.filter((x) => x.id !== b.dataset.del);
    save(); renderRoutine();
  }));

  $("#sleep-time").value = state.settings.sleepTime || "22:30";
  updateSleepHint();
  updateNotifButton();
}

function updateSleepHint() {
  const st = state.settings.sleepTime;
  if (!st) { $("#sleep-hint").textContent = ""; return; }
  const lastMealMin = timeToMin(st) - 180;
  const h = Math.floor(lastMealMin / 60), m = lastMealMin % 60;
  $("#sleep-hint").innerHTML = `Para evitar refluxo noturno, sua última refeição de verdade deveria terminar até <b>${pad(h)}:${pad(m)}</b> (3h antes de deitar). Depois disso, no máximo uma ceia leve (chá + fruta permitida).`;
}

$("#sleep-time").addEventListener("change", (e) => {
  state.settings.sleepTime = e.target.value; save(); updateSleepHint(); renderHome();
});

$("#meal-add").addEventListener("click", () => {
  state.meals.push({ id: "m-" + uid(), name: "Nova refeição", time: "16:00", alarm: true, icon: "🍽️" });
  save(); renderRoutine();
});

/* notificações */
function updateNotifButton() {
  const btn = $("#notif-btn");
  if (!("Notification" in window)) { btn.textContent = "🔕 Notificações não suportadas"; btn.disabled = true; return; }
  if (Notification.permission === "granted" && state.settings.notif) { btn.textContent = "🔔 Notificações ativadas ✓"; }
  else if (Notification.permission === "denied") { btn.textContent = "🔕 Bloqueadas — libere no navegador"; }
  else btn.textContent = "🔔 Ativar notificações";
}
$("#notif-btn").addEventListener("click", async () => {
  if (!("Notification" in window)) return;
  const perm = await Notification.requestPermission();
  state.settings.notif = perm === "granted";
  save(); updateNotifButton();
  if (perm === "granted") toast("Notificações ativadas! 🔔");
});

/* som do alarme — Web Audio, sem arquivos */
let audioCtx = null;
function playChime(times = 3) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtx;
    if (ctx.state === "suspended") ctx.resume();
    const notes = [880, 1108.7, 1318.5]; // lá — dó# — mi
    for (let rep = 0; rep < times; rep++) {
      notes.forEach((f, i) => {
        const t = ctx.currentTime + rep * 0.9 + i * 0.18;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine"; o.frequency.value = f;
        g.gain.setValueAtTime(0.001, t);
        g.gain.exponentialRampToValueAtTime(0.25, t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        o.connect(g).connect(ctx.destination);
        o.start(t); o.stop(t + 0.55);
      });
    }
  } catch { /* áudio bloqueado até primeira interação — ok */ }
}

function fireAlarm(title, sub) {
  playChime();
  if (navigator.vibrate) navigator.vibrate([300, 120, 300, 120, 600]);
  $("#alarm-title").textContent = title;
  $("#alarm-sub").textContent = sub;
  $("#alarm-banner").classList.add("on");
  if ("Notification" in window && Notification.permission === "granted" && state.settings.notif) {
    try {
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.ready.then((reg) =>
          reg.showNotification("🌿 " + title, { body: sub, icon: "icon-192.png", badge: "icon-192.png", tag: "gastrocuida" }));
      } else {
        new Notification("🌿 " + title, { body: sub, icon: "icon-192.png" });
      }
    } catch { /* melhor esforço */ }
  }
}
$("#alarm-dismiss").addEventListener("click", () => $("#alarm-banner").classList.remove("on"));
$("#alarm-test").addEventListener("click", () =>
  fireAlarm("Teste de alarme 🎉", "É assim que o GastroCuida vai te avisar na hora de comer."));

/* motor de alarmes — verifica a cada 15 s contra o relógio sincronizado */
function checkAlarms() {
  const d = now();
  const hhmm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const today = dateKey(d);

  for (const m of state.meals) {
    if (!m.alarm || m.time !== hhmm) continue;
    const k = `${today}|${hhmm}|${m.id}`;
    if (state.firedAlarms[k]) continue;
    state.firedAlarms[k] = true; save();
    fireAlarm(`Hora do ${m.name}! ${m.icon || "🍽️"}`, "Coma com calma, mastigue devagar e evite líquidos em excesso.");
  }
  for (const med of state.meds) {
    if (!med.alarm) continue;
    for (const t of med.times) {
      if (t !== hhmm) continue;
      const k = `${today}|${hhmm}|${med.id}`;
      if (state.firedAlarms[k]) continue;
      state.firedAlarms[k] = true; save();
      fireAlarm(`Remédio: ${med.name} 💊`, med.dose || "Não esqueça de marcar como tomado no app.");
    }
  }
  // limpeza de chaves antigas (mantém só hoje)
  for (const k of Object.keys(state.firedAlarms)) if (!k.startsWith(today)) delete state.firedAlarms[k];
}

/* =========================================================
   REMÉDIOS
   ========================================================= */
function renderMeds() {
  $("#med-list").innerHTML = state.meds.length
    ? state.meds.map((m) => `<div class="edit-row">
        <span class="grow"><b>💊 ${esc(m.name)}</b><br>
          <span class="muted">${m.times.join(" · ")}${m.dose ? " — " + esc(m.dose) : ""}</span></span>
        <label class="switch" title="Alarme"><input type="checkbox" ${m.alarm ? "checked" : ""} data-alarm="${m.id}"><span class="sl"></span></label>
        <button class="icon-btn" data-del="${m.id}" aria-label="Remover remédio">🗑️</button>
      </div>`).join("")
    : `<p class="muted">Nenhum remédio cadastrado ainda.</p>`;
  $$("#med-list [data-del]").forEach((b) => b.addEventListener("click", () => {
    state.meds = state.meds.filter((x) => x.id !== b.dataset.del); save(); renderMeds(); renderHome();
  }));
  $$("#med-list [data-alarm]").forEach((i) => i.addEventListener("change", () => {
    const m = state.meds.find((x) => x.id === i.dataset.alarm);
    if (m) { m.alarm = i.checked; save(); }
  }));
}

$("#med-add").addEventListener("click", () => {
  const name = $("#med-name").value.trim();
  const times = $("#med-times").value.split(",").map((t) => t.trim()).filter((t) => /^\d{1,2}:\d{2}$/.test(t))
    .map((t) => { const [h, m] = t.split(":"); return `${pad(h)}:${m}`; });
  if (!name) return toast("Dê um nome ao remédio 💊");
  if (!times.length) return toast("Informe ao menos um horário válido (ex.: 08:00)");
  state.meds.push({ id: "med-" + uid(), name, dose: $("#med-dose").value.trim(), times, alarm: true });
  $("#med-name").value = $("#med-dose").value = $("#med-times").value = "";
  save(); renderMeds(); toast("Lembrete criado! 🔔");
});

/* =========================================================
   PESO & METAS
   ========================================================= */
function renderWeight() {
  const ws = [...state.weights].sort((a, b) => a.date.localeCompare(b.date));
  const cur = ws[ws.length - 1];
  const first = ws[0];
  const goal = state.settings.goalWeight;

  const deltaTotal = cur && first && ws.length > 1 ? cur.kg - first.kg : null;
  const toGoal = cur && goal ? cur.kg - goal : null;
  const fmt = (v) => v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  $("#weight-tiles").innerHTML = `
    <div class="stat-tile"><div class="lb">Peso atual</div>
      <div class="vl">${cur ? fmt(cur.kg) : "—"}</div><div class="dl flat">kg</div></div>
    <div class="stat-tile"><div class="lb">Desde o início</div>
      <div class="vl">${deltaTotal != null ? (deltaTotal > 0 ? "+" : "") + fmt(deltaTotal) : "—"}</div>
      <div class="dl ${deltaTotal == null ? "flat" : deltaTotal < 0 ? "down" : deltaTotal > 0 ? "up" : "flat"}">${deltaTotal != null ? (deltaTotal < 0 ? "↓ perdeu" : deltaTotal > 0 ? "↑ ganhou" : "estável") : "kg"}</div></div>
    <div class="stat-tile"><div class="lb">Até a meta</div>
      <div class="vl">${toGoal != null ? fmt(Math.abs(toGoal)) : "—"}</div>
      <div class="dl flat">${toGoal != null ? (toGoal > 0 ? "kg a perder" : "kg abaixo 🎉") : goal ? "kg" : "defina a meta"}</div></div>`;

  $("#goal-weight").value = goal ?? "";
  renderWeightChart(ws);
  renderWeightTable(ws);
  renderGoals();
}

function renderWeightChart(ws) {
  const el = $("#weight-chart");
  if (ws.length < 2) {
    el.innerHTML = `<p class="muted">Registre seu peso pelo menos 2 vezes para ver o gráfico. ${ws.length === 1 ? "Já tem 1 registro — volte amanhã! 📈" : ""}</p>`;
    return;
  }
  const goal = state.settings.goalWeight;
  const W = 640, H = 260, padL = 46, padR = 52, padT = 18, padB = 30;
  const xs = ws.map((w) => keyToDate(w.date).getTime());
  const ys = ws.map((w) => w.kg);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  let yMin = Math.min(...ys, goal ?? Infinity), yMax = Math.max(...ys, goal ?? -Infinity);
  const yPad = Math.max((yMax - yMin) * 0.15, 0.8);
  yMin -= yPad; yMax += yPad;

  const X = (t) => padL + ((t - xMin) / (xMax - xMin || 1)) * (W - padL - padR);
  const Y = (v) => padT + (1 - (v - yMin) / (yMax - yMin)) * (H - padT - padB);

  // ticks "redondos" no eixo y
  const span = yMax - yMin;
  const step = span > 12 ? 5 : span > 6 ? 2 : span > 3 ? 1 : 0.5;
  const ticks = [];
  for (let v = Math.ceil(yMin / step) * step; v <= yMax; v += step) ticks.push(Number(v.toFixed(1)));

  const grid = ticks.map((v) =>
    `<line x1="${padL}" y1="${Y(v)}" x2="${W - padR}" y2="${Y(v)}" stroke="var(--viz-grid)" stroke-width="1"/>
     <text x="${padL - 8}" y="${Y(v) + 3.5}" text-anchor="end" font-size="10.5" fill="var(--viz-muted)" style="font-variant-numeric:tabular-nums">${v.toLocaleString("pt-BR")}</text>`).join("");

  // rótulos do eixo x: primeiro, ~meio e último
  const xIdx = [0, Math.floor((ws.length - 1) / 2), ws.length - 1].filter((v, i, a) => a.indexOf(v) === i);
  const xLabels = xIdx.map((i) => {
    const d = keyToDate(ws[i].date);
    return `<text x="${X(xs[i])}" y="${H - 8}" text-anchor="middle" font-size="10.5" fill="var(--viz-muted)">${d.getDate()}/${d.getMonth() + 1}</text>`;
  }).join("");

  const pts = ws.map((w, i) => `${X(xs[i])},${Y(ys[i])}`).join(" ");
  const areaPath = `M ${X(xs[0])} ${Y(ys[0])} ` + ws.map((w, i) => `L ${X(xs[i])} ${Y(ys[i])}`).join(" ") +
    ` L ${X(xs[xs.length - 1])} ${H - padB} L ${X(xs[0])} ${H - padB} Z`;

  const goalLine = goal != null && goal >= yMin && goal <= yMax
    ? `<line x1="${padL}" y1="${Y(goal)}" x2="${W - padR}" y2="${Y(goal)}" stroke="var(--viz-muted)" stroke-width="1"/>
       <text x="${W - padR + 6}" y="${Y(goal) + 3.5}" font-size="10.5" fill="var(--viz-muted)">meta ${goal.toLocaleString("pt-BR")}</text>` : "";

  const dots = ws.map((w, i) =>
    `<circle cx="${X(xs[i])}" cy="${Y(ys[i])}" r="4.5" fill="var(--viz-series)" stroke="var(--viz-surface)" stroke-width="2"/>`).join("");
  const hits = ws.map((w, i) =>
    `<circle class="w-hit" data-i="${i}" cx="${X(xs[i])}" cy="${Y(ys[i])}" r="14" fill="transparent"/>`).join("");

  const last = ws[ws.length - 1];
  const endLabel = `<text x="${X(xs[xs.length - 1]) + 9}" y="${Y(last.kg) + 4}" font-size="12" font-weight="600" fill="var(--viz-ink-2)" style="font-variant-numeric:tabular-nums">${last.kg.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}</text>`;

  el.innerHTML = `<div class="viz-root">
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolução do peso em quilogramas">
      ${grid}${goalLine}
      <line x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}" stroke="var(--viz-axis)" stroke-width="1"/>
      <path d="${areaPath}" fill="var(--viz-series)" opacity="0.1"/>
      <polyline points="${pts}" fill="none" stroke="var(--viz-series)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      ${dots}${endLabel}${xLabels}${hits}
    </svg>
    <div class="viz-tooltip" id="w-tt"></div>
  </div>`;

  const tt = $("#w-tt");
  const root = el.firstElementChild;
  $$(".w-hit").forEach((c) => {
    c.addEventListener("mouseenter", () => {
      const w = ws[Number(c.dataset.i)];
      const d = keyToDate(w.date);
      tt.innerHTML = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} — <b>${w.kg.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} kg</b>`;
      tt.style.display = "block";
    });
    c.addEventListener("mousemove", (e) => {
      const r = root.getBoundingClientRect();
      tt.style.left = Math.min(e.clientX - r.left + 12, r.width - tt.offsetWidth - 4) + "px";
      tt.style.top = (e.clientY - r.top - 36) + "px";
    });
    c.addEventListener("mouseleave", () => { tt.style.display = "none"; });
  });
}

function renderWeightTable(ws) {
  $("#weight-table").innerHTML = ws.length
    ? `<table class="data-table"><thead><tr><th>Data</th><th>Peso (kg)</th><th></th></tr></thead><tbody>
      ${[...ws].reverse().map((w) => {
        const d = keyToDate(w.date);
        return `<tr><td>${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}</td>
          <td>${w.kg.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}</td>
          <td><button class="icon-btn" data-wdel="${w.date}" aria-label="Remover">🗑️</button></td></tr>`;
      }).join("")}</tbody></table>`
    : `<p class="muted">Sem registros.</p>`;
  $$("#weight-table [data-wdel]").forEach((b) => b.addEventListener("click", () => {
    state.weights = state.weights.filter((x) => x.date !== b.dataset.wdel);
    save(); renderWeight(); $("#weight-table").style.display = "";
  }));
}

$("#weight-add").addEventListener("click", () => {
  const v = parseFloat($("#weight-input").value.replace(",", "."));
  if (!v || v < 20 || v > 400) return toast("Digite um peso válido (kg)");
  const key = dateKey(now());
  const existing = state.weights.find((w) => w.date === key);
  if (existing) existing.kg = v; else state.weights.push({ date: key, kg: v });
  $("#weight-input").value = "";
  save(); renderWeight(); toast("Peso registrado! ⚖️");
});
$("#goal-weight-save").addEventListener("click", () => {
  const v = parseFloat($("#goal-weight").value.replace(",", "."));
  state.settings.goalWeight = v && v >= 20 && v <= 400 ? v : null;
  save(); renderWeight(); toast(state.settings.goalWeight ? "Meta salva! 🎯" : "Meta removida");
});
$("#weight-table-toggle").addEventListener("click", () => {
  const t = $("#weight-table");
  const open = t.style.display !== "none";
  t.style.display = open ? "none" : "";
  $("#weight-table-toggle").textContent = open ? "Ver tabela" : "Ocultar tabela";
});

/* metas & sequências */
function streak(goal) {
  let s = 0;
  const d = now();
  if (!goal.checkins[dateKey(d)]) d.setDate(d.getDate() - 1); // hoje ainda pode ser marcado
  while (goal.checkins[dateKey(d)]) { s++; d.setDate(d.getDate() - 1); }
  return s;
}

function renderGoals() {
  const sel = $("#goal-select");
  sel.innerHTML = GOAL_SUGGESTIONS.map((g) => `<option>${g}</option>`).join("") + `<option value="__custom">✏️ Escrever a minha…</option>`;

  const today = dateKey(now());
  $("#goal-list").innerHTML = state.goals.length
    ? state.goals.map((g) => {
        const done = !!g.checkins[today];
        const s = streak(g);
        return `<div class="goal-row">
          <div class="check-row" style="border:none;padding:0">
            <button class="checkbox ${done ? "on" : ""}" data-goal="${g.id}">✓</button>
            <span class="n">${esc(g.title)}</span>
            <span class="streak">${s > 0 ? `🔥 ${s} dia${s > 1 ? "s" : ""}` : ""}</span>
            <button class="icon-btn" data-gdel="${g.id}" aria-label="Remover meta">🗑️</button>
          </div>
        </div>`;
      }).join("")
    : `<p class="muted">Nenhuma meta ainda. Que tal começar com “30 dias sem café”? ☕🚫</p>`;

  $$("#goal-list [data-goal]").forEach((b) => b.addEventListener("click", () => {
    const g = state.goals.find((x) => x.id === b.dataset.goal);
    if (!g) return;
    if (g.checkins[today]) delete g.checkins[today]; else g.checkins[today] = true;
    save(); renderGoals();
  }));
  $$("#goal-list [data-gdel]").forEach((b) => b.addEventListener("click", () => {
    state.goals = state.goals.filter((x) => x.id !== b.dataset.gdel);
    save(); renderGoals();
  }));
}

$("#goal-add").addEventListener("click", () => {
  let title = $("#goal-select").value;
  if (title === "__custom") {
    title = prompt("Escreva sua meta:");
    if (!title) return;
  }
  state.goals.push({ id: "g-" + uid(), title: title.trim(), checkins: {} });
  save(); renderGoals(); toast("Meta criada! 🎯");
});

/* =========================================================
   DICAS · SAFRA · SOBRE
   ========================================================= */
function renderTips() {
  const cats = [...new Set(TIPS.map((t) => t.cat))];
  $("#tips-list").innerHTML = cats.map((cat) =>
    `<h3 class="sub">${cat}</h3>` + TIPS.filter((t) => t.cat === cat).map((t) =>
      `<div class="card"><h4>${t.icon} ${esc(t.title)}</h4><p>${esc(t.text)}</p></div>`).join("")).join("");
}

let seasonMonth = null;
function renderSeason() {
  if (seasonMonth == null) seasonMonth = now().getMonth();
  $("#month-chips").innerHTML = MONTH_NAMES.map((m, i) =>
    `<button class="chip ${i === seasonMonth ? "active" : ""}" data-m="${i}">${m.slice(0, 3)}</button>`).join("");
  $$("#month-chips .chip").forEach((c) => c.addEventListener("click", () => { seasonMonth = Number(c.dataset.m); renderSeason(); }));

  const s = SEASONAL[seasonMonth];
  const isNow = seasonMonth === now().getMonth();
  $("#season-content").innerHTML = `
    <div class="card">
      <h4>🍎 Frutas de ${MONTH_NAMES[seasonMonth]}${isNow ? " (mês atual)" : ""}</h4>
      <div class="tags" style="margin-top:6px">${s.frutas.map((f) => `<span class="tag">${f}</span>`).join("")}</div>
    </div>
    <div class="card">
      <h4>🥕 Legumes & verduras de ${MONTH_NAMES[seasonMonth]}</h4>
      <div class="tags" style="margin-top:6px">${s.legumes.map((f) => `<span class="tag">${f}</span>`).join("")}</div>
    </div>
    <p class="muted">Cruze com o Guia: mesmo na safra, confira se o alimento é amigo do seu estômago. 😉</p>`;
}

function renderAbout() {
  $("#user-name").value = state.settings.name || "";
}

/* =========================================================
   MARCA (white-label) — configurada em config.js
   ========================================================= */
function applyBrand() {
  const B = typeof BRAND !== "undefined" ? BRAND : {};
  if (B.appName) { $("#brand-name").textContent = B.appName; document.title = `${B.appName} · Gastrite & Refluxo`; }
  if (B.logoEmoji) $("#brand-logo").textContent = B.logoEmoji;
  const about = $("#brand-about");
  if (B.doctorName) {
    about.style.display = "";
    about.innerHTML = `<h4>👨‍⚕️ Oferecido por ${esc(B.doctorName)}</h4>
      <p>${[B.specialty, B.crm].filter(Boolean).map(esc).join(" · ")}</p>
      ${B.clinic ? `<p>${esc(B.clinic)}</p>` : ""}
      ${B.phone ? `<p>📞 ${esc(B.phone)}</p>` : ""}
      ${B.whatsapp ? `<button class="btn ghost small" onclick="window.open('https://wa.me/${esc(B.whatsapp)}')">💬 Falar com o consultório</button>` : ""}`;
  }
}

/* =========================================================
   RELATÓRIO PARA A CONSULTA
   ========================================================= */
let reportDays = 30;

function computeReport(nDays) {
  const B = typeof BRAND !== "undefined" ? BRAND : {};
  const days = [];
  const base = now();
  for (let i = nDays - 1; i >= 0; i--) {
    const d = new Date(base); d.setDate(d.getDate() - i);
    const k = dateKey(d);
    days.push({ k, d, rec: state.days[k] });
  }
  const fmtD = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;

  const symCount = {}; let symTotal = 0, daysWithSym = 0;
  const symDays = [];
  let mealsDone = 0, water = 0, waterDays = 0, activeDays = 0;
  let medSched = 0, medTaken = 0;

  for (const { k, d, rec } of days) {
    if (rec && (Object.keys(rec.meals || {}).length || (rec.symptoms || []).length || rec.water)) activeDays++;
    const syms = rec?.symptoms || [];
    if (syms.length) {
      daysWithSym++;
      const notes = Object.entries(rec.meals || {}).filter(([, m]) => m.note).map(([id, m]) => m.note);
      symDays.push({ d, n: syms.length, int: Math.max(...syms.map((s) => s.intensity)), notes });
    }
    for (const s of syms) {
      symTotal++;
      const c = (symCount[s.type] ??= { n: 0, maxInt: 0 });
      c.n++; c.maxInt = Math.max(c.maxInt, s.intensity);
    }
    if (rec) {
      mealsDone += Object.values(rec.meals || {}).filter((m) => m.done).length;
      if (rec.water) { water += rec.water; waterDays++; }
      for (const med of state.meds) for (const t of med.times) { medSched++; if (rec.meds?.[med.id]?.[t]) medTaken++; }
    } else {
      medSched += state.meds.reduce((a, m) => a + m.times.length, 0);
    }
  }
  symDays.sort((a, b) => b.n - a.n || b.int - a.int);

  const ws = state.weights
    .filter((w) => w.date >= days[0].k && w.date <= days[days.length - 1].k)
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    B, days, fmtD, symCount, symTotal, daysWithSym, symDays,
    mealsDone, water, waterDays, activeDays, medSched, medTaken, ws,
    period: `${fmtD(days[0].d)} a ${fmtD(days[days.length - 1].d)}/${days[days.length - 1].d.getFullYear()}`,
  };
}

function renderReport() {
  const r = computeReport(reportDays);
  const fmtKg = (v) => v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const intDots = (n) => "●".repeat(n) + "○".repeat(3 - n);

  const symRows = Object.entries(r.symCount)
    .sort((a, b) => b[1].n - a[1].n)
    .map(([id, c]) => {
      const s = SYMPTOMS.find((x) => x.id === id) || { icon: "❓", name: id };
      return `<tr><td>${s.icon} ${esc(s.name)}</td><td>${c.n}×</td><td>intensidade máx.: ${intDots(c.maxInt)}</td></tr>`;
    }).join("");

  const worst = r.symDays.slice(0, 3).map((x) =>
    `<li><b>${r.fmtD(x.d)}</b> — ${x.n} sintoma${x.n > 1 ? "s" : ""} (máx. ${intDots(x.int)})${x.notes.length ? `<br><span class="muted">comeu: ${esc(x.notes.join(" · "))}</span>` : ""}</li>`).join("");

  const wLine = r.ws.length >= 2
    ? `${fmtKg(r.ws[0].kg)} kg → <b>${fmtKg(r.ws[r.ws.length - 1].kg)} kg</b> (${(r.ws[r.ws.length - 1].kg - r.ws[0].kg) >= 0 ? "+" : ""}${fmtKg(r.ws[r.ws.length - 1].kg - r.ws[0].kg)} kg no período)`
    : r.ws.length === 1 ? `${fmtKg(r.ws[0].kg)} kg (1 registro no período)` : "sem registros no período";

  const goals = state.goals.map((g) => `<li>${esc(g.title)} — sequência atual: <b>${streak(g)} dia(s)</b></li>`).join("");

  $("#report-content").innerHTML = `
    <div class="card report-card">
      <div class="report-head">
        <div style="font-size:26px">${r.B.logoEmoji || "🌿"}</div>
        <div>
          <b>${esc(r.B.appName || "GastroCuida")} — Relatório do paciente</b><br>
          <span class="muted">${state.settings.name ? "Paciente: " + esc(state.settings.name) + " · " : ""}Período: ${r.period} · Gerado em ${r.fmtD(now())}/${now().getFullYear()}</span>
          ${r.B.doctorName ? `<br><span class="muted">Acompanhamento: ${esc(r.B.doctorName)}${r.B.crm ? " · " + esc(r.B.crm) : ""}</span>` : ""}
        </div>
      </div>

      <h4>🔥 Sintomas</h4>
      ${r.symTotal
        ? `<p><b>${r.symTotal}</b> registro(s) em <b>${r.daysWithSym}</b> de ${reportDays} dias.</p>
           <table class="data-table">${symRows}</table>
           ${worst ? `<p style="margin-top:10px"><b>Piores dias:</b></p><ul style="margin:4px 0 0;padding-left:18px;font-size:13.5px">${worst}</ul>` : ""}`
        : `<p>Nenhum sintoma registrado no período. 🎉</p>`}

      <h4>⚖️ Peso</h4>
      <p>${wLine}${state.settings.goalWeight ? ` · Meta: ${fmtKg(state.settings.goalWeight)} kg` : ""}</p>

      <h4>🍽️ Hábitos</h4>
      <p>Usou o app em <b>${r.activeDays}</b> de ${reportDays} dias · <b>${r.mealsDone}</b> refeições marcadas
      ${r.waterDays ? ` · média de <b>${(r.water / r.waterDays).toFixed(1)}</b> copos de água/dia` : ""}</p>
      ${r.medSched ? `<p>💊 Remédios: <b>${Math.round((r.medTaken / r.medSched) * 100)}%</b> das doses marcadas como tomadas (${r.medTaken}/${r.medSched})</p>` : ""}
      ${goals ? `<p style="margin-bottom:2px">🎯 Metas em andamento:</p><ul style="margin:2px 0 0;padding-left:18px;font-size:13.5px">${goals}</ul>` : ""}

      <p class="muted" style="margin-top:14px">Relatório gerado pelo app para apoiar a consulta — não substitui avaliação médica.</p>
    </div>`;
}

function reportAsText() {
  const r = computeReport(reportDays);
  const fmtKg = (v) => v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const L = [];
  L.push(`📋 ${r.B.appName || "GastroCuida"} — Relatório do paciente`);
  if (state.settings.name) L.push(`Paciente: ${state.settings.name}`);
  L.push(`Período: ${r.period}`);
  L.push("");
  L.push(`🔥 Sintomas: ${r.symTotal} registro(s) em ${r.daysWithSym} de ${reportDays} dias`);
  for (const [id, c] of Object.entries(r.symCount).sort((a, b) => b[1].n - a[1].n)) {
    const s = SYMPTOMS.find((x) => x.id === id) || { name: id };
    L.push(`  • ${s.name}: ${c.n}× (intensidade máx. ${c.maxInt}/3)`);
  }
  L.push("");
  if (r.ws.length >= 2) L.push(`⚖️ Peso: ${fmtKg(r.ws[0].kg)} → ${fmtKg(r.ws[r.ws.length - 1].kg)} kg (${(r.ws[r.ws.length - 1].kg - r.ws[0].kg) >= 0 ? "+" : ""}${fmtKg(r.ws[r.ws.length - 1].kg - r.ws[0].kg)})`);
  else if (r.ws.length === 1) L.push(`⚖️ Peso: ${fmtKg(r.ws[0].kg)} kg`);
  L.push(`🍽️ Uso do app: ${r.activeDays}/${reportDays} dias · ${r.mealsDone} refeições marcadas`);
  if (r.medSched) L.push(`💊 Remédios: ${Math.round((r.medTaken / r.medSched) * 100)}% das doses tomadas`);
  for (const g of state.goals) L.push(`🎯 ${g.title}: ${streak(g)} dia(s) de sequência`);
  return L.join("\n");
}

$$("#report-period button").forEach((b) => b.addEventListener("click", () => {
  $$("#report-period button").forEach((x) => x.classList.remove("active"));
  b.classList.add("active");
  reportDays = Number(b.dataset.d);
  renderReport();
}));
$("#report-print").addEventListener("click", () => window.print());
$("#report-copy").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(reportAsText()); toast("Relatório copiado! 📋"); }
  catch { toast("Não consegui copiar — use Imprimir/PDF"); }
});
$("#report-wa").addEventListener("click", () =>
  window.open("https://wa.me/?text=" + encodeURIComponent(reportAsText())));
$("#user-name").addEventListener("change", (e) => {
  state.settings.name = e.target.value.trim(); save(); toast("Salvo!");
});

/* exportar / importar / apagar */
$("#data-export").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `gastrocuida-backup-${dateKey(now())}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});
$("#data-import").addEventListener("click", () => $("#data-file").click());
$("#data-file").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const s = JSON.parse(await file.text());
    if (!s.settings || !s.meals) throw new Error("formato");
    state = Object.assign(defaultState(), s);
    save(); applyTheme(); renderAll(); toast("Dados importados! ✅");
  } catch { toast("Arquivo inválido 😕"); }
  e.target.value = "";
});
$("#data-reset").addEventListener("click", () => {
  if (confirm("Apagar TODOS os dados do app? Essa ação não pode ser desfeita.")) {
    state = defaultState(); save(); applyTheme(); renderAll(); toast("Tudo apagado.");
  }
});

/* =========================================================
   BOAS-VINDAS (primeira vez)
   ========================================================= */
function onboard() {
  if (state.settings.onboarded) return;
  openModal(`
    <div class="onb">
      <div class="onb-logo">${(typeof BRAND !== "undefined" && BRAND.logoEmoji) || "🌿"}</div>
      <h3>Bem-vindo(a) ao ${esc((typeof BRAND !== "undefined" && BRAND.appName) || "GastroCuida")}!</h3>
      ${typeof BRAND !== "undefined" && BRAND.doctorName ? `<p style="text-align:center;font-size:13.5px;color:var(--text-2)">Oferecido por <b>${esc(BRAND.doctorName)}</b>${BRAND.crm ? " · " + esc(BRAND.crm) : ""}${BRAND.welcomeNote ? `<br>“${esc(BRAND.welcomeNote)}”` : ""}</p>` : ""}
      <p style="font-size:14px;color:var(--text-2)">Seu companheiro para cuidar da <b>gastrite</b> e do <b>refluxo</b> — a alimentação é a parte mais difícil da recuperação, e você não precisa fazer isso sozinho(a).</p>
      <ul>
        <li>🥗 <b>Guia</b>: o que pode, o que evitar (carnes, frutas, raízes, chás…)</li>
        <li>🍳 <b>Receitas</b> leves e modernas para café, almoço e jantar</li>
        <li>⏰ <b>Alarmes</b> de refeição e remédio com horário oficial da internet</li>
        <li>📔 <b>Diário</b> de sintomas para descobrir seus gatilhos</li>
        <li>⚖️ <b>Peso e metas</b> para acompanhar a evolução</li>
      </ul>
      <div class="notice danger" style="margin:12px 0">Este app é educativo e <b>não substitui</b> médico nem nutricionista. Siga sempre a orientação de quem te acompanha.</div>
      <label class="field"><span>Como você quer ser chamado(a)? (opcional)</span><input id="onb-name" placeholder="Seu nome" /></label>
      <button class="btn block" id="onb-go">Começar 🌱</button>
    </div>`);
  $("#onb-go").addEventListener("click", () => {
    state.settings.name = $("#onb-name").value.trim();
    state.settings.onboarded = true;
    save(); closeModal(); renderHome();
  });
}

/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */
applyTheme();
applyBrand();
updateClockUI();
syncClock();
setInterval(updateClockUI, 1000);
setInterval(() => { if (currentView === "inicio") renderHome(); }, 30_000);
setInterval(checkAlarms, 15_000);
setInterval(syncClock, 30 * 60_000); // re-sincroniza a cada 30 min
checkAlarms();
goto("inicio");
onboard();

// desbloqueia o áudio na primeira interação (exigência dos navegadores)
document.addEventListener("pointerdown", function unlock() {
  try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); audioCtx.resume(); } catch {}
  document.removeEventListener("pointerdown", unlock);
}, { once: true });

// PWA
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
