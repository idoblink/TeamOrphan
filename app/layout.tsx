import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import { BrutalNavbar } from "@/components/navbar/BrutalNavbar";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import { Zap, Heart, ShieldAlert } from "lucide-react";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["400", "500", "600", "700"],
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: "TeamSync – Event-Based Team Formation and Matching System",
  description:
    "Find teammates for hackathons, competitions, sports and events before your deadline. Strict 24-hour recruitment cutoff rule.",
  openGraph: {
    title: "TeamSync – Event-Based Team Formation and Matching System",
    description: "Don't let your team compete one member short. Match before the 24-hour cutoff.",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let user = null;
  try {
    user = await getCurrentUser();
  } catch (err) {
    console.error("RootLayout auth error:", err);
  }

  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable}`}>
      <body className="min-h-screen flex flex-col bg-brutal-bg antialiased text-black">
        {/* Sticky Neo-Brutalist Navbar */}
        <BrutalNavbar initialUser={user} />

        {/* Main Application Content */}
        <main className="flex-1 bg-grid">{children}</main>

        {/* Neo-Brutalist Footer */}
        <footer className="border-t-4 border-black bg-black text-white py-12 px-4 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              {/* Brand & Manifesto */}
              <div className="md:col-span-2 space-y-4">
                <div className="inline-block border-3 border-white bg-brutal-yellow px-3 py-1 text-xl font-black tracking-tighter text-black shadow-[4px_4px_0px_#fff]">
                  TEAM<span className="bg-black text-white px-1.5 ml-1">SYNC</span>
                </div>
                <p className="text-sm font-medium text-neutral-300 max-w-md">
                  &ldquo;Don&apos;t let your team compete one member short.&rdquo; The event-based team formation and matching platform built for students, hackers, athletes, and builders.
                </p>
                <div className="flex items-center gap-2 text-xs font-bold text-brutal-yellow">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Enforcing the strict 24-hour recruitment cutoff on all events.</span>
                </div>
              </div>

              {/* Quick Links */}
              <div className="space-y-3">
                <h4 className="font-heading text-xs font-black uppercase tracking-widest text-brutal-cyan">
                  Explore
                </h4>
                <ul className="space-y-2 text-xs font-bold">
                  <li>
                    <Link href="/discover" className="hover:text-brutal-yellow transition-colors">
                      Discover Teams & Orphans
                    </Link>
                  </li>
                  <li>
                    <Link href="/events" className="hover:text-brutal-yellow transition-colors">
                      Upcoming Events
                    </Link>
                  </li>
                  <li>
                    <Link href="/create/team" className="hover:text-brutal-yellow transition-colors">
                      Post Team Requirement
                    </Link>
                  </li>
                  <li>
                    <Link href="/create/orphan" className="hover:text-brutal-yellow transition-colors">
                      Looking For Team Profile
                    </Link>
                  </li>
                </ul>
              </div>

              {/* System & Support */}
              <div className="space-y-3">
                <h4 className="font-heading text-xs font-black uppercase tracking-widest text-brutal-pink">
                  Platform
                </h4>
                <ul className="space-y-2 text-xs font-bold">
                  <li>
                    <Link href="/login" className="hover:text-brutal-yellow transition-colors">
                      Account Login
                    </Link>
                  </li>
                  <li>
                    <Link href="/register" className="hover:text-brutal-yellow transition-colors">
                      Create Account
                    </Link>
                  </li>
                  <li>
                    <Link href="/admin" className="hover:text-brutal-yellow transition-colors">
                      Trust & Moderation
                    </Link>
                  </li>
                  <li>
                    <span className="inline-flex items-center gap-1 text-brutal-green">
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      v1.0.0 Ready
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="border-t-2 border-neutral-800 pt-6 flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-neutral-400">
              <p>© {new Date().getFullYear()} TeamSync. Event-Based Team Formation and Matching System.</p>
              <p className="flex items-center gap-1">
                Zero incomplete teams left behind.
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
