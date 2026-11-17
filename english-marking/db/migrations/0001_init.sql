-- Core schema for the English Language marking app.
-- Personal data is kept to the minimum needed: names, class, targets and
-- optional context flags. The AI only ever sees the pseudonymous `code`.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE students (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text NOT NULL UNIQUE,            -- pseudonymous code printed on cover sheets
  mis_id        text UNIQUE,                     -- Bromcom student ID / admission number
  first_name    text,
  last_name     text,
  year_group    int  NOT NULL,
  class_code    text,
  teacher       text,
  target_grade  int,
  pp            boolean NOT NULL DEFAULT false,
  send          boolean NOT NULL DEFAULT false,
  eal           boolean NOT NULL DEFAULT false,
  status        text NOT NULL DEFAULT 'active',  -- active | left | anonymised
  anonymised_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX students_year_class ON students (year_group, class_code);

CREATE TABLE assessments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  year_group      int  NOT NULL,
  paper           text NOT NULL CHECK (paper IN ('P1','P2')),
  questions       int[] NOT NULL,                -- question numbers included, e.g. {1,2,3,4,5}
  sat_on          date,
  question_texts  jsonb NOT NULL DEFAULT '{}',   -- {"2": "Look in detail at lines 8-15 ..."}
  answer_key      jsonb,                         -- P2 Q1 correct statements, e.g. ["A","C","E","H"]
  source_text     text,                          -- pasted insert text (optional)
  source_pdf      bytea,                         -- uploaded insert (optional)
  mark_scheme_pdf bytea,                         -- paper-specific mark scheme (optional)
  is_calibration  boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE scripts (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id        uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  student_id           uuid REFERENCES students(id) ON DELETE SET NULL,
  status               text NOT NULL DEFAULT 'queued', -- queued | processing | marked | error
  transcription        jsonb,      -- {"answers": [{question, text}], "legibility": "...", "notes": "..."}
  summary              jsonb,      -- overall strengths / weaknesses / next steps / response task
  total_mark           numeric,
  max_mark             numeric,
  grade_estimate       numeric,
  needs_review         boolean NOT NULL DEFAULT false,
  moderation_selected  boolean NOT NULL DEFAULT false,
  moderated_at         timestamptz,
  moderated_by         text,
  ai_mode              text,       -- live | demo
  error                text,
  images_deleted_at    timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, student_id)
);
CREATE INDEX scripts_assessment ON scripts (assessment_id);
CREATE INDEX scripts_student ON scripts (student_id);

CREATE TABLE script_pages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id  uuid NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  page_no    int  NOT NULL,
  mime       text NOT NULL DEFAULT 'image/jpeg',
  image      bytea NOT NULL
);
CREATE INDEX script_pages_script ON script_pages (script_id, page_no);

CREATE TABLE question_results (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id       uuid NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  question        int  NOT NULL,
  max_mark        int  NOT NULL,
  ai_mark         numeric NOT NULL,
  ai_marks_raw    numeric[],         -- individual marking passes (for consistency checks)
  teacher_mark    numeric,
  teacher_comment text,
  level           text,
  ao_marks        jsonb,             -- Q5: {"AO5": 18, "AO6": 11}
  descriptor      text,              -- level descriptor the answer best fits
  evidence        jsonb NOT NULL DEFAULT '[]',  -- [{quote, comment}]
  strengths       jsonb NOT NULL DEFAULT '[]',  -- [text]
  weaknesses      jsonb NOT NULL DEFAULT '[]',  -- [{code, detail}]
  next_step       text,
  confidence      text,
  rationale       text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (script_id, question)
);

CREATE TABLE exemplars (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paper         text NOT NULL,
  question      int  NOT NULL,
  mark          numeric NOT NULL,
  max_mark      int NOT NULL,
  ao_marks      jsonb,
  commentary    text,
  answer_text   text,                 -- transcription (filled by AI if images uploaded)
  source        text NOT NULL,        -- moderated | exam_return | teacher_override
  assessment_id uuid REFERENCES assessments(id) ON DELETE SET NULL,
  status        text NOT NULL DEFAULT 'ready', -- pending | ready | error
  images        jsonb,                -- temporary base64 pages until transcribed
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX exemplars_q ON exemplars (paper, question) WHERE active;

CREATE TABLE reference_docs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        text NOT NULL,          -- examiner_report | mark_scheme | department_structure | other
  title       text NOT NULL,
  paper       text,                   -- P1 | P2 | null (both)
  raw_text    text,
  digest      jsonb,                  -- {"general": "...", "questions": {"P1Q4": "..."}}
  sources     jsonb,                  -- URLs when found online
  status      text NOT NULL DEFAULT 'ready', -- pending | ready | error
  approved    boolean NOT NULL DEFAULT false,
  error       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE intervention_groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  tutor       text,
  year_group  int,
  start_date  date,
  origin      text NOT NULL DEFAULT 'imported', -- imported | suggested
  pack        jsonb,                -- generated tutor pack
  pack_generated_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE intervention_members (
  group_id   uuid NOT NULL REFERENCES intervention_groups(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, student_id)
);

-- Past exam results. Stored without names: only a one-way hash of the candidate.
CREATE TABLE historical_results (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_year   int  NOT NULL,
  anon_id       text NOT NULL,
  grade         int,
  question_marks jsonb NOT NULL DEFAULT '{}',   -- {"P1Q1": 4, ..., "P2Q5": 30}
  pp            boolean,
  send          boolean,
  eal           boolean,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cohort_year, anon_id)
);

CREATE TABLE insights (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope       text NOT NULL,     -- class | year | history
  scope_key   text NOT NULL,
  content     jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX insights_scope ON insights (scope, scope_key, created_at DESC);

CREATE TABLE jobs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type        text NOT NULL,
  payload     jsonb NOT NULL DEFAULT '{}',
  status      text NOT NULL DEFAULT 'queued', -- queued | running | done | error
  attempts    int  NOT NULL DEFAULT 0,
  run_after   timestamptz NOT NULL DEFAULT now(),
  locked_at   timestamptz,
  error       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE INDEX jobs_queue ON jobs (status, run_after);

CREATE TABLE settings (
  key   text PRIMARY KEY,
  value jsonb NOT NULL
);

CREATE TABLE audit_log (
  id         bigserial PRIMARY KEY,
  at         timestamptz NOT NULL DEFAULT now(),
  action     text NOT NULL,
  detail     jsonb
);
