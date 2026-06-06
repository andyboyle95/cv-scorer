"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Check, ChevronDown, List, Loader2 } from "lucide-react";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";
import { Slider } from "@/ui/slider";
import { cn } from "@/lib/utils";
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
  type Option,
} from "@/lib/job-spec-config";

const qualitiesShape = PERSONAL_QUALITIES.reduce(
  (acc, q) => ({ ...acc, [q.key]: z.number().min(1).max(5) }),
  {} as Record<string, z.ZodNumber>
);

const schema = z.object({
  jobTitle: z.string().min(1, "Please enter a job title"),
  industry: z.string().min(1, "Please choose an industry"),
  workingArrangement: z.string().min(1, "Please choose an option"),
  jobFunction: z.string().min(1, "Please choose a job function"),
  accountVolume: z.string().min(1, "Please choose an option"),
  seniority: z.string().min(1, "Please choose an option"),
  transactional: z.string().min(1, "Please choose an option"),
  sellingInto: z.string().min(1, "Please choose an option"),
  leadGeneration: z.string().min(1, "Please choose an option"),
  qualities: z.object(qualitiesShape),
  salesCycle: z.string().min(1, "Please choose an option"),
  orderValue: z.string().min(1, "Please choose an option"),
  pointOfContact: z.string().min(1, "Please choose an option"),
  additionalNotes: z.string().default(""),
  name: z.string().min(1, "Please enter your name"),
  email: z.string().email("Please enter a valid email"),
  companyUrl: z.string().min(1, "Please enter your company website"),
});

export type JobSpecFormData = z.infer<typeof schema>;

const defaultQualities = PERSONAL_QUALITIES.reduce(
  (acc, q) => ({ ...acc, [q.key]: 3 }),
  {} as Record<string, number>
);

// Sample data used by the "Fill test data" button (?test=1 only).
const PRESET: JobSpecFormData = {
  jobTitle: "Business Development Manager",
  industry: "technology",
  workingArrangement: "hybrid",
  jobFunction: "f2f-hunter",
  accountVolume: "none",
  seniority: "experienced",
  transactional: "no",
  sellingInto: "end-users",
  leadGeneration: "self",
  qualities: {
    ...defaultQualities,
    targetOriented: 5,
    dominant: 4,
    autonomous: 5,
    friendliness: 4,
    fastPaced: 4,
    meticulous: 2,
    compliant: 2,
  },
  salesCycle: "medium",
  orderValue: "10k-50k",
  pointOfContact: "director",
  additionalNotes:
    "Must have experience selling SaaS into financial services. £55k base, £90k OTE, car allowance.",
  name: "Andy Boyle",
  email: "andyboyleaw@gmail.com",
  companyUrl: "www.aaronwallis.co.uk",
};

// Word + colour for each importance level (index by slider value 1–5).
const IMPORTANCE = [
  null,
  { word: "Unimportant", className: "bg-gray-100 text-gray-500" },
  { word: "Minor", className: "bg-sky-100 text-sky-700" },
  { word: "Moderate", className: "bg-blue-100 text-blue-700" },
  { word: "Important", className: "bg-pink-100 text-[#df2681]" },
  { word: "Critical", className: "bg-[#df2681] text-white" },
] as const;

// Each step lists its short title and the field name(s) to validate.
const STEPS: { title: string; fields: (keyof JobSpecFormData)[] }[] = [
  { title: "Job title", fields: ["jobTitle"] },
  { title: "Industry", fields: ["industry"] },
  { title: "Working arrangement", fields: ["workingArrangement"] },
  { title: "Job function", fields: ["jobFunction"] },
  { title: "Accounts managed", fields: ["accountVolume"] },
  { title: "Seniority", fields: ["seniority"] },
  { title: "Transactional", fields: ["transactional"] },
  { title: "Selling into", fields: ["sellingInto"] },
  { title: "Lead generation", fields: ["leadGeneration"] },
  { title: "Personal qualities", fields: ["qualities"] },
  { title: "Sales cycle", fields: ["salesCycle"] },
  { title: "Average order value", fields: ["orderValue"] },
  { title: "Point of contact", fields: ["pointOfContact"] },
  { title: "Additional notes", fields: ["additionalNotes"] },
  { title: "Your details", fields: ["name", "email", "companyUrl"] },
];

// Steps that are always considered "complete" (optional or pre-filled).
const OPTIONAL_FIELDS = new Set(["additionalNotes", "qualities"]);

interface JobSpecFormProps {
  onSubmit: (data: JobSpecFormData) => void;
  submitting?: boolean;
  /** Pre-fill the wizard (used when returning to "Edit answers"). */
  initialValues?: JobSpecFormData;
}

export function JobSpecForm({
  onSubmit,
  submitting,
  initialValues,
}: JobSpecFormProps) {
  const [step, setStep] = useState(0);
  const [contentsOpen, setContentsOpen] = useState(false);

  const [showTest, setShowTest] = useState(false);

  // Only expose the test button when the URL has ?test=1 (kept out of the
  // way of real leads). Done in an effect to avoid a hydration mismatch.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("test")) {
      setShowTest(true);
    }
  }, []);

  const {
    register,
    handleSubmit,
    control,
    trigger,
    reset,
    getValues,
    formState: { errors },
  } = useForm<JobSpecFormData>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: initialValues ?? {
      jobTitle: "",
      industry: "",
      workingArrangement: "",
      jobFunction: "",
      accountVolume: "",
      seniority: "",
      transactional: "",
      sellingInto: "",
      leadGeneration: "",
      qualities: defaultQualities,
      salesCycle: "",
      orderValue: "",
      pointOfContact: "",
      additionalNotes: "",
      name: "",
      email: "",
      companyUrl: "",
    },
  });

  const isLast = step === STEPS.length - 1;

  const next = async () => {
    const valid = await trigger(STEPS[step].fields);
    if (!valid) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const back = () => setStep((s) => Math.max(s - 1, 0));

  const fillTestData = () => {
    reset(PRESET);
    setStep(STEPS.length - 1);
  };

  // If the final submit fails validation, jump to the first step that has an
  // error so the user can see and fix it (instead of nothing happening).
  const goToFirstError = (formErrors: typeof errors) => {
    const erroredKeys = Object.keys(formErrors);
    const target = STEPS.findIndex((s) =>
      s.fields.some((f) => erroredKeys.includes(f as string))
    );
    if (target >= 0) setStep(target);
  };

  const isStepComplete = (idx: number) => {
    const values = getValues();
    return STEPS[idx].fields.every((f) => {
      if (OPTIONAL_FIELDS.has(f as string)) return true;
      const v = values[f];
      return typeof v === "string" ? v.trim().length > 0 : Boolean(v);
    });
  };

  const goToStep = (idx: number) => {
    setStep(idx);
    setContentsOpen(false);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit, goToFirstError)}
      className="w-full max-w-5xl mx-auto"
      onKeyDown={(e) => {
        // Prevent Enter from submitting early on intermediate steps.
        if (e.key === "Enter" && !isLast) {
          e.preventDefault();
          next();
        }
      }}
    >
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Sidebar — Aaron Wallis branding + contents navigation */}
        <aside className="lg:w-64 shrink-0">
          <div className="lg:sticky lg:top-6 space-y-4">
            {/* Branding */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4">
              <Image
                src="/aaron-wallis-logo.png"
                alt="Aaron Wallis"
                width={180}
                height={56}
                className="h-9 w-auto object-contain"
                unoptimized
                priority
              />
              <h1 className="mt-3 text-base font-semibold text-[#1a3668]">
                Job Spec Creator
              </h1>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                Build a tailored job &amp; person spec for your sales role.
              </p>
            </div>

            {/* Desktop contents */}
            {!submitting && (
              <nav className="hidden lg:block bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-2">
                <p className="px-2 pt-1 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Contents
                </p>
                <ol className="space-y-0.5">
                  {STEPS.map((s, i) => (
                    <li key={s.title}>
                      <StepNavButton
                        index={i}
                        title={s.title}
                        active={i === step}
                        complete={isStepComplete(i)}
                        onClick={() => setStep(i)}
                      />
                    </li>
                  ))}
                </ol>
              </nav>
            )}

            {/* Mobile contents (collapsible) */}
            {!submitting && (
              <div className="lg:hidden">
                <button
                  type="button"
                  onClick={() => setContentsOpen((o) => !o)}
                  className="w-full flex items-center justify-between gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-medium text-[#1a3668] shadow-sm hover:bg-gray-50"
                >
                  <span className="flex items-center gap-2">
                    <List className="h-4 w-4" /> Contents — {STEPS[step].title}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${contentsOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {contentsOpen && (
                  <ol className="mt-2 rounded-lg border border-[#E2E8F0] bg-white shadow-sm p-2 space-y-0.5">
                    {STEPS.map((s, i) => (
                      <li key={s.title}>
                        <StepNavButton
                          index={i}
                          title={s.title}
                          active={i === step}
                          complete={isStepComplete(i)}
                          onClick={() => goToStep(i)}
                        />
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Main column */}
        <div className="flex-1 min-w-0">
          {showTest && !submitting && (
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={fillTestData}
                className="text-xs font-semibold text-[#df2681] border border-[#df2681]/40 rounded-md px-3 py-1.5 hover:bg-pink-50 transition-colors"
              >
                Fill test data
              </button>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-[#E2E8F0]">
        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100">
          <div
            className="h-full bg-[#df2681] transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {submitting ? (
          <GeneratingStatus />
        ) : (
          <>
            <div className="p-6 sm:p-10 min-h-[360px]">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#df2681] mb-6">
                Step {step + 1} of {STEPS.length}
              </p>

              {/* key={step} forces each step to mount fresh so Controllers don't
                  share an instance across steps (which dropped earlier answers). */}
              <StepContent
                key={step}
                step={step}
                register={register}
                control={control}
                errors={errors}
              />
            </div>

            {/* Footer nav */}
            <div className="flex items-stretch border-t border-gray-100 bg-[#df2681] text-white">
              <button
                type="button"
                onClick={back}
                disabled={step === 0}
                className="flex-1 flex items-center justify-center gap-2 py-4 px-6 font-semibold tracking-wide uppercase text-sm transition-colors hover:bg-[#C0005A] disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <ArrowLeft className="h-4 w-4" /> Previous
              </button>
              <div className="w-px bg-white/20" />
              {isLast ? (
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 py-4 px-6 font-semibold tracking-wide uppercase text-sm transition-colors hover:bg-[#C0005A]"
                >
                  Create Job Spec
                </button>
              ) : (
                <button
                  type="button"
                  onClick={next}
                  className="flex-1 flex items-center justify-center gap-2 py-4 px-6 font-semibold tracking-wide uppercase text-sm transition-colors hover:bg-[#C0005A]"
                >
                  Next <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </>
        )}
          </div>
        </div>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Contents nav button (shared by desktop sidebar + mobile dropdown)
// ---------------------------------------------------------------------------
function StepNavButton({
  index,
  title,
  active,
  complete,
  onClick,
}: {
  index: number;
  title: string;
  active: boolean;
  complete: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left text-sm transition-colors hover:bg-gray-50 ${
        active ? "bg-pink-50" : ""
      }`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
          active
            ? "bg-[#df2681] text-white"
            : complete
            ? "bg-green-100 text-green-600"
            : "bg-gray-100 text-gray-400"
        }`}
      >
        {complete && !active ? <Check className="h-3 w-3" /> : index + 1}
      </span>
      <span
        className={
          active ? "font-semibold text-[#1a3668]" : "text-gray-600"
        }
      >
        {title}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Generating status — shown inside the wizard card while the AI works.
// ---------------------------------------------------------------------------
const GEN_STEPS = [
  "Reading your brief",
  "Researching the company website",
  "Writing the job specification",
  "Shaping the person specification",
  "Adding the finishing touches",
];

function GeneratingStatus() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((i) => Math.min(i + 1, GEN_STEPS.length - 1));
    }, 6000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="p-6 sm:p-10 min-h-[360px]">
      <div className="flex items-center gap-3 mb-1">
        <Loader2 className="h-5 w-5 animate-spin text-[#df2681]" />
        <h2 className="text-lg font-semibold text-[#1a3668]">
          Building your job spec
        </h2>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        This usually takes around 30 seconds — hang tight.
      </p>

      <ul className="space-y-3">
        {GEN_STEPS.map((s, i) => {
          const done = i < active;
          const current = i === active;
          return (
            <li key={s} className="flex items-center gap-3">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-xs shrink-0 ${
                  done
                    ? "bg-[#df2681] text-white"
                    : current
                    ? "bg-pink-100 text-[#df2681]"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {done ? (
                  <Check className="h-3 w-3" />
                ) : current ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={`text-sm ${
                  done || current ? "text-[#1a3668] font-medium" : "text-gray-400"
                }`}
              >
                {s}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step content
// ---------------------------------------------------------------------------
interface StepProps {
  step: number;
  register: ReturnType<typeof useForm<JobSpecFormData>>["register"];
  control: ReturnType<typeof useForm<JobSpecFormData>>["control"];
  errors: ReturnType<typeof useForm<JobSpecFormData>>["formState"]["errors"];
}

function StepContent({ step, register, control, errors }: StepProps) {
  switch (step) {
    case 0:
      return (
        <Question title="What is the job title that you are recruiting for?">
          <Input
            {...register("jobTitle")}
            placeholder="e.g. Business Development Manager"
            className="h-12 text-base"
            autoFocus
          />
          <FieldError message={errors.jobTitle?.message} />
        </Question>
      );
    case 1:
      return (
        <Question title="What industry do you want to recruit for?">
          <Controller
            name="industry"
            control={control}
            render={({ field }) => (
              <select
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                className="flex h-12 w-full rounded-md border border-input bg-white px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="" disabled>
                  Select an industry…
                </option>
                {INDUSTRIES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}
          />
          <FieldError message={errors.industry?.message} />
        </Question>
      );
    case 2:
      return (
        <RadioStep
          title="What working arrangement best fits the role?"
          name="workingArrangement"
          options={WORKING_ARRANGEMENTS}
          control={control}
          error={errors.workingArrangement?.message}
        />
      );
    case 3:
      return (
        <RadioStep
          title="Describe the job function"
          subtitle="Select the option that best describes the core function of your vacancy"
          name="jobFunction"
          options={JOB_FUNCTIONS}
          control={control}
          error={errors.jobFunction?.message}
        />
      );
    case 4:
      return (
        <RadioStep
          title="Approximately how many accounts is the role managing?"
          name="accountVolume"
          options={ACCOUNT_VOLUMES}
          control={control}
          error={errors.accountVolume?.message}
        />
      );
    case 5:
      return (
        <RadioStep
          title="What is the seniority of the role / level of experience required?"
          name="seniority"
          options={SENIORITIES}
          control={control}
          error={errors.seniority?.message}
        />
      );
    case 6:
      return (
        <RadioStep
          title="Is the role transactional?"
          subtitle="Is it selling 'off the shelf' products or products from a brochure?"
          name="transactional"
          options={TRANSACTIONAL}
          control={control}
          error={errors.transactional?.message}
        />
      );
    case 7:
      return (
        <RadioStep
          title="Who is the role selling into?"
          name="sellingInto"
          options={SELLING_INTO}
          control={control}
          error={errors.sellingInto?.message}
        />
      );
    case 8:
      return (
        <RadioStep
          title="How are leads generated for the individual in this role?"
          name="leadGeneration"
          options={LEAD_GENERATION}
          control={control}
          error={errors.leadGeneration?.message}
        />
      );
    case 9:
      return (
        <Question
          title="Personal qualities"
          subtitle="How important is each quality for the ideal candidate? Drag each slider from Unimportant to Critical."
        >
          {/* Scale legend */}
          <div className="flex items-center justify-between text-[11px] font-medium text-gray-400 mb-6 px-0.5">
            <span>1 · Unimportant</span>
            <span className="hidden sm:inline">3 · Moderate</span>
            <span>5 · Critical</span>
          </div>

          <div className="space-y-6">
            {PERSONAL_QUALITIES.map((q) => (
              <Controller
                key={q.key}
                name={`qualities.${q.key}` as const}
                control={control}
                render={({ field }) => {
                  const value = Number(field.value);
                  const level = IMPORTANCE[value]!;
                  return (
                    <div>
                      <div className="flex items-center justify-between mb-2 gap-3">
                        <span className="text-sm font-medium text-[#1a3668]">
                          {q.label}
                        </span>
                        <span
                          className={cn(
                            "text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap transition-colors",
                            level.className
                          )}
                        >
                          {level.word}
                        </span>
                      </div>
                      <Slider
                        min={1}
                        max={5}
                        step={1}
                        value={[value]}
                        onValueChange={([v]) => field.onChange(v)}
                        aria-label={`${q.label} importance`}
                      />
                      {/* Tick marks */}
                      <div className="flex justify-between px-0.5 mt-1.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => field.onChange(n)}
                            aria-label={`Set ${q.label} to ${n}`}
                            className={cn(
                              "h-1.5 w-1.5 rounded-full transition-colors",
                              n <= value ? "bg-[#df2681]" : "bg-gray-300"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  );
                }}
              />
            ))}
          </div>
        </Question>
      );
    case 10:
      return (
        <RadioStep
          title="What is the length of the sales cycle?"
          name="salesCycle"
          options={SALES_CYCLES}
          control={control}
          error={errors.salesCycle?.message}
        />
      );
    case 11:
      return (
        <RadioStep
          title="What is the size of the average order value?"
          name="orderValue"
          options={ORDER_VALUES}
          control={control}
          error={errors.orderValue?.message}
        />
      );
    case 12:
      return (
        <RadioStep
          title="Typical point of contact that the individual will sell into?"
          name="pointOfContact"
          options={POINTS_OF_CONTACT}
          control={control}
          error={errors.pointOfContact?.message}
        />
      );
    case 13:
      return (
        <Question
          title="Anything else we should know?"
          subtitle="Use the box below for any additional information — an existing job spec, or a few bullet points of mandatory requirements. (Optional)"
        >
          <Textarea
            {...register("additionalNotes")}
            rows={7}
            placeholder="Paste an existing spec or list any must-have requirements…"
            className="text-base"
          />
        </Question>
      );
    case 14:
      return (
        <Question
          title="Your details"
          subtitle="We'll create your job spec and send a copy to your inbox."
        >
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-[#1a3668]">Name</label>
              <Input
                {...register("name")}
                placeholder="Your full name"
                className="h-11 mt-1"
              />
              <FieldError message={errors.name?.message} />
            </div>
            <div>
              <label className="text-sm font-medium text-[#1a3668]">Email</label>
              <Input
                {...register("email")}
                type="email"
                placeholder="you@company.com"
                className="h-11 mt-1"
              />
              <FieldError message={errors.email?.message} />
            </div>
            <div>
              <label className="text-sm font-medium text-[#1a3668]">
                Company website
              </label>
              <Input
                {...register("companyUrl")}
                placeholder="www.yourcompany.com"
                className="h-11 mt-1"
              />
              <p className="text-xs text-gray-400 mt-1">
                We use this to tailor the opening of your job spec.
              </p>
              <FieldError message={errors.companyUrl?.message} />
            </div>
          </div>
        </Question>
      );
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Reusable pieces
// ---------------------------------------------------------------------------
function Question({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-[#1a3668] leading-snug">
        {title}
      </h2>
      {subtitle && <p className="text-sm text-gray-500 mt-2">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-500 mt-2">{message}</p>;
}

function RadioStep({
  title,
  subtitle,
  name,
  options,
  control,
  error,
}: {
  title: string;
  subtitle?: string;
  name: keyof JobSpecFormData;
  options: Option[];
  control: StepProps["control"];
  error?: string;
}) {
  return (
    <Question title={title} subtitle={subtitle}>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <div className="space-y-3">
            {options.map((o) => {
              const selected = field.value === o.value;
              return (
                <button
                  type="button"
                  key={o.value}
                  onClick={() => field.onChange(o.value)}
                  className={cn(
                    "w-full text-left rounded-lg border px-4 py-3 flex gap-3 items-start transition-colors",
                    selected
                      ? "border-[#df2681] bg-pink-50 ring-1 ring-[#df2681]"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center",
                      selected ? "border-[#df2681]" : "border-gray-300"
                    )}
                  >
                    {selected && (
                      <span className="h-2 w-2 rounded-full bg-[#df2681]" />
                    )}
                  </span>
                  <span>
                    <span className="block text-[15px] font-medium text-[#2D2D2D]">
                      {o.label}
                    </span>
                    {o.description && (
                      <span className="block text-xs text-gray-500 mt-0.5 leading-relaxed">
                        {o.description}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      />
      <FieldError message={error} />
    </Question>
  );
}
