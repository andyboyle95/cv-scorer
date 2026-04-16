'use client';

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FileSearch, FileText, ArrowRight } from "lucide-react";

export default function Home() {
  const router = useRouter();

  // Pre-compile both tool routes in the background as soon as home loads
  useEffect(() => {
    router.prefetch('/score');
    router.prefetch('/generate');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col">

      {/* Header */}
      <header className="bg-[#1a3668] text-white px-6 py-3 flex items-center gap-4 shadow-md">
        <div className="bg-white rounded px-2 py-1">
          <Image
            src="https://www.aaronwallis.co.uk/media/chgpaiwp/aaron-wallis-logo.png"
            alt="Aaron Wallis"
            height={40}
            width={160}
            className="h-8 w-auto object-contain"
            unoptimized
            priority
          />
        </div>
        <div className="h-7 w-px bg-white/30" />
        <span className="text-lg font-semibold tracking-tight">Recruitment Tools</span>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="max-w-2xl w-full text-center mb-12">
          <h1 className="text-3xl font-bold text-[#1a3668] mb-3">What would you like to do?</h1>
          <p className="text-gray-500 text-base">Choose a tool to get started</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">

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

        </div>
      </main>

      <footer className="border-t border-[#E2E8F0] bg-white py-4 px-6 text-center text-xs text-gray-400">
        Aaron Wallis Recruitment Tools — Built by Andy Boyle.
      </footer>
    </div>
  );
}
