"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrutalCard } from "../ui/BrutalCard";
import { BrutalButton } from "../ui/BrutalButton";
import { Avatar } from "../ui/Avatar";
import { SkillTag } from "../ui/SkillTag";
import { MessageModal } from "../modals/MessageModal";
import { parseJsonArray, formatTimeAgo } from "@/lib/utils";
import { Check, X, MessageSquare, AlertTriangle, Users } from "lucide-react";

export interface IncomingRequestItem {
  id: string;
  teamId: string;
  teamName: string;
  message?: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    username: string;
    avatar?: string | null;
    college?: string | null;
    location?: string | null;
    skills?: string;
  };
}

export function IncomingRequestsManager({
  initialRequests,
}: {
  initialRequests: IncomingRequestItem[];
}) {
  const [requests, setRequests] = useState<IncomingRequestItem[]>(initialRequests);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [messageTarget, setMessageTarget] = useState<{ id: string; name: string } | null>(null);
  const router = useRouter();

  const handleAction = async (requestId: string, action: "ACCEPT" | "REJECT") => {
    setProcessingId(requestId);
    setActionError(null);

    try {
      const res = await fetch("/api/teams/join-request", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to ${action.toLowerCase()} request`);
      }

      // Remove from pending list
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      router.refresh();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (requests.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-3 border-black pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center border-2 border-black bg-brutal-pink text-white shadow-[2px_2px_0px_#000]">
            <Users className="w-4 h-4 stroke-[3]" />
          </div>
          <h2 className="font-heading text-xl sm:text-2xl font-black uppercase text-black">
            PENDING SQUAD APPLICATIONS ({requests.length})
          </h2>
        </div>
        <span className="border-2 border-black bg-brutal-yellow px-2.5 py-0.5 text-xs font-black uppercase shadow-[2px_2px_0px_#000]">
          Action Needed
        </span>
      </div>

      {actionError && (
        <div className="flex items-center gap-2 border-2 border-black bg-red-100 p-3 text-xs font-black text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {requests.map((req) => {
          const skills = parseJsonArray(req.user.skills);
          const isBusy = processingId === req.id;

          return (
            <BrutalCard
              key={req.id}
              variant="white"
              shadowSize="md"
              className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5"
            >
              <div className="space-y-3 flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Avatar name={req.user.name} src={req.user.avatar} size="md" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-heading text-base font-black uppercase text-black">
                          {req.user.name}
                        </h4>
                        <span className="text-xs font-bold text-neutral-500">
                          @{req.user.username}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-neutral-600">
                        {req.user.college || req.user.location || "Student Builder"}
                      </div>
                    </div>
                  </div>

                  <span className="border-2 border-black bg-yellow-100 px-2.5 py-1 text-xs font-black text-black">
                    Squad: {req.teamName}
                  </span>
                </div>

                {req.message && (
                  <p className="border-l-4 border-black bg-yellow-50 p-2.5 text-xs font-semibold italic text-neutral-800">
                    &ldquo;{req.message}&rdquo;
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-black uppercase text-neutral-600 mr-1">
                    Skills:
                  </span>
                  {skills.length === 0 ? (
                    <span className="text-xs text-neutral-400">None listed</span>
                  ) : (
                    skills.map((s, idx) => <SkillTag key={idx} skill={s} size="sm" />)
                  )}
                  <span className="text-[10px] font-bold text-neutral-400 ml-auto">
                    {formatTimeAgo(req.createdAt)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 border-t-2 md:border-t-0 md:border-l-2 border-black pt-3 md:pt-0 md:pl-4">
                <BrutalButton
                  variant="green"
                  size="sm"
                  onClick={() => handleAction(req.id, "ACCEPT")}
                  disabled={isBusy}
                  className="shadow-brutal-sm"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  {isBusy ? "Accepting..." : "ACCEPT"}
                </BrutalButton>

                <BrutalButton
                  variant="white"
                  size="sm"
                  onClick={() => handleAction(req.id, "REJECT")}
                  disabled={isBusy}
                  className="shadow-brutal-sm"
                >
                  <X className="w-4 h-4 stroke-[3]" />
                  REJECT
                </BrutalButton>

                <button
                  type="button"
                  onClick={() => setMessageTarget({ id: req.user.id, name: req.user.name })}
                  className="border-2 border-black bg-brutal-yellow p-2 shadow-brutal-sm hover:bg-black hover:text-white transition-colors"
                  title="Direct Message"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>

                <Link href={`/profile/${req.user.username}`}>
                  <BrutalButton variant="outline" size="sm" className="shadow-brutal-sm">
                    Profile
                  </BrutalButton>
                </Link>
              </div>
            </BrutalCard>
          );
        })}
      </div>

      {messageTarget && (
        <MessageModal
          isOpen={true}
          onClose={() => setMessageTarget(null)}
          receiverId={messageTarget.id}
          receiverName={messageTarget.name}
        />
      )}
    </div>
  );
}

