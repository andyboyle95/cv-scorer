// A fixed list of skill gaps. The AI must tag every weakness with one of these
// codes, so that class, year-group and intervention analysis can count and
// compare like with like. Each code carries a plain-English description and
// the intervention focus a tutor should deliver.

export type SkillCode = keyof typeof TAXONOMY;

export type SkillInfo = {
  label: string;
  area: "Reading" | "Writing" | "Exam craft";
  questions: string[]; // e.g. ["P1Q2", "P2Q3"]; "*" = any
  teach: string;       // what the intervention should deliver
};

export const TAXONOMY = {
  // ---------- Reading: retrieval and inference ----------
  R_RETRIEVAL_ACCURACY: {
    label: "Retrieval not accurate or outside the given lines",
    area: "Reading",
    questions: ["P1Q1", "P2Q1"],
    teach: "Box the line range before reading; retrieve short, explicit facts only; check each answer is inside the lines and is true of the named focus.",
  },
  R_INFERENCE_SURFACE: {
    label: "Paraphrases or retells instead of inferring",
    area: "Reading",
    questions: ["P2Q2", "P1Q4", "P2Q4", "P1Q2", "P2Q3"],
    teach: "Practise 'what this suggests' statements: quote, then infer two layers of meaning. Ban 'this shows that he is...' + restatement.",
  },
  R_SYNTHESIS_ONE_SOURCE: {
    label: "Uses only one source or treats sources separately",
    area: "Reading",
    questions: ["P2Q2"],
    teach: "Use a 'both / whereas' synthesis frame: one difference, evidence from Source A, evidence from Source B, then an inference about each.",
  },
  R_SYNTHESIS_NO_DIFFERENCE: {
    label: "Does not identify a clear difference (or similarity) to synthesise",
    area: "Reading",
    questions: ["P2Q2"],
    teach: "Start from the focus in the question; list contrasts in a two-column grid before writing; open each paragraph with the difference.",
  },

  // ---------- Reading: evidence and quotation ----------
  R_EVIDENCE_MISSING: {
    label: "Ideas not supported with evidence",
    area: "Reading",
    questions: ["*"],
    teach: "Every point needs a short quotation or precise reference. Drill point-evidence pairs: one claim, one word or phrase that proves it.",
  },
  R_QUOTES_NOT_JUDICIOUS: {
    label: "Quotations too long or not well chosen",
    area: "Reading",
    questions: ["P1Q2", "P1Q4", "P2Q3", "P2Q4", "P2Q2"],
    teach: "Trim quotations to 1-5 words that carry the meaning; embed them in the sentence; choose words that can be analysed, not whole sentences.",
  },

  // ---------- Reading: language analysis ----------
  R_FEATURE_SPOTTING: {
    label: "Names techniques without explaining their effect",
    area: "Reading",
    questions: ["P1Q2", "P1Q3", "P2Q3", "P1Q4", "P2Q4"],
    teach: "Move from 'the writer uses a simile' to 'the simile suggests... because...'. The method is the start of the sentence, not the point.",
  },
  R_EFFECT_GENERIC: {
    label: "Generic effects ('makes the reader want to read on', 'creates imagery')",
    area: "Reading",
    questions: ["P1Q2", "P1Q3", "P2Q3", "P1Q4", "P2Q4"],
    teach: "Ban generic effect phrases. Effects must name a specific feeling, idea or image linked to the question focus.",
  },
  R_NO_WORD_LEVEL_ANALYSIS: {
    label: "No close analysis of individual words or connotations",
    area: "Reading",
    questions: ["P1Q2", "P2Q3", "P1Q4"],
    teach: "Zoom in on one word: connotations, word class, why this word and not a synonym. Practise 'the verb X implies...'.",
  },
  R_TERMINOLOGY: {
    label: "Subject terminology missing or used wrongly",
    area: "Reading",
    questions: ["P1Q2", "P1Q3", "P2Q3"],
    teach: "Teach a core list (word classes, sentence forms, imagery, structural terms) with retrieval quizzes; terminology must support the analysis, not replace it.",
  },

  // ---------- Reading: structure ----------
  R_STRUCTURE_AS_LANGUAGE: {
    label: "Analyses language instead of structure",
    area: "Reading",
    questions: ["P1Q3"],
    teach: "Structure = where the writer takes the reader: focus shifts, openings, endings, time, perspective, repetition across the text. Use the 'camera' model.",
  },
  R_STRUCTURE_NO_WHOLE_TEXT: {
    label: "No whole-text overview of structure (beginning, middle, end)",
    area: "Reading",
    questions: ["P1Q3"],
    teach: "Track focus at the start, the shift, and the end. Write about why the focus changes at each point and the effect on the reader.",
  },

  // ---------- Reading: evaluation and comparison ----------
  R_EVAL_NO_JUDGEMENT: {
    label: "Does not evaluate the statement (no personal judgement)",
    area: "Reading",
    questions: ["P1Q4"],
    teach: "Open with a clear view on the statement and return to it in every paragraph: 'I agree because...', 'the writer convinces me that...'.",
  },
  R_EVAL_NO_METHODS: {
    label: "Evaluation does not consider the writer's methods",
    area: "Reading",
    questions: ["P1Q4"],
    teach: "Each paragraph: student view + quotation + writer's method + how it creates the impression in the statement.",
  },
  R_COMPARE_NO_PERSPECTIVE: {
    label: "Does not compare writers' perspectives or attitudes",
    area: "Reading",
    questions: ["P2Q4"],
    teach: "Identify each writer's attitude in one sentence before writing; compare attitudes first, methods second, in every paragraph.",
  },
  R_COMPARE_NO_METHODS: {
    label: "Compares content but not how the writers convey their views",
    area: "Reading",
    questions: ["P2Q4"],
    teach: "Add a methods sentence per source: 'Writer A conveys this through...; in contrast Writer B uses...'.",
  },
  R_COMPARE_UNBALANCED: {
    label: "Comparison unbalanced (one source dominates)",
    area: "Reading",
    questions: ["P2Q4", "P2Q2"],
    teach: "Use alternating paragraphs or integrated comparison; check equal evidence from both sources.",
  },
  R_MISREADING: {
    label: "Misreads the text (figurative language taken literally, words out of context)",
    area: "Reading",
    questions: ["P1Q2", "P1Q4", "P2Q1", "P2Q3", "P2Q4"],
    teach: "Read figurative phrases for meaning before analysing; check the context of a word before deciding its connotation; paraphrase the line first.",
  },
  R_CONTEXT_BOLTED_ON: {
    label: "Bolts on context or themes not rooted in the text",
    area: "Reading",
    questions: ["P1Q2", "P1Q4", "P2Q4"],
    teach: "Every idea must start from a word or detail in the source. Context is not credited on this paper: cut it and add a quotation instead.",
  },
  R_QUESTION_FOCUS: {
    label: "Drifts from the question focus or the given lines",
    area: "Exam craft",
    questions: ["*"],
    teach: "Underline the focus word in the question and the line range; end every paragraph by linking back to that focus.",
  },

  // ---------- Writing: content and organisation (AO5) ----------
  W_TASK_PURPOSE: {
    label: "Purpose, audience or form not matched (tone and register)",
    area: "Writing",
    questions: ["P1Q5", "P2Q5"],
    teach: "Identify form, audience and purpose (FAP) before planning; practise switching register for different audiences.",
  },
  W_FORM_CONVENTIONS: {
    label: "Missing conventions of the form (article, letter, speech, leaflet)",
    area: "Writing",
    questions: ["P2Q5"],
    teach: "Teach a short checklist per form: headline/standfirst, salutation/sign-off, direct address in speeches, and use it when planning.",
  },
  W_IDEAS_UNDEVELOPED: {
    label: "Ideas thin, repetitive or undeveloped",
    area: "Writing",
    questions: ["P1Q5", "P2Q5"],
    teach: "Plan 4-5 distinct ideas; develop each with a detail, example or zoom. In description, zoom into small details rather than listing.",
  },
  W_STRUCTURE_SHAPE: {
    label: "No deliberate overall structure (rushed whole-life plot, weak opening, shift or ending)",
    area: "Writing",
    questions: ["P1Q5", "P2Q5"],
    teach: "Use a structure plan (e.g. drop, shift, zoom, flashback, cyclical ending for creative; counter-argument and call to action for viewpoint).",
  },
  W_PARAGRAPHING: {
    label: "Paragraphs missing or not used for effect",
    area: "Writing",
    questions: ["P1Q5", "P2Q5"],
    teach: "TiPToP paragraphing; practise one-line paragraphs for impact; plan paragraph by paragraph.",
  },
  W_COHESION: {
    label: "Weak cohesion or discourse markers",
    area: "Writing",
    questions: ["P1Q5", "P2Q5"],
    teach: "Teach a bank of discourse markers and topic sentences that link back; avoid 'Firstly/Secondly' only.",
  },
  W_PRELEARNED_FORMULA: {
    label: "Pre-learned formulas (templates, forced 'ambitious' words, invented statistics)",
    area: "Writing",
    questions: ["P1Q5", "P2Q5"],
    teach: "Write for this task, not a template: choose vocabulary that fits the register, use specific real-world examples instead of invented statistics, and drop stock openers.",
  },
  W_VOCAB_RANGE: {
    label: "Limited or imprecise vocabulary",
    area: "Writing",
    questions: ["P1Q5", "P2Q5"],
    teach: "Upgrade vocabulary for precision, not length: thesaurus with care, word banks tied to the task.",
  },
  W_DEVICES_OVERLOADED: {
    label: "Devices overused or forced (crafting gets in the way of meaning)",
    area: "Writing",
    questions: ["P1Q5", "P2Q5"],
    teach: "Less is more: one controlled image per paragraph; read aloud to cut clichés and stacked adjectives.",
  },

  // ---------- Writing: technical accuracy (AO6) ----------
  W_SENTENCE_DEMARCATION: {
    label: "Sentence demarcation errors (comma splices, run-ons)",
    area: "Writing",
    questions: ["P1Q5", "P2Q5"],
    teach: "Comma splice drills: full stop, semicolon or conjunction. Proof-read for one error type at a time.",
  },
  W_SENTENCE_VARIETY: {
    label: "Limited range of sentence forms",
    area: "Writing",
    questions: ["P1Q5", "P2Q5"],
    teach: "Practise short sentences for impact, fronted adverbials, subordinate openings, and deliberate fragments.",
  },
  W_PUNCTUATION_RANGE: {
    label: "Limited or inaccurate range of punctuation",
    area: "Writing",
    questions: ["P1Q5", "P2Q5"],
    teach: "Add one new punctuation mark at a time (semicolon, colon, dash, brackets) with accurate models.",
  },
  W_SPELLING: {
    label: "Spelling errors (common or ambitious words)",
    area: "Writing",
    questions: ["P1Q5", "P2Q5"],
    teach: "Personal spelling list from their own errors; homophones (their/there, where/were), and look-cover-write-check.",
  },
  W_STANDARD_ENGLISH: {
    label: "Grammar or Standard English errors (tense, agreement)",
    area: "Writing",
    questions: ["P1Q5", "P2Q5"],
    teach: "Tense consistency and subject-verb agreement drills; read work aloud to hear slips.",
  },

  // ---------- Exam craft ----------
  X_UNDEVELOPED_LENGTH: {
    label: "Response too brief for the marks available",
    area: "Exam craft",
    questions: ["*"],
    teach: "Marks-per-minute: practise timed responses with a target number of points per mark band.",
  },
  X_INCOMPLETE: {
    label: "Question not attempted or not finished (timing)",
    area: "Exam craft",
    questions: ["*"],
    teach: "Timed practice with checkpoints; teach the recommended minutes for each question and the order to attempt them.",
  },
  X_DEPT_STRUCTURE: {
    label: "Not following the department's answer structure",
    area: "Exam craft",
    questions: ["*"],
    teach: "Re-model the department structure for this question; use the scaffold, then fade it.",
  },
} satisfies Record<string, SkillInfo>;

export const SKILL_CODES = Object.keys(TAXONOMY) as SkillCode[];

export function skillLabel(code: string): string {
  return (TAXONOMY as Record<string, SkillInfo>)[code]?.label ?? code;
}

export function skillTeach(code: string): string {
  return (TAXONOMY as Record<string, SkillInfo>)[code]?.teach ?? "";
}

export function codesForQuestion(qid: string): SkillCode[] {
  return SKILL_CODES.filter((c) => {
    const qs = TAXONOMY[c].questions as string[];
    return qs.includes("*") || qs.includes(qid);
  });
}
