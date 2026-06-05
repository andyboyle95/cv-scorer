// Fetches a company homepage and returns a cleaned, truncated plain-text
// version suitable for feeding to Claude to craft the "X company is..." opener.
// Best-effort: returns "" on any failure so generation can still proceed.

export async function fetchWebsiteText(rawUrl: string): Promise<string> {
  if (!rawUrl?.trim()) return "";

  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AaronWallisJobSpecBot/1.0; +https://www.aaronwallis.co.uk)",
        Accept: "text/html",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!res.ok) return "";
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return "";

    const html = await res.text();
    return htmlToText(html).slice(0, 4000);
  } catch {
    return "";
  }
}

function htmlToText(html: string): string {
  // Drop script/style/noscript and HTML comments, then strip tags.
  const stripped = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<head[\s\S]*?<\/head>/gi, " ")
    .replace(/<[^>]+>/g, " ");

  return decodeEntities(stripped)
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(text: string): string {
  const named: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
    "&pound;": "£",
    "&rsquo;": "'",
    "&lsquo;": "'",
    "&ldquo;": '"',
    "&rdquo;": '"',
    "&ndash;": "–",
    "&mdash;": "—",
  };
  return text
    .replace(/&[a-z]+;|&#\d+;/gi, (m) => named[m.toLowerCase()] ?? m)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}
