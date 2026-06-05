"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
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

// Word + colour for each importance level (index by slider value 1–5).
const IMPORTANCE = [
  null,
  { word: "Unimportant", className: "bg-gray-100 text-gray-500" },
  { word: "Minor", className: "bg-sky-100 text-sky-700" },
  { word: "Moderate", className: "bg-blue-100 text-blue-700" },
  { word: "Important", className: "bg-pink-100 text-[#df2681]" },
  { word: "Critical", className: "bg-[#df2681] text-white" },
] as const;

// Each step lists the field name(s) to validate before advancing.
const STEPS: { fields: (keyof JobSpecFormData)[] }[] = [
  { fields: ["jobTitle"] },
  { fields: ["industry"] },
  { fields: ["workingArrangement"] },
  { fields: ["jobFunction"] },
  { fields: ["accountVolume"] },
  { fields: ["seniority"] },
  { fields: ["transactional"] },
  { fields: ["sellingInto"] },
  { fields: ["leadGeneration"] },
  { fields: ["qualities"] },
  { fields: ["salesCycle"] },
  { fields: ["orderValue"] },
  { fields: ["pointOfContact"] },
  { fields: ["additionalNotes"] },
  { fields: ["name", "email", "companyUrl"] },
];

interface JobSpecFormProps {
  onSubmit: (data: JobSpecFormData) => void;
  submitting?: boolean;
}

export function JobSpecForm({ onSubmit, submitting }: JobSpecFormProps) {
  const [step, setStep] = useState(0);

  const {
    register,
    handleSubmit,
    control,
    trigger,
    formState: { errors },
  } = useForm<JobSpecFormData>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
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

  // If the final submit fails validation, jump to the first step that has an
  // error so the user can see and fix it (instead of nothing happening).
  const goToFirstError = (formErrors: typeof errors) => {
    const erroredKeys = Object.keys(formErrors);
    const target = STEPS.findIndex((s) =>
      s.fields.some((f) => erroredKeys.includes(f as string))
    );
    if (target >= 0) setStep(target);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit, goToFirstError)}
      className="w-full max-w-2xl mx-auto"
      onKeyDown={(e) => {
        // Prevent Enter from submitting early on intermediate steps.
        if (e.key === "Enter" && !isLast) {
          e.preventDefault();
          next();
        }
      }}
    >
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-[#E2E8F0]">
        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100">
          <div
            className="h-full bg-[#df2681] transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="p-6 sm:p-10 min-h-[360px]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#df2681] mb-6">
            Step {step + 1} of {STEPS.length}
          </p>

          <StepContent
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
            disabled={step === 0 || submitting}
            className="flex-1 flex items-center justify-center gap-2 py-4 px-6 font-semibold tracking-wide uppercase text-sm transition-colors hover:bg-[#C0005A] disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <ArrowLeft className="h-4 w-4" /> Previous
          </button>
          <div className="w-px bg-white/20" />
          {isLast ? (
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 py-4 px-6 font-semibold tracking-wide uppercase text-sm transition-colors hover:bg-[#C0005A] disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Generating…
                </>
              ) : (
                <>Create Job Spec</>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={next}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 py-4 px-6 font-semibold tracking-wide uppercase text-sm transition-colors hover:bg-[#C0005A]"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </form>
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
          <select
            {...register("industry")}
            className="flex h-12 w-full rounded-md border border-input bg-white px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            defaultValue=""
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
