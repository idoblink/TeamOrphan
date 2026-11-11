"use client";

import React, { useState } from "react";
import { BrutalModal } from "../ui/BrutalModal";
import { BrutalButton } from "../ui/BrutalButton";
import { BrutalTextarea } from "../ui/BrutalInput";
import { useRouter } from "next/navigation";
import { Users, AlertCircle, CheckCircle2 } from "lucide-react";

export interface JoinRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  teamName: string;
  eventName: string;
  onSuccess?: (joinRequest: any) => void;
}

export const JoinRequestModal: React.FC<JoinRequestModalProps> = ({
  isOpen,
  onClose,
  teamId,
  teamName,
  eventName,
  onSuccess,
}) => {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/teams/join-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, message }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit request.");
      }

      setSuccess(true);
      if (onSuccess && data.joinRequest) {
        onSuccess(data.joinRequest);
      }

      setTimeout(() => {
        setSuccess(false);
        setMessage("");
        onClose();
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BrutalModal isOpen={isOpen} onClose={onClose} title="Request to Join Team">
      {success ? (
        <div className="py-6 text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center border-3 border-black bg-brutal-green shadow-brutal">
            <CheckCircle2 className="w-8 h-8 text-black stroke-[3]" />
          </div>
          <h4 className="font-heading text-lg font-black uppercase text-black">
            Request Sent!
          </h4>
          <p className="text-xs font-semibold text-neutral-600">
            The team leader has been notified. You can track status on your dashboard.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="border-2 border-black bg-yellow-50 p-3 shadow-brutal-sm">
            <div className="flex items-center gap-2 font-heading text-xs font-black uppercase">
              <Users className="w-4 h-4" />
              <span>Target Team: {teamName}</span>
            </div>
            <div className="text-[11px] font-bold text-neutral-600 mt-0.5">
              Event: {eventName}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 border-2 border-black bg-red-100 p-2.5 text-xs font-black text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <BrutalTextarea
            label="Your Pitch / Message (Optional)"
            placeholder="Tell the team why you'd be a great fit, what skills you bring, past experience..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            helperText="Highlight relevant skills or hackathon experience to increase your chances."
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <BrutalButton
              type="button"
              variant="white"
              size="sm"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </BrutalButton>
            <BrutalButton
              type="submit"
              variant="yellow"
              size="sm"
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Join Request"}
            </BrutalButton>
          </div>
        </form>
      )}
    </BrutalModal>
  );
};
