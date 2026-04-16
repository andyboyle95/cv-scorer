import Image from "next/image";

export function Header() {
  return (
    <header className="bg-[#1a3668] text-white px-6 py-3 flex items-center gap-4 shadow-md">
      <div className="flex items-center gap-3">
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
        <span className="text-lg font-semibold tracking-tight">
          CV Scoring Tool
        </span>
      </div>
    </header>
  );
}
