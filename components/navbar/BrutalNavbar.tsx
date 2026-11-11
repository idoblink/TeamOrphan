"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BrutalButton } from "../ui/BrutalButton";
import { Avatar } from "../ui/Avatar";
import {
  Bell,
  MessageSquare,
  Menu,
  X,
  PlusCircle,
  Shield,
  LogOut,
  User,
  LayoutDashboard,
  Compass,
  Calendar,
  Users,
} from "lucide-react";

interface NavbarUser {
  id: string;
  name: string;
  username: string;
  avatar?: string | null;
  role: string;
}

export const BrutalNavbar: React.FC<{ initialUser?: NavbarUser | null }> = ({
  initialUser,
}) => {
  const [user, setUser] = useState<NavbarUser | null>(initialUser || null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const pathname = usePathname();
  const router = useRouter();

  // Fetch current user & notifications
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    }
    checkAuth();
  }, [pathname]);

  useEffect(() => {
    if (!user) return;
    async function fetchNotifications() {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
          setUnreadNotifications(data.unreadCount || 0);
        }
      } catch {
        // silent error
      }
    }
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user, pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.push("/");
      router.refresh();
    } catch {
      // ignore
    }
  };

  const navLinks = [
    { name: "Discover", href: "/discover", icon: Compass },
    { name: "Events", href: "/events", icon: Calendar },
    { name: "Teams", href: "/teams", icon: Users },
  ];

  return (
    <nav className="sticky top-0 z-40 w-full border-b-4 border-black bg-brutal-bg shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="border-3 border-black bg-brutal-yellow px-2.5 py-1 text-base sm:text-lg font-black tracking-tighter text-black shadow-brutal-sm group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
            TEAM<span className="bg-black text-white px-1 ml-0.5">SYNC</span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`font-heading text-sm font-black uppercase tracking-wider transition-all px-2 py-1 ${
                  isActive
                    ? "bg-black text-white shadow-[2px_2px_0px_#000]"
                    : "text-black hover:bg-brutal-yellow"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </div>

        {/* Action Buttons / Auth */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              {/* Quick Create Buttons */}
              <Link href="/create/team">
                <BrutalButton variant="yellow" size="sm" className="hidden lg:inline-flex">
                  <PlusCircle className="w-4 h-4" />
                  + Post Need
                </BrutalButton>
              </Link>
              <Link href="/create/event">
                <BrutalButton variant="purple" size="sm" className="hidden xl:inline-flex text-white">
                  <Calendar className="w-4 h-4" />
                  + Host Event
                </BrutalButton>
              </Link>

              {/* Messages Link */}
              <Link
                href="/messages"
                className="relative border-2 border-black bg-white p-2 shadow-brutal-sm hover:bg-yellow-100 transition-colors"
                title="Messages"
              >
                <MessageSquare className="w-5 h-5 text-black" />
              </Link>

              {/* Notification Bell Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="relative border-2 border-black bg-white p-2 shadow-brutal-sm hover:bg-yellow-100 transition-colors"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5 text-black" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center border-2 border-black bg-brutal-pink text-[10px] font-black text-white">
                      {unreadNotifications > 9 ? "9+" : unreadNotifications}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 border-3 border-black bg-white p-3 shadow-brutal-xl z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-2">
                      <span className="font-heading text-xs font-black uppercase tracking-wider">
                        Notifications
                      </span>
                      <Link
                        href="/notifications"
                        onClick={() => setNotificationsOpen(false)}
                        className="text-[11px] font-bold text-neutral-600 hover:underline"
                      >
                        View All
                      </Link>
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {notifications.length === 0 ? (
                        <p className="text-xs font-bold text-neutral-500 py-3 text-center">
                          No notifications yet.
                        </p>
                      ) : (
                        notifications.slice(0, 5).map((n) => (
                          <Link
                            key={n.id}
                            href={n.link || "/notifications"}
                            onClick={() => setNotificationsOpen(false)}
                            className={`block border-2 border-black p-2 text-xs transition-colors ${
                              n.read ? "bg-neutral-50" : "bg-yellow-50"
                            } hover:bg-yellow-100`}
                          >
                            <div className="font-black text-black">{n.title}</div>
                            <div className="text-neutral-700 mt-0.5 line-clamp-2">
                              {n.message}
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Admin Link if role is ADMIN */}
              {user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="border-2 border-black bg-brutal-purple p-2 text-white shadow-brutal-sm hover:bg-purple-600"
                  title="Admin Dashboard"
                >
                  <Shield className="w-5 h-5" />
                </Link>
              )}

              {/* Dashboard / Profile */}
              <Link href="/dashboard" className="flex items-center gap-2">
                <Avatar name={user.name} src={user.avatar} size="sm" />
                <span className="font-heading text-xs font-black uppercase tracking-wider text-black hover:underline hidden xl:inline">
                  {user.name.split(" ")[0]}
                </span>
              </Link>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="border-2 border-black bg-white p-2 shadow-brutal-sm hover:bg-red-100 text-black hover:text-red-600 transition-colors"
                title="Log out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              <Link href="/login">
                <BrutalButton variant="white" size="sm">
                  LOGIN
                </BrutalButton>
              </Link>
              <Link href="/register">
                <BrutalButton variant="yellow" size="sm">
                  JOIN NOW
                </BrutalButton>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex items-center gap-2 md:hidden">
          {user && (
            <Link
              href="/notifications"
              className="relative border-2 border-black bg-white p-1.5 shadow-brutal-sm"
            >
              <Bell className="w-4 h-4 text-black" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center border-2 border-black bg-brutal-pink text-[9px] font-black text-white">
                  {unreadNotifications}
                </span>
              )}
            </Link>
          )}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="border-3 border-black bg-brutal-yellow p-1.5 text-black shadow-brutal-sm"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 stroke-[3]" />
            ) : (
              <Menu className="w-6 h-6 stroke-[3]" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-t-3 border-black bg-brutal-bg p-4 md:hidden space-y-4 animate-in slide-in-from-top-2">
          <div className="space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block border-2 border-black bg-white p-2.5 font-heading text-sm font-black uppercase tracking-wider text-black shadow-brutal-sm hover:bg-brutal-yellow"
              >
                {link.name}
              </Link>
            ))}
          </div>

          {user ? (
            <div className="space-y-2 border-t-2 border-black pt-3">
              <div className="flex items-center gap-3 bg-white p-2.5 border-2 border-black">
                <Avatar name={user.name} src={user.avatar} size="sm" />
                <div>
                  <div className="font-heading text-xs font-black uppercase">{user.name}</div>
                  <div className="text-[11px] font-bold text-neutral-500">@{user.username}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="border-2 border-black bg-brutal-cyan p-2 text-center text-xs font-black uppercase shadow-brutal-sm"
                >
                  Dashboard
                </Link>
                <Link
                  href={`/profile/${user.username}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="border-2 border-black bg-white p-2 text-center text-xs font-black uppercase shadow-brutal-sm"
                >
                  My Profile
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <Link
                  href="/create/team"
                  onClick={() => setMobileMenuOpen(false)}
                  className="border-2 border-black bg-brutal-yellow p-2 text-center text-[10px] sm:text-xs font-black uppercase shadow-brutal-sm"
                >
                  + Team
                </Link>
                <Link
                  href="/create/orphan"
                  onClick={() => setMobileMenuOpen(false)}
                  className="border-2 border-black bg-brutal-green p-2 text-center text-[10px] sm:text-xs font-black uppercase shadow-brutal-sm"
                >
                  + Orphan
                </Link>
                <Link
                  href="/create/event"
                  onClick={() => setMobileMenuOpen(false)}
                  className="border-2 border-black bg-brutal-purple p-2 text-center text-[10px] sm:text-xs font-black uppercase text-white shadow-brutal-sm"
                >
                  + Event
                </Link>
              </div>

              <Link
                href="/messages"
                onClick={() => setMobileMenuOpen(false)}
                className="block border-2 border-black bg-white p-2 text-center text-xs font-black uppercase shadow-brutal-sm"
              >
                💬 Messages
              </Link>

              {user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block border-2 border-black bg-brutal-purple p-2 text-center text-xs font-black uppercase text-white shadow-brutal-sm"
                >
                  🛡️ Admin Panel
                </Link>
              )}

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full border-2 border-black bg-red-100 p-2 text-center text-xs font-black uppercase text-red-600 shadow-brutal-sm"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="space-y-2 border-t-2 border-black pt-3">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block"
              >
                <BrutalButton variant="white" size="md" className="w-full">
                  LOGIN
                </BrutalButton>
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="block"
              >
                <BrutalButton variant="yellow" size="md" className="w-full">
                  JOIN NOW
                </BrutalButton>
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};
