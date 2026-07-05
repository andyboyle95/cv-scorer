'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FileSearch, FileText, MessageSquare, Car, ClipboardList, ArrowRight } from "lucide-react";
import { Header } from "@/components/header";

export default function Home() {
  const router = useRouter();

  // Pre-compile both tool routes in the background as soon as home loads
  useEffect(() => {
    router.prefetch('/score');
    router.prefetch('/generate');
    router.prefetch('/interview');
    router.prefetch('/commute');
    router.prefetch('/job-spec');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col">

      <Header title="Recruitment Tools" />

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="max-w-6xl w-full text-center mb-12">
          <h1 className="text-3xl font-bold text-[#1a3668] mb-3">What would you like to do?</h1>
          <p className="text-gray-500 text-base">Choose a tool to get started</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">

          {/* CV Scorer */}
          <Link
            href="/score"
            prefetch={true}
            className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-[#1a3668]/40 transition-all p-8 flex flex-col items-start gap-4 text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-[#1a3668]/10 flex items-center justify-center group-hover:bg-[#1a3668]/20 transition-colors">
              <FileSearch className="w-6 h-6 text-[#1a3668]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1a3668] mb-1">CV Scorer</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Upload candidate CVs and score them against a job brief using AI. Get ranked shortlists instantly.
              </p>
            </div>
            <span className="mt-auto flex items-center gap-1 text-sm font-semibold text-[#df2681] group-hover:gap-2 transition-all">
              Open tool <ArrowRight className="w-4 h-4" />
            </span>
          </Link>

          {/* Job Spec Creator */}
          <Link
            href="/job-spec"
            prefetch={true}
            className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-purple-500/40 transition-all p-8 flex flex-col items-start gap-4 text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
              <ClipboardList className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1a3668] mb-1">Job Spec Creator</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Answer a few questions to instantly generate a tailored job spec and person spec for a sales role.
              </p>
            </div>
            <span className="mt-auto flex items-center gap-1 text-sm font-semibold text-purple-600 group-hover:gap-2 transition-all">
              Open tool <ArrowRight className="w-4 h-4" />
            </span>
          </Link>

          {/* CV Generator */}
          <Link
            href="/generate"
            prefetch={true}
            className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-[#df2681]/40 transition-all p-8 flex flex-col items-start gap-4 text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-[#df2681]/10 flex items-center justify-center group-hover:bg-[#df2681]/20 transition-colors">
              <FileText className="w-6 h-6 text-[#df2681]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1a3668] mb-1">CV Generator</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Create a professionally formatted Aaron Wallis CV with cover sheet, ready to send to clients as a PDF.
              </p>
            </div>
            <span className="mt-auto flex items-center gap-1 text-sm font-semibold text-[#df2681] group-hover:gap-2 transition-all">
              Open tool <ArrowRight className="w-4 h-4" />
            </span>
          </Link>


          {/* Interview Generator */}
          <Link
            href="/interview"
            prefetch={true}
            className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-green-500/40 transition-all p-8 flex flex-col items-start gap-4 text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
              <MessageSquare className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1a3668] mb-1">Interview Generator</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Upload a CV and generate tailored competency-based interview questions, ready to download as PDF.
              </p>
            </div>
            <span className="mt-auto flex items-center gap-1 text-sm font-semibold text-green-600 group-hover:gap-2 transition-all">
              Open tool <ArrowRight className="w-4 h-4" />
            </span>
          </Link>

          {/* Commute Calculator */}
          <Link
            href="/commute"
            prefetch={true}
            className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-orange-500/40 transition-all p-8 flex flex-col items-start gap-4 text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
              <Car className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1a3668] mb-1">Commute Calculator</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Calculate the real cost of commuting by car. Compare your vehicle against petrol and EV alternatives.
              </p>
            </div>
            <span className="mt-auto flex items-center gap-1 text-sm font-semibold text-orange-600 group-hover:gap-2 transition-all">
              Open tool <ArrowRight className="w-4 h-4" />
            </span>
          </Link>

        </div>
      </main>

      <footer className="border-t border-[#E2E8F0] bg-white py-4 px-6 text-center text-xs text-gray-400">
        Aaron Wallis Recruitment Tools — Built by Andy Boyle.
      </footer>
    </div>
  );
}
