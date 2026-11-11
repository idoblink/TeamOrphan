"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BrutalCard } from "@/components/ui/BrutalCard";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { Avatar } from "@/components/ui/Avatar";
import { formatDate } from "@/lib/utils";
import { Shield, Users, Flag, Trash2, UserX, CheckCircle, RefreshCw } from "lucide-react";

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"reports" | "users" | "teams">("reports");
  const [reports, setReports] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [reportsRes, usersRes, teamsRes] = await Promise.all([
        fetch("/api/reports"),
        fetch("/api/admin/users"),
        fetch("/api/admin/teams"),
      ]);

      if (reportsRes.status === 403 || usersRes.status === 403) {
        setError("Access denied: You must be logged in as an ADMIN to access this portal.");
        setLoading(false);
        return;
      }

      const [reportsData, usersData, teamsData] = await Promise.all([
        reportsRes.json(),
        usersRes.json(),
        teamsRes.json(),
      ]);

      setReports(reportsData.reports || []);
      setUsers(usersData.users || []);
      setTeams(teamsData.teams || []);
    } catch (err: any) {
      setError(err.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleUpdateReport = async (id: string, status: string) => {
    try {
      await fetch("/api/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      fetchAdminData();
    } catch {
      // ignore
    }
  };

  const handleToggleSuspendUser = async (userId: string, currentSuspended: boolean) => {
    try {
      await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, isSuspended: !currentSuspended }),
      });
      fetchAdminData();
    } catch {
      // ignore
    }
  };

  const handleUpdateTeamStatus = async (teamId: string, status: string) => {
    try {
      await fetch("/api/admin/teams", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, status }),
      });
      fetchAdminData();
    } catch {
      // ignore
    }
  };

  if (error) {
    return (
      <div className="py-16 px-4 text-center max-w-lg mx-auto space-y-4">
        <div className="border-4 border-black bg-red-100 p-6 shadow-brutal-xl">
          <Shield className="w-12 h-12 text-red-600 mx-auto" />
          <h2 className="font-heading text-xl font-black uppercase text-red-800 mt-2">
            RESTRICTED ADMIN AREA
          </h2>
          <p className="text-xs font-bold text-neutral-700 mt-2">{error}</p>
          <div className="pt-4">
            <BrutalButton variant="black" size="sm" onClick={() => router.push("/login")}>
              Log in as Admin (admin@teamsync.org)
            </BrutalButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 px-4 sm:px-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-4 border-black bg-brutal-purple p-6 sm:p-8 text-white shadow-brutal-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="border-3 border-black bg-white p-2 text-black shadow-brutal-sm">
              <Shield className="w-8 h-8 stroke-[2.5]" />
            </div>
            <div>
              <div className="font-heading text-xs font-black uppercase tracking-widest text-neutral-200">
                PLATFORM TRUST & MODERATION
              </div>
              <h1 className="font-heading text-3xl sm:text-4xl font-black uppercase tracking-tight text-white">
                ADMIN COMMAND CENTER
              </h1>
            </div>
          </div>

          <BrutalButton variant="yellow" size="sm" onClick={fetchAdminData}>
            <RefreshCw className="w-4 h-4" />
            Refresh Data
          </BrutalButton>
        </div>

        {/* Tab Controls */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-6 pt-6 border-t-2 border-white/40">
          <button
            onClick={() => setActiveTab("reports")}
            className={`border-3 border-black py-2 text-xs sm:text-sm font-black uppercase tracking-wider transition-colors shadow-brutal ${
              activeTab === "reports"
                ? "bg-brutal-yellow text-black"
                : "bg-white text-black hover:bg-neutral-100"
            }`}
          >
            🚩 Reports ({reports.length})
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`border-3 border-black py-2 text-xs sm:text-sm font-black uppercase tracking-wider transition-colors shadow-brutal ${
              activeTab === "users"
                ? "bg-brutal-yellow text-black"
                : "bg-white text-black hover:bg-neutral-100"
            }`}
          >
            👥 Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab("teams")}
            className={`border-3 border-black py-2 text-xs sm:text-sm font-black uppercase tracking-wider transition-colors shadow-brutal ${
              activeTab === "teams"
                ? "bg-brutal-yellow text-black"
                : "bg-white text-black hover:bg-neutral-100"
            }`}
          >
            ⚡ Teams ({teams.length})
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-xs font-bold text-neutral-500 text-center py-10">
          Loading platform data...
        </p>
      ) : activeTab === "reports" ? (
        /* REPORTS VIEW */
        <div className="space-y-4">
          <h2 className="font-heading text-xl font-black uppercase text-black border-b-2 border-black pb-2">
            Community Reports Queue
          </h2>

          {reports.length === 0 ? (
            <BrutalCard variant="muted" shadowSize="sm" className="py-8 text-center text-xs font-bold text-neutral-600">
              Zero pending reports! Platform is healthy.
            </BrutalCard>
          ) : (
            reports.map((report) => (
              <BrutalCard
                key={report.id}
                variant="white"
                shadowSize="md"
                className="flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`border-2 border-black px-2 py-0.5 text-[10px] font-black uppercase ${
                        report.status === "PENDING"
                          ? "bg-brutal-pink text-white"
                          : report.status === "RESOLVED"
                          ? "bg-brutal-green text-black"
                          : "bg-neutral-200"
                      }`}
                    >
                      {report.status}
                    </span>
                    <span className="text-xs font-bold text-neutral-500">
                      Reported by @{report.reporter.username} • {formatDate(report.createdAt)}
                    </span>
                  </div>

                  <div className="font-heading text-sm font-black text-black">
                    {report.reportedUser
                      ? `Target User: @${report.reportedUser.username}`
                      : report.team
                      ? `Target Team: ${report.team.name}`
                      : "General Report"}
                  </div>

                  <p className="border-l-3 border-black bg-red-50 p-2 text-xs font-semibold text-red-900">
                    Reason: {report.reason}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t-2 md:border-t-0 md:border-l-2 border-black pt-3 md:pt-0 md:pl-4">
                  {report.status === "PENDING" && (
                    <>
                      <BrutalButton
                        variant="green"
                        size="sm"
                        onClick={() => handleUpdateReport(report.id, "RESOLVED")}
                      >
                        Resolve
                      </BrutalButton>
                      <BrutalButton
                        variant="white"
                        size="sm"
                        onClick={() => handleUpdateReport(report.id, "DISMISSED")}
                      >
                        Dismiss
                      </BrutalButton>
                    </>
                  )}
                </div>
              </BrutalCard>
            ))
          )}
        </div>
      ) : activeTab === "users" ? (
        /* USERS VIEW */
        <div className="space-y-4">
          <h2 className="font-heading text-xl font-black uppercase text-black border-b-2 border-black pb-2">
            Registered Users Directory
          </h2>

          <div className="space-y-3">
            {users.map((u) => (
              <BrutalCard
                key={u.id}
                variant="white"
                shadowSize="sm"
                className="flex flex-wrap items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={u.name} size="md" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-heading text-sm font-black uppercase text-black">
                        {u.name}
                      </h4>
                      <span className="text-xs font-bold text-neutral-500">
                        @{u.username}
                      </span>
                      {u.isSuspended && (
                        <span className="border border-black bg-red-600 text-white px-1.5 py-0.2 text-[9px] font-black uppercase">
                          SUSPENDED
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-neutral-600">
                      {u.email} • Role: {u.role}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <BrutalButton
                    variant={u.isSuspended ? "green" : "pink"}
                    size="sm"
                    onClick={() => handleToggleSuspendUser(u.id, u.isSuspended)}
                  >
                    <UserX className="w-4 h-4" />
                    {u.isSuspended ? "Unsuspend" : "Suspend User"}
                  </BrutalButton>
                </div>
              </BrutalCard>
            ))}
          </div>
        </div>
      ) : (
        /* TEAMS VIEW */
        <div className="space-y-4">
          <h2 className="font-heading text-xl font-black uppercase text-black border-b-2 border-black pb-2">
            Active Team Listings
          </h2>

          <div className="space-y-3">
            {teams.map((t) => (
              <BrutalCard
                key={t.id}
                variant="white"
                shadowSize="sm"
                className="flex flex-wrap items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="border border-black bg-yellow-100 px-1.5 py-0.2 text-[10px] font-black uppercase">
                      {t.event.name}
                    </span>
                    <span className="border border-black px-1.5 py-0.2 text-[10px] font-black uppercase">
                      Status: {t.status}
                    </span>
                  </div>
                  <h4 className="font-heading text-base font-black uppercase text-black mt-1">
                    {t.name}
                  </h4>
                  <div className="text-xs text-neutral-600">
                    Leader: {t.creator.name} • {t._count.members} Members
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <BrutalButton
                    variant={t.status === "CLOSED" ? "green" : "white"}
                    size="sm"
                    onClick={() =>
                      handleUpdateTeamStatus(t.id, t.status === "CLOSED" ? "OPEN" : "CLOSED")
                    }
                  >
                    {t.status === "CLOSED" ? "Re-open" : "Close Listing"}
                  </BrutalButton>
                </div>
              </BrutalCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
