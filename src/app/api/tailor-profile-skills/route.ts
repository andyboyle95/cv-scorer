import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { HUMAN_STYLE_RULES, sanitizeProse, sanitizeProseList } from "@/lib/prose-style";
import { requireSession } from "@/lib/session";
import { logUsage } from "@/lib/usage";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 60;

interface ExperienceIn {
  company?: string;
  role?: string;
  description?: string;
  bullets?: string[];
}

const tailoringSchema = {
  type: "object" as const,
  properties: {
    profile: {
      type: "string",
      description:
        "The rewritten first-person profile paragraph, same length and voice as the original. Emphasises the parts of the candidate's background that map to the job spec, but only using material already evident in the original profile or in the experience bullets provided. No new claims. No bullet points. No headings.",
    },
    skills: {
      type: "array",
      items: { type: "string" },
      description:
        "The reordered skills list — matching skills first (in order of relevance to the job spec), then the remaining originals. You MAY append up to 3 new skills at the end IF and only if each one is clearly evidenced by an experience bullet AND is a stated requirement of the job spec; otherwise do not add any. Do not remove any original skill. Every original skill must appear exactly once.",
    },
    addedSkills: {
      type: "array",
      items: { type: "string" },
      description:
        "Any new skills you appended (subset of `skills`). Empty array if you appended none. Used to show the user which additions came from you so they can review them.",
    },
  },
  required: ["profile", "skills", "addedSkills"],
};

export async function POST(req: NextRequest) {
  try { await requireSession() } catch (r) { return r as Response }
  let profile: string,
    skills: string[],
    experience: ExperienceIn[],
    jobSpec: string,
    candidateName: string | undefined,
    roleAppliedFor: string | undefined;
  try {
    ({ profile, skills, experience, jobSpec, candidateName, roleAppliedFor } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!jobSpec?.trim()) {
    return NextResponse.json({ error: "Job spec is required" }, { status: 400 });
  }
  if (!profile?.trim() && !(skills?.length)) {
    return NextResponse.json({ error: "Profile or skills required" }, { status: 400 });
  }

  const skillsList = (skills || []).filter(Boolean);
  const experienceBlock = (experience || [])
    .filter((e) => e.company || e.role || (e.bullets && e.bullets.length))
    .map((e) => {
      const header = [e.company, e.role].filter(Boolean).join(" — ");
      const bullets = (e.bullets || []).filter(Boolean).map((b) => `  • ${b}`).join("\n");
      return `${header}\n${bullets}`.trim();
    })
    .join("\n\n");

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      tools: [
        {
          name: "tailor_profile_skills",
          description: "Return a job-tailored profile paragraph and reordered skills list",
          input_schema: tailoringSchema,
        },
      ],
      tool_choice: { type: "tool", name: "tailor_profile_skills" },
      messages: [
        {
          role: "user",
          content: `You are tailoring a candidate's CV Profile paragraph and Skills list to a specific job spec. This is a recruiter's tool. Accuracy matters more than persuasion. Overstating the candidate is worse than omitting a match.

${HUMAN_STYLE_RULES}

STRICT RULES:
1. Never invent skills, experience, sectors, tools, or achievements. Every claim must be evident in the source material below.
2. Keep the profile in first person, same tone and roughly the same length as the original.
3. Skills list: match the job spec's language for existing skills where it fits (e.g. "SaaS sales" → "B2B SaaS sales" IF the candidate has that). Reorder so matches come first, but keep EVERY original skill exactly once — never delete.
4. You may append up to 3 new skills only if BOTH (a) the job spec explicitly asks for them AND (b) an experience bullet clearly evidences them. If either fails, don't add.
5. Return added skills separately in \`addedSkills\` for review.

Candidate: ${candidateName || "the candidate"}
Role applied for: ${roleAppliedFor || "the role"}

Current profile (first person):
${profile?.trim() || "(none — return an empty string if you can't write one from evidence alone)"}

Current skills (order preserved as source of truth):
${skillsList.length ? skillsList.map((s) => `- ${s}`).join("\n") : "(none)"}

Evidence — experience bullets you can draw from (do NOT invent beyond these):
${experienceBlock || "(none supplied)"}

Job spec / advert:
${jobSpec.trim().slice(0, 8000)}`,
        },
      ],
    });

    const block = response.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") {
      return NextResponse.json({ error: "No structured response from AI" }, { status: 500 });
    }
    const out = block.input as { profile: string; skills: string[]; addedSkills: string[] };

    // Defensive: guarantee no original skill was dropped (LLMs sometimes drift).
    const returned = new Set(out.skills.map((s) => s.trim().toLowerCase()));
    const missing = skillsList.filter((s) => !returned.has(s.trim().toLowerCase()));
    const finalSkills = missing.length ? [...out.skills, ...missing] : out.skills;

    await logUsage({
      tool: "cv-generator",
      action: "tailor-job-spec",
      meta: { addedSkillsCount: (out.addedSkills ?? []).length },
    });
    return NextResponse.json({
      profile: sanitizeProse(out.profile),
      skills: sanitizeProseList(finalSkills),
      addedSkills: sanitizeProseList(out.addedSkills),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tailoring failed";
    console.error("[tailor-profile-skills]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
