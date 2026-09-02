#!/usr/bin/env python3
"""
Google Search Console bulk export.

Pulls the last 16 complete months of Search Analytics data and writes three
CSVs per month into gsc_export/<YYYY-MM>/:

    queries.csv     dimensions: [query]
    pages.csv       dimensions: [page]
    query_page.csv  dimensions: [query, page]

The pull is resume-safe. Each report is written to a .tmp file and renamed
into place only once it is complete, so a finished CSV always means a finished
report. Re-running skips any report that is already on disk; delete a CSV to
force it to be re-pulled.

Usage:
    export GSC_CREDENTIALS=/path/to/service_account.json
    python3 gsc_api_pull.py

Environment:
    GSC_CREDENTIALS   path to the service account JSON (default: ./service_account.json)
    GSC_SITE_URL      property to pull (default: sc-domain:o2.co.uk)
    GSC_OUT_DIR       output directory (default: ./gsc_export)
    GSC_MONTHS        how many months back to pull (default: 16)
"""

import csv
import os
import random
import sys
import time
from calendar import monthrange
from datetime import date

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

SITE_URL = os.environ.get("GSC_SITE_URL", "sc-domain:o2.co.uk")
CREDENTIALS = os.environ.get("GSC_CREDENTIALS", "service_account.json")
OUT_DIR = os.environ.get("GSC_OUT_DIR", "gsc_export")
MONTHS_BACK = int(os.environ.get("GSC_MONTHS", "16"))

SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"]
ROW_LIMIT = 25000          # API maximum rows per request
MAX_ROWS = 5_000_000       # safety ceiling per report
MAX_RETRIES = 8

REPORTS = [
    ("queries.csv", ["query"]),
    ("pages.csv", ["page"]),
    ("query_page.csv", ["query", "page"]),
]


def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def month_range(months_back):
    """Return [(year, month), ...] oldest first, ending with last complete month."""
    today = date.today()
    y, m = today.year, today.month
    # step back one month to land on the last *complete* month
    m -= 1
    if m == 0:
        y, m = y - 1, 12
    out = []
    for _ in range(months_back):
        out.append((y, m))
        m -= 1
        if m == 0:
            y, m = y - 1, 12
    return list(reversed(out))


def is_retryable(err):
    """Quota, rate limit and transient server errors are worth retrying."""
    if isinstance(err, HttpError):
        return err.resp.status in (403, 429, 500, 502, 503, 504) and (
            err.resp.status != 403 or "quota" in str(err).lower() or "rate" in str(err).lower()
        )
    return isinstance(err, (TimeoutError, ConnectionError, OSError))


def query_with_retry(svc, body):
    """Execute one Search Analytics query, backing off on quota/transient errors."""
    for attempt in range(MAX_RETRIES):
        try:
            return svc.searchanalytics().query(siteUrl=SITE_URL, body=body).execute()
        except Exception as err:
            if attempt == MAX_RETRIES - 1 or not is_retryable(err):
                raise
            # exponential backoff with jitter: 30s, 60s, 120s ... capped at 15 min
            delay = min(30 * (2 ** attempt), 900) + random.uniform(0, 10)
            status = getattr(getattr(err, "resp", None), "status", "?")
            log(f"    retryable error (HTTP {status}), sleeping {delay:.0f}s "
                f"[attempt {attempt + 1}/{MAX_RETRIES}]")
            time.sleep(delay)


def fetch_report(svc, dimensions, start_date, end_date):
    """Page through every row for one dimension set."""
    rows = []
    start_row = 0
    while True:
        body = {
            "startDate": start_date,
            "endDate": end_date,
            "dimensions": dimensions,
            "rowLimit": ROW_LIMIT,
            "startRow": start_row,
            "dataState": "final",
            "type": "web",
        }
        resp = query_with_retry(svc, body)
        batch = resp.get("rows", [])
        rows.extend(batch)
        if len(batch) < ROW_LIMIT:
            break
        start_row += len(batch)
        if start_row >= MAX_ROWS:
            log(f"    hit {MAX_ROWS:,} row safety ceiling - truncating")
            break
        if start_row % 100000 == 0:
            log(f"    ...{start_row:,} rows so far")
    return rows


def write_csv(path, dimensions, rows):
    """Write atomically: .tmp first, then rename."""
    tmp = path + ".tmp"
    with open(tmp, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(dimensions + ["clicks", "impressions", "ctr", "position"])
        for r in rows:
            keys = r.get("keys", [])
            w.writerow(keys + [
                r.get("clicks", 0),
                r.get("impressions", 0),
                round(r.get("ctr", 0.0), 6),
                round(r.get("position", 0.0), 2),
            ])
    os.replace(tmp, path)


def main():
    if not os.path.exists(CREDENTIALS):
        sys.exit(f"Credentials not found at {CREDENTIALS!r}. Set GSC_CREDENTIALS.")

    creds = service_account.Credentials.from_service_account_file(CREDENTIALS, scopes=SCOPES)
    svc = build("searchconsole", "v1", credentials=creds, cache_discovery=False)

    months = month_range(MONTHS_BACK)
    log(f"Property : {SITE_URL}")
    log(f"Months   : {months[0][0]}-{months[0][1]:02d} .. {months[-1][0]}-{months[-1][1]:02d} "
        f"({len(months)} months)")
    log(f"Output   : {OUT_DIR}/")
    print()

    for y, m in months:
        label = f"{y}-{m:02d}"
        start_date = f"{label}-01"
        end_date = f"{label}-{monthrange(y, m)[1]:02d}"
        month_dir = os.path.join(OUT_DIR, label)
        os.makedirs(month_dir, exist_ok=True)

        for filename, dimensions in REPORTS:
            path = os.path.join(month_dir, filename)
            if os.path.exists(path):
                log(f"{label} {filename:<15} already done - skipping")
                continue
            log(f"{label} {filename:<15} pulling...")
            t0 = time.time()
            rows = fetch_report(svc, dimensions, start_date, end_date)
            write_csv(path, dimensions, rows)
            clicks = sum(r.get("clicks", 0) for r in rows)
            log(f"{label} {filename:<15} {len(rows):,} rows, "
                f"{clicks:,.0f} clicks ({time.time() - t0:.0f}s)")

    print()
    log("All months complete.")


if __name__ == "__main__":
    main()
