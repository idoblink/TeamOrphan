"use client";

import React, { useState } from "react";
import { BrutalModal } from "../ui/BrutalModal";
import { BrutalButton } from "../ui/BrutalButton";
import { BrutalTextarea, BrutalSelect } from "../ui/BrutalInput";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportedUserId?: string;
  teamId?: string;
  targetName: string;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  reportedUserId,
  teamId,
  targetName,
}) => {
  const [reasonCategory, setReasonCategory] = useState("Spam or Fake Listing");
  const [reasonDetails, setReasonDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fullReason = `[${reasonCategory}] ${reasonDetails.trim()}`;

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportedUserId,
          teamId,
          reason: fullReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit report.");
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setReasonDetails("");
        onClose();
      }, 1800);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BrutalModal isOpen={isOpen} onClose={onClose} title={`Report ${targetName}`}>
      {success ? (
        <div className="py-6 text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center border-3 border-black bg-brutal-green shadow-brutal">
            <CheckCircle2 className="w-8 h-8 text-black stroke-[3]" />
          </div>
          <h4 className="font-heading text-lg font-black uppercase text-black">
            Report Submitted
          </h4>
          <p className="text-xs font-semibold text-neutral-600">
            Our moderation team will review this listing shortly. Thank you for keeping TeamSync safe.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="border-2 border-black bg-red-50 p-2.5 flex items-center gap-2 text-xs font-bold text-red-800">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Reporting: {targetName}</span>
          </div>

          {error && (
            <p className="text-xs font-black text-red-600 border-2 border-black bg-red-100 p-2 uppercase">
              {error}
            </p>
          )}

          <BrutalSelect
            label="Violation Category"
            value={reasonCategory}
            onChange={(e) => setReasonCategory(e.target.value)}
          >
            <option value="Spam or Fake Listing">Spam or Fake Listing</option>
            <option value="Inappropriate Content">Inappropriate Content / Language</option>
            <option value="Harassment">Harassment or Abusive Behavior</option>
            <option value="Scam or Solicitation">Commercial Solicitation / Scam</option>
            <option value="Other">Other Violation</option>
          </BrutalSelect>

          <BrutalTextarea
            label="Details"
            placeholder="Please provide details about what happened..."
            value={reasonDetails}
            onChange={(e) => setReasonDetails(e.target.value)}
            rows={3}
            required
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
              variant="pink"
              size="sm"
              disabled={loading}
            >
              {loading ? "Submitting..." : "Submit Report"}
            </BrutalButton>
          </div>
        </form>
      )}
    </BrutalModal>
  );
};
