"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "./wordmark";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/assessments", label: "Assessments" },
  { href: "/students", label: "Students" },
  { href: "/moderation", label: "Moderation" },
  { href: "/insights", label: "Year groups" },
  { href: "/interventions", label: "Interventions" },
  { href: "/history", label: "History" },
  { href: "/library", label: "Library" },
  { href: "/settings", label: "Settings" },
];

export function Nav() {
  const path = usePathname();
  if (path.startsWith("/login") || path.includes("/cover-sheets")) return null;
  return (
    <header className="no-print border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="mr-2">
          <Wordmark />
        </Link>
        <nav className="-mx-1 flex flex-1 gap-1 overflow-x-auto text-sm">
          {LINKS.map((l) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap rounded px-2.5 py-1.5 font-medium transition-colors duration-150 ${
                  active ? "bg-rubric-wash text-rubric-ink" : "text-muted hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
