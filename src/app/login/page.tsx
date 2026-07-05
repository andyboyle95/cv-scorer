"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Loader2 } from "lucide-react";

function LoginContent() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/";
  const error = params.get("error");
  const [loading, setLoading] = useState<"google" | "azure" | null>(null);

  const errorMessage =
    error === "AccessDenied"
      ? "You aren't on the access list yet. Contact your Aaron Wallis administrator."
      : error
        ? "Sign-in failed. Please try again."
        : null;

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-[#0a1e40]">
      {/* Navy gradient background + pink accent bar */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a1e40] via-[#12274d] to-[#1a3668]" />
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#df2681] to-transparent" />
      <div className="absolute -top-32 -right-24 w-96 h-96 rounded-full bg-[#df2681]/10 blur-3xl" />
      <div className="absolute -bottom-32 -left-24 w-96 h-96 rounded-full bg-[#1a3668]/40 blur-3xl" />

      <div className="relative w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Pink accent strip */}
          <div className="h-1 bg-gradient-to-r from-[#df2681] to-[#c01f6e]" />

          <div className="p-8 pb-6">
            <div className="flex justify-center mb-5">
              <Image
                src="/aaron-wallis-logo.png"
                alt="Aaron Wallis"
                width={220}
                height={52}
                className="h-12 w-auto object-contain"
                unoptimized
                priority
              />
            </div>
            <h1 className="text-center text-lg font-bold text-[#1a3668] tracking-tight">
              Aaron Wallis Recruitment Apps
            </h1>
            <p className="text-center text-xs text-gray-500 mt-1">
              Sign in with your work account to continue
            </p>

            <div className="mt-6 space-y-2">
              <button
                onClick={() => {
                  setLoading("google");
                  signIn("google", { callbackUrl });
                }}
                disabled={loading !== null}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors font-medium text-sm text-gray-700 disabled:opacity-60 disabled:pointer-events-none"
              >
                {loading === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
                Continue with Google
              </button>

              <button
                onClick={() => {
                  setLoading("azure");
                  signIn("azure-ad", { callbackUrl });
                }}
                disabled={loading !== null}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors font-medium text-sm text-gray-700 disabled:opacity-60 disabled:pointer-events-none"
              >
                {loading === "azure" ? <Loader2 className="h-4 w-4 animate-spin" /> : <MicrosoftIcon />}
                Continue with Microsoft
              </button>
            </div>

            {errorMessage && (
              <div className="mt-4 text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                {errorMessage}
              </div>
            )}
          </div>

          <div className="px-8 py-4 border-t border-gray-100 bg-gray-50 text-center">
            <p className="text-[10px] text-gray-500 leading-relaxed">
              Access is restricted to authorised Aaron Wallis staff and approved partners. No passwords, no emails from us.
            </p>
          </div>
        </div>

        <p className="mt-4 text-center text-[10px] text-white/60">© Aaron Wallis Sales Recruitment</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a1e40]" />}>
      <LoginContent />
    </Suspense>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" fill="#EA4335" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 23 23" aria-hidden="true">
      <rect x="1" y="1" width="10" height="10" fill="#f25022" />
      <rect x="12" y="1" width="10" height="10" fill="#7fba00" />
      <rect x="1" y="12" width="10" height="10" fill="#00a4ef" />
      <rect x="12" y="12" width="10" height="10" fill="#ffb900" />
    </svg>
  );
}
