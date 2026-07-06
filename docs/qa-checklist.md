# Pre-ship QA checklist

Run through this in the browser before merging anything user-facing.
Meant to catch the specific classes of bug we've been burned by — not a
substitute for automated tests, but a structured way to verify the app
still does the visible-to-a-recruiter things it's supposed to.

If a check fails, don't ship. If a check is genuinely N/A for the
change, mark it that way and move on — never silently skip.

---

## 1. Auth + gating (2 minutes)

- [ ] Open the site in an incognito window → **should redirect to `/login`**
- [ ] Sign in with Google as a whitelisted user → lands on `/` homepage
- [ ] Sign in with a **non-whitelisted email** → sees "You aren't on the access list yet." error, does NOT reach the app
- [ ] Signed-in user without ADMIN role → `/admin` redirects to `/`
- [ ] Sign out → returns to `/login`, session cookie gone
- [ ] Static shared tool at `/tools/wc26-d25bb010b528` loads **without** signing in

## 2. CV Generator — first-run flow (3 minutes)

- [ ] Land on `/generate` clean (no CV loaded) → welcome screen shows
- [ ] Empty state options ("Also apply") visible above the fold
- [ ] Click the drop zone → file picker opens
- [ ] Drop a CV file → progress overlay appears with the pipeline steps
- [ ] Progress overlay completes → editor populates with the candidate's data
- [ ] "Interview questions" tab exists in the tab bar (all 5 tabs visible without truncation)
- [ ] The live preview renders the candidate name

## 3. CV Generator — editing reflects everywhere (2 minutes)

*This is the class of bug we've been burned by. Test both modes.*

**Anonymous mode OFF:**
- [ ] Edit the candidate name field → preview updates within 500ms
- [ ] Edit a role's Company → preview role card updates
- [ ] Edit a bullet point → preview bullet updates
- [ ] Edit Executive Summary → cover page updates

**Anonymous mode ON:**
- [ ] Tick "Anonymise / Generate Intro Email" → wait for anonymise → candidate name becomes "Confidential Candidate", employer names generalised
- [ ] **Edit a role's Company** → preview updates (this is the specific bug from Jul 6)
- [ ] Edit a bullet point → preview updates
- [ ] Untick anonymous → confirm dialogue appears; if confirmed, original data restored

## 4. Job spec tailoring (2 minutes)

- [ ] Attach a job spec (Step 2, or via empty-state "Also apply" toggle before importing)
- [ ] Click Tailor Profile & Skills → button shows "Tailoring…" → skills reorder + profile paragraph rewrites
- [ ] Any "new skills suggested" amber notice shows the actual list, dismissible

## 5. Page breaks (1 minute)

- [ ] Roles tab shows the pink hint about overflowing pages
- [ ] Click "Insert page break" between two roles → dashed line goes pink, label becomes "✂ Page break · click to remove"
- [ ] Live preview shows the "✂ PAGE BREAK" marker between the two roles
- [ ] Continuation page shows "Experience (continued)" heading
- [ ] Click "click to remove" → marker gone, roles flow together again

## 6. Downloads (2 minutes)

*Both formats. Both matter.*

- [ ] Click Download PDF → file downloads, opens cleanly, candidate name in filename, all edits reflected, page breaks respected
- [ ] Click DOCX → file downloads, opens in Word/Pages/LibreOffice without errors, matches PDF content structurally
- [ ] Try both with anonymous mode ON → downloads use anonymised name in filename ("confidential-candidate.pdf")

## 7. Send options dropdown (1 minute)

- [ ] Button labelled "Anonymise / Generate Intro Email"
- [ ] Clicking opens dropdown with two items
- [ ] "Generate introduction email" opens the modal
- [ ] Modal shows generated subject + body
- [ ] "Open in mail client" fires a mailto: link
- [ ] Copy buttons put the right thing on the clipboard
- [ ] Regenerate produces a different draft

## 8. Interview questions tab (1 minute)

- [ ] Select ≥1 theme, click Generate → questions appear in the list
- [ ] "Include in PDF" toggle unchecked → PDF export doesn't include IQ pages
- [ ] Toggle ON → PDF export includes IQ pages after the CV
- [ ] Individual question edit → save reflects in preview
- [ ] Individual question regenerate → returns a different question

## 9. Admin dashboard (only when the change touches auth/admin) (2 minutes)

- [ ] Sign in as ADMIN → click user chip → "Admin dashboard" link appears
- [ ] `/admin` loads with three stat tiles + Users / Domains / Activity tabs
- [ ] Add a user, change their role, revoke, restore — all reflect in the table immediately
- [ ] Add a domain, remove a domain — reflects
- [ ] Activity tab shows recent SIGN_IN events plus the admin actions you just performed
- [ ] Revoke a user → their next request bounces to `/login` (test with a different browser session if you can)

## 10. Console (30 seconds)

- [ ] Open browser DevTools → Console tab → **zero red errors** during the flow
- [ ] Zero orange warnings you don't recognise

---

## When something fails

- **Don't ship.** Fix the finding or revert the change.
- **Add a note** to this file if you found a new class of bug worth adding to the checklist.
- **Ping the developer** with the exact steps that reproduced it — screenshots > words.

---

## Amendments

Newest first. Add a bullet whenever a real regression makes it through — the checklist has to grow with the app.

- **2026-07-06** — Added §3 anonymous-mode edits check (`viewData` frozen snapshot bug).
- **2026-07-06** — Added §6 DOCX download check (`file-saver` ESM interop failure).
