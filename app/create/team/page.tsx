"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BrutalCard } from "@/components/ui/BrutalCard";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { BrutalInput, BrutalTextarea, BrutalSelect } from "@/components/ui/BrutalInput";
import { SkillTag } from "@/components/ui/SkillTag";
import { Plus, Users, PlusCircle, AlertCircle, Calendar } from "lucide-react";

function CreateTeamForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultEventId = searchParams.get("eventId") || "";

  const [events, setEvents] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    eventId: defaultEventId,
    maxMembers: 4,
    description: "",
    contactInfo: "",
  });

  const [requiredSkills, setRequiredSkills] = useState<string[]>(["Python", "React"]);
  const [newSkill, setNewSkill] = useState("");
  const [preferredSkills, setPreferredSkills] = useState<string[]>([]);
  const [newPrefSkill, setNewPrefSkill] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch("/api/events");
        if (res.ok) {
          const data = await res.json();
          setEvents(data.events || []);
          if (!formData.eventId && data.events?.length > 0) {
            setFormData((prev) => ({ ...prev, eventId: data.events[0].id }));
          }
        }
      } catch {
        // ignore
      }
    }
    loadEvents();
  }, []);

  const handleAddRequiredSkill = (e: React.KeyboardEvent | React.MouseEvent) => {
    if (("key" in e && e.key === "Enter") || e.type === "click") {
      e.preventDefault();
      const trimmed = newSkill.trim();
      if (trimmed && !requiredSkills.includes(trimmed)) {
        setRequiredSkills([...requiredSkills, trimmed]);
        setNewSkill("");
      }
    }
  };

  const handleAddPreferredSkill = (e: React.KeyboardEvent | React.MouseEvent) => {
    if (("key" in e && e.key === "Enter") || e.type === "click") {
      e.preventDefault();
      const trimmed = newPrefSkill.trim();
      if (trimmed && !preferredSkills.includes(trimmed)) {
        setPreferredSkills([...preferredSkills, trimmed]);
        setNewPrefSkill("");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.eventId) {
      setError("Please select an event.");
      return;
    }
    if (requiredSkills.length === 0) {
      setError("Please specify at least 1 required skill.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          requiredSkills,
          preferredSkills,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create team listing.");
      }

      window.location.href = `/teams/${data.team.id}`;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedEvent = events.find((e) => e.id === formData.eventId);

  return (
    <div className="py-8 px-4 sm:px-6 max-w-3xl mx-auto space-y-6">
      <div className="border-4 border-black bg-brutal-yellow p-6 sm:p-8 shadow-brutal-xl">
        <div className="inline-block border-2 border-black bg-white px-2.5 py-0.5 font-heading text-xs font-black uppercase mb-1 shadow-[2px_2px_0px_#000]">
          TEAM RECRUITMENT CREATOR
        </div>
        <h1 className="font-heading text-3xl sm:text-5xl font-black uppercase tracking-tight text-black">
          POST TEAM REQUIREMENT
        </h1>
        <p className="text-xs font-bold text-neutral-800 mt-1">
          Specify what your team is building and the missing skill sets you need before the 24h cutoff.
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
          <BrutalInput
            label="Team Name *"
            placeholder="e.g. Neural Ninjas, CyberSparks"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <BrutalSelect
            label="Select Target Event *"
            value={formData.eventId}
            onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
            required
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name} ({ev.category} • {new Date(ev.startDate).toLocaleDateString()})
              </option>
            ))}
          </BrutalSelect>

          {selectedEvent && (
            <div className="border-2 border-black bg-yellow-50 p-3 text-xs font-bold space-y-1 shadow-[2px_2px_0px_#000]">
              <div className="font-black text-black uppercase">
                Event: {selectedEvent.name}
              </div>
              <div className="text-neutral-700">
                Kickoff: {new Date(selectedEvent.startDate).toLocaleString()} • Venue: {selectedEvent.location}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <BrutalInput
              label="Total Team Size Required *"
              type="number"
              min={2}
              max={12}
              value={formData.maxMembers}
              onChange={(e) =>
                setFormData({ ...formData, maxMembers: parseInt(e.target.value) || 4 })
              }
              helperText="E.g. 4 if you are 3 and need 1 more."
              required
            />

            <BrutalInput
              label="Contact / Discord / Preferred Channel"
              placeholder="e.g. Discord: alex#1234 or Email"
              value={formData.contactInfo}
              onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
            />
          </div>

          {/* Required Skills */}
          <div className="space-y-2">
            <label className="block font-heading text-xs font-black uppercase tracking-wider text-black">
              Required Skills * (e.g. Python, Machine Learning, React)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type skill and press Enter..."
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={handleAddRequiredSkill}
                className="flex-1 border-3 border-black bg-white px-3.5 py-2 text-sm font-bold shadow-brutal outline-none"
              />
              <button
                type="button"
                onClick={handleAddRequiredSkill}
                className="border-3 border-black bg-brutal-yellow px-4 py-2 font-heading text-xs font-black uppercase shadow-brutal hover:bg-yellow-300"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {requiredSkills.map((skill, idx) => (
                <SkillTag
                  key={idx}
                  skill={skill}
                  onRemove={() => setRequiredSkills(requiredSkills.filter((s) => s !== skill))}
                />
              ))}
            </div>
          </div>

          {/* Preferred Skills */}
          <div className="space-y-2">
            <label className="block font-heading text-xs font-black uppercase tracking-wider text-black">
              Preferred / Nice-to-Have Skills (Optional)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type bonus skill and press Enter..."
                value={newPrefSkill}
                onChange={(e) => setNewPrefSkill(e.target.value)}
                onKeyDown={handleAddPreferredSkill}
                className="flex-1 border-3 border-black bg-white px-3.5 py-2 text-sm font-bold shadow-brutal outline-none"
              />
              <button
                type="button"
                onClick={handleAddPreferredSkill}
                className="border-3 border-black bg-brutal-cyan px-4 py-2 font-heading text-xs font-black uppercase shadow-brutal hover:bg-cyan-300"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {preferredSkills.map((skill, idx) => (
                <SkillTag
                  key={idx}
                  skill={skill}
                  onRemove={() => setPreferredSkills(preferredSkills.filter((s) => s !== skill))}
                />
              ))}
            </div>
          </div>

          <BrutalTextarea
            label="Project Description & Mission *"
            placeholder="Describe what your team is building, your current tech stack, and what role the new member will take..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            required
          />

          <div className="pt-2">
            <BrutalButton
              type="submit"
              variant="yellow"
              size="lg"
              className="w-full shadow-brutal-lg"
              disabled={loading}
            >
              <PlusCircle className="w-5 h-5" />
              {loading ? "PUBLISHING LISTING..." : "PUBLISH TEAM REQUIREMENT"}
            </BrutalButton>
          </div>
        </form>
      </BrutalCard>
    </div>
  );
}

export default function CreateTeamPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center font-heading text-xs font-black uppercase">Loading form...</div>}>
      <CreateTeamForm />
    </Suspense>
  );
}
