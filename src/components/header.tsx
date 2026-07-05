import Image from "next/image";
import { UserMenu } from "./user-menu";

export function Header({ title = "CV Scoring Tool" }: { title?: string }) {
  return (
    <header className="bg-[#1a3668] text-white px-6 py-3 flex items-center justify-between gap-4 shadow-md">
      <div className="flex items-center gap-4 min-w-0">
        <div className="bg-white rounded px-2 py-1">
          <Image
            src="/aaron-wallis-logo.png"
            alt="Aaron Wallis"
            height={40}
            width={160}
            className="h-8 w-auto object-contain"
            unoptimized
            priority
          />
        </div>
        <div className="h-7 w-px bg-white/30" />
        <span className="text-lg font-semibold tracking-tight truncate">{title}</span>
      </div>
      <UserMenu />
    </header>
  );
}
