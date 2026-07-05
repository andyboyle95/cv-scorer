import Image from "next/image";
import Link from "next/link";
import { UserMenu } from "./user-menu";

// Two-tone header. Left block: white ground with the real Aaron Wallis
// colour logo sitting on its native background — no awkward pill inside a
// navy field. Right block: navy, holds the page title and the user chip.
// The vertical seam between the two blocks IS the design element.
export function Header({ title = "" }: { title?: string }) {
  return (
    <header className="flex items-stretch shadow-md">
      {/* Left — white block with the actual AW logo */}
      <Link
        href="/"
        aria-label="Aaron Wallis Recruitment Apps — home"
        className="bg-white flex items-center px-5 sm:px-6 py-3 border-r border-black/5 flex-shrink-0"
      >
        <Image
          src="/aaron-wallis-logo.png"
          alt="Aaron Wallis"
          height={40}
          width={160}
          className="h-8 w-auto object-contain"
          unoptimized
          priority
        />
      </Link>

      {/* Right — navy block with page title + user chip */}
      <div className="flex-1 bg-[#1a3668] text-white px-5 sm:px-6 py-3 flex items-center justify-between gap-4 min-w-0">
        {title ? (
          <span className="text-[14px] sm:text-[15px] font-semibold tracking-tight truncate">
            {title}
          </span>
        ) : (
          <span />
        )}
        <UserMenu />
      </div>
    </header>
  );
}
