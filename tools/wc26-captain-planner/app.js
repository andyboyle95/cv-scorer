/* World Cup 2026 — Captain Planner. Autocomplete squad builder, vanilla JS. */
(function () {
  "use strict";

  const LS = "wc26.slots.v3";
  const $ = (id) => document.getElementById(id);
  const FIXTURES_URL = window.__FIXTURES_URL__ || "fixtures.json";
  const PLAYERS = window.__PLAYERS__ || [];

  const POSN = [["GK", "Goalkeepers", 2], ["DEF", "Defenders", 5], ["MID", "Midfielders", 5], ["FWD", "Forwards", 3]];

  // Country → flag emoji
  const FLAGS = {
    "Mexico": "🇲🇽", "South Africa": "🇿🇦", "South Korea": "🇰🇷", "Czech Republic": "🇨🇿",
    "Canada": "🇨🇦", "Bosnia and Herzegovina": "🇧🇦", "Qatar": "🇶🇦", "Switzerland": "🇨🇭",
    "Brazil": "🇧🇷", "Morocco": "🇲🇦", "Haiti": "🇭🇹", "Scotland": "🇬🇧",
    "United States": "🇺🇸", "Paraguay": "🇵🇾", "Australia": "🇦🇺", "Turkey": "🇹🇷",
    "Germany": "🇩🇪", "Curaçao": "🇨🇼", "Ivory Coast": "🇨🇮", "Ecuador": "🇪🇨",
    "Netherlands": "🇳🇱", "Japan": "🇯🇵", "Sweden": "🇸🇪", "Tunisia": "🇹🇳",
    "Belgium": "🇧🇪", "Egypt": "🇪🇬", "Iran": "🇮🇷", "New Zealand": "🇳🇿",
    "Spain": "🇪🇸", "Cape Verde": "🇨🇻", "Saudi Arabia": "🇸🇦", "Uruguay": "🇺🇾",
    "France": "🇫🇷", "Senegal": "🇸🇳", "Iraq": "🇮🇶", "Norway": "🇳🇴",
    "Argentina": "🇦🇷", "Algeria": "🇩🇿", "Austria": "🇦🇹", "Jordan": "🇯🇴",
    "Portugal": "🇵🇹", "DR Congo": "🇨🇩", "Uzbekistan": "🇺🇿", "Colombia": "🇨🇴",
    "England": "🇬🇧", "Croatia": "🇭🇷", "Ghana": "🇬🇭", "Panama": "🇵🇦",
  };
  const flag = (c) => FLAGS[c] || "⚽";

  const CODES = {
    "Mexico": "MEX", "South Africa": "RSA", "South Korea": "KOR", "Czech Republic": "CZE",
    "Canada": "CAN", "Bosnia and Herzegovina": "BIH", "Qatar": "QAT", "Switzerland": "SUI",
    "Brazil": "BRA", "Morocco": "MAR", "Haiti": "HAI", "Scotland": "SCO", "United States": "USA",
    "Paraguay": "PAR", "Australia": "AUS", "Turkey": "TUR", "Germany": "GER", "Curaçao": "CUW",
    "Ivory Coast": "CIV", "Ecuador": "ECU", "Netherlands": "NED", "Japan": "JPN", "Sweden": "SWE",
    "Tunisia": "TUN", "Belgium": "BEL", "Egypt": "EGY", "Iran": "IRN", "New Zealand": "NZL",
    "Spain": "ESP", "Cape Verde": "CPV", "Saudi Arabia": "KSA", "Uruguay": "URU", "France": "FRA",
    "Senegal": "SEN", "Iraq": "IRQ", "Norway": "NOR", "Argentina": "ARG", "Algeria": "ALG",
    "Austria": "AUT", "Jordan": "JOR", "Portugal": "POR", "DR Congo": "COD", "Uzbekistan": "UZB",
    "Colombia": "COL", "England": "ENG", "Croatia": "CRO", "Ghana": "GHA", "Panama": "PAN",
  };
  const code = (c) => CODES[c] || c.slice(0, 3).toUpperCase();

  let DATA = null;
  let COUNTRIES = [];
  let slots = loadSlots();
  let round = "all";
  let hidePlayed = false;
  let heroKey = "";
  const mdByMatch = new Map();

  // ---- storage / model -----------------------------------------------------
  function uid() { return Math.random().toString(36).slice(2, 9); }
  function blankSlots() {
    const s = [];
    POSN.forEach(([pos, , n]) => { for (let i = 0; i < n; i++) s.push({ id: uid(), pos, name: null, country: null }); });
    return s;
  }
  function loadSlots() {
    try {
      const v = JSON.parse(localStorage.getItem(LS) || "null");
      if (Array.isArray(v) && v.length === 15) return v;
      const old = JSON.parse(localStorage.getItem("wc26.squad.v2") || "null")
        || (JSON.parse(localStorage.getItem("wc26.captain.teams") || "[]")).map((c) => ({ name: null, country: c }));
      const s = blankSlots();
      if (Array.isArray(old)) old.slice(0, 15).forEach((e, i) => { s[i].name = e.name || null; s[i].country = e.country || null; });
      return s;
    } catch { return blankSlots(); }
  }
  const saveSlots = () => { try { localStorage.setItem(LS, JSON.stringify(slots)); } catch { /* */ } };
  const filled = () => slots.filter((s) => s.country);

  // ---- saved teams ---------------------------------------------------------
  const SAVED = "wc26.saved.v1";
  const loadSavedTeams = () => { try { return JSON.parse(localStorage.getItem(SAVED) || "{}") || {}; } catch { return {}; } };
  const persistSavedTeams = (o) => { try { localStorage.setItem(SAVED, JSON.stringify(o)); } catch { /* */ } };
  function renderSavedTeams() {
    const sel = $("savedSel"); if (!sel) return;
    const names = Object.keys(loadSavedTeams()).sort();
    sel.innerHTML = '<option value="">⭐ Saved teams…</option>' + names.map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join("");
  }
  function saveTeam() {
    if (!filled().length) { alert("Add some players first, then save."); return; }
    const name = (prompt("Name this team:", "My team") || "").trim();
    if (!name) return;
    const o = loadSavedTeams(); o[name] = JSON.parse(JSON.stringify(slots)); persistSavedTeams(o);
    renderSavedTeams(); $("savedSel").value = name;
  }
  function loadTeam(name) {
    const o = loadSavedTeams(); if (!o[name]) return;
    const copy = JSON.parse(JSON.stringify(o[name]));
    slots = Array.isArray(copy) && copy.length === 15 ? copy : blankSlots();
    slots.forEach((s) => { if (!s.id) s.id = uid(); });
    saveSlots(); renderBuilder(); renderAll();
  }
  function deleteSavedTeam() {
    const name = $("savedSel").value; if (!name) return;
    const o = loadSavedTeams(); delete o[name]; persistSavedTeams(o); renderSavedTeams();
  }

  // ---- helpers -------------------------------------------------------------
  const ko = (m) => new Date(m.kickoff_utc).getTime();
  const now = () => Date.now();
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const opponentOf = (m, t) => (m.home === t ? m.away : m.home);
  const label = (s) => s.name || s.country;
  function fmtTime(m) {
    const d = new Date(m.kickoff_utc);
    return { t: d.toLocaleString(undefined, { hour: "2-digit", minute: "2-digit" }), d: d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) };
  }
  const sameDay = (a, b) => new Date(a.kickoff_utc).toDateString() === new Date(b.kickoff_utc).toDateString();
  const dayLabel = (m) => new Date(m.kickoff_utc).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

  function computeMatchdays() {
    // Prefer an explicit `matchday` field on the fixture (group=1/2/3, R32=4,
    // R16=5, QF=6, SF=7, F=8). Fall back to a per-team kickoff position so older
    // group-only data still works.
    const perTeam = {};
    for (const m of DATA.matches) { (perTeam[m.home] = perTeam[m.home] || []).push(m); (perTeam[m.away] = perTeam[m.away] || []).push(m); }
    const pos = new Map();
    for (const t of Object.keys(perTeam)) perTeam[t].slice().sort((a, b) => ko(a) - ko(b)).forEach((m, i) => pos.set(t + "|" + m.kickoff_utc, i + 1));
    for (const m of DATA.matches) {
      if (typeof m.matchday === "number") mdByMatch.set(m, m.matchday);
      else mdByMatch.set(m, Math.max(pos.get(m.home + "|" + m.kickoff_utc), pos.get(m.away + "|" + m.kickoff_utc)));
    }
  }
  function defaultRound() {
    const up = DATA.matches.filter((m) => ko(m) > now()).sort((a, b) => ko(a) - ko(b))[0];
    return up ? String(mdByMatch.get(up)) : "all";
  }
  function matchForCountry(c) {
    if (!DATA) return null;
    const ms = DATA.matches.filter((m) => m.home === c || m.away === c);
    if (round !== "all") return ms.find((m) => mdByMatch.get(m) === Number(round)) || null;
    const up = ms.filter((m) => ko(m) > now()).sort((a, b) => ko(a) - ko(b))[0];
    return up || ms.sort((a, b) => ko(b) - ko(a))[0] || null;
  }
  // filled slots with their match, sorted by kickoff
  function withMatch() {
    return filled().map((s) => ({ s, m: matchForCountry(s.country) })).filter((x) => x.m).sort((a, b) => ko(a.m) - ko(b.m));
  }
  const nextX = () => withMatch().filter((x) => ko(x.m) > now())[0] || null;

  // ---- boot ----------------------------------------------------------------
  // The builder works immediately; fixtures load in the background for the
  // match-based views (hero / pitch / queue).
  function init() {
    COUNTRIES = Object.keys(FLAGS).sort();
    $("tz").textContent = Intl.DateTimeFormat().resolvedOptions().timeZone || "your device";
    renderBuilder();
    renderAll();
    $("round").addEventListener("change", (e) => { round = e.target.value; renderAll(); });
    $("hideKicked").addEventListener("change", (e) => { hidePlayed = e.target.checked; renderAll(); });
    $("clearBtn").addEventListener("click", () => { slots = blankSlots(); saveSlots(); renderBuilder(); renderAll(); });
    renderSavedTeams();
    $("saveBtn").addEventListener("click", saveTeam);
    $("delSavedBtn").addEventListener("click", deleteSavedTeam);
    $("savedSel").addEventListener("change", (e) => { if (e.target.value) loadTeam(e.target.value); });
    setInterval(tick, 1000);
    setInterval(renderAll, 30000);

    fetch(FIXTURES_URL)
      .then((r) => r.json())
      .then((d) => { DATA = d; computeMatchdays(); round = defaultRound(); $("round").value = round; renderAll(); })
      .catch(() => { $("pitch").innerHTML = '<p class="empty">Could not load fixtures — refresh to retry.</p>'; });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  // ---- builder + autocomplete ---------------------------------------------
  function renderBuilder() {
    const total = filled().length;
    $("filledCount").textContent = total ? `(${total}/15)` : "";
    const el = $("builder");
    el.innerHTML = POSN.map(([pos, labelTxt]) => {
      const list = slots.filter((s) => s.pos === pos);
      const count = list.filter((s) => s.country).length;
      const rows = list.map((s) => slotHtml(s)).join("");
      return `<div class="posgroup"><div class="poshead">${labelTxt} <span class="poscount">${count}/${list.length}</span></div><div class="slots">${rows}</div></div>`;
    }).join("");
    bindSlots();
  }
  function slotHtml(s) {
    if (s.country) {
      return `<div class="slot filled" data-id="${s.id}">
        <span class="flag">${flag(s.country)}</span>
        <span class="slotmain"><span class="pname">${esc(label(s))}</span>${s.name ? `<span class="pcty">${esc(s.country)}</span>` : ""}</span>
        <button class="slotclear" data-id="${s.id}" aria-label="Clear">×</button>
      </div>`;
    }
    return `<div class="slot" data-id="${s.id}">
      <input class="ac-input" data-id="${s.id}" type="text" placeholder="Player or country…" autocomplete="off" spellcheck="false" />
      <div class="ac hidden" data-id="${s.id}"></div>
    </div>`;
  }
  function bindSlots() {
    $("builder").querySelectorAll(".slotclear").forEach((b) =>
      b.addEventListener("click", () => { const s = slots.find((x) => x.id === b.dataset.id); if (s) { s.name = null; s.country = null; } saveSlots(); renderBuilder(); renderAll(); }));
    $("builder").querySelectorAll(".ac-input").forEach((inp) => {
      inp.addEventListener("input", () => openAc(inp));
      inp.addEventListener("focus", () => openAc(inp));
      inp.addEventListener("keydown", (e) => acKeydown(inp, e));
      inp.addEventListener("blur", () => setTimeout(() => closeAc(inp), 150));
    });
  }
  function suggestions(q) {
    const n = norm(q.trim());
    if (!n) return [];
    const ps = PLAYERS.filter((p) => norm(p.n).includes(n)).slice(0, 6).map((p) => ({ type: "p", name: p.n, country: p.c }));
    const cs = COUNTRIES.filter((c) => norm(c).includes(n)).slice(0, 4).map((c) => ({ type: "c", country: c }));
    return [...ps, ...cs].slice(0, 8);
  }
  function openAc(inp) {
    const box = inp.parentElement.querySelector(".ac");
    const items = suggestions(inp.value);
    inp._items = items; inp._ai = 0;
    if (!items.length) { box.classList.add("hidden"); box.innerHTML = ""; return; }
    box.innerHTML = items.map((it, i) =>
      it.type === "p"
        ? `<div class="acitem${i === 0 ? " on" : ""}" data-i="${i}"><span class="flag">${flag(it.country)}</span><span class="acn">${esc(it.name)}</span><span class="acc">${esc(it.country)}</span></div>`
        : `<div class="acitem${i === 0 ? " on" : ""}" data-i="${i}"><span class="flag">${flag(it.country)}</span><span class="acn">${esc(it.country)}</span><span class="acc">team</span></div>`
    ).join("");
    box.classList.remove("hidden");
    box.querySelectorAll(".acitem").forEach((d) => d.addEventListener("mousedown", (e) => { e.preventDefault(); pick(inp, Number(d.dataset.i)); }));
  }
  function closeAc(inp) { const box = inp.parentElement && inp.parentElement.querySelector(".ac"); if (box) box.classList.add("hidden"); }
  function acKeydown(inp, e) {
    const items = inp._items || [];
    if (e.key === "ArrowDown") { e.preventDefault(); inp._ai = Math.min((inp._ai || 0) + 1, items.length - 1); paintAc(inp); }
    else if (e.key === "ArrowUp") { e.preventDefault(); inp._ai = Math.max((inp._ai || 0) - 1, 0); paintAc(inp); }
    else if (e.key === "Enter") { e.preventDefault(); if (items.length) pick(inp, inp._ai || 0); }
    else if (e.key === "Escape") closeAc(inp);
  }
  function paintAc(inp) {
    const box = inp.parentElement.querySelector(".ac");
    box.querySelectorAll(".acitem").forEach((d, i) => d.classList.toggle("on", i === (inp._ai || 0)));
  }
  function pick(inp, i) {
    const it = (inp._items || [])[i];
    if (!it) return;
    const s = slots.find((x) => x.id === inp.dataset.id);
    if (!s) return;
    if (it.type === "p") { s.name = it.name; s.country = it.country; }
    else { s.country = it.country; const typed = inp.value.trim(); s.name = typed && norm(typed) !== norm(it.country) ? typed : null; }
    saveSlots();
    renderBuilder();
    renderAll();
    const nextInput = $("builder").querySelector(".ac-input");
    if (nextInput) nextInput.focus();
  }

  // ---- render --------------------------------------------------------------
  function renderAll() {
    if (!DATA) {
      $("hero").className = "hero idle";
      $("hero").innerHTML = '<div class="label">Almost ready</div><div class="team" style="font-size:20px;">Loading fixtures… ⏳</div><div class="meta">Build your squad above while this loads.</div>';
      $("timeline").innerHTML = '<p class="empty">Loading fixtures…</p>';
      $("pitch").innerHTML = '<p class="empty">Loading fixtures…</p>';
      $("queue").innerHTML = '<p class="empty">Loading fixtures…</p>';
      return;
    }
    renderHero(); renderTimeline(); renderPitch(); renderQueue();
  }

  // Round timeline: grouped by day (empty hours/nights removed), one block per
  // match (players in the same fixture merged), showing the matchup with flags.
  function renderTimeline() {
    const el = $("timeline");
    const xs = withMatch();
    if (!xs.length) { el.innerHTML = '<p class="empty">Add your squad to see the timeline.</p>'; return; }

    // de-duplicate to unique matches, collecting your players in each
    const mm = new Map();
    for (const { s, m } of xs) {
      const k = m.kickoff_utc + "|" + m.home + "|" + m.away;
      if (!mm.has(k)) mm.set(k, { m, players: [] });
      mm.get(k).players.push(s);
    }
    let matches = [...mm.values()].sort((a, b) => ko(a.m) - ko(b.m));
    if (hidePlayed) matches = matches.filter((x) => ko(x.m) > now());
    if (!matches.length) { el.innerHTML = '<p class="empty">No matches to show.</p>'; return; }

    const nx = nextX();
    const nextKey = nx ? nx.m.kickoff_utc + "|" + nx.m.home + "|" + nx.m.away : null;
    const todayStr = new Date().toDateString();

    // Single horizontal strip in kickoff order: day chips + match pills + a
    // "now" marker. Sequence layout (not proportional) → no dead hours, no
    // overlap, one compact line.
    let html = "";
    let lastDay = null;
    let nowDone = false;
    for (const mt of matches) {
      const m = mt.m;
      const dstr = new Date(m.kickoff_utc).toDateString();
      if (dstr !== lastDay) {
        const dl = new Date(m.kickoff_utc).toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
        html += `<span class="tlsep${dstr === todayStr ? " today" : ""}">${esc(dl)}</span>`;
        lastDay = dstr;
      }
      if (!nowDone && ko(m) > now()) { html += '<span class="tlnowsep">● now</span>'; nowDone = true; }
      const played = ko(m) <= now();
      const isNext = (m.kickoff_utc + "|" + m.home + "|" + m.away) === nextKey;
      const ft = fmtTime(m);
      const mineHome = mt.players.some((s) => s.country === m.home);
      const mineAway = mt.players.some((s) => s.country === m.away);
      const names = mt.players.map((s) => label(s)).join(", ");
      html += `<div class="tlpill ${played ? "played" : ""}${isNext ? " next" : ""}" title="${esc(names)} — ${esc(m.home)} v ${esc(m.away)} · ${ft.t} ${ft.d}">
        <div class="ptime">${ft.t}${isNext ? ' <span class="pnext">next</span>' : ""}</div>
        <div class="pteams"><span class="ps ${mineHome ? "mine" : ""}">${flag(m.home)} ${code(m.home)}</span><span class="pv">v</span><span class="ps ${mineAway ? "mine" : ""}">${code(m.away)} ${flag(m.away)}</span></div>
        <div class="pnames">${esc(names)}</div>
      </div>`;
    }
    el.innerHTML = `<div class="tlstrip">${html}</div>`;
  }

  function pad(n) { return String(n).padStart(2, "0"); }
  function cd(ms) { const s = Math.max(0, Math.floor(ms / 1000)); return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }; }

  function renderHero() {
    const el = $("hero");
    if (!filled().length) { heroKey = "none"; el.className = "hero idle"; el.innerHTML = '<div class="label">Next to play</div><div class="team" style="font-size:20px;">Add your squad to begin 🚀</div><div class="meta">Type your players above — names autocomplete to their country.</div>'; return; }
    const x = nextX();
    if (!x) { heroKey = "done"; el.className = "hero idle"; el.innerHTML = '<div class="label">All done</div><div class="team" style="font-size:20px;">Everyone has kicked off 🎉</div><div class="meta">No players left to play in this round.</div>'; return; }
    const opp = opponentOf(x.m, x.s.country);
    // A later match the SAME DAY = a chance to move the armband if the captain blanks.
    const swap = withMatch().find((y) => ko(y.m) > ko(x.m) && sameDay(y.m, x.m));
    const swapHtml = swap
      ? `<div class="swaphint">🔁 If they blank, switch the armband to <strong>${flag(swap.s.country)} ${esc(label(swap.s))}</strong> (vs ${esc(opponentOf(swap.m, swap.s.country))}) at <strong>${fmtTime(swap.m).t}</strong> — same day.</div>`
      : "";
    heroKey = x.m.kickoff_utc + x.s.id;
    el.className = "hero";
    el.innerHTML = `<div class="crown">⏭️</div><div class="label">Plays next — captain or sub?</div>
      <div class="team">${flag(x.s.country)} ${esc(label(x.s))}</div>
      <div class="meta">${x.s.name ? esc(x.s.country) + " · " : ""}vs ${esc(opp)} · ${fmtTime(x.m).t} ${fmtTime(x.m).d}</div>
      <div class="cd" id="cdv"></div>${swapHtml}`;
    tick();
  }
  function tick() {
    $("now").textContent = new Date().toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" });
    if (!DATA) return;
    const x = nextX();
    const key = x ? x.m.kickoff_utc + x.s.id : (filled().length ? "done" : "none");
    if (key !== heroKey) { renderHero(); return; }
    const c = $("cdv");
    if (x && c) { const p = cd(ko(x.m) - now()); const big = p.d > 0 ? `<span class="seg">${p.d}d</span> ` : ""; c.innerHTML = `${big}<span class="seg">${pad(p.h)}</span><small>h</small> <span class="seg">${pad(p.m)}</span><small>m</small> <span class="seg">${pad(p.s)}</span><small>s</small> <small>to move the armband 🔁</small>`; }
  }

  function renderPitch() {
    const el = $("pitch");
    let xs = withMatch();
    if (hidePlayed) xs = xs.filter((x) => ko(x.m) > now());
    if (!xs.length) { el.innerHTML = '<p class="empty">Add your squad to see the formation.</p>'; return; }
    // play-order rank by kickoff
    const order = new Map(); withMatch().forEach((x, i) => order.set(x.s.id, i + 1));
    const nx = nextX();
    const rows = POSN.map(([pos, labelTxt]) => {
      const cards = xs.filter((x) => x.s.pos === pos).map((x) => {
        const played = ko(x.m) <= now();
        const isNext = nx && x.s.id === nx.s.id;
        const ft = fmtTime(x.m);
        const st = played ? '<span class="cstat ok">✓ Played</span>' : isNext ? '<span class="cstat next">⏭️ Next</span>' : '<span class="cstat">To play</span>';
        return `<div class="fcard ${played ? "played" : isNext ? "isnext" : ""}">
          <span class="ford">${order.get(x.s.id)}</span>
          <div class="fflag">${flag(x.s.country)}</div>
          <div class="fpn">${esc(label(x.s))}</div>
          <div class="fop">vs ${esc(opponentOf(x.m, x.s.country))}</div>
          <div class="ftime">${ft.t} · ${ft.d}</div>
          ${st}
        </div>`;
      }).join("");
      if (!cards) return "";
      return `<div class="prow"><div class="plabel">${labelTxt}</div><div class="pcards">${cards}</div></div>`;
    }).join("");
    el.innerHTML = `<div class="formation">${rows}</div>
      <p class="pitch-note">Number = kickoff order (1 plays first). 👑 = captain next; after they play, move the armband to the next number. ✓ = already played.</p>`;
  }

  function renderQueue() {
    const el = $("queue");
    let xs = withMatch();
    if (hidePlayed) xs = xs.filter((x) => ko(x.m) > now());
    if (!xs.length) { el.innerHTML = '<p class="empty">Add your squad to see the captain queue.</p>'; return; }
    const nx = nextX();

    // group by calendar day so multiple games in a day are obvious
    const groups = [];
    let cur = null;
    for (const x of xs) {
      const k = dayLabel(x.m);
      if (!cur || cur.key !== k) { cur = { key: k, items: [] }; groups.push(cur); }
      cur.items.push(x);
    }
    let n = 0;
    el.innerHTML = groups.map((g) => {
      const distinctTimes = new Set(g.items.map((x) => ko(x.m))).size;
      const upcomingTimes = new Set(g.items.filter((x) => ko(x.m) > now()).map((x) => ko(x.m))).size;
      // A swap window = 2+ of your matches at DIFFERENT times on the same day.
      const swap = distinctTimes >= 2;
      const head = `<div class="qday"><span>${esc(g.key)}</span>${swap ? `<span class="swapbadge">🔁 ${g.items.length} games · armband swap window${upcomingTimes >= 2 ? "" : " (done)"}</span>` : ""}</div>`;
      const items = g.items.map((x) => {
        n++;
        const played = ko(x.m) <= now();
        const isNext = nx && x.s.id === nx.s.id;
        const ft = fmtTime(x.m);
        return `<div class="qitem ${played ? "played" : ""}${isNext ? " next" : ""}">
          <span class="qnum">${n}</span>
          <span class="qname">${flag(x.s.country)} ${esc(label(x.s))}${x.s.name ? ` <small>${esc(x.s.country)}</small>` : ""}</span>
          <span class="qvs">vs ${esc(opponentOf(x.m, x.s.country))}</span>
          ${isNext ? '<span class="badge-next">Next to play</span>' : ""}
          ${played ? '<span class="badge-played">Played</span>' : ""}
          <span class="qtime"><span class="t">${ft.t}</span><br/><span class="d">${ft.d}</span></span>
        </div>`;
      }).join("");
      return `<div class="qdaygroup">${head}${items}</div>`;
    }).join("");
  }
})();
