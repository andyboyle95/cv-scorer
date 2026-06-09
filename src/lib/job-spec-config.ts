// ---------------------------------------------------------------------------
// Job Spec Creator — configuration, option lists, conditional logic and DiSC
// mapping. Everything that drives "if x then y" guidance for the AI lives here
// so the rules can be tuned in one place without touching the form or prompts.
// ---------------------------------------------------------------------------

export interface Option {
  value: string;
  label: string;
  /** Optional longer description shown under the label (job function cards). */
  description?: string;
}

// --- 2) Industry (dropdown of 15) ------------------------------------------
export const INDUSTRIES: Option[] = [
  { value: "technology", label: "Technology, Software & IT" },
  { value: "manufacturing", label: "Manufacturing & Engineering" },
  { value: "construction", label: "Construction & Building Products" },
  { value: "financial", label: "Financial Services & Insurance" },
  { value: "medical", label: "Medical, Healthcare & Pharmaceutical" },
  { value: "fmcg", label: "FMCG, Food & Drink" },
  { value: "logistics", label: "Logistics, Transport & Supply Chain" },
  { value: "professional", label: "Professional & Business Services" },
  { value: "media", label: "Media, Marketing & Advertising" },
  { value: "telecoms", label: "Telecommunications" },
  { value: "energy", label: "Energy, Utilities & Renewables" },
  { value: "recruitment", label: "Recruitment & HR Services" },
  { value: "retail", label: "Retail & E-commerce" },
  { value: "automotive", label: "Automotive" },
  { value: "chemicals", label: "Chemicals & Industrial Supplies" },
];

// --- 3) Working arrangement -------------------------------------------------
export const WORKING_ARRANGEMENTS: Option[] = [
  {
    value: "office",
    label: "Office-based",
    description: "Primarily based in the office, with some off-site meetings",
  },
  {
    value: "office-field",
    label: "Office-based with frequent field visits",
    description: "Office-based but with many off-site meetings",
  },
  {
    value: "hybrid",
    label: "Hybrid",
    description: "A mix of office and home working",
  },
  {
    value: "remote",
    label: "Remote",
    description:
      "Home-based, with no field visits or only very occasional off-site meetings",
  },
  {
    value: "field",
    label: "Field-based",
    description: "Based in the field and working from home",
  },
];

// --- 4) Job function (the core driver of the spec) --------------------------
export const JOB_FUNCTIONS: Option[] = [
  {
    value: "f2f-hunter",
    label: 'Face-to-Face (Field) Sales New Business "Hunters"',
    description:
      "Finding and closing deals with brand-new customers. Resilience to rejection. Titles: BDM, Field Sales Executive, Account Executive.",
  },
  {
    value: "f2f-farmer",
    label: 'Face-to-Face (Field) Sales Relationship Management "Farmers"',
    description:
      "Nurturing existing accounts so they stay loyal and spend more over time. Titles: Account Manager, KAM, NAM, Customer Success Manager.",
  },
  {
    value: "f2f-hunter-farmer",
    label: 'Face-to-Face (Field) Sales "Hunter/Farmer"',
    description:
      "A mix of new business and account management. High-impact, relies on personal presence and networking. Titles: Field Sales Executive, Account Executive, Regional Sales.",
  },
  {
    value: "f2f-technical",
    label: "Face-to-Face (Field) Technical Sales",
    description:
      "Products needing deep knowledge (software, engineering, chemicals). Problem-solver first, salesperson second.",
  },
  {
    value: "f2f-regulated",
    label: "Face-to-Face (Field) Highly Regulated Sales",
    description:
      "Selling products governed by strict laws (financial services, medical devices). Accuracy and ethics are as important as the sale.",
  },
  {
    value: "internal-lead-gen",
    label: "Internal Sales Lead Generation & Prospecting (Outbound)",
    description:
      'Making the first move. Identifying potential leads and "warming them up" for the senior sales team. Titles: SDR, BDR.',
  },
  {
    value: "internal-inbound",
    label: "Internal Sales Inbound New Business",
    description:
      'Dealing with "warm" leads—people who have already expressed interest. Titles: Inbound Sales Executive, Lead Qualifier.',
  },
  {
    value: "internal-relationship",
    label: "Internal Relationship Management",
    description:
      "Managing a high volume of smaller accounts from a desk. Efficiency and keeping the customer happy without the travel costs of field sales.",
  },
  {
    value: "internal-technical",
    label: "Internal Technical & Regulated",
    description:
      'Like their face-to-face counterparts, but remote. Often support the field team by handling the "nitty-gritty" of a complex quote or compliance check.',
  },
  {
    value: "support-customer-service",
    label: "Support & Customer Service",
    description:
      'The "engine room" of the sales department. Delivering the promises salespeople make, resolving complaints and preventing customers from leaving.',
  },
  {
    value: "leadership-manager",
    label: "Sales Leadership: Sales Manager / Head of Sales",
    description:
      'Tactical leadership. Hire, coach and motivate the team while ensuring they hit targets. They manage the "people".',
  },
  {
    value: "leadership-director",
    label: "Sales Leadership: Sales Director / CSO / CRO",
    description:
      'Strategic leadership at Board level. Long-term growth, overall turnover and how sales fits the wider business strategy. They manage the "profit".',
  },
];

// --- 5) Number of accounts managed -----------------------------------------
export const ACCOUNT_VOLUMES: Option[] = [
  { value: "none", label: "None - all new business" },
  { value: "single", label: "A single account (National Account, Key Account)" },
  { value: "few", label: "A few Key Accounts (less than 10)" },
  { value: "50plus", label: "More than 50 accounts" },
  { value: "100plus", label: "More than 100 accounts" },
  { value: "250plus", label: "More than 250 accounts" },
];

// --- 6) Seniority -----------------------------------------------------------
export const SENIORITIES: Option[] = [
  { value: "entry", label: "Entry level / junior sales" },
  { value: "mid", label: "Mid Level - 2 years plus sales experience required" },
  {
    value: "experienced",
    label: "Experienced - 5 years plus sales experience required",
  },
  {
    value: "highly-experienced",
    label: "Highly Experienced - 10 years plus sales experience required",
  },
];

// --- 7) Transactional -------------------------------------------------------
export const TRANSACTIONAL: Option[] = [
  { value: "yes", label: "Yes — selling 'off the shelf' / brochure products" },
  { value: "no", label: "No — consultative / solution-based selling" },
];

// --- 8) Who the role sells into --------------------------------------------
export const SELLING_INTO: Option[] = [
  { value: "end-users", label: "End Users" },
  {
    value: "channel",
    label: "Channel / Resellers / Retailers / Wholesalers / Distributors",
  },
  { value: "mix", label: "Mix of Both" },
];

// --- 9) Lead generation -----------------------------------------------------
export const LEAD_GENERATION: Option[] = [
  { value: "self", label: "Self-generated — the individual finds their own leads" },
  { value: "provided", label: "Most leads are provided" },
  { value: "mix", label: "A mix of self-generated and provided" },
];

// --- 11) Length of sales cycle ---------------------------------------------
export const SALES_CYCLES: Option[] = [
  { value: "one-call", label: "One-call close / same day" },
  { value: "short", label: "Short — up to 1 month" },
  { value: "medium", label: "Medium — 1 to 3 months" },
  { value: "long", label: "Long — 3 to 6 months" },
  { value: "complex", label: "Complex — 6 months or more" },
];

// --- 12) Average order value -----------------------------------------------
export const ORDER_VALUES: Option[] = [
  { value: "sub-1k", label: "A few hundred to £1,000" },
  { value: "1k-10k", label: "£1,000 – £10,000" },
  { value: "10k-50k", label: "£10,000 – £50,000" },
  { value: "50k-200k", label: "£50,000 – £200,000" },
  { value: "200k-plus", label: "£200,000+" },
];

// --- 13) Point of contact ---------------------------------------------------
export const POINTS_OF_CONTACT: Option[] = [
  { value: "manager-hod", label: "Manager / Head of Department" },
  { value: "procurement", label: "Procurement / Professional Buyers" },
  { value: "director-small", label: "Director of small companies" },
  {
    value: "exec-large",
    label: "Executive / Board Director of larger companies",
  },
];

// --- 10) Personal qualities (sliders 1–5) ----------------------------------
export interface PersonalQuality {
  key: string;
  label: string;
}

export const PERSONAL_QUALITIES: PersonalQuality[] = [
  { key: "compliant", label: "Compliant" },
  { key: "targetOriented", label: "Target-oriented" },
  { key: "serviceOriented", label: "Service-oriented" },
  { key: "stubbornness", label: "Stubbornness" },
  { key: "agreeable", label: "Agreeable" },
  { key: "friendliness", label: "Friendliness" },
  { key: "meticulous", label: "Meticulous" },
  { key: "dominant", label: "Dominant" },
  { key: "fastPaced", label: "Fast Paced" },
  { key: "supportive", label: "Supportive" },
  { key: "autonomous", label: "Autonomous / Independent" },
];

// ---------------------------------------------------------------------------
// Label lookup helper
// ---------------------------------------------------------------------------
export function labelFor(options: Option[], value: string | undefined): string {
  if (!value) return "";
  return options.find((o) => o.value === value)?.label ?? value;
}

// ---------------------------------------------------------------------------
// DiSC profiling
// ---------------------------------------------------------------------------
// Each job function has a base DiSC tendency. Sliders then nudge the profile.
// D = Dominance (direct, results, competitive)
// i = Influence (outgoing, persuasive, relationship)
// S = Steadiness (patient, supportive, dependable)
// C = Conscientiousness (analytical, accurate, compliant)
// ---------------------------------------------------------------------------
export type Disc = "D" | "i" | "S" | "C";

const JOB_FUNCTION_DISC: Record<string, Record<Disc, number>> = {
  "f2f-hunter": { D: 5, i: 3, S: 0, C: 1 },
  "f2f-farmer": { D: 1, i: 4, S: 4, C: 1 },
  "f2f-hunter-farmer": { D: 3, i: 4, S: 2, C: 1 },
  "f2f-technical": { D: 2, i: 1, S: 2, C: 5 },
  "f2f-regulated": { D: 1, i: 1, S: 3, C: 5 },
  "internal-lead-gen": { D: 4, i: 3, S: 1, C: 1 },
  "internal-inbound": { D: 2, i: 4, S: 3, C: 1 },
  "internal-relationship": { D: 1, i: 3, S: 4, C: 2 },
  "internal-technical": { D: 1, i: 1, S: 3, C: 5 },
  "support-customer-service": { D: 0, i: 2, S: 5, C: 3 },
  "leadership-manager": { D: 4, i: 4, S: 2, C: 1 },
  "leadership-director": { D: 5, i: 2, S: 1, C: 3 },
};

// How each personal-quality slider (value 1–5, centred on 3) shifts DiSC.
const QUALITY_DISC: Record<string, Partial<Record<Disc, number>>> = {
  compliant: { C: 1, S: 0.5 },
  targetOriented: { D: 1 },
  serviceOriented: { S: 1 },
  stubbornness: { D: 0.7, C: 0.7, i: -0.5, S: -0.5 },
  agreeable: { S: 0.7, i: 0.5, D: -0.5 },
  friendliness: { i: 1 },
  meticulous: { C: 1 },
  dominant: { D: 1, S: -0.5 },
  fastPaced: { D: 0.7, i: 0.5, S: -0.5 },
  supportive: { S: 1 },
  autonomous: { D: 0.7, C: 0.5 },
};

const DISC_DESCRIPTORS: Record<Disc, string> = {
  D: "results-driven, direct, competitive and comfortable making decisions and taking the lead",
  i: "outgoing, enthusiastic, persuasive and naturally builds rapport and a strong network",
  S: "patient, dependable, supportive and excellent at nurturing long-term relationships",
  C: "analytical, precise, process-driven and diligent about accuracy, detail and compliance",
};

export interface DiscProfile {
  scores: Record<Disc, number>;
  /** Primary + secondary letters, e.g. "Di". */
  type: string;
  /** Human-readable summary for the prompt. */
  summary: string;
}

export interface JobSpecAnswers {
  jobTitle: string;
  industry: string;
  workingArrangement: string;
  jobFunction: string;
  accountVolume: string;
  seniority: string;
  transactional: string;
  sellingInto: string;
  leadGeneration: string;
  qualities: Record<string, number>;
  salesCycle: string;
  orderValue: string;
  pointOfContact: string;
  additionalNotes: string;
  name: string;
  email: string;
  companyUrl: string;
}

export function deriveDiscProfile(answers: JobSpecAnswers): DiscProfile {
  const base = JOB_FUNCTION_DISC[answers.jobFunction] ?? {
    D: 2,
    i: 2,
    S: 2,
    C: 2,
  };
  const scores: Record<Disc, number> = { ...base };

  for (const [key, value] of Object.entries(answers.qualities ?? {})) {
    const weights = QUALITY_DISC[key];
    if (!weights) continue;
    // Centre slider on 3 → range of -2..+2 multiplier.
    const intensity = (value - 3) / 2;
    for (const [letter, weight] of Object.entries(weights)) {
      scores[letter as Disc] += weight * intensity * 2;
    }
  }

  // Rank the letters by score.
  const ranked = (Object.entries(scores) as [Disc, number][])
    .sort((a, b) => b[1] - a[1])
    .map(([letter]) => letter);

  const primary = ranked[0];
  const secondary = ranked[1];
  const type = `${primary}${secondary.toLowerCase()}`;

  const summary =
    `Dominant style "${type}". This person is primarily ${DISC_DESCRIPTORS[primary]}, ` +
    `with a strong secondary tendency to be ${DISC_DESCRIPTORS[secondary]}.`;

  return { scores, type, summary };
}

// ---------------------------------------------------------------------------
// Conditional ("if x then y") brief signals.
// Each rule inspects the answers and, when it fires, contributes a guidance
// line that is injected into the AI prompt. Edit/extend rules freely.
// ---------------------------------------------------------------------------
type SignalRule = (a: JobSpecAnswers) => string | null;

const SIGNAL_RULES: SignalRule[] = [
  // 7) Transactional
  (a) =>
    a.transactional === "yes"
      ? "Transactional sale: emphasise pace, activity levels, pipeline volume, resilience and the ability to close quickly. Keep product-knowledge requirements light and lead with energy and consistency."
      : a.transactional === "no"
      ? "Consultative / solution sale: emphasise discovery, needs analysis, stakeholder management, commercial acumen and the ability to articulate value and ROI rather than push product."
      : null,

  // 11) Sales cycle
  (a) => {
    if (a.salesCycle === "one-call" || a.salesCycle === "short")
      return "Short sales cycle: prioritise high activity, fast decision-making, tenacity and comfort with a high volume of opportunities.";
    if (a.salesCycle === "long" || a.salesCycle === "complex")
      return "Long sales cycle: prioritise patience, pipeline discipline, multi-threading across stakeholders, forecasting accuracy and the resilience to nurture deals over many months.";
    return null;
  },

  // 12) Order value
  (a) => {
    if (a.orderValue === "sub-1k" || a.orderValue === "1k-10k")
      return "Lower average order value: success comes from volume and efficiency — frame targets around activity, conversion rates and number of deals.";
    if (a.orderValue === "50k-200k" || a.orderValue === "200k-plus")
      return "High average order value: this is a strategic, high-stakes sale — emphasise board-level credibility, complex negotiation, business cases and the gravitas to handle large commitments.";
    return null;
  },

  // 13) Point of contact — each implies a very different selling approach
  (a) => {
    if (a.pointOfContact === "manager-hod")
      return "Sells to Managers / Heads of Department: emphasise practical, operational conversations, solving day-to-day problems for the people who actually use the product, and building rapport with departmental budget-holders rather than pitching high-level strategy.";
    if (a.pointOfContact === "procurement")
      return "Sells to Procurement / professional Buyers: this is a commercially hard-nosed, process-driven sale. Emphasise commercial acumen, negotiation, defending margin and value (total cost of ownership, not just price), navigating tenders/RFPs and frameworks, and the resilience to handle professional buyers whose job is to drive the price down.";
    if (a.pointOfContact === "director-small")
      return "Sells to owner-Directors of small companies: decisions are made quickly by one pragmatic person who is spending their own money. Emphasise building personal trust and rapport, clear and fast ROI, flexibility, and speaking the language of an entrepreneur who wears many hats — not corporate process.";
    if (a.pointOfContact === "exec-large")
      return "Sells to Executive / Board Directors of larger companies: a strategic, high-stakes, often long and committee-driven sale. Emphasise gravitas and board-level credibility, building a compelling business case, articulating strategic and commercial outcomes, and the patience to navigate multiple senior stakeholders and procurement in parallel.";
    return null;
  },

  // 9) Lead generation
  (a) => {
    if (a.leadGeneration === "self")
      return "Self-generated leads: prospecting, business development and self-motivation are critical — the person must be comfortable building pipeline from a standing start.";
    if (a.leadGeneration === "provided")
      return "Leads are provided: emphasise conversion, qualification and closing skill rather than cold prospecting.";
    return null;
  },

  // 8) Route to market
  (a) => {
    if (a.sellingInto === "channel")
      return "Sells through the channel (resellers / distributors / wholesalers): emphasise channel management, partner enablement, indirect influence and managing sell-through rather than direct end-user selling.";
    if (a.sellingInto === "mix")
      return "Sells to both end users and the channel: the candidate needs the versatility to manage direct relationships and partner/channel relationships simultaneously.";
    return null;
  },

  // 5) Account volume — nuances the job function
  (a) => {
    if (a.accountVolume === "none")
      return "No existing accounts — 100% new business: lead the spec with hunting, prospecting and new-logo acquisition.";
    if (a.accountVolume === "single" || a.accountVolume === "few")
      return "A small number of strategic key accounts: emphasise depth, relationship management, account planning and growing share-of-wallet within a few important customers.";
    if (a.accountVolume === "100plus" || a.accountVolume === "250plus")
      return "A very high volume of accounts: emphasise organisation, prioritisation, efficient territory/time management and the ability to manage many relationships at once rather than deep single-account focus.";
    return null;
  },

  // 6) Seniority — nuances tone and requirements
  (a) => {
    if (a.seniority === "entry")
      return "Entry-level / junior: focus on attitude, coachability and potential. Keep hard experience requirements minimal and emphasise training and development on offer.";
    if (a.seniority === "highly-experienced")
      return "Highly experienced (10+ years): expect a proven track record, autonomy, a relevant network and the ability to operate with minimal supervision; pitch responsibilities and ambition accordingly.";
    return null;
  },

  // 3) Working arrangement
  (a) => {
    if (a.workingArrangement === "remote" || a.workingArrangement === "field")
      return "Predominantly home/field-based: emphasise self-discipline, autonomy and the ability to stay productive and motivated without daily office structure.";
    return null;
  },
];

export function deriveBriefSignals(answers: JobSpecAnswers): string[] {
  return SIGNAL_RULES.map((rule) => rule(answers)).filter(
    (s): s is string => Boolean(s)
  );
}
