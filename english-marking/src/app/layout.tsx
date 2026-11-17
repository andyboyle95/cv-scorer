import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/nav";
import { BRAND } from "@/lib/brand";
import { isSignedIn } from "@/lib/auth/server";
import Login from "./login/page";

export const metadata: Metadata = {
  title: { default: BRAND.name, template: `%s · ${BRAND.name}` },
  description: "AI marking and intervention planning for AQA GCSE English Language.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const signedIn = await isSignedIn();
  return (
    <html lang="en-GB">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700;800&family=UnifrakturMaguntia&display=swap"
        />
      </head>
      <body className="min-h-screen font-sans antialiased">
        {signedIn && <Nav />}
        <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6">{signedIn ? children : <Login />}</main>
      </body>
    </html>
  );
}
