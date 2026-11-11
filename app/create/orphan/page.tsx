"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BrutalCard } from "@/components/ui/BrutalCard";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { BrutalInput, BrutalTextarea, BrutalSelect } from "@/components/ui/BrutalInput";
import { SkillTag } from "@/components/ui/SkillTag";
import { Plus, UserCheck, AlertCircle, Sparkles } from "lucide-react";

function CreateOrphanForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultEventId = searchParams.get("eventId") || "";

  const [events, setEvents] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    targetEventId: defaultEventId,
    targetCategory: "Hackathon",
    experience: "",
    availability: "Available immediately for upcoming events",
    location: "",
    mode: "ANY" as "ONLINE" | "OFFLINE" | "ANY",
    bio: "",
  });

  const [skills, setSkills] = useState<string[]>(["Python", "Machine Learning", "Backend"]);
  const [newSkill, setNewSkill] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch("/api/events");
        if (res.ok) {
          const data = await res.json();
          setEvents(data.events || []);
        }
      } catch {
        // ignore
      }
    }
    loadEvents();
  }, []);

  const handleAddSkill = (e: React.KeyboardEvent | React.MouseEvent) => {
    if (("key" in e && e.key === "Enter") || e.type === "click") {
      e.preventDefault();
      const trimmed = newSkill.trim();
      if (trimmed && !skills.includes(trimmed)) {
        setSkills([...skills, trimmed]);
        setNewSkill("");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (skills.length === 0) {
      setError("Please specify at least 1 skill.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/orphans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          targetEventId: formData.targetEventId || null,
          skills,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to post orphan listing.");
      }

      window.location.href = "/discover?tab=orphans";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-8 px-4 sm:px-6 max-w-3xl mx-auto space-y-6">
      <div className="border-4 border-black bg-brutal-green p-6 sm:p-8 shadow-brutal-xl">
        <div className="inline-block border-2 border-black bg-white px-2.5 py-0.5 font-heading text-xs font-black uppercase mb-1 shadow-[2px_2px_0px_#000]">
          INDIVIDUAL AVAILABILITY POST
        </div>
        <h1 className="font-heading text-3xl sm:text-5xl font-black uppercase tracking-tight text-black">
          POST &ldquo;LOOKING FOR A TEAM&rdquo;
        </h1>
        <p className="text-xs font-bold text-neutral-900 mt-1">
          Tell incomplete squads what you bring to the table so they can invite you directly.
        </p>
      </div>

      <BrutalCard variant="white" shadowSize="xl" className="space-y-6">
        {error && (
          <div className="flex items-start gap-2 border-2 border-black bg-red-100 p-3 text-xs font-black text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <BrutalSelect
              label="Specific Event (Optional)"
              value={formData.targetEventId}
              onChange={(e) => setFormData({ ...formData, targetEventId: e.target.value })}
            >
              <option value="">Any Upcoming Event</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({ev.category})
                </option>
              ))}
            </BrutalSelect>

            <BrutalSelect
              label="Preferred Event Domain *"
              value={formData.targetCategory}
              onChange={(e) => setFormData({ ...formData, targetCategory: e.target.value })}
            >
              <option value="Hackathon">Hackathons</option>
              <option value="Coding Contest">Coding Contests</option>
              <option value="Sports">Sports</option>
              <option value="Gaming">Gaming / Esports</option>
              <option value="Robotics">Robotics</option>
              <option value="College Fest">College Fest</option>
              <option value="Debate">Debates</option>
            </BrutalSelect>
          </div>

          {/* Skills Input */}
          <div className="space-y-2">
            <label className="block font-heading text-xs font-black uppercase tracking-wider text-black">
              Skills You Can Help With * (e.g. Python, React, Solidity, Pitching)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type skill and press Enter..."
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={handleAddSkill}
                className="flex-1 border-3 border-black bg-white px-3.5 py-2 text-sm font-bold shadow-brutal outline-none"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="border-3 border-black bg-brutal-green px-4 py-2 font-heading text-xs font-black uppercase shadow-brutal hover:bg-lime-300"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {skills.map((skill, idx) => (
                <SkillTag
                  key={idx}
                  skill={skill}
                  onRemove={() => setSkills(skills.filter((s) => s !== skill))}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <BrutalInput
              label="Availability Status *"
              placeholder="e.g. Available full 48 hours for weekend hackathon"
              value={formData.availability}
              onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
              required
            />

            <BrutalSelect
              label="Preferred Mode *"
              value={formData.mode}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  mode: e.target.value as "ONLINE" | "OFFLINE" | "ANY",
                })
              }
            >
              <option value="ANY">Any (Online or In-Person)</option>
              <option value="ONLINE">Online Only</option>
              <option value="OFFLINE">Offline / In-Person Only</option>
            </BrutalSelect>
          </div>

          <BrutalInput
            label="Past Experience / Projects (Optional)"
            placeholder="e.g. Won HackMIT 2025; Built 3 full-stack Next.js apps..."
            value={formData.experience}
            onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
          />

          <BrutalTextarea
            label="About You & Pitch *"
            placeholder="Introduce yourself to team leaders. What makes you an exceptional teammate under pressure?"
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            rows={3}
            required
          />

          <div className="pt-2">
            <BrutalButton
              type="submit"
              variant="green"
              size="lg"
              className="w-full shadow-brutal-lg"
              disabled={loading}
            >
              <Sparkles className="w-5 h-5" />
              {loading ? "POSTING..." : "POST TO TALENT MARKETPLACE"}
            </BrutalButton>
          </div>
        </form>
      </BrutalCard>
    </div>
  );
}

export default function CreateOrphanPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center font-heading text-xs font-black uppercase">Loading form...</div>}>
      <CreateOrphanForm />
    </Suspense>
  );
}
