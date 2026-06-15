/* World Cup 2026 — Captain Planner (vanilla JS, no framework). */
(function () {
  "use strict";

  const LS_KEY = "wc26.captain.teams";
  const $ = (id) => document.getElementById(id);

  let DATA = null;
  let selected = loadSelected();
  let round = "all";
  let hideKicked = false;
  const mdByMatch = new Map(); // match -> matchday (1..3)

  // ---- boot ----------------------------------------------------------------
  function boot(data) {
    DATA = data;
    computeMatchdays();
    round = defaultRound();
    $("round").value = round;
    $("tz").textContent =
      Intl.DateTimeFormat().resolvedOptions().timeZone || "your device";
    tickClock();
    setInterval(tickClock, 30000);

    renderPicker();
    renderAll();

    $("togglePicker").addEventListener("click", () => {
      const p = $("picker");
      p.style.display = p.style.display === "none" ? "" : "none";
    });
    $("clearTeams").addEventListener("click", () => {
      selected = new Set();
      saveSelected();
      renderPicker();
      renderAll();
    });
    $("round").addEventListener("change", (e) => {
      round = e.target.value;
      renderAll();
    });
    $("hideKicked").addEventListener("change", (e) => {
      hideKicked = e.target.checked;
      renderAll();
    });
    $("pasteLoad").addEventListener("click", loadImport);
    $("shotInput").addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) loadShot(f);
      e.target.value = "";
    });
  }

  const FIXTURES_URL = window.__FIXTURES_URL__ || "fixtures.json";
  const IMPORT_URL = window.__IMPORT_URL__ || "/api/wc26-import";

  fetch(FIXTURES_URL)
    .then((r) => r.json())
    .then(boot)
    .catch(() => {
      $("timeline").innerHTML =
        '<p class="empty">Could not load fixtures. Please refresh.</p>';
    });

  // ---- helpers -------------------------------------------------------------
  function loadSelected() {
    try {
      return new Set(JSON.parse(localStorage.getItem(LS_KEY) || "[]"));
    } catch {
      return new Set();
    }
  }
  function saveSelected() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify([...selected]));
    } catch {
      /* ignore */
    }
  }

  // Function declarations (hoisted) so they're safe to call from boot()
  // regardless of execution order — avoids any temporal-dead-zone error.
  function ko(m) { return new Date(m.kickoff_utc).getTime(); }
  function now() { return Date.now(); }

  // Matchday: each team's Nth chronological match = MD N; a fixture's MD = max
  // of its two teams' running counts.
  function computeMatchdays() {
    const perTeam = {};
    for (const m of DATA.matches) {
      (perTeam[m.home] = perTeam[m.home] || []).push(m);
      (perTeam[m.away] = perTeam[m.away] || []).push(m);
    }
    const pos = new Map(); // `${team}|${kickoff}` -> position
    for (const team of Object.keys(perTeam)) {
      perTeam[team]
        .slice()
        .sort((a, b) => ko(a) - ko(b))
        .forEach((m, i) => pos.set(team + "|" + m.kickoff_utc, i + 1));
    }
    for (const m of DATA.matches) {
      const ph = pos.get(m.home + "|" + m.kickoff_utc);
      const pa = pos.get(m.away + "|" + m.kickoff_utc);
      mdByMatch.set(m, Math.max(ph, pa));
    }
  }

  // Default to the round containing the next upcoming match (or last if over).
  function defaultRound() {
    const upcoming = DATA.matches
      .filter((m) => ko(m) > now())
      .sort((a, b) => ko(a) - ko(b))[0];
    if (upcoming) return String(mdByMatch.get(upcoming));
    return "all";
  }

  function tickClock() {
    $("now").textContent = new Date().toLocaleString(undefined, {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function selectedMatches() {
    return DATA.matches
      .filter((m) => selected.has(m.home) || selected.has(m.away))
      .filter((m) => round === "all" || mdByMatch.get(m) === Number(round))
      .sort((a, b) => ko(a) - ko(b));
  }

  // The soonest not-yet-started match among the user's teams (global).
  function nextMatch() {
    return DATA.matches
      .filter((m) => selected.has(m.home) || selected.has(m.away))
      .filter((m) => ko(m) > now())
      .sort((a, b) => ko(a) - ko(b))[0];
  }

  function fmtTime(m) {
    const d = new Date(m.kickoff_utc);
    return {
      t: d.toLocaleString(undefined, { hour: "2-digit", minute: "2-digit" }),
      d: d.toLocaleDateString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
    };
  }
  function dayKey(m) {
    return new Date(m.kickoff_utc).toLocaleDateString(undefined, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }
  function esc(s) {
    return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  }
  function opponentOf(m, team) {
    return m.home === team ? m.away : m.home;
  }

  // ---- render --------------------------------------------------------------
  function renderAll() {
    $("selCount").textContent = selected.size ? `(${selected.size} selected)` : "";
    renderCaptainOrder();
    renderTimeline();
  }

  function renderPicker() {
    const el = $("picker");
    el.innerHTML = Object.entries(DATA.groups)
      .map(([g, teams]) => {
        const chips = teams
          .map(
            (t) =>
              `<span class="chip${selected.has(t) ? " sel" : ""}" data-team="${esc(t)}">${esc(t)}</span>`
          )
          .join("");
        return `<div class="group"><div class="glabel">Group ${g}</div><div class="chips">${chips}</div></div>`;
      })
      .join("");
    el.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const t = chip.getAttribute("data-team");
        if (selected.has(t)) selected.delete(t);
        else selected.add(t);
        saveSelected();
        chip.classList.toggle("sel");
        renderAll();
      });
    });
  }

  function renderCaptainOrder() {
    const el = $("captainOrder");
    if (!selected.size) {
      el.innerHTML = '<p class="empty">Pick your teams above to see the captain order.</p>';
      return;
    }
    const next = nextMatch();
    // One row per selected team that plays in this round, soonest first.
    let rows = [];
    for (const m of selectedMatches()) {
      for (const team of [m.home, m.away]) {
        if (selected.has(team)) rows.push({ team, m });
      }
    }
    rows.sort((a, b) => ko(a.m) - ko(b.m));
    if (!rows.length) {
      el.innerHTML = '<p class="empty">None of your teams play in this round.</p>';
      return;
    }
    el.innerHTML = rows
      .map((r, i) => {
        const played = ko(r.m) <= now();
        const isNext = r.m === next;
        const ft = fmtTime(r.m);
        return `<div class="order-item${played ? " played" : ""}${isNext ? " next" : ""}">
          <span class="rank">${i + 1}</span>
          <span class="team">${esc(r.team)}</span>
          <span class="vs">vs ${esc(opponentOf(r.m, r.team))}</span>
          ${isNext ? '<span class="badge-next">Captain next</span>' : ""}
          ${played ? '<span class="badge-played">Kicked off</span>' : ""}
          <span class="time"><span class="t">${ft.t}</span><br/><span class="d">${ft.d}</span></span>
        </div>`;
      })
      .join("");
  }

  function renderTimeline() {
    const el = $("timeline");
    if (!selected.size) {
      el.innerHTML = '<p class="empty">No teams selected yet.</p>';
      return;
    }
    const next = nextMatch();
    let matches = selectedMatches();
    if (hideKicked) matches = matches.filter((m) => ko(m) > now());
    if (!matches.length) {
      el.innerHTML = '<p class="empty">No matches to show for this round.</p>';
      return;
    }
    // group by local day
    const days = [];
    let cur = null;
    for (const m of matches) {
      const k = dayKey(m);
      if (!cur || cur.key !== k) {
        cur = { key: k, items: [] };
        days.push(cur);
      }
      cur.items.push(m);
    }
    el.innerHTML = days
      .map((day) => {
        const items = day.items
          .map((m) => {
            const played = ko(m) <= now();
            const isNext = m === next;
            const ft = fmtTime(m);
            const yours = [m.home, m.away].filter((t) => selected.has(t)).join(", ");
            return `<div class="match${played ? " played" : ""}${isNext ? " next" : ""}">
              <div>
                <div class="teams">${esc(m.home)} <span class="muted">v</span> ${esc(m.away)}<span class="grp">${m.group} · MD${mdByMatch.get(m)}</span></div>
                <div class="meta">${esc(m.city)} · ${esc(m.venue)} · your team: ${esc(yours)}
                  ${isNext ? '<span class="badge-next">Captain next</span>' : ""}
                  ${played ? '<span class="badge-played">Kicked off</span>' : ""}
                </div>
              </div>
              <span class="time"><span class="t">${ft.t}</span><br/><span class="d">${ft.d}</span></span>
            </div>`;
          })
          .join("");
        return `<div class="daygroup"><p class="dayhead">${esc(day.key)}</p>${items}</div>`;
      })
      .join("");
  }

  function applyImport(data) {
    const msg = $("pasteMsg");
    const teams = data.teams || [];
    if (!teams.length) {
      msg.textContent =
        data.error || "No countries recognised — check spelling, or tap them above.";
      return;
    }
    teams.forEach((t) => selected.add(t));
    saveSelected();
    renderPicker();
    renderAll();
    msg.textContent = `Added ${teams.length}: ${teams.join(", ")}`;
  }

  async function postImport(payload, searchingMsg) {
    const msg = $("pasteMsg");
    msg.textContent = searchingMsg;
    try {
      const res = await fetch(IMPORT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      applyImport(await res.json());
    } catch {
      msg.textContent = "Import failed — please pick your teams above.";
    }
  }

  function loadImport() {
    const raw = ($("pasteBox").value || "").trim();
    if (!raw) return;
    const isUrl = /^(https?:\/\/|www\.)\S+$/i.test(raw);
    postImport(isUrl ? { url: raw } : { text: raw }, "Searching…");
  }

  // Downscale the screenshot client-side (smaller = faster + under OCR limits).
  function scaleImage(file, maxW) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("bad image"));
      };
      img.src = url;
    });
  }

  async function loadShot(file) {
    const msg = $("pasteMsg");
    try {
      const dataUrl = await scaleImage(file, 1100);
      await postImport({ image: dataUrl }, "Reading screenshot…");
    } catch {
      msg.textContent = "Couldn't read that image — try another screenshot.";
    }
  }
})();
