"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrutalCard } from "@/components/ui/BrutalCard";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { Countdown } from "@/components/ui/Countdown";
import { SkillTag } from "@/components/ui/SkillTag";
import { MatchScore } from "@/components/ui/MatchScore";
import { Avatar } from "@/components/ui/Avatar";
import { JoinRequestModal } from "@/components/modals/JoinRequestModal";
import { ReportModal } from "@/components/modals/ReportModal";
import { MessageModal } from "@/components/modals/MessageModal";
import { getRecruitmentStatus } from "@/lib/cutoff";
import { parseJsonArray, formatDate, getCategoryColor } from "@/lib/utils";
import { MatchResult } from "@/lib/matching";
import {
  Users,
  Calendar,
  MapPin,
  Check,
  X,
  AlertTriangle,
  UserPlus,
  ShieldAlert,
  MessageSquare,
  Sparkles,
  UserCheck,
} from "lucide-react";

interface TeamDetailClientProps {
  initialTeam: any;
  currentUser: any;
  userMatch: MatchResult | null;
}

export const TeamDetailClient: React.FC<TeamDetailClientProps> = ({
  initialTeam,
  currentUser,
  userMatch,
}) => {
  const router = useRouter();
  const [team, setTeam] = useState(initialTeam);

  useEffect(() => {
    setTeam(initialTeam);
  }, [initialTeam]);

  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [messageTargetUser, setMessageTargetUser] = useState<{ id: string; name: string } | null>(null);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const status = getRecruitmentStatus(team.event.startDate);
  const isLeader = Boolean(
    currentUser && (
      team.creatorId === currentUser.id ||
      currentUser.role === "ADMIN" ||
      team.members?.some((m: any) => m.userId === currentUser.id && m.role === "LEADER")
    )
  );
  const isMember = currentUser && team.members.some((m: any) => m.userId === currentUser.id);
  const currentMembersCount = team.members.length;
  const missingCount = Math.max(0, team.maxMembers - currentMembersCount);
  const isFull = currentMembersCount >= team.maxMembers || team.status === "FULL";
  const requiredSkills = parseJsonArray(team.requiredSkills);
  const preferredSkills = parseJsonArray(team.preferredSkills);
  const catStyle = getCategoryColor(team.event.category);

  // Check if current user has an existing request
  const myJoinRequest = currentUser
    ? team.joinRequests?.find((r: any) => r.userId === currentUser.id)
    : null;

  const handleRequestAction = async (requestId: string, action: "ACCEPT" | "REJECT") => {
    setProcessingRequestId(requestId);
    setActionError(null);

    try {
      const res = await fetch("/api/teams/join-request", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process request");
      }

      setTeam((prev: any) => {
        const targetReq = prev.joinRequests?.find((r: any) => r.id === requestId);
        const updatedRequests = (prev.joinRequests || []).map((r: any) =>
          r.id === requestId ? { ...r, status: action === "ACCEPT" ? "ACCEPTED" : "REJECTED" } : r
        );

        if (action === "ACCEPT") {
          const newMember = data.member || {
            id: `tm_${Date.now()}`,
            teamId: prev.id,
            userId: targetReq?.userId,
            role: "MEMBER",
            user: targetReq?.user,
          };

          const alreadyIn = prev.members?.some((m: any) => m.userId === newMember.userId);
          const updatedMembers = alreadyIn ? prev.members : [...(prev.members || []), newMember];
          const isNowFull = updatedMembers.length >= prev.maxMembers;

          return {
            ...prev,
            status: isNowFull ? "FULL" : prev.status,
            members: updatedMembers,
            joinRequests: updatedRequests,
          };
        } else {
          return {
            ...prev,
            joinRequests: updatedRequests,
          };
        }
      });

      router.refresh();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setProcessingRequestId(null);
    }
  };

  return (
    <div className="space-y-10">
      {/* 1. TOP TEAM HERO CARD */}
      <div className="border-4 border-black bg-white p-6 sm:p-10 shadow-brutal-xl space-y-6">
        {/* Category & Action bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`border-2 border-black px-3 py-1 text-xs font-black uppercase tracking-wider ${catStyle.bg} ${catStyle.text}`}
            >
              {team.event.category}
            </span>
            <Link
              href={`/events/${team.event.id}`}
              className="border-2 border-black bg-yellow-100 px-3 py-1 text-xs font-black uppercase text-black hover:bg-yellow-200 transition-colors"
            >
              Event: {team.event.name} →
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {userMatch && <MatchScore match={userMatch} size="md" showBreakdown />}
            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="border-2 border-black bg-neutral-100 p-2 text-xs font-bold text-neutral-700 hover:bg-red-100 hover:text-red-700 transition-colors"
              title="Report Team"
            >
              <ShieldAlert className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Team Title & Description */}
        <div>
          <h1 className="font-heading text-4xl sm:text-6xl font-black uppercase tracking-tight text-black">
            {team.name}
          </h1>
          <p className="mt-3 text-base font-medium text-neutral-800 max-w-3xl">
            {team.description}
          </p>
        </div>

        {/* Member Count Box */}
        <div className="border-3 border-black bg-yellow-50 p-4 shadow-brutal flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 stroke-[2.5] text-black" />
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-neutral-600">
                TEAM CAPACITY
              </div>
              <div className="font-heading text-xl font-black text-black">
                {currentMembersCount} / {team.maxMembers} MEMBERS FILLED
              </div>
            </div>
          </div>

          <div>
            {isFull ? (
              <span className="border-3 border-black bg-black text-white px-3 py-1.5 font-heading text-sm font-black uppercase tracking-wider shadow-[3px_3px_0px_#FFE500]">
                ✓ SQUAD LOCKED & FULL
              </span>
            ) : (
              <span className="border-3 border-black bg-brutal-pink text-white px-3 py-1.5 font-heading text-sm font-black uppercase tracking-wider shadow-[3px_3px_0px_#000] animate-pulse">
                🔥 NEED {missingCount} MORE {missingCount === 1 ? "PERSON" : "PEOPLE"}
              </span>
            )}
          </div>
        </div>

        {/* Countdown Banner */}
        <Countdown startDate={team.event.startDate} variant="banner" showDetails />

        {/* Skills Required */}
        <div className="space-y-2 border-t-2 border-black pt-4">
          <div className="text-xs font-black uppercase tracking-wider text-black">
            Required Skills:
          </div>
          <div className="flex flex-wrap gap-2">
            {requiredSkills.map((skill: string, idx: number) => {
              const userHasSkill =
                currentUser &&
                parseJsonArray(currentUser.skills).some(
                  (s: string) => s.toLowerCase() === skill.toLowerCase()
                );
              return <SkillTag key={idx} skill={skill} matched={currentUser ? userHasSkill : null} size="md" />;
            })}
          </div>

          {preferredSkills.length > 0 && (
            <div className="pt-2">
              <div className="text-xs font-black uppercase tracking-wider text-neutral-600 mb-1">
                Preferred Skills (Bonus):
              </div>
              <div className="flex flex-wrap gap-2">
                {preferredSkills.map((skill: string, idx: number) => (
                  <SkillTag key={idx} skill={skill} size="sm" />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CTA Join Actions */}
        <div className="border-t-3 border-black pt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs font-bold text-neutral-600">
            Contact: {team.contactInfo || "Via TeamSync Messages"}
          </div>

          <div>
            {isLeader ? (
              <span className="border-2 border-black bg-brutal-yellow px-4 py-2 font-heading text-xs font-black uppercase shadow-brutal">
                👑 YOU ARE THE TEAM LEADER
              </span>
            ) : isMember ? (
              <span className="border-2 border-black bg-brutal-green px-4 py-2 font-heading text-xs font-black uppercase shadow-brutal flex items-center gap-1.5">
                <Check className="w-4 h-4 stroke-[3]" /> YOU ARE A MEMBER OF THIS TEAM
              </span>
            ) : status.isClosed ? (
              <div className="border-3 border-black bg-neutral-200 px-4 py-2 font-heading text-xs font-black uppercase text-neutral-700 shadow-brutal">
                ⛔ RECRUITMENT CLOSED (&lt;24H TO EVENT)
              </div>
            ) : isFull ? (
              <div className="border-3 border-black bg-neutral-200 px-4 py-2 font-heading text-xs font-black uppercase text-neutral-700 shadow-brutal">
                ⛔ TEAM IS FULL
              </div>
            ) : myJoinRequest?.status === "PENDING" ? (
              <div className="border-3 border-black bg-brutal-yellow px-4 py-2 font-heading text-xs font-black uppercase shadow-brutal">
                ⏳ JOIN REQUEST PENDING REVIEW
              </div>
            ) : currentUser ? (
              <BrutalButton
                variant="yellow"
                size="lg"
                onClick={() => setIsJoinModalOpen(true)}
              >
                <UserPlus className="w-5 h-5" />
                REQUEST TO JOIN TEAM →
              </BrutalButton>
            ) : (
              <Link href="/login">
                <BrutalButton variant="yellow" size="lg">
                  LOG IN TO REQUEST JOIN →
                </BrutalButton>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 2. TEAM ROSTER & EMPTY SLOTS */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b-3 border-black pb-3">
          <Users className="w-6 h-6 stroke-[3] text-black" />
          <h2 className="font-heading text-2xl font-black uppercase text-black">
            TEAM ROSTER ({currentMembersCount}/{team.maxMembers})
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Confirmed Members */}
          {team.members.map((member: any) => {
            const memberUser = member.user || {
              id: member.userId,
              name: "Team Member",
              username: "member",
              avatar: null,
              college: null,
              location: null,
            };
            const isMe = currentUser && memberUser.id === currentUser.id;
            return (
              <BrutalCard
                key={member.id}
                variant="white"
                shadowSize="sm"
                className="flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={memberUser.name} src={memberUser.avatar} size="md" />
                  <div>
                    <h4 className="font-heading text-sm font-black uppercase text-black">
                      {memberUser.name}
                    </h4>
                    <span
                      className={`inline-block border border-black px-1.5 py-0.2 text-[10px] font-black uppercase ${
                        member.role === "LEADER" ? "bg-brutal-yellow" : "bg-neutral-100"
                      }`}
                    >
                      {member.role}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] font-semibold text-neutral-600 line-clamp-1">
                  {memberUser.college || memberUser.location || "Teammate"}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-black/20">
                  <Link
                    href={`/profile/${memberUser.username}`}
                    className="flex-1 text-center border-2 border-black bg-white py-1 text-[11px] font-black uppercase hover:bg-brutal-yellow transition-colors"
                  >
                    Profile
                  </Link>
                  {!isMe && currentUser && (
                    <button
                      type="button"
                      onClick={() =>
                        setMessageTargetUser({
                          id: memberUser.id,
                          name: memberUser.name,
                        })
                      }
                      className="border-2 border-black bg-brutal-yellow p-1 hover:bg-black hover:text-white transition-colors"
                      title="Direct Message"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </BrutalCard>
            );
          })}

          {/* Missing Empty Member Slots */}
          {Array.from({ length: missingCount }).map((_, idx) => (
            <div
              key={`empty-${idx}`}
              className="border-3 border-dashed border-black bg-neutral-100 p-5 flex flex-col items-center justify-center text-center space-y-2 min-h-[160px]"
            >
              <div className="flex h-10 w-10 items-center justify-center border-2 border-black bg-white shadow-[2px_2px_0px_#000]">
                <UserPlus className="w-5 h-5 text-neutral-500" />
              </div>
              <div className="font-heading text-xs font-black uppercase text-black">
                EMPTY SPOT #{currentMembersCount + idx + 1}
              </div>
              <div className="text-[11px] font-bold text-neutral-500">
                WAITING FOR ORPHAN TO JOIN
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. TEAM LEADER DASHBOARD: INCOMING JOIN REQUESTS */}
      {isLeader && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b-3 border-black pb-3">
            <div className="flex items-center gap-2">
              <UserCheck className="w-6 h-6 stroke-[3] text-brutal-pink" />
              <h2 className="font-heading text-2xl font-black uppercase text-black">
                MANAGE JOIN REQUESTS ({team.joinRequests?.length || 0})
              </h2>
            </div>
            {isFull && (
              <span className="text-xs font-black bg-black text-white px-2 py-1 uppercase">
                Team is Full (Requests Auto-Locked)
              </span>
            )}
          </div>

          {actionError && (
            <div className="flex items-center gap-2 border-2 border-black bg-red-100 p-3 text-xs font-black text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {!team.joinRequests || team.joinRequests.length === 0 ? (
            <BrutalCard variant="muted" shadowSize="sm" className="py-8 text-center text-xs font-bold text-neutral-600">
              No join requests received yet. Share your team listing or browse available orphans!
            </BrutalCard>
          ) : (
            <div className="space-y-4">
              {team.joinRequests.map((req: any) => {
                const reqUser = req.user || {
                  id: req.userId,
                  name: "Applicant",
                  username: "applicant",
                  avatar: null,
                  college: null,
                  location: null,
                  skills: "[]",
                };
                const candidateSkills = parseJsonArray(reqUser.skills);
                return (
                  <BrutalCard
                    key={req.id}
                    variant="white"
                    shadowSize="md"
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <Avatar name={reqUser.name} src={reqUser.avatar} size="md" />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-heading text-base font-black uppercase text-black">
                              {reqUser.name}
                            </h4>
                            <span className="text-xs font-bold text-neutral-500">
                              @{reqUser.username}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-neutral-600">
                            {reqUser.college || reqUser.location || "Student"}
                          </div>
                        </div>
                      </div>

                      {req.message && (
                        <p className="border-l-3 border-black bg-yellow-50 p-2 text-xs italic text-neutral-800">
                          &ldquo;{req.message}&rdquo;
                        </p>
                      )}

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {candidateSkills.map((s: string, idx: number) => (
                          <SkillTag key={idx} skill={s} size="sm" />
                        ))}
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex flex-wrap items-center gap-2 border-t-2 md:border-t-0 md:border-l-2 border-black pt-3 md:pt-0 md:pl-4">
                      {req.status === "PENDING" ? (
                        <>
                          <BrutalButton
                            variant="green"
                            size="sm"
                            onClick={() => handleRequestAction(req.id, "ACCEPT")}
                            disabled={processingRequestId === req.id || isFull || status.isClosed}
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                            {processingRequestId === req.id ? "Processing..." : "ACCEPT"}
                          </BrutalButton>
                          <BrutalButton
                            variant="white"
                            size="sm"
                            onClick={() => handleRequestAction(req.id, "REJECT")}
                            disabled={processingRequestId === req.id}
                          >
                            <X className="w-4 h-4 stroke-[3]" />
                            REJECT
                          </BrutalButton>
                        </>
                      ) : (
                        <span
                          className={`border-2 border-black px-3 py-1 text-xs font-black uppercase ${
                            req.status === "ACCEPTED"
                              ? "bg-brutal-green text-black"
                              : "bg-neutral-200 text-neutral-700"
                          }`}
                        >
                          {req.status}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setMessageTargetUser({
                            id: reqUser.id,
                            name: reqUser.name,
                          })
                        }
                        className="border-2 border-black bg-brutal-yellow p-2 hover:bg-black hover:text-white transition-colors"
                        title="Direct Message Applicant"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>

                      <Link href={`/profile/${reqUser.username}`}>
                        <BrutalButton variant="outline" size="sm">
                          Profile
                        </BrutalButton>
                      </Link>
                    </div>
                  </BrutalCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODALS */}
      <JoinRequestModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        teamId={team.id}
        teamName={team.name}
        eventName={team.event.name}
        onSuccess={(newReq) => {
          setTeam((prev: any) => ({
            ...prev,
            joinRequests: [...(prev.joinRequests || []), newReq],
          }));
        }}
      />

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        teamId={team.id}
        targetName={`Team "${team.name}"`}
      />

      {messageTargetUser && (
        <MessageModal
          isOpen={!!messageTargetUser}
          onClose={() => setMessageTargetUser(null)}
          receiverId={messageTargetUser.id}
          receiverName={messageTargetUser.name}
        />
      )}
    </div>
  );
};
