import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 20;

// Canonical team names (must match fixtures.json) + accepted aliases.
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
  "United States": ["united states", "usa", "usmnt"],
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

export async function POST(req: NextRequest) {
  let body: { url?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  let text = (body.text || "").slice(0, 20000);

  if (body.url) {
    let url = body.url.trim();
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;

    // FIFA Fantasy team pages are client-rendered and the underlying team API
    // (play.fifa.com/api/.../fantasy/team/{id}) requires a logged-in FIFA
    // session token — so a public link can't be read server-side. Tell the
    // user clearly rather than returning a confusing "nothing found".
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
      // Strip tags so we scan visible-ish text, not attributes/scripts.
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

  const teams = matchTeams(text);
  return NextResponse.json({ teams });
}
