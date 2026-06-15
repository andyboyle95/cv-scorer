/* World Cup 2026 — Captain Planner. Player-squad model, vanilla JS. */
(function () {
  "use strict";

  const LS = "wc26.squad.v2";
  const LS_OLD = "wc26.captain.teams";
  const $ = (id) => document.getElementById(id);
  const FIXTURES_URL = window.__FIXTURES_URL__ || "fixtures.json";
  const IMPORT_URL = window.__IMPORT_URL__ || "/api/wc26-import";

  let DATA = null;
  let squad = loadSquad();          // [{ id, name|null, country }]
  let round = "all";                 // 'all' = each team's next match
  let hidePlayed = false;
  let heroKey = "";
  const mdByMatch = new Map();

  // ---- storage -------------------------------------------------------------
  function loadSquad() {
    try {
      const v = JSON.parse(localStorage.getItem(LS) || "null");
      if (Array.isArray(v)) return v;
      // migrate old country-set
      const old = JSON.parse(localStorage.getItem(LS_OLD) || "[]");
      return old.map((c) => ({ id: uid(), name: null, country: c }));
    } catch { return []; }
  }
  function saveSquad() { try { localStorage.setItem(LS, JSON.stringify(squad)); } catch { /* */ } }
  function uid() { return Math.random().toString(36).slice(2, 9); }

  // ---- helpers -------------------------------------------------------------
  const ko = (m) => new Date(m.kickoff_utc).getTime();
  const now = () => Date.now();
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const opponentOf = (m, team) => (m.home === team ? m.away : m.home);
  const title = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());
  function fmtTime(m) {
    const d = new Date(m.kickoff_utc);
    return {
      t: d.toLocaleString(undefined, { hour: "2-digit", minute: "2-digit" }),
      d: d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }),
    };
  }
  const ordinal = (n) => n + (["th", "st", "nd", "rd"][(n % 100 > 10 && n % 100 < 14) || n % 10 > 3 ? 0 : n % 10] || "th");

  function computeMatchdays() {
    const perTeam = {};
    for (const m of DATA.matches) {
      (perTeam[m.home] = perTeam[m.home] || []).push(m);
      (perTeam[m.away] = perTeam[m.away] || []).push(m);
    }
    const pos = new Map();
    for (const t of Object.keys(perTeam)) {
      perTeam[t].slice().sort((a, b) => ko(a) - ko(b)).forEach((m, i) => pos.set(t + "|" + m.kickoff_utc, i + 1));
    }
    for (const m of DATA.matches) {
      mdByMatch.set(m, Math.max(pos.get(m.home + "|" + m.kickoff_utc), pos.get(m.away + "|" + m.kickoff_utc)));
    }
  }
  function defaultRound() {
    const up = DATA.matches.filter((m) => ko(m) > now()).sort((a, b) => ko(a) - ko(b))[0];
    return up ? String(mdByMatch.get(up)) : "all";
  }
  // The match to show for a country given the current round.
  function matchForCountry(country) {
    const ms = DATA.matches.filter((m) => m.home === country || m.away === country);
    if (round !== "all") return ms.find((m) => mdByMatch.get(m) === Number(round)) || null;
    const up = ms.filter((m) => ko(m) > now()).sort((a, b) => ko(a) - ko(b))[0];
    return up || ms.sort((a, b) => ko(b) - ko(a))[0] || null;
  }
  // entries (with resolved match), sorted by kickoff
  function entriesWithMatch() {
    return squad
      .map((e) => ({ e, m: matchForCountry(e.country) }))
      .filter((x) => x.m)
      .sort((a, b) => ko(a.m) - ko(b.m));
  }
  function nextEntry() {
    return entriesWithMatch().filter((x) => ko(x.m) > now())[0] || null;
  }
  const label = (e) => e.name || e.country;

  // ---- squad ops -----------------------------------------------------------
  function addEntry(name, country) {
    if (!country) return;
    const n = name && name.trim() ? name.trim() : null;
    const dup = squad.some((e) => e.country === country && (e.name || "").toLowerCase() === (n || "").toLowerCase());
    if (dup) return;
    squad.push({ id: uid(), name: n, country });
  }
  function removeEntry(id) { squad = squad.filter((e) => e.id !== id); }
  function hasNamelessCountry(country) { return squad.some((e) => e.country === country && !e.name); }

  // ---- boot ----------------------------------------------------------------
  function boot(data) {
    DATA = data;
    computeMatchdays();
    round = defaultRound();
    $("round").value = round;
    $("tz").textContent = Intl.DateTimeFormat().resolvedOptions().timeZone || "your device";

    populateCountrySelect();
    renderPicker();
    renderAll();
    setupTabs();
    setupDropzone();

    $("round").addEventListener("change", (e) => { round = e.target.value; renderAll(); });
    $("hideKicked").addEventListener("change", (e) => { hidePlayed = e.target.checked; renderAll(); });
    $("pasteLoad").addEventListener("click", loadImport);
    $("addPlayer").addEventListener("click", () => {
      addEntry($("playerName").value, $("playerCountry").value);
      $("playerName").value = "";
      saveSquad(); renderPicker(); renderAll();
    });

    setInterval(tick, 1000);
    setInterval(renderAll, 30000);
  }
  fetch(FIXTURES_URL).then((r) => r.json()).then(boot).catch(() => {
    $("pitch").innerHTML = '<p class="empty">Could not load fixtures. Please refresh.</p>';
  });

  // ---- tabs / inputs -------------------------------------------------------
  function setupTabs() {
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
        document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
        tab.classList.add("active");
        $("panel-" + tab.dataset.tab).classList.add("active");
      });
    });
  }
  function populateCountrySelect() {
    const all = Object.values(DATA.groups).flat().sort();
    $("playerCountry").innerHTML = all.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
  }
  function setupDropzone() {
    const dz = $("dropzone"), input = $("shotInput");
    dz.addEventListener("click", () => input.click());
    input.addEventListener("change", (e) => { const f = e.target.files && e.target.files[0]; if (f) loadShot(f); e.target.value = ""; });
    ["dragenter", "dragover"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("drag"); }));
    ["dragleave", "drop"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove("drag"); }));
    dz.addEventListener("drop", (e) => { const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f && f.type.startsWith("image/")) loadShot(f); });
    document.addEventListener("paste", (e) => {
      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (const it of items) if (it.type.startsWith("image/")) { loadShot(it.getAsFile()); break; }
    });
  }

  function scaleImage(file, maxW) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1.5, maxW / img.width);
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        const ctx = c.getContext("2d");
        ctx.filter = "grayscale(1) contrast(1.6) brightness(1.05)";
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("bad image")); };
      img.src = url;
    });
  }
  async function loadShot(file) {
    const msg = $("shotMsg");
    msg.innerHTML = '<span class="spin"></span> Reading your screenshot…';
    try { await postImport({ image: await scaleImage(file, 1500) }, msg); }
    catch { msg.textContent = "Couldn't read that image — try Add players."; }
  }
  function loadImport() {
    const raw = ($("pasteBox").value || "").trim();
    if (!raw) return;
    const isUrl = /^(https?:\/\/|www\.)\S+$/i.test(raw);
    $("pasteMsg").textContent = "Searching…";
    postImport(isUrl ? { url: raw } : { text: raw }, $("pasteMsg"));
  }
  async function postImport(payload, msg) {
    try {
      const res = await fetch(IMPORT_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      applyImport(await res.json(), msg);
    } catch { msg.textContent = "Import failed — please use Add players."; }
  }
  function applyImport(data, msg) {
    const players = data.players || [];
    const teams = data.teams || [];
    if (!players.length && !teams.length) {
      const r = data.read ? `<br/><span style="color:#7c789f;">Read from image: “${esc(data.read)}”</span>` : "";
      msg.innerHTML = (data.error || "Nothing recognised — try Add players.") + r;
      return;
    }
    for (const p of players) addEntry(p.name ? title(p.name) : null, p.country);
    for (const c of teams) if (!squad.some((e) => e.country === c)) addEntry(null, c);
    saveSquad();
    if (data.round && ["1", "2", "3"].includes(String(data.round))) { round = String(data.round); $("round").value = round; }
    renderPicker(); renderAll();
    const added = players.length || teams.length;
    const r = data.read ? `<br/><span style="color:#7c789f;">Read: “${esc(data.read)}”</span>` : "";
    msg.innerHTML = `✅ Added ${added}. <a class="link jumpadd" style="cursor:pointer">➕ Add any we missed</a>${r}`;
    const j = msg.querySelector(".jumpadd");
    if (j) j.addEventListener("click", () => { const b = document.querySelector('.tab[data-tab="build"]'); if (b) b.click(); });
  }

  // ---- render --------------------------------------------------------------
  function renderAll() { renderSquadbar(); renderHero(); renderPitch(); renderQueue(); }

  function renderPicker() {
    const el = $("picker");
    const inSquad = (t) => squad.some((e) => e.country === t);
    el.innerHTML = Object.entries(DATA.groups).map(([g, teams]) => {
      const chips = teams.map((t) => `<span class="chip${inSquad(t) ? " sel" : ""}" data-team="${esc(t)}">${esc(t)}</span>`).join("");
      return `<div class="group"><div class="glabel">Group ${g}</div><div class="chips">${chips}</div></div>`;
    }).join("");
    el.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const t = chip.getAttribute("data-team");
        if (inSquad(t)) squad = squad.filter((e) => e.country !== t); // toggle whole country off
        else addEntry(null, t);
        saveSquad(); renderPicker(); renderAll();
      });
    });
  }

  function renderSquadbar() {
    const el = $("squadbar");
    if (!squad.length) { el.innerHTML = '<span class="hint">No players yet — add your team above 👆</span>'; return; }
    el.innerHTML = squad.map((e) =>
      `<span class="squadchip">${esc(label(e))}${e.name ? ` <small style="color:var(--muted)">${esc(e.country)}</small>` : ""}<button data-id="${e.id}" aria-label="Remove">×</button></span>`
    ).join("") + `<button class="clearall" id="clearAll">Clear all</button>`;
    el.querySelectorAll(".squadchip button").forEach((b) =>
      b.addEventListener("click", () => { removeEntry(b.getAttribute("data-id")); saveSquad(); renderPicker(); renderAll(); }));
    $("clearAll").addEventListener("click", () => { squad = []; saveSquad(); renderPicker(); renderAll(); });
  }

  function pad(n) { return String(n).padStart(2, "0"); }
  function cdParts(ms) { const s = Math.max(0, Math.floor(ms / 1000)); return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }; }

  function renderHero() {
    const el = $("hero");
    if (!squad.length) {
      heroKey = "none"; el.className = "hero idle";
      el.innerHTML = '<div class="label">Your captain</div><div class="team" style="font-size:20px;">Add your team to begin 🚀</div><div class="meta">Upload a screenshot, add players, or paste your countries above.</div>';
      return;
    }
    const x = nextEntry();
    if (!x) {
      heroKey = "done"; el.className = "hero idle";
      el.innerHTML = '<div class="label">All done</div><div class="team" style="font-size:20px;">Everyone has kicked off 🎉</div><div class="meta">No players left to play in this round.</div>';
      return;
    }
    const opp = opponentOf(x.m, x.e.country);
    const sameTime = entriesWithMatch().filter((y) => ko(y.m) === ko(x.m) && ko(y.m) > now());
    const others = sameTime.length - 1;
    heroKey = x.m.kickoff_utc + x.e.id;
    el.className = "hero";
    el.innerHTML = `
      <div class="crown">👑</div>
      <div class="label">Captain next</div>
      <div class="team">${esc(label(x.e))}</div>
      <div class="meta">${x.e.name ? esc(x.e.country) + " · " : ""}vs ${esc(opp)} · ${fmtTime(x.m).t} ${fmtTime(x.m).d}${others > 0 ? ` · +${others} more at this time` : ""}</div>
      <div class="cd" id="cd"></div>`;
    tick();
  }
  function tick() {
    const d = new Date();
    $("now").textContent = d.toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" });
    if (!DATA) return;
    const x = nextEntry();
    const key = x ? x.m.kickoff_utc + x.e.id : (squad.length ? "done" : "none");
    if (key !== heroKey) { renderHero(); return; }
    const cd = $("cd");
    if (x && cd) {
      const p = cdParts(ko(x.m) - now());
      const big = p.d > 0 ? `<span class="seg">${p.d}d</span> ` : "";
      cd.innerHTML = `${big}<span class="seg">${pad(p.h)}</span><small>h</small> <span class="seg">${pad(p.m)}</span><small>m</small> <span class="seg">${pad(p.s)}</span><small>s</small> <small>until kickoff — lock your armband 🔒</small>`;
    }
  }

  function renderPitch() {
    const el = $("pitch");
    let items = entriesWithMatch();
    if (hidePlayed) items = items.filter((x) => ko(x.m) > now());
    if (!items.length) { el.innerHTML = '<p class="empty">Add your team to see the formation.</p>'; return; }

    // group by kickoff time
    const groups = [];
    let cur = null;
    for (const x of items) {
      if (!cur || cur.ko !== ko(x.m)) { cur = { ko: ko(x.m), m: x.m, items: [] }; groups.push(cur); }
      cur.items.push(x);
    }
    const nx = nextEntry();
    const nextKo = nx ? ko(nx.m) : null;

    const rows = groups.map((g, i) => {
      const played = g.ko <= now();
      const isNext = !played && g.ko === nextKo;
      const ft = fmtTime(g.m);
      const status = played ? "✓ Played" : isNext ? "👑 Captain now" : "To play";
      const cards = g.items.map(({ e, m }) => `
        <div class="fcard">
          ${isNext ? '<span class="arm">👑</span>' : ""}
          <div class="pn">${esc(label(e))}</div>
          ${e.name ? `<div class="cty">${esc(e.country)}</div>` : ""}
          <div class="vop">vs ${esc(opponentOf(m, e.country))}</div>
        </div>`).join("");
      return `<div class="frow ${played ? "played" : isNext ? "next" : "upcoming"}">
        <div class="frail">
          <div class="ord">${ordinal(i + 1)} to play</div>
          <div class="ftime">${ft.t}</div>
          <div class="fdate">${ft.d}</div>
          <div class="fstatus">${status}</div>
        </div>
        <div class="fcards">${cards}</div>
      </div>`;
    }).join("");

    el.innerHTML = `<div class="formation">${rows}</div>
      <p class="pitch-note">Top = plays first. 👑 = captain next; once they kick off, move the armband to the next row down. ✓ = already played.</p>`;
  }

  function renderQueue() {
    const el = $("queue");
    let items = entriesWithMatch();
    if (hidePlayed) items = items.filter((x) => ko(x.m) > now());
    if (!items.length) { el.innerHTML = '<p class="empty">Add your team to see the captain queue.</p>'; return; }
    const nx = nextEntry();
    el.innerHTML = items.map((x, i) => {
      const played = ko(x.m) <= now();
      const isNext = nx && x.e.id === nx.e.id && x.m === nx.m;
      const ft = fmtTime(x.m);
      return `<div class="qitem ${played ? "played" : ""}${isNext ? " next" : ""}">
        <span class="qnum">${i + 1}</span>
        <span class="qname">${esc(label(x.e))}${x.e.name ? ` <small>${esc(x.e.country)}</small>` : ""}</span>
        <span class="qvs">vs ${esc(opponentOf(x.m, x.e.country))}</span>
        ${isNext ? '<span class="badge-next">Captain next</span>' : ""}
        ${played ? '<span class="badge-played">Played</span>' : ""}
        <span class="qtime"><span class="t">${ft.t}</span><br/><span class="d">${ft.d}</span></span>
      </div>`;
    }).join("");
  }
})();
