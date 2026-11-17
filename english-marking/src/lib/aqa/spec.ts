// AQA GCSE English Language 8700: question specification used by the marker.
// Descriptors and caps are taken from the June 2024 / June 2025 AQA mark schemes
// and the 2022-2025 examiner reports. AQA permits schools to use this material
// for internal purposes.

export type Paper = "P1" | "P2";

export type QuestionSpec = {
  id: string;           // "P1Q4"
  paper: Paper;
  number: number;
  title: string;
  marks: number;
  aos: string;
  minutes: number;      // suggested timing (teacher practice, not AQA)
  needsSource: boolean;
  isWriting: boolean;
  focus: string;
  levels: { name: string; min: number; max: number }[]; // for the total mark (AO5 used for Q5 bands)
  descriptors: string;
  guidance: string;
  commonIssues: string;
};

export const qid = (paper: Paper, q: number) => `${paper}Q${q}`;

const READING_LADDER = `Use the levels as a ladder: start at Level 1 and move up while the answer meets a skills descriptor for the level. A level is reached if a student meets one or more of its skills descriptors (once is enough). It is the quality of the comments, not the number of references, that decides the level. Then fine-tune within the level by best fit: balance the skills, letting strong performance in one compensate for others partly met. Credit valid points the indicative content does not list. Use the full range of marks. Subject terminology supports a level but cannot by itself raise it: only comments on effect move an answer up. Students may paraphrase instead of quoting. Bullet points in the question are a guide and carry no marks of their own. An answer with nothing relevant gets 0.`;

const LANGUAGE_DESCRIPTORS = (top: string, l3: string, l2: string, l1: string) => `Level 4 "Perceptive, detailed analysis" (${top}): Shows detailed and perceptive understanding of language. Analyses the effects of the writer's choices of language. Selects a range of judicious textual detail. Makes sophisticated and accurate use of subject terminology.
Level 3 "Clear, relevant explanation" (${l3}): Shows clear understanding of language. Explains clearly the effects of the writer's choices of language. Selects a range of relevant textual detail. Makes clear and accurate use of subject terminology.
Level 2 "Some understanding and comment" (${l2}): Shows some understanding of language. Attempts to comment on the effect of language. Selects some appropriate textual detail. Makes some use of subject terminology, mainly appropriately.
Level 1 "Simple, limited comment" (${l1}): Shows simple awareness of language. Offers simple comment on the effect of language. Selects simple references or textual details. Makes simple use of subject terminology, not always appropriately.
Level 0 (0): Nothing to reward.`;

const AO5_AO6 = `AO5 CONTENT AND ORGANISATION (24 marks). Each level has an upper and lower band.
Level 4 "Compelling, convincing communication" (19-24)
 - Upper (22-24): Content: communication is convincing and compelling; tone, style and register assuredly matched to purpose and audience; extensive and ambitious vocabulary with sustained crafting of linguistic devices. Organisation: varied and inventive use of structural features; writing is compelling, incorporating a range of convincing and complex ideas; fluently linked paragraphs with seamlessly integrated discourse markers.
 - Lower (19-21): Content: communication is convincing; tone, style and register convincingly matched to purpose and audience; extensive vocabulary with conscious crafting of linguistic devices. Organisation: varied and effective structural features; writing is highly engaging with a range of developed complex ideas; consistently coherent use of paragraphs with integrated discourse markers.
Level 3 "Consistent, clear communication" (13-18)
 - Upper (16-18): Content: communication is consistently clear; tone, style and register clearly and consistently matched to purpose and audience; increasingly sophisticated vocabulary and phrasing, chosen for effect with a range of successful linguistic devices. Organisation: effective use of structural features; writing is engaging, using a range of clear, connected ideas; coherent paragraphs with integrated discourse markers.
 - Lower (13-15): Content: communication is generally clear; tone, style and register generally matched to purpose and audience; vocabulary clearly chosen for effect and appropriate use of linguistic devices. Organisation: usually effective use of structural features; writing is engaging, with a range of connected ideas; usually coherent paragraphs with range of discourse markers.
Level 2 "Some successful communication" (7-12)
 - Upper (10-12): Content: communicates with some sustained success; some sustained attempt to match tone, style and register to purpose and audience; conscious use of vocabulary with some use of linguistic devices. Organisation: some use of structural features; increasing variety of linked and relevant ideas; some use of paragraphs and some use of discourse markers.
 - Lower (7-9): Content: communicates with some success; attempts to match tone, style and register to purpose and audience; begins to vary vocabulary with some use of linguistic devices. Organisation: attempts to use structural features; some linked and relevant ideas; attempt to write in paragraphs with some discourse markers, not always appropriate.
Level 1 "Simple, limited communication" (1-6)
 - Upper (4-6): Content: communicates simply; simple awareness of matching tone, style and register to purpose and audience; simple vocabulary; simple linguistic devices. Organisation: evidence of simple structural features; one or two relevant ideas, simply linked; random paragraph structure.
 - Lower (1-3): Content: limited communication; occasional sense of matching tone, style and register to purpose and audience; simple vocabulary. Organisation: limited or no evidence of structural features; one or two unlinked ideas; no paragraphs.
Level 0 (0): no meaningful writing to assess.

AO6 TECHNICAL ACCURACY (16 marks). No sub-bands.
Level 4 (13-16): Sentence demarcation is consistently secure and consistently accurate. Wide range of punctuation is used with a high level of accuracy. Uses a full range of appropriate sentence forms for effect. Uses Standard English consistently and appropriately with secure control of complex grammatical structures. High level of accuracy in spelling, including ambitious vocabulary. Extensive and ambitious use of vocabulary.
Level 3 (9-12): Sentence demarcation is mostly secure and mostly accurate. Range of punctuation is used, mostly with success. Uses a variety of sentence forms for effect. Mostly uses Standard English appropriately with mostly controlled grammatical structures. Generally accurate spelling, including complex and irregular words. Increasingly sophisticated use of vocabulary.
Level 2 (5-8): Sentence demarcation is mostly secure and sometimes accurate. Some control of a range of punctuation. Attempts a variety of sentence forms. Some use of Standard English with some control of agreement. Some accurate spelling of more complex words. Varied use of vocabulary.
Level 1 (1-4): Occasional use of sentence demarcation. Some evidence of conscious punctuation. Simple range of sentence forms. Occasional use of Standard English with limited control of agreement. Accurate basic spelling. Simple use of vocabulary.
Level 0 (0): Spelling, punctuation etc. are so poor that they prevent understanding.`;

const WRITING_GUIDANCE = `Mark AO5 and AO6 independently: a technically weak answer can still have strong content, and the reverse. For AO5, decide the level, then upper or lower band, then the mark. Pre-learned "ambitious" vocabulary that does not fit the tone or register is not credited as ambitious, and misspelt ambitious words count against AO6. Length is not a virtue: optimum performance usually comes within two to three sides; long, uncontrolled pieces lose cohesion and accuracy. Typed scripts are marked by the same criteria.`;

const L4 = (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => [
  { name: "Level 1", min: a, max: b },
  { name: "Level 2", min: c, max: d },
  { name: "Level 3", min: e, max: f },
  { name: "Level 4", min: g, max: h },
];

export const QUESTIONS: Record<string, QuestionSpec> = {
  P1Q1: {
    id: "P1Q1", paper: "P1", number: 1, title: "List four things", marks: 4, aos: "AO1", minutes: 5,
    needsSource: true, isWriting: false,
    focus: "Retrieve four explicit or implicit pieces of information about a given focus from a short line range at the start of the source.",
    levels: [],
    descriptors: "Give 1 mark for each valid point about the focus, up to 4.",
    guidance: `Responses must be drawn only from the given lines, must be true, and must relate to the focus. Quotations or paraphrases are both fine; single words are fine. A single answer can earn two marks if it contains two separate valid points. Copying out the whole section earns nothing (no evidence of selection). No mark if a miscopying or misreading changes the meaning, or if the point comes from the italic introduction. Unsupported inferences earn no mark. Check: does it tell you something about the focus? Is it from the correct lines? Is it true?`,
    commonIssues: `Answers taken from outside the given lines (most common error). Using the italic introduction. Miscopying that changes the meaning. Unsupported inferences. Over-complicated answers. Incomplete selections that distort the meaning.`,
  },
  P1Q2: {
    id: "P1Q2", paper: "P1", number: 2, title: "Language analysis", marks: 8, aos: "AO2 (language)", minutes: 10,
    needsSource: true, isWriting: false,
    focus: "How the writer uses language (words and phrases, language features and techniques, sentence forms) in the given lines to describe the focus.",
    levels: L4(1, 2, 3, 4, 5, 6, 7, 8),
    descriptors: LANGUAGE_DESCRIPTORS("7-8", "5-6", "3-4", "1-2"),
    guidance: `${READING_LADDER}
CAP: If a student writes only about language outside the given lines, place the answer in Level 1 or Level 2 according to its quality. Language only: comments on structure are not credited here.`,
    commonIssues: `Feature spotting: complex terminology but no effective comment on effect. Over-long quotations, leading to comments on content not language; similes and metaphors not unpicked word by word. Generic reader comments ("makes the reader want to read on" is a Level 1 comment). Terminology confused (adverb/adjective; "semantic field" with no comment). Repeating a glossary definition as the effect. Literal readings of figurative language. Words read out of context. Bolted-on themes. Personal opinions about characters instead of analysis. Writing outside the lines.`,
  },
  P1Q3: {
    id: "P1Q3", paper: "P1", number: 3, title: "Structure", marks: 8, aos: "AO2 (structure)", minutes: 10,
    needsSource: true, isWriting: false,
    focus: "How the writer has structured the whole text to interest the reader: focus at the beginning, how and why the focus changes, other structural features.",
    levels: L4(1, 2, 3, 4, 5, 6, 7, 8),
    descriptors: `Level 4 "Perceptive, detailed analysis" (7-8): Shows perceptive and detailed understanding of structural features. Analyses the effects of the writer's choices of structural features. Selects a range of judicious examples. Makes sophisticated and accurate use of subject terminology.
Level 3 "Clear, relevant explanation" (5-6): Shows clear understanding of structural features. Explains clearly the effects of the writer's choices of structural features. Selects a range of relevant examples. Makes clear and accurate use of subject terminology.
Level 2 "Some understanding and comment" (3-4): Shows some understanding of structural features. Attempts to comment on the effect of structural features. Selects some appropriate examples. Makes some use of subject terminology, mainly appropriately.
Level 1 "Simple, limited comment" (1-2): Shows simple awareness of structural features. Offers simple comment on the effect of structure. Selects simple reference(s) or example(s). Makes simple use of subject terminology, not always appropriately.
Level 0 (0): Nothing to reward.`,
    guidance: `${READING_LADDER}
Structural features: whole-text level (beginnings, endings, perspective shifts, shifts in focus from wide to narrow, time, chronology, flashback, cyclical structure, foreshadowing, juxtaposition), paragraph level (topic change, cohesion), and sentence level only when it contributes to the whole structure. Two or three well-chosen features in detail can reach the top level. Language analysis is not credited.`,
    commonIssues: `Language analysis instead of structure. Formulaic beginning/middle/end recount with no comment on why events are placed where they are ("why this, why now?"). Features identified without effect. Sentence or paragraph length treated as structure without linking to the whole. Vague comments ("engages the reader"). Covering only the beginning. Few structural terms.`,
  },
  P1Q4: {
    id: "P1Q4", paper: "P1", number: 4, title: "Evaluation of a statement", marks: 20, aos: "AO4", minutes: 20,
    needsSource: true, isWriting: false,
    focus: "Evaluate a statement about the second part of the source: the student's view of the statement, the writer's methods, and the effect on the reader.",
    levels: L4(1, 5, 6, 10, 11, 15, 16, 20),
    descriptors: `Level 4 "Perceptive, detailed evaluation" (16-20): Develops a convincing and critical response to the focus of the statement. Shows perceptive understanding of writer's methods. Selects a range of judicious textual detail. Evaluates critically and in detail the effect(s) on the reader.
Level 3 "Clear, relevant evaluation" (11-15): Makes a clear and relevant response to the focus of the statement. Shows clear understanding of writer's methods. Selects a range of relevant textual references. Evaluates clearly the effect(s) on the reader.
Level 2 "Some evaluation" (6-10): Makes some response to the focus of the statement. Shows some understanding of writer's methods. Selects some appropriate textual reference(s). Makes some evaluative comment(s) on effect(s) on the reader.
Level 1 "Simple, limited comment" (1-5): Makes a simple, limited response to the focus of the statement. Shows limited understanding of writer's methods. Selects simple, limited textual reference(s). Makes simple, limited evaluative comment(s) on effect(s) on reader.
Level 0 (0): Nothing to reward.`,
    guidance: `${READING_LADDER}
CAP: Any section written about events outside the given lines can only gain Level 1 or 2 for that section; if the whole answer is outside the lines, the whole answer is capped at Level 2. Out-of-lines detail goes above Level 2 only if it is linked across the text. Methods may be implicit without naming the writer; agreement may be implicit. Students may agree, partly agree or disagree: no approach is preferred, and disagreement is not needed unless the text supports it. Language and structure count as methods. Context (historical, social) is not credited on this paper. Brief answers struggle to move up the levels.`,
    commonIssues: `Assertion without textual detail (repeats the statement with no reasons). Forced disagreement. Writing outside the given lines. Bolted-on context (patriarchy, gender roles). Drifting into generalities. Misreading events or characters. Not using language and structure as methods. Short answers. Few conceptual ideas (top answers explore themes such as power and powerlessness).`,
  },
  P1Q5: {
    id: "P1Q5", paper: "P1", number: 5, title: "Descriptive or narrative writing", marks: 40, aos: "AO5 (24) + AO6 (16)", minutes: 45,
    needsSource: false, isWriting: true,
    focus: "A description (often from a picture) or a story. The main focus must be descriptive for description and narrative for a story.",
    levels: [
      { name: "Lower Level 1", min: 1, max: 3 }, { name: "Upper Level 1", min: 4, max: 6 },
      { name: "Lower Level 2", min: 7, max: 9 }, { name: "Upper Level 2", min: 10, max: 12 },
      { name: "Lower Level 3", min: 13, max: 15 }, { name: "Upper Level 3", min: 16, max: 18 },
      { name: "Lower Level 4", min: 19, max: 21 }, { name: "Upper Level 4", min: 22, max: 24 },
    ],
    descriptors: AO5_AO6,
    guidance: `${WRITING_GUIDANCE}
A description may contain narrative elements and a story may contain description, but the main focus must match the task chosen. AQA rewards a single episode with controlled pacing and narrow focus.`,
    commonIssues: `Whole-life narratives with no shape, rushed and superficial. Endings that tie up every loose end or "it was all a dream". Descriptions that walk around the picture with no imaginative extension. Sudden unexplained mood shifts. Overused personification, pathetic fallacy and the senses. Pre-learned ambitious vocabulary that does not fit (plethora, obsidian, myriad). Arbitrary lists of three single words. Too much direct speech. Images lifted from Literature texts. Argument writing (Paper 2 style) instead of narrative or description. AO6: narrow punctuation range, insecure speech punctuation, wrong capitals, incorrect semicolons, apostrophes, fragments used "for effect" that lose meaning, little sentence variety, careless spelling.`,
  },
  P2Q1: {
    id: "P2Q1", paper: "P2", number: 1, title: "True statements", marks: 4, aos: "AO1", minutes: 5,
    needsSource: true, isWriting: false,
    focus: "Choose four true statements (of eight, A-H) about a short line range of Source A.",
    levels: [],
    descriptors: "1 mark for each correctly shaded true statement, maximum 4.",
    guidance: `If more than four statements are shaded, mark only the first four in A-H order. Ticks or scribbles instead of shading may not be creditable; if a box is crossed out it does not count unless it is circled again.`,
    commonIssues: `Reading figurative or idiomatic language literally. Hyperbole read as fact. Not following the shading instructions. Shading more than four.`,
  },
  P2Q2: {
    id: "P2Q2", paper: "P2", number: 2, title: "Summary and synthesis", marks: 8, aos: "AO1", minutes: 8,
    needsSource: true, isWriting: false,
    focus: "Use details from both sources to summarise differences (or similarities) about a concrete focus, with inference.",
    levels: L4(1, 2, 3, 4, 5, 6, 7, 8),
    descriptors: `Level 4 "Perceptive, detailed summary" (7-8): Shows perceptive or detailed synthesis and interpretation of both texts. Makes perceptive inferences from both texts. Selects judicious references/use of textual detail relevant to the focus of the question. Statements show perceptive differences between texts.
Level 3 "Clear, relevant summary" (5-6): Shows clear synthesis and interpretation of both texts. Makes clear inferences from both texts. Selects clear references/textual detail relevant to the focus of the question. Statements show clear differences between texts.
Level 2 "Some attempts at summary" (3-4): Shows some interpretation from one/both texts. Attempts some inference(s) from one/both texts. Selects some appropriate references/textual detail from one/both texts. Statements show some difference(s) between texts.
Level 1 "Simple, limited summary" (1-2): Shows simple awareness from one/both texts. Offers paraphrase rather than inference. Selects simple reference(s)/textual detail(s) from one/both texts. Statements show simple difference between texts.
Level 0 (0): Nothing to reward.
(Read "similarities" for "differences" when the question asks for similarities.)`,
    guidance: `${READING_LADDER}
CAPS: Level 1 quality dealing with one text only = 1 mark, not 2. Level 2 quality dealing with one text only = 3 marks, not 4. Level 3 or above needs both texts AND the correct focus. Writing about the writers' feelings or perspectives instead of the concrete focus is a Question 4 skill and cannot be rewarded above Level 2.
Discriminators: paraphrase = Level 1; inference that is undeveloped or unexplained = Level 2; like-for-like differences with explained inference = Level 3; extended or conceptual interpretation = Level 4.`,
    commonIssues: `Summarising or paraphrasing instead of inferring. Wrong focus: writers' attitudes (Question 4 territory) or the wrong subject. Inferences identified but not developed. Mismatched rather than like-for-like comparisons. Missing easy concrete details. One source only.`,
  },
  P2Q3: {
    id: "P2Q3", paper: "P2", number: 3, title: "Language analysis (one source)", marks: 12, aos: "AO2 (language)", minutes: 12,
    needsSource: true, isWriting: false,
    focus: "How the writer uses language to describe the focus, in the given lines of one source only. Language only: no comparison, no structure.",
    levels: L4(1, 3, 4, 6, 7, 9, 10, 12),
    descriptors: LANGUAGE_DESCRIPTORS("10-12", "7-9", "4-6", "1-3"),
    guidance: `${READING_LADDER}
CAP: Language from outside the given lines or from the wrong source (with the correct focus) is placed in the level its quality deserves but at the bottom of that level. Level 3 or above needs the correct focus. It is the "how" and "why" of the effect that moves an answer from Level 2 to Level 3.`,
    commonIssues: `Feature spotting; features wrongly labelled. Naming the effect without explaining how or why (stays at Level 2). Restating the quote with a synonym. Comments on sentence forms with nothing to say. Formulaic reader-effect lines. Generalised comments. Misreadings.`,
  },
  P2Q4: {
    id: "P2Q4", paper: "P2", number: 4, title: "Comparing perspectives", marks: 16, aos: "AO3", minutes: 20,
    needsSource: true, isWriting: false,
    focus: "Compare how the writers convey their (different or similar) perspectives, thoughts or feelings, across the whole of both sources, including their methods.",
    levels: L4(1, 4, 5, 8, 9, 12, 13, 16),
    descriptors: `Level 4 "Perceptive, detailed comparison" (13-16): Compares ideas and perspectives in a perceptive way. Analyses how writers' methods are used. Selects a range of judicious supporting detail from both texts. Shows a detailed and perceptive understanding of the different ideas and perspectives in both texts.
Level 3 "Clear, relevant comparison" (9-12): Compares ideas and perspectives in a clear and relevant way. Explains clearly how writers' methods are used. Selects relevant detail to support from both texts. Shows a clear understanding of the different ideas and perspectives in both texts.
Level 2 "Some attempts at comparison" (5-8): Attempts to compare ideas and perspectives. Makes some comment on how writers' methods are used. Selects some appropriate textual detail/references, not always supporting, from one or both texts. Shows some understanding of different ideas and perspectives.
Level 1 "Simple, limited comment" (1-4): Makes simple cross reference of ideas and perspectives. Makes simple identification of writers' methods. Selects simple reference(s)/textual detail(s) from one or both texts. Shows simple awareness of ideas and/or perspectives.
Level 0 (0): Nothing to reward.`,
    guidance: `${READING_LADDER}
CAPS: Level 1 quality dealing with one text only = maximum 2. Level 2 quality dealing with one text only = maximum 6. Level 3 or above needs both texts. If writers' methods are not addressed, award only the lower half of the level reached (examiner-report guidance). Answers showing understanding, methods and comparison together sit in the upper half. Level 3 needs like-for-like comparison of the same aspect; mismatched comparisons stay at Level 2. Methods may be implicit. Methods include tone, first-person viewpoint, structure and shifts, tense, figurative and sensory language, word choices. Similarities and differences are rewarded equally.`,
    commonIssues: `No comment on writers' methods. Perspective identified with a single adjective and not explained (stays Level 2). "Positive versus negative" comparisons (Level 1). Mismatched comparisons. Method-heavy answers that lose the perspectives. Context bolted on. Treating Question 4 like Question 2.`,
  },
  P2Q5: {
    id: "P2Q5", paper: "P2", number: 5, title: "Writing a viewpoint", marks: 40, aos: "AO5 (24) + AO6 (16)", minutes: 45,
    needsSource: false, isWriting: true,
    focus: "Argue a point of view on a statement in a given form (article, letter, speech, essay) for a given audience.",
    levels: [
      { name: "Lower Level 1", min: 1, max: 3 }, { name: "Upper Level 1", min: 4, max: 6 },
      { name: "Lower Level 2", min: 7, max: 9 }, { name: "Upper Level 2", min: 10, max: 12 },
      { name: "Lower Level 3", min: 13, max: 15 }, { name: "Upper Level 3", min: 16, max: 18 },
      { name: "Lower Level 4", min: 19, max: 21 }, { name: "Upper Level 4", min: 22, max: 24 },
    ],
    descriptors: AO5_AO6,
    guidance: `${WRITING_GUIDANCE}
Students may use ideas from the sources, but the response should be their own. Reward clear awareness of form, audience and purpose. Wholly pre-prepared generic templates with the topic word slotted in cannot reach the higher bands. Invented statistics and checklists of rhetorical devices detract rather than add. Specific examples develop an argument towards Level 3; generalised arguments are typical of Level 2.`,
    commonIssues: `Excessive length that loses cohesion. Shoe-horned "ambitious" vocabulary that does not match register, often misspelt. Invented statistics; device checklists. Formulaic openers ("Picture this..."); pre-prepared quotations. Generic templates. Generalised arguments without specific examples. Drifting off-topic. Ignoring audience and form. Random order, no topic sentences. AO6: little sentence variety and narrow punctuation; weak agreement over long pieces; missing demarcation (especially typed); punctuation used as a checklist; misspelt sophisticated words.`,
  },
};

export const PAPER_QUESTIONS: Record<Paper, number[]> = { P1: [1, 2, 3, 4, 5], P2: [1, 2, 3, 4, 5] };

export const paperName = (p: Paper) => (p === "P1" ? "Paper 1: Explorations in Creative Reading and Writing" : "Paper 2: Writers' Viewpoints and Perspectives");

/** Level label for a mark. For Q5 the AO5 band is used (AO6 has no sub-bands). */
export function levelFor(paper: Paper, q: number, mark: number, ao5?: number | null, ao6?: number | null): string | null {
  const spec = QUESTIONS[qid(paper, q)];
  if (!spec.levels.length) return "n/a";
  const value = spec.isWriting ? ao5 ?? null : mark;
  if (value == null) return null;
  if (value <= 0) return "Level 0";
  const lvl = spec.levels.find((l) => value >= l.min && value <= l.max);
  if (!lvl) return null;
  if (spec.isWriting && ao6 != null) {
    const ao6Level = ao6 >= 13 ? 4 : ao6 >= 9 ? 3 : ao6 >= 5 ? 2 : ao6 >= 1 ? 1 : 0;
    return `AO5 ${lvl.name} / AO6 Level ${ao6Level}`;
  }
  return lvl.name;
}

/** Simple whole-number level (1-4) used for analysis across years. */
export function levelNumber(paper: Paper, q: number, mark: number): number | null {
  const spec = QUESTIONS[qid(paper, q)];
  if (!spec.levels.length) return null;
  if (spec.isWriting) {
    // Use the combined mark scaled to AO5 bands for historical data without AO split.
    const scaled = (mark / 40) * 24;
    return scaled >= 19 ? 4 : scaled >= 13 ? 3 : scaled >= 7 ? 2 : scaled >= 1 ? 1 : 0;
  }
  if (mark <= 0) return 0;
  const lvl = spec.levels.find((l) => mark >= l.min && mark <= l.max);
  return lvl ? Number(lvl.name.replace(/\D/g, "")) : null;
}
