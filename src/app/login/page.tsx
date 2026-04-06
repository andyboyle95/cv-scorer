"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Card, CardContent, CardHeader } from "@/ui/card";
import { Lock } from "lucide-react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/");
    } else {
      setError("Incorrect password. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex items-center justify-center p-4">
      <Card className="w-full max-w-sm border-[#E2E8F0] shadow-lg">
        <CardHeader className="text-center pb-2 pt-8">
          <div className="flex justify-center mb-4">
            <Image
              src="https://www.aaronwallis.co.uk/media/chgpaiwp/aaron-wallis-logo.png"
              alt="Aaron Wallis"
              height={48}
              width={200}
              className="h-12 w-auto object-contain"
              unoptimized
            />
          </div>
          <h1 className="text-lg font-semibold text-[#1a3668]">
            CV Scoring Tool
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Enter your password to continue
          </p>
        </CardHeader>
        <CardContent className="pb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[#1a3668]">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  placeholder="Enter password"
                  autoFocus
                  required
                />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !password}
            >
              {loading ? "Checking..." : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
