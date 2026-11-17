# Notice Period Calculator (Aaron Wallis)

A self-contained calculator block for the Aaron Wallis website (Umbraco + uSkinned).
The whole tool is one file: `notice-period-calculator.html`.

## What it does

Two modes:

- **When can I leave?** - enter the notice period and the hand-in date. Shows the date notice ends, the last working day (moved back if notice ends on a weekend or bank holiday), the earliest start date for a new job, and counts of calendar days, working days and bank holidays.
- **When should I resign?** - enter a target start date. Shows the latest working day to hand in notice. If the date is too soon, it shows the earliest possible start and how much early release is needed.

Extras:

- Holiday offset: uses the holiday days left to show an earlier last working day (if the employer agrees).
- "What if you negotiate an earlier release?" table (1 week, 2 weeks, 1 month, half of notice).
- Legal minimum check (optional start date): length of service, statutory notice each way, and a warning if the contract is below the statutory minimum.
- Region setting for bank holidays (England & Wales, Scotland, Northern Ireland). Live from GOV.UK, with a built-in copy for 2026-2028.
- Add to calendar (.ics) and copy dates.
- Tips and a call to action that change with the notice length and audience.

## Rules used (checked against GOV.UK, November 2026)

- Notice runs from the day after it is handed in. N weeks ends on hand-in date + 7N days. N months ends on the same date N months later (or the last day of the month if that date does not exist).
- Employee resigning: minimum 1 week after 1 month's service.
- Employer giving notice: 1 week (1 month to 2 years), then 1 week per full year, up to 12 weeks.
- Working days: Monday to Friday, not bank holidays.

## How to add it to a page (uSkinned)

1. Open the page in the Umbraco backoffice.
2. Add a **Code** component where the calculator should go (the same component the mileage calculator uses).
3. Paste the full contents of `notice-period-calculator.html` into it.
4. For the employer page, change `data-audience="candidate"` to `data-audience="employer"` near the top of the block.
5. Save and preview, then publish.

Suggested placement:

- Candidate: `/candidates/advice/sales-interview-advice/resigning-and-starting-new-job/working-out-your-notice/`, under the Page Overview.
- Employer: `/employers/advice/managing-sales-teams/employee-notice-periods/` with `data-audience="employer"`.
- Optional: a page of its own, such as `.../resigning-and-starting-new-job/notice-period-calculator/`, like the mileage calculator, to target "notice period calculator" searches.

## Settings

| Attribute on `#aw-notice-calc` | Values | Default |
| --- | --- | --- |
| `data-audience` | `candidate`, `employer` | `candidate` |
| `data-region` | `ew`, `sc`, `ni` | `ew` |

## Analytics

If Google Tag Manager is on the page, the block pushes events to `window.dataLayer`:

- `event: "aw_notice_calculator"` with `awnc_action` = `calculate` (first use), `mode_change`, `calendar`, `copy` or `cta_click`
- Also `awnc_mode`, `awnc_audience`, `awnc_notice` and `awnc_cta` (on CTA clicks).

Add a GTM trigger on the custom event `aw_notice_calculator` to send these to GA4.

## Maintenance

- Bank holidays come live from `https://www.gov.uk/bank-holidays.json`. The built-in copy covers 2026-2028. Update the `FALLBACK` object in early 2028.
- All CSS is scoped under `#aw-notice-calc` and all classes start with `awnc-`, so the block does not change the rest of the page.
