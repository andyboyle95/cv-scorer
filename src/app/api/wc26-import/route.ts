import { NextRequest, NextResponse } from "next/server";
import { WC26_PLAYERS } from "@/lib/wc26-players";
import { WC26_FIXTURES } from "@/lib/wc26-fixtures";

// FIFA 3-letter codes → country (used ONLY to decode "v XXX" opponent labels).
const CODE_TO_COUNTRY: Record<string, string> = {
  mex: "Mexico", rsa: "South Africa", kor: "South Korea", cze: "Czech Republic",
  can: "Canada", bih: "Bosnia and Herzegovina", qat: "Qatar", sui: "Switzerland",
  bra: "Brazil", mar: "Morocco", hai: "Haiti", sco: "Scotland", usa: "United States",
  par: "Paraguay", aus: "Australia", tur: "Turkey", ger: "Germany", cuw: "Curaçao",
  civ: "Ivory Coast", ecu: "Ecuador", ned: "Netherlands", jpn: "Japan", swe: "Sweden",
  tun: "Tunisia", bel: "Belgium", egy: "Egypt", irn: "Iran", nzl: "New Zealand",
  esp: "Spain", cpv: "Cape Verde", ksa: "Saudi Arabia", uru: "Uruguay", fra: "France",
  sen: "Senegal", irq: "Iraq", nor: "Norway", arg: "Argentina", alg: "Algeria",
  aut: "Austria", jor: "Jordan", por: "Portugal", cod: "DR Congo", uzb: "Uzbekistan",
  col: "Colombia", eng: "England", cro: "Croatia", gha: "Ghana", pan: "Panama",
};

// Precompute matchday + each team's opponent per matchday from the fixtures.
const KO = (m: { kickoff_utc: string }) => new Date(m.kickoff_utc).getTime();
const TEAM_ROUND_OPP: Record<string, Record<number, string>> = (() => {
  const perTeam: Record<string, { kickoff_utc: string; home: string; away: string }[]> = {};
  for (const m of WC26_FIXTURES.matches) {
    (perTeam[m.home] ||= []).push(m);
    (perTeam[m.away] ||= []).push(m);
  }
  const pos = new Map<string, number>();
  for (const t of Object.keys(perTeam)) {
    perTeam[t].slice().sort((a, b) => KO(a) - KO(b)).forEach((m, i) => pos.set(t + "|" + m.kickoff_utc, i + 1));
  }
  const out: Record<string, Record<number, string>> = {};
  for (const m of WC26_FIXTURES.matches) {
    const md = Math.max(pos.get(m.home + "|" + m.kickoff_utc)!, pos.get(m.away + "|" + m.kickoff_utc)!);
    (out[m.home] ||= {})[md] = m.away;
    (out[m.away] ||= {})[md] = m.home;
  }
  return out;
})();

function defaultRound(): number {
  const now = Date.now();
  let best: { md: number; ko: number } | null = null;
  for (const m of WC26_FIXTURES.matches) {
    if (KO(m) <= now) continue;
    const md = Object.entries(TEAM_ROUND_OPP[m.home]).find(([, opp]) => opp === m.away)?.[0];
    const mdNum = md ? Number(md) : 1;
    if (!best || KO(m) < best.ko) best = { md: mdNum, ko: KO(m) };
  }
  return best ? best.md : 1;
}

// Decode "v XXX" opponent labels → the opponent countries.
function opponentCountries(text: string): string[] {
  const out: string[] = [];
  const re = /\bv\.?\s+([a-z]{3})\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const c = CODE_TO_COUNTRY[m[1].toLowerCase()];
    if (c) out.push(c);
  }
  return out;
}

export const maxDuration = 30;

// Canonical team names (must match fixtures.json) + textual aliases only.
// NOTE: FIFA 3-letter codes (KSA, IRQ, COD…) are deliberately NOT matched —
// in fantasy team screenshots those codes are the OPPONENT ("v KSA"), so
// matching them would select the wrong teams. We rely on full country names
// (paste) and player names (screenshots) instead.
const TEAMS: Record<string, string[]> = {
  Mexico: ["mexico"],
  "South Africa": ["south africa"],
  "South Korea": ["south korea", "korea republic", "republic of korea"],
  "Czech Republic": ["czech republic", "czechia"],
  Canada: ["canada"],
  "Bosnia and Herzegovina": ["bosnia and herzegovina", "bosnia"],
  Qatar: ["qatar"],
  Switzerland: ["switzerland"],
  Brazil: ["brazil"],
  Morocco: ["morocco"],
  Haiti: ["haiti"],
  Scotland: ["scotland"],
  "United States": ["united states", "usmnt"],
  Paraguay: ["paraguay"],
  Australia: ["australia"],
  Turkey: ["turkey", "türkiye", "turkiye"],
  Germany: ["germany"],
  Curaçao: ["curaçao", "curacao"],
  "Ivory Coast": ["ivory coast", "côte d'ivoire", "cote d'ivoire"],
  Ecuador: ["ecuador"],
  Netherlands: ["netherlands", "holland"],
  Japan: ["japan"],
  Sweden: ["sweden"],
  Tunisia: ["tunisia"],
  Belgium: ["belgium"],
  Egypt: ["egypt"],
  Iran: ["iran"],
  "New Zealand": ["new zealand"],
  Spain: ["spain"],
  "Cape Verde": ["cape verde", "cabo verde"],
  "Saudi Arabia": ["saudi arabia"],
  Uruguay: ["uruguay"],
  France: ["france"],
  Senegal: ["senegal"],
  Iraq: ["iraq"],
  Norway: ["norway"],
  Argentina: ["argentina"],
  Algeria: ["algeria"],
  Austria: ["austria"],
  Jordan: ["jordan"],
  Portugal: ["portugal"],
  "DR Congo": ["dr congo", "democratic republic of the congo", "congo dr"],
  Uzbekistan: ["uzbekistan"],
  Colombia: ["colombia"],
  England: ["england"],
  Croatia: ["croatia"],
  Ghana: ["ghana"],
  Panama: ["panama"],
};

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Match an alias as a whole token (so "us" can't match inside "house").
function found(text: string, alias: string): boolean {
  const re = new RegExp(`(^|[^\\p{L}])${escapeRe(alias)}([^\\p{L}]|$)`, "iu");
  return re.test(text);
}

function matchTeams(text: string): string[] {
  const lower = text.toLowerCase();
  const hits: string[] = [];
  for (const [canonical, aliases] of Object.entries(TEAMS)) {
    if (aliases.some((a) => found(lower, a.toLowerCase()))) hits.push(canonical);
  }
  return hits;
}

// --- Player-name matching (best-effort screenshot import) -------------------
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const PLAYER_INDEX = Object.entries(WC26_PLAYERS).flatMap(([country, names]) =>
  names.map((n) => {
    const key = norm(n);
    return { country, key, multi: key.includes(" ") };
  })
);

function matchPlayers(text: string): string[] {
  const t = norm(text);
  const words = t.split(/[^a-z0-9-]+/).filter(Boolean);
  const wordSet = new Set(words);
  const triggers = new Map<string, Set<string>>();
  const add = (trig: string, country: string) => {
    if (!triggers.has(trig)) triggers.set(trig, new Set());
    triggers.get(trig)!.add(country);
  };

  for (const e of PLAYER_INDEX) {
    if (e.multi) {
      // Multi-word key: require the lead word(s) present and the last word
      // present (allowing a truncated/prefix match for "Bruno Fernand…").
      const parts = e.key.split(" ");
      const last = parts[parts.length - 1];
      const leadOk = parts.slice(0, -1).every((w) => wordSet.has(w));
      const lastOk = words.some(
        (w) =>
          w === last ||
          (w.length >= 4 && last.length >= 4 && (last.startsWith(w) || w.startsWith(last)))
      );
      if (t.includes(e.key) || (leadOk && lastOk)) add(e.key, e.country); // distinctive trigger
    } else if (e.key.length < 5) {
      if (wordSet.has(e.key)) add(e.key, e.country); // short key → exact only
    } else {
      for (const w of words) {
        if (w.length >= 5 && (w === e.key || e.key.startsWith(w) || w.startsWith(e.key))) {
          add(w, e.country); // group by OCR token to catch prefix collisions
          break;
        }
      }
    }
  }

  // Accept a trigger only if it points to exactly one country (skip ambiguous).
  const out = new Set<string>();
  for (const [, countries] of triggers) {
    if (countries.size === 1) out.add([...countries][0]);
  }
  return [...out];
}

// Remove "v OPP" opponent labels (e.g. "v KSA") so the opponent's code/name
// isn't mistaken for one of the user's teams.
function scrubOpponents(text: string): string {
  // case-insensitive; \s covers spaces and newlines from OCR line breaks
  return text.replace(/\bv\.?\s+[a-z]{3}\b/gi, " ");
}

// Combined resolver. Strategy:
//  1. Country names + player names (opponent labels scrubbed) → name matches.
//  2. Decode "v XXX" opponent codes; pick the matchday whose opponent-derived
//     teams best overlap the name matches; resolve every opponent → the team
//     facing it that round (fills in unread/ambiguous players, e.g. Colombia
//     via "Rodriguez v UZB"). Also returns the detected round.
function resolveTeams(text: string): { teams: string[]; round?: number } {
  const cleaned = scrubOpponents(text);
  const nameMatched = new Set<string>([...matchTeams(cleaned), ...matchPlayers(cleaned)]);

  const opps = opponentCountries(text);
  if (opps.length === 0) return { teams: [...nameMatched] };

  let best = { round: defaultRound(), score: -1 };
  for (const r of [1, 2, 3]) {
    const resolved = opps.map((oc) => TEAM_ROUND_OPP[oc]?.[r]).filter(Boolean) as string[];
    const score = resolved.filter((t) => nameMatched.has(t)).length;
    if (score > best.score) best = { round: r, score };
  }
  const round = best.score > 0 ? best.round : defaultRound();
  const resolvedTeams = opps.map((oc) => TEAM_ROUND_OPP[oc]?.[round]).filter(Boolean) as string[];

  return { teams: Array.from(new Set([...nameMatched, ...resolvedTeams])), round };
}

// Best-effort OCR via OCR.space. Free demo key "helloworld" works out of the
// box (heavily rate-limited); set OCR_SPACE_API_KEY in env for a real key.
async function ocrImage(dataUrl: string): Promise<string> {
  const key = process.env.OCR_SPACE_API_KEY || "helloworld";
  const base64Image = dataUrl.startsWith("data:")
    ? dataUrl
    : `data:image/jpeg;base64,${dataUrl}`;

  const form = new URLSearchParams();
  form.set("base64Image", base64Image);
  form.set("language", "eng");
  form.set("OCREngine", "2");
  form.set("scale", "true");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  const res = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
    signal: controller.signal,
  });
  clearTimeout(timer);

  const data = await res.json();
  if (data.IsErroredOnProcessing) {
    const msg = Array.isArray(data.ErrorMessage)
      ? data.ErrorMessage.join(" ")
      : data.ErrorMessage || "OCR failed";
    throw new Error(msg);
  }
  return (data.ParsedResults || []).map((r: { ParsedText?: string }) => r.ParsedText || "").join(" ");
}

export async function POST(req: NextRequest) {
  let body: { url?: string; text?: string; image?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  let text = (body.text || "").slice(0, 20000);

  // Screenshot import (best-effort OCR)
  if (body.image) {
    try {
      const ocrText = await ocrImage(body.image);
      text += " " + ocrText;
      const resolved = resolveTeams(text);
      if (!resolved.teams.length) {
        return NextResponse.json({
          teams: [],
          error:
            "Couldn't read your team from that screenshot. Make sure the player names / opponent codes are legible, or use the Pick teams tab.",
        });
      }
      return NextResponse.json(resolved);
    } catch (e) {
      return NextResponse.json({
        teams: [],
        error:
          "Couldn't process that image" +
          (e instanceof Error && /size|large/i.test(e.message)
            ? " — it may be too large. Try a smaller screenshot, or paste your countries."
            : " — please paste your countries instead."),
      });
    }
  }

  if (body.url) {
    let url = body.url.trim();
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;

    // FIFA Fantasy team pages are client-rendered and the team API needs a
    // logged-in FIFA session token, so a public link can't be read.
    if (/fifa\.com/i.test(url) && /(fantasy|public-team|\/team\/)/i.test(url)) {
      return NextResponse.json({
        error:
          "Your FIFA Fantasy team is behind FIFA's login and loads privately in your browser, so it can't be read from a link. Paste the countries in your squad instead — e.g. England, Brazil, France.",
      });
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; WC26Planner/1.0)" },
        redirect: "follow",
      });
      clearTimeout(timer);
      if (!res.ok) {
        return NextResponse.json(
          { error: `Couldn't fetch that link (HTTP ${res.status}).` },
          { status: 200 }
        );
      }
      const html = await res.text();
      text += " " + html.replace(/<[^>]+>/g, " ");
    } catch {
      return NextResponse.json(
        {
          error:
            "Couldn't read that link — many fantasy pages load privately in the browser, so paste your countries instead.",
        },
        { status: 200 }
      );
    }
  }

  if (!text.trim()) {
    return NextResponse.json({ teams: [], note: "Nothing to read." });
  }

  return NextResponse.json(resolveTeams(text));
}
