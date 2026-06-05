import {
  ACCOUNT_VOLUMES,
  INDUSTRIES,
  JOB_FUNCTIONS,
  LEAD_GENERATION,
  ORDER_VALUES,
  POINTS_OF_CONTACT,
  PERSONAL_QUALITIES,
  SALES_CYCLES,
  SELLING_INTO,
  SENIORITIES,
  TRANSACTIONAL,
  WORKING_ARRANGEMENTS,
  deriveBriefSignals,
  deriveDiscProfile,
  labelFor,
  type JobSpecAnswers,
} from "./job-spec-config";

export const JOB_SPEC_SYSTEM_PROMPT = `You are an expert sales recruitment consultant and copywriter with 15+ years of experience writing job specifications and person specifications for specialist sales roles.

Your task is to produce TWO things from a structured brief:
1. A JOB SPEC — what the role is and what the company needs (responsibilities, experience, skills).
2. A PERSON SPEC — the ideal behavioural profile of the person who will thrive, grounded in DiSC profiling.

Guidance:
- The selected JOB FUNCTION is the primary driver of the job description. Everything else (number of accounts, seniority, transactional vs consultative, route to market, sales cycle, order value, point of contact and lead generation) NUANCES and sharpens the brief — weave these signals in naturally.
- Write in clear, professional, engaging British English. Avoid clichés and filler ("dynamic self-starter", "rockstar"). Be specific and concrete.
- Tailor seniority of language and expectations to the experience level provided.
- For the PERSON SPEC, use the supplied DiSC guidance as the backbone. Explain the ideal style in plain English a hiring manager would understand, and be honest about which personality types would struggle.
- Use the company website content (if provided) to write the opening statement in the form "X company is...". If no usable content is provided, write a sensible, generic-but-credible opener based on the industry. Never invent specific facts (awards, figures, client names) that are not supported by the supplied content.
- Use the additional notes to sprinkle in role/business specifics where relevant, and treat any mandatory requirements stated there as essential.
- Keep bullets crisp (one line each where possible). Return everything via the provided tool.`;

// Shared brief context block used by both full generation and per-section
// regeneration so the AI always reasons from the same inputs.
function buildBriefContext(
  answers: JobSpecAnswers,
  websiteContent: string
): string {
  const disc = deriveDiscProfile(answers);
  const signals = deriveBriefSignals(answers);

  const qualitiesLines = PERSONAL_QUALITIES.map((q) => {
    const v = answers.qualities?.[q.key] ?? 3;
    return `  - ${q.label}: ${v}/5`;
  }).join("\n");

  const signalsBlock = signals.length
    ? signals.map((s) => `  - ${s}`).join("\n")
    : "  - (no additional conditional signals)";

  const website = websiteContent.trim()
    ? `<company_website_content>\n${websiteContent.trim().slice(0, 3500)}\n</company_website_content>`
    : `<company_website_content>None supplied — write a credible generic opener for a ${labelFor(
        INDUSTRIES,
        answers.industry
      )} business.</company_website_content>`;

  return `<brief>
<job_title>${answers.jobTitle}</job_title>
<industry>${labelFor(INDUSTRIES, answers.industry)}</industry>
<working_arrangement>${labelFor(
    WORKING_ARRANGEMENTS,
    answers.workingArrangement
  )}</working_arrangement>
<job_function>${labelFor(JOB_FUNCTIONS, answers.jobFunction)}</job_function>
<accounts_managed>${labelFor(ACCOUNT_VOLUMES, answers.accountVolume)}</accounts_managed>
<seniority>${labelFor(SENIORITIES, answers.seniority)}</seniority>
<transactional>${labelFor(TRANSACTIONAL, answers.transactional)}</transactional>
<selling_into>${labelFor(SELLING_INTO, answers.sellingInto)}</selling_into>
<lead_generation>${labelFor(LEAD_GENERATION, answers.leadGeneration)}</lead_generation>
<sales_cycle>${labelFor(SALES_CYCLES, answers.salesCycle)}</sales_cycle>
<average_order_value>${labelFor(ORDER_VALUES, answers.orderValue)}</average_order_value>
<point_of_contact>${labelFor(POINTS_OF_CONTACT, answers.pointOfContact)}</point_of_contact>
</brief>

<personal_qualities_importance scale="1=Unimportant, 5=Critical">
${qualitiesLines}
</personal_qualities_importance>

<disc_guidance>
${disc.summary}
DiSC weighting (higher = stronger): D=${disc.scores.D.toFixed(1)}, i=${disc.scores.i.toFixed(
    1
  )}, S=${disc.scores.S.toFixed(1)}, C=${disc.scores.C.toFixed(1)}.
Use this as the backbone of the person spec.
</disc_guidance>

<conditional_signals>
${signalsBlock}
</conditional_signals>

<additional_notes>
${answers.additionalNotes?.trim() || "(none provided)"}
</additional_notes>

${website}`;
}

export function buildJobSpecPrompt(
  answers: JobSpecAnswers,
  websiteContent: string
): string {
  return `${buildBriefContext(answers, websiteContent)}

Produce the job spec and person spec for this role using the create_job_spec tool. Be concise: 6–8 key responsibilities, 5–7 experience & skills points, up to 4 desirable, up to 5 key behaviours, up to 4 motivational drivers, up to 3 watch-outs. One line per bullet.`;
}

// --- Per-section regeneration ----------------------------------------------
export type SpecSection =
  | "openingStatement"
  | "roleOverview"
  | "keyResponsibilities"
  | "experienceAndSkills"
  | "desirable"
  | "behaviouralSummary"
  | "discProfile"
  | "keyBehaviours"
  | "motivationalDrivers"
  | "watchOuts";

export const SECTION_META: Record<
  SpecSection,
  { label: string; type: "prose" | "list"; instruction: string }
> = {
  openingStatement: {
    label: "Opening statement",
    type: "prose",
    instruction:
      "Write a fresh opening statement in the form 'X company is...' (2–3 sentences) introducing the hiring business, grounded in the supplied website content. Never invent specific facts.",
  },
  roleOverview: {
    label: "The role",
    type: "prose",
    instruction:
      "Write a fresh 2–4 sentence summary of the purpose of this role.",
  },
  keyResponsibilities: {
    label: "Key responsibilities",
    type: "list",
    instruction:
      "Write 6–8 fresh, concise bullet points describing what the person will do.",
  },
  experienceAndSkills: {
    label: "Experience & skills",
    type: "list",
    instruction:
      "Write 5–7 fresh bullet points of essential experience, skills and track record required.",
  },
  desirable: {
    label: "Desirable",
    type: "list",
    instruction: "Write up to 4 fresh desirable (nice-to-have) attributes.",
  },
  behaviouralSummary: {
    label: "Behavioural summary",
    type: "prose",
    instruction:
      "Write a fresh 2–4 sentence description of the ideal personality and behavioural profile, grounded in the DiSC guidance.",
  },
  discProfile: {
    label: "DiSC profile",
    type: "prose",
    instruction:
      "Write a fresh plain-English explanation of the ideal DiSC profile and why it fits this role.",
  },
  keyBehaviours: {
    label: "Key behaviours",
    type: "list",
    instruction:
      "Write up to 5 fresh behavioural competencies that matter most for this role.",
  },
  motivationalDrivers: {
    label: "Motivational drivers",
    type: "list",
    instruction:
      "Write up to 4 fresh points describing what motivates a person who thrives in this role.",
  },
  watchOuts: {
    label: "Watch-outs",
    type: "list",
    instruction:
      "Write up to 3 fresh points describing personality types or traits that would struggle in this role.",
  },
};

export function buildSectionPrompt(
  answers: JobSpecAnswers,
  websiteContent: string,
  section: SpecSection
): string {
  const meta = SECTION_META[section];
  return `${buildBriefContext(answers, websiteContent)}

You are regenerating ONLY the "${meta.label}" section of this job/person spec.
${meta.instruction}
Return it using the write_section tool. One line per bullet, no numbering.`;
}
