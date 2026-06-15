/* World Cup 2026 — Captain Planner. Vanilla JS, no framework. */
(function () {
  "use strict";

  const LS_KEY = "wc26.captain.teams";
  const $ = (id) => document.getElementById(id);
  const FIXTURES_URL = window.__FIXTURES_URL__ || "fixtures.json";
  const IMPORT_URL = window.__IMPORT_URL__ || "/api/wc26-import";

  let DATA = null;
  let selected = loadSelected();
  let round = "all";
  let hideKicked = false;
  let heroKey = "";
  const mdByMatch = new Map();

  // ---- helpers -------------------------------------------------------------
  function loadSelected() {
    try { return new Set(JSON.parse(localStorage.getItem(LS_KEY) || "[]")); }
    catch { return new Set(); }
  }
  function saveSelected() {
    try { localStorage.setItem(LS_KEY, JSON.stringify([...selected])); } catch { /* ignore */ }
  }
  function ko(m) { return new Date(m.kickoff_utc).getTime(); }
  function now() { return Date.now(); }
  function esc(s) { return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }
  function opponentOf(m, team) { return m.home === team ? m.away : m.home; }
  function dayKey(m) {
    return new Date(m.kickoff_utc).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  }
  function fmtTime(m) {
    const d = new Date(m.kickoff_utc);
    return {
      t: d.toLocaleString(undefined, { hour: "2-digit", minute: "2-digit" }),
      d: d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }),
    };
  }

  function computeMatchdays() {
    const perTeam = {};
    for (const m of DATA.matches) {
      (perTeam[m.home] = perTeam[m.home] || []).push(m);
      (perTeam[m.away] = perTeam[m.away] || []).push(m);
    }
    const pos = new Map();
    for (const team of Object.keys(perTeam)) {
      perTeam[team].slice().sort((a, b) => ko(a) - ko(b)).forEach((m, i) => pos.set(team + "|" + m.kickoff_utc, i + 1));
    }
    for (const m of DATA.matches) {
      mdByMatch.set(m, Math.max(pos.get(m.home + "|" + m.kickoff_utc), pos.get(m.away + "|" + m.kickoff_utc)));
    }
  }
  function defaultRound() {
    const up = DATA.matches.filter((m) => ko(m) > now()).sort((a, b) => ko(a) - ko(b))[0];
    return up ? String(mdByMatch.get(up)) : "all";
  }
  function selectedMatches() {
    return DATA.matches
      .filter((m) => selected.has(m.home) || selected.has(m.away))
      .filter((m) => round === "all" || mdByMatch.get(m) === Number(round))
      .sort((a, b) => ko(a) - ko(b));
  }
  function nextMatch() {
    return DATA.matches
      .filter((m) => selected.has(m.home) || selected.has(m.away))
      .filter((m) => ko(m) > now())
      .sort((a, b) => ko(a) - ko(b))[0];
  }

  // ---- boot ----------------------------------------------------------------
  function boot(data) {
    DATA = data;
    computeMatchdays();
    round = defaultRound();
    $("round").value = round;
    $("tz").textContent = Intl.DateTimeFormat().resolvedOptions().timeZone || "your device";

    renderPicker();
    renderAll();
    setupTabs();
    setupDropzone();

    $("round").addEventListener("change", (e) => { round = e.target.value; renderAll(); });
    $("hideKicked").addEventListener("change", (e) => { hideKicked = e.target.checked; renderAll(); });
    $("pasteLoad").addEventListener("click", loadImport);

    setInterval(tick, 1000);     // live countdown
    setInterval(renderAll, 30000); // refresh played/upcoming
  }

  fetch(FIXTURES_URL).then((r) => r.json()).then(boot).catch(() => {
    $("timeline").innerHTML = '<p class="empty">Could not load fixtures. Please refresh.</p>';
  });

  // ---- tabs ----------------------------------------------------------------
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

  // ---- screenshot dropzone -------------------------------------------------
  function setupDropzone() {
    const dz = $("dropzone");
    const input = $("shotInput");
    dz.addEventListener("click", () => input.click());
    input.addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) loadShot(f);
      e.target.value = "";
    });
    ["dragenter", "dragover"].forEach((ev) =>
      dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("drag"); })
    );
    ["dragleave", "drop"].forEach((ev) =>
      dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove("drag"); })
    );
    dz.addEventListener("drop", (e) => {
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f && f.type.startsWith("image/")) loadShot(f);
    });
    // Paste an image anywhere
    document.addEventListener("paste", (e) => {
      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (const it of items) {
        if (it.type.startsWith("image/")) { loadShot(it.getAsFile()); break; }
      }
    });
  }

  function scaleImage(file, maxW) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("bad image")); };
      img.src = url;
    });
  }
  async function loadShot(file) {
    const msg = $("shotMsg");
    msg.innerHTML = '<span class="spin"></span> Reading your screenshot…';
    try {
      const dataUrl = await scaleImage(file, 1500);
      await postImport({ image: dataUrl }, msg);
    } catch {
      msg.textContent = "Couldn't read that image — try another screenshot or use Pick teams.";
    }
  }

  // ---- import (text / link / image) ---------------------------------------
  function applyImport(data, msg) {
    const teams = data.teams || [];
    if (!teams.length) {
      msg.textContent = data.error || "No countries recognised — try Pick teams.";
      return;
    }
    teams.forEach((t) => selected.add(t));
    saveSelected();
    // Use the round detected from the screenshot's opponent codes so the
    // fixtures / captain order reflect the right matchday.
    if (data.round && ["1", "2", "3"].includes(String(data.round))) {
      round = String(data.round);
      $("round").value = round;
    }
    renderPicker();
    renderAll();
    msg.innerHTML = `✅ Added <strong>${teams.length}</strong>: ${esc(teams.join(", "))}`;
  }
  async function postImport(payload, msg) {
    try {
      const res = await fetch(IMPORT_URL, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      applyImport(await res.json(), msg);
    } catch {
      msg.textContent = "Import failed — please use Pick teams.";
    }
  }
  function loadImport() {
    const raw = ($("pasteBox").value || "").trim();
    if (!raw) return;
    const isUrl = /^(https?:\/\/|www\.)\S+$/i.test(raw);
    $("pasteMsg").textContent = "Searching…";
    postImport(isUrl ? { url: raw } : { text: raw }, $("pasteMsg"));
  }

  // ---- render --------------------------------------------------------------
  function renderAll() {
    renderSquadbar();
    renderHero();
    renderPitch();
    renderCaptainOrder();
    renderTimeline();
  }

  // One representative match per country for the formation view.
  function repMatch(team) {
    const ms = DATA.matches.filter((m) => m.home === team || m.away === team);
    if (round !== "all") {
      const m = ms.find((x) => mdByMatch.get(x) === Number(round));
      if (m) return m;
    }
    const up = ms.filter((m) => ko(m) > now()).sort((a, b) => ko(a) - ko(b))[0];
    return up || ms.sort((a, b) => ko(b) - ko(a))[0];
  }

  function chunk(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  function renderPitch() {
    const el = $("pitch");
    if (!selected.size) { el.innerHTML = '<p class="empty">Add your teams to see the formation.</p>'; return; }
    const next = nextMatch();
    const cards = [...selected]
      .map((t) => ({ t, m: repMatch(t) }))
      .filter((x) => x.m)
      .sort((a, b) => ko(a.m) - ko(b.m)); // soonest at the front (top)
    if (!cards.length) { el.innerHTML = '<p class="empty">No matches for this round.</p>'; return; }

    // Lay out up to 4 per row, soonest-to-play rows first.
    const rows = chunk(cards, 4);
    const rowsHtml = rows.map((row) => {
      const c = row.map(({ t, m }) => {
        const played = ko(m) <= now();
        const isNext = m === next && (selected.has(m.home) || selected.has(m.away)) && (m.home === t || m.away === t);
        const ft = fmtTime(m);
        const status = played ? '<div class="st">✓ Played</div>' : `<div class="st">⏳ ${ft.t}</div>`;
        return `<div class="pcard ${played ? "played" : "upcoming"}${isNext ? " next" : ""}">
          ${isNext ? '<span class="arm">👑</span>' : ""}
          <div class="nm">${esc(t)}</div>
          <div class="op">vs ${esc(opponentOf(m, t))}</div>
          <div class="dt">${ft.d}</div>
          ${status}
        </div>`;
      }).join("");
      return `<div class="pitch-row">${c}</div>`;
    }).join("");

    el.innerHTML = `<div class="pitch"><div class="pitch-rows">${rowsHtml}</div></div>
      <p class="pitch-note">✓ marks teams that have already kicked off · 👑 = captain next. Live fantasy points aren't available from FIFA, so they're not shown.</p>`;
  }

  function renderPicker() {
    const el = $("picker");
    el.innerHTML = Object.entries(DATA.groups).map(([g, teams]) => {
      const chips = teams.map((t) =>
        `<span class="chip${selected.has(t) ? " sel" : ""}" data-team="${esc(t)}">${esc(t)}</span>`
      ).join("");
      return `<div class="group"><div class="glabel">Group ${g}</div><div class="chips">${chips}</div></div>`;
    }).join("");
    el.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const t = chip.getAttribute("data-team");
        if (selected.has(t)) selected.delete(t); else selected.add(t);
        saveSelected();
        chip.classList.toggle("sel");
        renderAll();
      });
    });
  }

  function renderSquadbar() {
    const el = $("squadbar");
    if (!selected.size) { el.innerHTML = '<span class="hint">No teams yet — add yours above 👆</span>'; return; }
    const chips = [...selected].sort().map((t) =>
      `<span class="squadchip">${esc(t)}<button data-team="${esc(t)}" aria-label="Remove">×</button></span>`
    ).join("");
    el.innerHTML = chips + `<button class="clearall" id="clearAll">Clear all</button>`;
    el.querySelectorAll(".squadchip button").forEach((b) =>
      b.addEventListener("click", () => {
        selected.delete(b.getAttribute("data-team"));
        saveSelected(); renderPicker(); renderAll();
      })
    );
    $("clearAll").addEventListener("click", () => { selected = new Set(); saveSelected(); renderPicker(); renderAll(); });
  }

  function pad(n) { return String(n).padStart(2, "0"); }
  function countdownParts(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
  }

  function renderHero() {
    const el = $("hero");
    if (!selected.size) {
      heroKey = "none";
      el.className = "hero idle";
      el.innerHTML = '<div class="label">Your captain pick</div><div class="team" style="font-size:20px;">Add your team to begin 🚀</div><div class="meta">Upload a screenshot, pick teams, or paste your countries above.</div>';
      return;
    }
    const n = nextMatch();
    if (!n) {
      heroKey = "done";
      el.className = "hero idle";
      el.innerHTML = '<div class="label">All done for now</div><div class="team" style="font-size:20px;">No upcoming matches 🎉</div><div class="meta">All your teams have kicked off in this round.</div>';
      return;
    }
    const team = selected.has(n.home) ? n.home : n.away;
    const opp = opponentOf(n, team);
    heroKey = n.kickoff_utc + team;
    el.className = "hero";
    el.innerHTML = `
      <div class="crown">👑</div>
      <div class="label">Captain next</div>
      <div class="team">${esc(team)}</div>
      <div class="meta">vs ${esc(opp)} · Group ${n.group} · Matchday ${mdByMatch.get(n)} · ${fmtTime(n).t} ${fmtTime(n).d}</div>
      <div class="cd" id="cd"></div>`;
    tick();
  }

  // 1-second tick: clock + live countdown (and re-render hero when it flips)
  function tick() {
    const d = new Date();
    $("now").textContent = d.toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" });
    if (!DATA) return;
    const n = nextMatch();
    const key = n ? n.kickoff_utc + (selected.has(n.home) ? n.home : n.away) : (selected.size ? "done" : "none");
    if (key !== heroKey) { renderHero(); return; }
    const cd = $("cd");
    if (n && cd) {
      const p = countdownParts(ko(n) - now());
      const big = p.d > 0 ? `<span class="seg">${p.d}d</span> ` : "";
      cd.innerHTML = `${big}<span class="seg">${pad(p.h)}</span><small>h</small> <span class="seg">${pad(p.m)}</span><small>m</small> <span class="seg">${pad(p.s)}</span><small>s</small> <small>until kickoff — lock your armband 🔒</small>`;
    }
  }

  function renderCaptainOrder() {
    const el = $("captainOrder");
    if (!selected.size) { el.innerHTML = '<p class="empty">Add your teams to see the order.</p>'; return; }
    const next = nextMatch();
    const rows = [];
    for (const m of selectedMatches()) {
      for (const team of [m.home, m.away]) if (selected.has(team)) rows.push({ team, m });
    }
    rows.sort((a, b) => ko(a.m) - ko(b.m));
    if (!rows.length) { el.innerHTML = '<p class="empty">None of your teams play in this round.</p>'; return; }
    el.innerHTML = rows.map((r, i) => {
      const played = ko(r.m) <= now();
      const isNext = r.m === next;
      const ft = fmtTime(r.m);
      return `<div class="order-item${played ? " played" : ""}${isNext ? " next" : ""}">
        <span class="rank">${i + 1}</span>
        <span class="team-nm">${esc(r.team)}</span>
        <span class="vs">vs ${esc(opponentOf(r.m, r.team))}</span>
        ${isNext ? '<span class="badge-next">Captain next</span>' : ""}
        ${played ? '<span class="badge-played">Kicked off</span>' : ""}
        <span class="time"><span class="t">${ft.t}</span><br/><span class="d">${ft.d}</span></span>
      </div>`;
    }).join("");
  }

  function renderTimeline() {
    const el = $("timeline");
    if (!selected.size) { el.innerHTML = '<p class="empty">No teams selected yet.</p>'; return; }
    const next = nextMatch();
    let matches = selectedMatches();
    if (hideKicked) matches = matches.filter((m) => ko(m) > now());
    if (!matches.length) { el.innerHTML = '<p class="empty">No matches to show for this round.</p>'; return; }
    const days = [];
    let cur = null;
    for (const m of matches) {
      const k = dayKey(m);
      if (!cur || cur.key !== k) { cur = { key: k, items: [] }; days.push(cur); }
      cur.items.push(m);
    }
    el.innerHTML = days.map((day) => {
      const items = day.items.map((m) => {
        const played = ko(m) <= now();
        const isNext = m === next;
        const ft = fmtTime(m);
        const yours = [m.home, m.away].filter((t) => selected.has(t)).join(", ");
        return `<div class="match${played ? " played" : ""}${isNext ? " next" : ""}">
          <div>
            <div class="teams">${esc(m.home)} <span class="vs">v</span> ${esc(m.away)}<span class="grp">${m.group} · MD${mdByMatch.get(m)}</span></div>
            <div class="meta2">${esc(m.city)} · your team: ${esc(yours)}
              ${isNext ? '<span class="badge-next">Captain next</span>' : ""}
              ${played ? '<span class="badge-played">Kicked off</span>' : ""}
            </div>
          </div>
          <span class="time"><span class="t">${ft.t}</span><br/><span class="d">${ft.d}</span></span>
        </div>`;
      }).join("");
      return `<div class="daygroup"><p class="dayhead">${esc(day.key)}</p>${items}</div>`;
    }).join("");
  }
})();
