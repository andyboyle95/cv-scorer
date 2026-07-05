'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FileSearch, FileText, MessageSquare, Car, ClipboardList, ArrowRight } from "lucide-react";
import { Header } from "@/components/header";

// The homepage is the launcher for the whole recruitment suite. Direction 01
// ("The Hero") — CV Generator dominates the top of the page as the product
// the agency would sell externally; everything else supports it in a
// four-across secondary row.

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.prefetch("/generate");
    router.prefetch("/interview");
    router.prefetch("/score");
    router.prefetch("/job-spec");
    router.prefetch("/commute");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col">
      <Header title="Recruitment Apps" />

      <main className="flex-1 px-4 sm:px-6 lg:px-10 py-10 sm:py-14">
        <div className="max-w-6xl mx-auto w-full">
          {/* Intro */}
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Suite</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1a3668] tracking-tight mb-10">
            AI-powered recruitment tools
          </h1>

          {/* Hero — CV Generator */}
          <CvGeneratorHero />

          {/* Secondary row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SecondaryCard
              href="/interview"
              icon={<MessageSquare className="w-5 h-5" />}
              iconClass="bg-[#1a3668]/10 text-[#1a3668]"
              title="Interview Generator"
              body="Turn a candidate's CV into a set of competency-based interview questions for your client. STAR format, follow-up probes, ready to print."
              accent="text-[#1a3668]"
            />
            <SecondaryCard
              href="/score"
              icon={<FileSearch className="w-5 h-5" />}
              iconClass="bg-amber-500/10 text-amber-700"
              title="CV Scorer"
              body="Score a stack of candidate CVs against a client's brief in one pass. Ranked shortlist with a written reason next to each score."
              accent="text-amber-700"
            />
            <SecondaryCard
              href="/job-spec"
              icon={<ClipboardList className="w-5 h-5" />}
              iconClass="bg-purple-500/10 text-purple-600"
              title="Job Spec Creator"
              body="Turn a client's rough brief into a polished job spec and person spec. The lead is emailed straight to your inbox."
              accent="text-purple-600"
            />
            <SecondaryCard
              href="/commute"
              icon={<Car className="w-5 h-5" />}
              iconClass="bg-slate-500/10 text-slate-600"
              title="Commute Calculator"
              body="Distance and cost of a candidate's commute to the client's office. Handy sanity-check before you send the shortlist."
              accent="text-slate-600"
            />
          </div>
        </div>
      </main>

      <footer className="border-t border-[#E2E8F0] bg-white py-4 px-6 text-center text-xs text-gray-400">
        Aaron Wallis Recruitment Apps
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Hero — CV Generator
// ─────────────────────────────────────────────────────────────────────

function CvGeneratorHero() {
  return (
    <Link
      href="/generate"
      prefetch
      className="group relative block overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a3668] via-[#12274d] to-[#0e1f3f] text-white shadow-[0_22px_60px_-30px_rgba(24,29,45,0.5)] mb-6 hover:shadow-[0_30px_80px_-30px_rgba(24,29,45,0.65)] transition-shadow"
    >
      {/* Ambient pink glow */}
      <div className="absolute -right-24 -bottom-24 w-72 h-72 rounded-full bg-[#df2681]/30 blur-3xl pointer-events-none" />
      <div className="absolute right-32 top-0 w-48 h-48 rounded-full bg-[#df2681]/10 blur-3xl pointer-events-none" />

      <div className="relative grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-8 lg:gap-10 p-6 sm:p-10 items-center">
        {/* Left: copy */}
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight mb-3">
            CV Generator
          </h2>
          <p className="text-white/85 text-[15px] leading-relaxed mb-5 max-w-xl">
            Turn a candidate&rsquo;s raw CV into a client-ready document tailored to the job spec. Import any format, edit inline, and export a polished, submission-ready PDF. Every claim it surfaces has to be evidenced in the source, so nothing is invented on your behalf.
          </p>
          <ul className="space-y-2 mb-6 text-[13.5px] text-white/90">
            <li className="flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#df2681] flex-shrink-0" />
              Executive summary, profile &amp; skills auto-tailored to the target role
            </li>
            <li className="flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#df2681] flex-shrink-0" />
              Anonymous-send mode with a matching introduction email
            </li>
            <li className="flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#df2681] flex-shrink-0" />
              Interview questions bundled into the same PDF export
            </li>
          </ul>
          <span className="inline-flex items-center gap-2 bg-[#df2681] hover:bg-[#c01f6e] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors group-hover:gap-3">
            Open CV Generator
            <ArrowRight className="w-4 h-4 transition-transform" />
          </span>
        </div>

        {/* Right: mini CV preview — hints at the actual output */}
        <div className="relative hidden lg:block">
          <MiniCvPreview />
        </div>
      </div>
    </Link>
  );
}

function MiniCvPreview() {
  return (
    <div className="relative">
      <div className="absolute inset-0 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm -rotate-1" />
      <div className="relative bg-white text-[#1a3668] rounded-lg shadow-2xl p-5 rotate-1 max-w-[320px] mx-auto">
        {/* Brand strip */}
        <div className="-mx-5 -mt-5 mb-3">
          <div className="h-3 bg-[#1a3668]" />
          <div className="h-[2px] bg-[#df2681]" />
        </div>
        {/* Logo row */}
        <div className="flex items-end justify-between mb-3 pb-2 border-b border-[#1a3668]/20">
          <div className="text-[10px] font-bold text-[#1a3668] tracking-tight">Aaron Wallis</div>
          <div className="text-[6px] font-bold text-[#df2681] uppercase tracking-widest">Sales Recruitment</div>
        </div>
        {/* Candidate line */}
        <p className="text-[9px] font-bold uppercase tracking-widest text-[#1a3668]">Candidate</p>
        <p className="text-[13px] font-bold text-[#1a3668] leading-tight mt-0.5">Joe Bloggs</p>
        <p className="text-[9px] text-gray-500 mt-0.5">Enterprise Account Executive</p>

        {/* Profile block */}
        <div className="mt-3">
          <p className="text-[8px] font-bold text-[#1a3668] uppercase tracking-widest border-b border-[#1a3668]/20 pb-0.5 mb-1.5">Profile</p>
          <div className="h-[3px] bg-gray-200 rounded-full mb-1" />
          <div className="h-[3px] bg-gray-200 rounded-full mb-1 w-[92%]" />
          <div className="h-[3px] bg-gray-200 rounded-full mb-1 w-[78%]" />
          <div className="h-[3px] bg-gray-200 rounded-full w-[60%]" />
        </div>

        {/* Experience block */}
        <div className="mt-3">
          <p className="text-[8px] font-bold text-[#1a3668] uppercase tracking-widest border-b border-[#1a3668]/20 pb-0.5 mb-1.5">Experience</p>
          <p className="text-[8px] font-bold text-[#1a3668]">S&amp;P Global &mdash; BDE</p>
          <div className="h-[2.5px] bg-gray-200 rounded-full mt-1 mb-0.5" />
          <div className="h-[2.5px] bg-gray-200 rounded-full mb-0.5 w-[88%]" />
          <div className="h-[2.5px] bg-gray-200 rounded-full w-[70%]" />
        </div>

        {/* Skills block */}
        <div className="mt-3">
          <p className="text-[8px] font-bold text-[#1a3668] uppercase tracking-widest border-b border-[#1a3668]/20 pb-0.5 mb-1.5">Skills</p>
          <div className="flex flex-wrap gap-1">
            <span className="text-[7px] bg-[#1a3668]/8 text-[#1a3668] px-1.5 py-0.5 rounded">Enterprise SaaS</span>
            <span className="text-[7px] bg-[#1a3668]/8 text-[#1a3668] px-1.5 py-0.5 rounded">Buy-side</span>
            <span className="text-[7px] bg-[#1a3668]/8 text-[#1a3668] px-1.5 py-0.5 rounded">Forecasting</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Secondary card
// ─────────────────────────────────────────────────────────────────────

function SecondaryCard({
  href,
  icon,
  iconClass,
  title,
  body,
  accent,
}: {
  href: string;
  icon: React.ReactNode;
  iconClass: string;
  title: string;
  body: string;
  accent: string;
}) {
  return (
    <Link
      href={href}
      prefetch
      className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-[#1a3668]/30 transition-all p-5 flex flex-col gap-3 text-left"
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconClass}`}>
        {icon}
      </div>
      <div>
        <h3 className="text-[15px] font-bold text-[#1a3668] mb-1 tracking-tight">{title}</h3>
        <p className="text-[12.5px] text-gray-500 leading-relaxed">{body}</p>
      </div>
      <span className={`mt-auto flex items-center gap-1 text-[12px] font-semibold ${accent} group-hover:gap-2 transition-all`}>
        Open tool <ArrowRight className="w-3.5 h-3.5" />
      </span>
    </Link>
  );
}
