"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Shield, LogOut, User as UserIcon } from "lucide-react";
import { useState, useEffect, useRef } from "react";

// Small user chip for the top-right of the app header. Shows the signed-in
// user's initial + name/email, a dropdown with a link to /admin (ADMINs only)
// and a Sign out action. Hidden entirely when there's no session (e.g. on the
// public landing page for a signed-out visitor).
export function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (status === "loading") return null;
  if (!session?.user) {
    return (
      <Link href="/login" className="text-xs text-white/80 hover:text-white font-medium">
        Sign in
      </Link>
    );
  }

  const initial = (session.user.name || session.user.email || "?").trim().charAt(0).toUpperCase();
  const isAdmin = session.user.role === "ADMIN";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-white/10 transition-colors"
      >
        <span className="h-7 w-7 rounded-full bg-[#df2681] flex items-center justify-center text-white text-xs font-bold">
          {initial}
        </span>
        <span className="hidden sm:block text-xs font-medium text-white/90 max-w-[160px] truncate">
          {session.user.name || session.user.email}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-800 truncate">{session.user.name || "—"}</p>
            <p className="text-[10px] text-gray-500 truncate">{session.user.email}</p>
            <p className="mt-1 inline-block text-[9px] font-bold uppercase tracking-wider text-white bg-[#1a3668] px-1.5 py-0.5 rounded">
              {session.user.role}
            </p>
          </div>
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#1a3668] hover:bg-gray-50"
            >
              <Shield className="h-3.5 w-3.5" />
              Admin dashboard
            </Link>
          )}
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <UserIcon className="h-3.5 w-3.5" />
            All apps
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 border-t border-gray-100"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
