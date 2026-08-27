// Lead capture tests for the public Job Spec Creator form.
//
// The suites that touch Postgres are skipped unless DATABASE_URL is set, so
// `npm test` stays runnable without a database. To run them:
//   DATABASE_URL=postgresql://... npx vitest run src/lib/lead-capture.test.ts
//
// The pure suites (config health + Resend error handling) always run — they
// cover the failure modes that previously lost leads silently.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { recordLead, recordLeadDelivery } from "@/lib/leads";
import { getLeadEmailConfig, sendLeadEmail } from "@/lib/send-lead-email";
import { prisma } from "@/lib/prisma";

const hasDb = Boolean(process.env.DATABASE_URL);

const answers: any = {
  jobTitle: "Business Development Manager",
  industry: "technology", workingArrangement: "hybrid", jobFunction: "new-business",
  accountVolume: "few", seniority: "mid", transactional: "consultative",
  sellingInto: "smes", leadGeneration: "mixed", qualities: { drive: 8 },
  salesCycle: "medium", orderValue: "mid", pointOfContact: "director",
  additionalNotes: "", name: "Andy Boyle", email: "andyboyleaw@gmail.com",
  companyUrl: "https://www.aaronwallis.co.uk",
};
const spec: any = {
  opening_statement: "Opening",
  job_spec: { job_title: "BDM", role_overview: "Overview", key_responsibilities: ["a"], experience_and_skills: ["b"], desirable: ["c"] },
  person_spec: { behavioural_summary: "Sum", disc_profile: "D", key_behaviours: ["x"], motivational_drivers: ["y"], watch_outs: ["z"] },
};

beforeAll(async () => { if (hasDb) await prisma.lead.deleteMany(); });
afterAll(async () => { if (hasDb) await prisma.$disconnect(); });

describe.skipIf(!hasDb)("lead capture (requires DATABASE_URL)", () => {
  it("persists the lead before any email is attempted", async () => {
    const id = await recordLead(answers, spec);
    expect(id).toBeTruthy();
    const row = await prisma.lead.findUnique({ where: { id: id! } });
    expect(row?.email).toBe("andyboyleaw@gmail.com");
    expect(row?.jobTitle).toBe("Business Development Manager");
    expect(row?.notifyStatus).toBe("pending");
    expect((row?.answers as any).qualities.drive).toBe(8);
    expect((row?.spec as any).job_spec.job_title).toBe("BDM");
  }, 30000); // first query pays Prisma engine start-up

  it("records a failed delivery against the lead", async () => {
    const id = await recordLead(answers, spec);
    await recordLeadDelivery(id, {
      notification: { status: "failed", error: "Resend 403: domain not verified" },
      copy: { status: "sent" },
    });
    const row = await prisma.lead.findUnique({ where: { id: id! } });
    expect(row?.notifyStatus).toBe("failed");
    expect(row?.notifyError).toContain("403");
    expect(row?.copyStatus).toBe("sent");
  });

  it("counts undelivered notifications for the admin badge", async () => {
    const undelivered = await prisma.lead.count({ where: { NOT: { notifyStatus: "sent" } } });
    expect(undelivered).toBeGreaterThan(0);
  });
});

describe("email config health", () => {
  it("flags a missing API key and the Resend test sender", () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.LEAD_FROM_EMAIL;
    const c = getLeadEmailConfig();
    expect(c.hasApiKey).toBe(false);
    expect(c.isTestSender).toBe(true);
    expect(c.problems.join(" ")).toContain("RESEND_API_KEY is not set");
    expect(c.problems.join(" ")).toContain("onboarding@resend.dev");
  });

  it("is clean once a verified sender is configured", () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.LEAD_FROM_EMAIL = "Job Spec <noreply@aaronwallis.co.uk>";
    process.env.LEAD_NOTIFICATION_EMAIL = "info@aaronwallis.co.uk, andy@aaronwallis.co.uk";
    const c = getLeadEmailConfig();
    expect(c.problems).toEqual([]);
    expect(c.notify).toEqual(["info@aaronwallis.co.uk", "andy@aaronwallis.co.uk"]);
  });
});

describe("sendLeadEmail", () => {
  it("skips (not silently) when no API key is set", async () => {
    delete process.env.RESEND_API_KEY;
    const r = await sendLeadEmail(answers, spec);
    expect(r.notification.status).toBe("skipped");
    expect(r.notification.error).toContain("RESEND_API_KEY");
  });

  it("surfaces a 403 from Resend instead of swallowing it, and does not retry it", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.LEAD_FROM_EMAIL = "Job Spec <noreply@aaronwallis.co.uk>";
    // A fresh Response per call — a single one can only be read once.
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response("You can only send testing emails to your own address", { status: 403 })
      )
    );
    vi.stubGlobal("fetch", fetchMock);
    const r = await sendLeadEmail(answers, spec);
    expect(r.notification.status).toBe("failed");
    expect(r.notification.error).toContain("403");
    expect(fetchMock).toHaveBeenCalledTimes(2); // one per email, no retries on 4xx
    vi.unstubAllGlobals();
  });

  it("retries a 500 and succeeds on a later attempt", async () => {
    process.env.RESEND_API_KEY = "re_test";
    let calls = 0;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => {
      calls++;
      return Promise.resolve(calls <= 2 ? new Response("boom", { status: 500 }) : new Response("{}", { status: 200 }));
    }));
    const r = await sendLeadEmail(answers, spec);
    expect([r.notification.status, r.copy.status]).toContain("sent");
    vi.unstubAllGlobals();
  }, 20000);

  it("still notifies internally when the enquirer's address is unusable", async () => {
    process.env.RESEND_API_KEY = "re_test";
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response("{}", { status: 200 }))));
    const r = await sendLeadEmail({ ...answers, email: "not-an-email" }, spec);
    expect(r.notification.status).toBe("sent");
    expect(r.copy.status).toBe("skipped");
    vi.unstubAllGlobals();
  });
});
