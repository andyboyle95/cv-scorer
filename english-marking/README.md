# Red Letter

AI marking and intervention planning for AQA GCSE English Language (8700), built for the English department at Trinity Academy Cathedral.

## What it does
1. **Import students** from a Bromcom CSV: classes, target grades, optional PP/SEND/EAL flags.
2. **Set up an assessment** (Paper 1 or 2, any questions), with the source insert and the paper's mark scheme if you have them.
3. **Print cover sheets.** Each has a QR code and a 6-character student code.
4. **Scan in bulk.** One PDF per class from the photocopier. The browser reads the cover sheets, splits the pile by student and uploads only the answer pages.
5. **Marking** runs in the background:
   - transcription that keeps every spelling and punctuation error;
   - each question marked against the AQA level descriptors, mark caps and examiner-report weaknesses, plus your moderated exemplars and department structures;
   - questions worth 16+ marks are marked twice, with a third pass if the two disagree;
   - Paper 2 Q1 is marked exactly from the answer key.
6. **Outputs:**
   - marks, levels, evidence quotes, strengths, weaknesses and next steps per question;
   - an A5 feedback sheet per student with a response task (Word);
   - a class report and common misconceptions;
   - an Excel markbook;
   - year-group grade-band analysis ("why are the 3s not 4s?");
   - suggested intervention groups;
   - tutor packs as A5 booklets for imported SLT groups;
   - impact tracking;
   - trends from past Enhanced Results Analysis data.
7. **Moderation:** about 1 in 5 scripts (and any the marker is unsure of) go to a teacher check. The Moderation page shows how close AI marks are to teacher marks, per question.

## Accuracy checklist before relying on it
1. Add an `ANTHROPIC_API_KEY` (without one the app runs in demo mode with placeholder marks).
2. Upload department structures (Library → Upload → Department structures).
3. Add moderated exemplars, ideally 5+ per question across the mark range. AQA script returns with real marks are the best.
4. Create an **accuracy check** assessment from 30-50 teacher-marked scripts, upload them, enter the teacher marks in Moderation, and check the agreement table.

## Data protection
- Shared staff password for now (`ACCESS_PASSWORD`); Google/Microsoft sign-in is planned for version 2.
- The AI never receives names: cover sheets are not uploaded, and analysis uses pseudonymous codes.
- Scan images are deleted after 12 months (configurable). Marks and transcriptions are kept.
- Leavers can be anonymised in one click (marks are kept for trends). Each student has a subject-access download and an erase button.
- Past results are stored without names: candidate numbers are salted and hashed.
- An audit log records imports, exports, moderation and deletions.
- Host the database in Render's Frankfurt (EU) region. Scans are processed by Anthropic's API, so the school's DPO should approve it and record it in the DPIA.

## Running locally
```bash
cp .env.example .env.local   # fill in DATABASE_URL etc.
npm install
npm run migrate
npm run dev                  # http://localhost:3100/redletter
```

## Deploying on Render
- `render.yaml` at the repo root creates the `redletter` web service (root dir `english-marking/`) and a Postgres database, both in Frankfurt.
- Set `ACCESS_PASSWORD` and `ANTHROPIC_API_KEY` in the dashboard.
- The service must be a paid, always-on instance: marking runs in a worker inside the web process.
- **Subfolder on your domain:** the app is served under `/redletter`. If your domain points at the CV scorer service, set `REDLETTER_ORIGIN=https://<redletter-service>.onrender.com` on that service. Its `next.config.ts` then proxies `yourdomain/redletter/*` to this app.

## Cost
Opus 5.5 with high effort and double marking costs roughly 50p-£1 per full paper (estimate, depends on handwriting length). Settings lets you lower effort or turn off double marking.
