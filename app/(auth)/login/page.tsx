"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrutalCard } from "@/components/ui/BrutalCard";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { BrutalInput } from "@/components/ui/BrutalInput";
import { LogIn, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-12 px-4 sm:px-6 flex items-center justify-center min-h-[80vh]">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-block border-3 border-black bg-brutal-yellow px-3 py-1 text-2xl font-black tracking-tight text-black shadow-brutal">
            TEAMSYNC
          </div>
          <h1 className="font-heading text-3xl font-black uppercase text-black">
            WELCOME BACK
          </h1>
          <p className="text-xs font-bold text-neutral-600">
            Log in to manage your team listings and join requests.
          </p>
        </div>

        <BrutalCard variant="white" shadowSize="xl" className="space-y-5">
          {error && (
            <div className="flex items-start gap-2 border-2 border-black bg-red-100 p-3 text-xs font-black text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <BrutalInput
              label="Email or Username"
              placeholder="e.g. your_username or email@domain.com"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              required
            />

            <BrutalInput
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <BrutalButton
              type="submit"
              variant="yellow"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              <LogIn className="w-4 h-4" />
              {loading ? "AUTHENTICATING..." : "LOG IN NOW"}
            </BrutalButton>
          </form>

          <div className="border-t-2 border-black pt-3 text-center text-xs font-bold text-neutral-700">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-black text-black underline decoration-2 hover:text-brutal-pink">
              REGISTER HERE
            </Link>
          </div>
        </BrutalCard>
      </div>
    </div>
  );
}
