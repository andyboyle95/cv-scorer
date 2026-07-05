"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Shield, LogOut, LayoutGrid, ChevronDown } from "lucide-react";
import { useState, useEffect, useRef } from "react";

// Top-right user chip. Shows the real Google/Microsoft profile picture
// (so it feels genuinely signed-in rather than just a coloured circle),
// with a "Signed in with Google" or "Signed in with Microsoft" line and
// a small provider mark inside the dropdown. Falls back gracefully if
// the image URL fails to load or isn't provided by the IdP.
export function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [imageBroken, setImageBroken] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (status === "loading") {
    return <div className="h-8 w-8 rounded-full bg-white/10 animate-pulse" />;
  }
  if (!session?.user) {
    return (
      <Link href="/login" className="text-xs text-white/80 hover:text-white font-medium">
        Sign in
      </Link>
    );
  }

  const { name, email, image, role, provider } = session.user;
  const displayName = name || email;
  const initial = (name || email || "?").trim().charAt(0).toUpperCase();
  const isAdmin = role === "ADMIN";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-white/10 transition-colors"
      >
        <Avatar image={image} initial={initial} imageBroken={imageBroken} onBroken={() => setImageBroken(true)} />
        <span className="hidden sm:block text-xs font-medium text-white/90 max-w-[160px] truncate">
          {displayName}
        </span>
        <ChevronDown className="hidden sm:block h-3 w-3 text-white/60" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-100">
          {/* Header: bigger avatar + name + email + role pill */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-start gap-3">
            <Avatar image={image} initial={initial} imageBroken={imageBroken} onBroken={() => setImageBroken(true)} size="lg" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
              <p className="text-[11px] text-gray-500 truncate">{email}</p>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="inline-block text-[9px] font-bold uppercase tracking-wider text-white bg-[#1a3668] px-1.5 py-0.5 rounded">
                  {role}
                </span>
              </div>
            </div>
          </div>

          {/* "Signed in with" row — the trust cue */}
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
            <ProviderMark provider={provider} />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                Signed in with {providerLabel(provider)}
              </p>
              <p className="text-[10px] text-gray-400 truncate">Secure session, 7-day auto-renew</p>
            </div>
          </div>

          {/* Actions */}
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-[#1a3668] hover:bg-gray-50"
            >
              <Shield className="h-3.5 w-3.5" />
              Admin dashboard
            </Link>
          )}
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            All apps
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 border-t border-gray-100"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

// ── Avatar ──────────────────────────────────────────────────────────────

function Avatar({
  image,
  initial,
  imageBroken,
  onBroken,
  size = "sm",
}: {
  image?: string | null;
  initial: string;
  imageBroken: boolean;
  onBroken: () => void;
  size?: "sm" | "lg";
}) {
  const dim = size === "lg" ? "h-10 w-10 text-sm" : "h-7 w-7 text-xs";
  const showImage = image && !imageBroken;

  if (showImage) {
    // Google/Microsoft profile pics — plain <img> avoids next/image domain
    // config for arbitrary CDNs. Referrer stripped so Google doesn't count
    // the load against your consent screen quota.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=""
        onError={onBroken}
        referrerPolicy="no-referrer"
        className={`${dim} rounded-full object-cover ring-2 ring-white/40`}
      />
    );
  }
  return (
    <span
      className={`${dim} rounded-full bg-gradient-to-br from-[#df2681] to-[#c01f6e] text-white font-bold flex items-center justify-center ring-2 ring-white/40`}
    >
      {initial}
    </span>
  );
}

// ── Provider mark + label ──────────────────────────────────────────────

function providerLabel(provider?: string | null): string {
  if (provider === "google") return "Google";
  if (provider === "azure-ad") return "Microsoft";
  return "your work account";
}

function ProviderMark({ provider }: { provider?: string | null }) {
  if (provider === "google") {
    return (
      <span className="h-6 w-6 rounded-full bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm">
        <GoogleG />
      </span>
    );
  }
  if (provider === "azure-ad") {
    return (
      <span className="h-6 w-6 rounded-full bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm">
        <MicrosoftSquares />
      </span>
    );
  }
  return (
    <span className="h-6 w-6 rounded-full bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm">
      <Shield className="h-3.5 w-3.5 text-gray-500" />
    </span>
  );
}

function GoogleG() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" fill="#EA4335" />
    </svg>
  );
}

function MicrosoftSquares() {
  return (
    <svg width="12" height="12" viewBox="0 0 23 23" aria-hidden="true">
      <rect x="1" y="1" width="10" height="10" fill="#f25022" />
      <rect x="12" y="1" width="10" height="10" fill="#7fba00" />
      <rect x="1" y="12" width="10" height="10" fill="#00a4ef" />
      <rect x="12" y="12" width="10" height="10" fill="#ffb900" />
    </svg>
  );
}
