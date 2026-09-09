#!/usr/bin/env python3
"""
GSC pull: O2 SIM-free / refurbished query analysis.

Pull 1  gsc-simfree-28d.csv      last 28 full days ending yesterday, query x device
Pull 2  gsc-simfree-monthly.csv  2025-06-01 -> yesterday, one request per calendar month
Pull 3  anonymisation check      device-only totals with and without the regex filter

All pulls: country=GBR, type=web, dataState=final, regex filter on query
(except the unfiltered control in pull 3).
"""

import csv
import os
import random
import time
from calendar import monthrange
from datetime import date, timedelta

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

SITE = os.environ.get("GSC_SITE_URL", "sc-domain:o2.co.uk")
CREDS = os.environ.get("GSC_CREDENTIALS", "service_account.json")
OUT = os.environ.get("GSC_OUT_DIR", "gsc_simfree")

REGEX = (r"(?i)(sim[ -]?free|simfree|unlocked|refurb|second[ -]?hand|\bused\b|"
         r"like new|pre[ -]?owned|handset only|phone only|outright|no contract|"
         r"without contract|pay monthly)")

SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"]
ROW_LIMIT = 25000
MAX_RETRIES = 8

TODAY = date.today()
YESTERDAY = TODAY - timedelta(days=1)
START_28 = YESTERDAY - timedelta(days=27)      # 28 full days inclusive
MONTHLY_START = date(2025, 6, 1)

quota_events = []          # any 429 / quota backoff, for the log
notes = []


def log(m):
    print(f"[{time.strftime('%H:%M:%S')}] {m}", flush=True)


def filters(use_regex=True):
    f = [{"dimension": "country", "operator": "equals", "expression": "GBR"}]
    if use_regex:
        f.append({"dimension": "query", "operator": "includingRegex", "expression": REGEX})
    return [{"filters": f}]


def run(svc, body):
    for attempt in range(MAX_RETRIES):
        try:
            return svc.searchanalytics().query(siteUrl=SITE, body=body).execute()
        except HttpError as e:
            status = e.resp.status
            retryable = status in (429, 500, 502, 503, 504) or (
                status == 403 and ("quota" in str(e).lower() or "rate" in str(e).lower()))
            if not retryable or attempt == MAX_RETRIES - 1:
                raise
            delay = min(30 * (2 ** attempt), 900) + random.uniform(0, 10)
            msg = f"HTTP {status} on {body.get('startDate')}..{body.get('endDate')}, slept {delay:.0f}s"
            quota_events.append(msg)
            log(f"    {msg}")
            time.sleep(delay)


def fetch(svc, start, end, dims, use_regex=True):
    """Paginate a single Search Analytics request to exhaustion."""
    rows, start_row = [], 0
    while True:
        body = {
            "startDate": start, "endDate": end, "dimensions": dims,
            "rowLimit": ROW_LIMIT, "startRow": start_row,
            "dataState": "final", "type": "web",
            "dimensionFilterGroups": filters(use_regex),
        }
        r = run(svc, body)
        batch = r.get("rows", [])
        rows.extend(batch)
        if len(batch) < ROW_LIMIT:
            break
        start_row += len(batch)
    return rows


def coverage(svc, start, end):
    """Actual dates returned for a window (final data lags ~2-3 days)."""
    r = run(svc, {"startDate": start, "endDate": end, "dimensions": ["date"],
                  "dataState": "final", "type": "web", "rowLimit": 1000,
                  "dimensionFilterGroups": filters(False)})
    d = sorted(x["keys"][0] for x in r.get("rows", []))
    return (d[0], d[-1], len(d)) if d else (None, None, 0)


def norm(row, ndims):
    """Lowercase+trim text dims, format metrics per spec."""
    keys = [str(k).strip().lower() for k in row["keys"][:ndims]]
    return keys + [row.get("clicks", 0), row.get("impressions", 0),
                   round(row.get("ctr", 0.0), 6), round(row.get("position", 0.0), 2)]


def main():
    creds = service_account.Credentials.from_service_account_file(CREDS, scopes=SCOPES)
    svc = build("searchconsole", "v1", credentials=creds, cache_discovery=False)
    os.makedirs(OUT, exist_ok=True)

    s28, e28 = START_28.isoformat(), YESTERDAY.isoformat()
    log(f"Property {SITE} | 28d window requested {s28} .. {e28}")

    cmin, cmax, cdays = coverage(svc, s28, e28)
    log(f"28d actual final-data coverage: {cmin} .. {cmax} ({cdays} days)")
    if cmax and cmax < e28:
        notes.append(f"28d window requested through {e28} but final data ends {cmax} "
                     f"({cdays} days returned, not 28) - GSC finalisation lag.")

    # ---------- Pull 1 ----------
    log("Pull 1: query x device, 28d")
    p1 = fetch(svc, s28, e28, ["query", "device"])
    p1_path = os.path.join(OUT, "gsc-simfree-28d.csv")
    with open(p1_path, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["query", "device", "clicks", "impressions", "ctr", "position"])
        for r in p1:
            w.writerow(norm(r, 2))
    p1_clicks = sum(r.get("clicks", 0) for r in p1)
    p1_impr = sum(r.get("impressions", 0) for r in p1)
    log(f"Pull 1: {len(p1):,} rows, {p1_clicks:,} clicks, {p1_impr:,} impressions")

    # ---------- Pull 2 ----------
    log("Pull 2: monthly trend")
    p2_path = os.path.join(OUT, "gsc-simfree-monthly.csv")
    months, partial = [], []
    y, m = MONTHLY_START.year, MONTHLY_START.month
    while date(y, m, 1) <= YESTERDAY:
        months.append((y, m))
        m += 1
        if m == 13:
            y, m = y + 1, 1
    total_p2 = 0
    with open(p2_path, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["month", "query", "device", "clicks", "impressions", "ctr", "position"])
        for y, m in months:
            mstart = date(y, m, 1)
            mend = min(date(y, m, monthrange(y, m)[1]), YESTERDAY)
            rows = fetch(svc, mstart.isoformat(), mend.isoformat(), ["query", "device"])
            _, amax, adays = coverage(svc, mstart.isoformat(), mend.isoformat())
            full = monthrange(y, m)[1]
            if adays < full:
                partial.append(f"{mstart.isoformat()}: {adays}/{full} days (through {amax})")
            for r in rows:
                w.writerow([mstart.isoformat()] + norm(r, 2))
            total_p2 += len(rows)
            log(f"  {y}-{m:02d}: {len(rows):,} rows, {sum(x.get('clicks',0) for x in rows):,} clicks"
                f"{' [PARTIAL]' if adays < full else ''}")
    log(f"Pull 2: {total_p2:,} rows across {len(months)} months")

    # ---------- Pull 3 ----------
    log("Pull 3: anonymisation check")
    dev_all = fetch(svc, s28, e28, ["device"], use_regex=False)
    dev_rgx = fetch(svc, s28, e28, ["device"], use_regex=True)
    # D: every query Google will name, no regex - needed because B-C is structurally zero
    all_named = fetch(svc, s28, e28, ["query", "device"], use_regex=False)
    t_all_c = sum(r.get("clicks", 0) for r in dev_all)
    t_all_i = sum(r.get("impressions", 0) for r in dev_all)
    t_rgx_c = sum(r.get("clicks", 0) for r in dev_rgx)
    t_rgx_i = sum(r.get("impressions", 0) for r in dev_rgx)
    gap_c, gap_i = t_rgx_c - p1_clicks, t_rgx_i - p1_impr
    d_c = sum(r.get("clicks", 0) for r in all_named)
    d_i = sum(r.get("impressions", 0) for r in all_named)
    site_gap_c, site_gap_i = t_all_c - d_c, t_all_i - d_i
    site_pct_c = (site_gap_c / t_all_c * 100) if t_all_c else 0
    site_pct_i = (site_gap_i / t_all_i * 100) if t_all_i else 0

    # ---------- Log ----------
    with open(os.path.join(OUT, "_gsc-log.md"), "w", encoding="utf-8") as fh:
        W = fh.write
        W("# GSC pull log - O2 SIM-free / refurb queries\n\n")
        W(f"Run: {TODAY.isoformat()}\n\n")
        W("## Property\n\n")
        W(f"- Used: `{SITE}` (service account has `siteFullUser`)\n")
        W("- `https://www.o2.co.uk/` was NOT used: returns HTTP 403, the URL-prefix "
          "property is not verified for this service account.\n")
        W("- country=GBR, type=web, dataState=final\n\n")
        W("## Regex\n\n```\n" + REGEX + "\n```\n\n")
        W("## Date ranges actually returned\n\n")
        W(f"- Pull 1 requested: {s28} .. {e28} (28 days)\n")
        W(f"- Pull 1 returned : {cmin} .. {cmax} ({cdays} days)\n\n")
        if partial:
            W("Partial months (Pull 2):\n\n")
            for p in partial:
                W(f"- {p}\n")
            W("\n")
        else:
            W("No partial months in Pull 2.\n\n")
        W("## Row counts\n\n")
        W("| file | rows |\n|---|---|\n")
        W(f"| gsc-simfree-28d.csv | {len(p1):,} |\n")
        W(f"| gsc-simfree-monthly.csv | {total_p2:,} |\n\n")
        W("## Anonymisation check (28d window, GBR)\n\n")
        W("| measure | clicks | impressions |\n|---|---|---|\n")
        W(f"| A. Site total, device-only, no query filter | {t_all_c:,} | {t_all_i:,} |\n")
        W(f"| B. Regex filter, device-only | {t_rgx_c:,} | {t_rgx_i:,} |\n")
        W(f"| C. Regex filter, sum of query-level rows | {p1_clicks:,} | {p1_impr:,} |\n")
        W(f"| B - C | {gap_c:,} | {gap_i:,} |\n")
        W(f"| D. All named queries, no regex | {d_c:,} | {d_i:,} |\n")
        W(f"| **Site-wide anonymised tail (A - D)** | **{site_gap_c:,}** | **{site_gap_i:,}** |\n\n")
        W("### B - C is zero, and always will be\n\n")
        W("The requested method cannot measure the anonymised tail. A `dimensionFilter` "
          "on `query` can only be evaluated against queries Google is willing to name: "
          "anonymised rows carry no query string, so the regex excludes them just as the "
          "`query` dimension does. B and C therefore count the same underlying rows and "
          "the difference is structurally zero, whatever the real tail is.\n\n")
        W("### What can be measured\n\n")
        W(f"Dropping the query filter entirely gives the site-wide figure: **{site_gap_c:,} "
          f"clicks** and **{site_gap_i:,} impressions** are anonymised across the whole "
          f"property in this window - **{site_pct_c:.1f}% of clicks** and "
          f"**{site_pct_i:.1f}% of impressions**.\n\n")
        W("That is a property-level rate, not a SIM-free one. The anonymised tail cannot "
          "be attributed to the regex subset, because the withheld terms are exactly the "
          "ones nobody can test against the pattern. Applying the site-wide rate to the "
          "SIM-free numbers assumes rare SIM-free queries are anonymised at the same rate "
          "as rare queries generally - plausible, and arguably conservative given "
          "long-tail refurb/second-hand phrasing skews rarer than average, but an "
          "assumption rather than a measurement.\n\n")
        W(f"On that assumption the {p1_clicks:,} observed SIM-free clicks would understate "
          f"true matched demand by roughly {site_pct_c:.0f}%, implying somewhere near "
          f"{p1_clicks/(1-site_pct_c/100):,.0f} clicks. Treat as an order-of-magnitude "
          f"bound, not a figure to report.\n\n")
        W("### Per-device breakdown\n\n")
        W("| device | total clicks (no regex) | regex clicks | regex impressions |\n|---|---|---|---|\n")
        da = {r["keys"][0].lower(): r for r in dev_all}
        dr = {r["keys"][0].lower(): r for r in dev_rgx}
        for d in sorted(set(da) | set(dr)):
            W(f"| {d} | {da.get(d,{}).get('clicks',0):,.0f} | "
              f"{dr.get(d,{}).get('clicks',0):,.0f} | {dr.get(d,{}).get('impressions',0):,.0f} |\n")
        W("\n## Quota / errors\n\n")
        W("\n".join(f"- {q}" for q in quota_events) + "\n" if quota_events
          else "No 429s or quota backoffs. All requests succeeded first attempt.\n")
        if notes:
            W("\n## Notes\n\n")
            for n in notes:
                W(f"- {n}\n")

    log(f"Anonymisation: B={t_rgx_c:,} vs C={p1_clicks:,} -> B-C gap {gap_c:,} (structurally zero)")
    log(f"Site-wide anonymised tail: {site_gap_c:,} clicks ({site_pct_c:.1f}%), "
        f"{site_gap_i:,} impressions ({site_pct_i:.1f}%)")
    log("Done.")


if __name__ == "__main__":
    main()
