"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrutalCard } from "@/components/ui/BrutalCard";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { BrutalInput, BrutalTextarea, BrutalSelect } from "@/components/ui/BrutalInput";
import { Calendar, PlusCircle, AlertCircle, MapPin, Sparkles, Trophy } from "lucide-react";

export default function CreateEventPage() {
  const router = useRouter();

  // Tomorrow by default
  const defaultDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);

  const [formData, setFormData] = useState({
    name: "",
    category: "Hackathon",
    startDate: defaultDate,
    location: "Bangalore & Online",
    mode: "HYBRID",
    description: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    "Hackathon",
    "Coding Contest",
    "Sports",
    "Gaming",
    "Robotics",
    "College Fest",
    "Debate",
    "Design Sprint",
  ];

  const modes = [
    { label: "Hybrid (Online & In-person)", value: "HYBRID" },
    { label: "Online Only (Remote)", value: "ONLINE" },
    { label: "Offline (In-person Venue)", value: "OFFLINE" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || formData.name.trim().length < 3) {
      setError("Event name must be at least 3 characters.");
      return;
    }
    if (!formData.description.trim() || formData.description.trim().length < 10) {
      setError("Please provide a description (at least 10 characters).");
      return;
    }
    if (!formData.startDate) {
      setError("Start date and time is required.");
      return;
    }
    if (!formData.location.trim()) {
      setError("Location is required (e.g., 'Online', 'Campus Auditorium').");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create event.");
      }

      window.location.href = `/events/${data.event.id}`;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-8 px-4 sm:px-6 max-w-3xl mx-auto space-y-6">
      {/* Neo-brutalist Header */}
      <div className="border-4 border-black bg-brutal-purple p-6 sm:p-8 shadow-brutal-xl text-white">
        <div className="inline-block border-2 border-black bg-white px-2.5 py-0.5 font-heading text-xs font-black uppercase mb-1 text-black shadow-[2px_2px_0px_#000]">
          EVENT ORGANIZER & HOSTING
        </div>
        <h1 className="font-heading text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
          HOST / ADD A NEW EVENT
        </h1>
        <p className="text-xs font-bold text-neutral-200 mt-1">
          Publish an upcoming hackathon, tournament, or contest. Teams and solo builders can match and recruit before the 24h cutoff.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 border-3 border-black bg-red-100 p-4 text-xs font-black text-red-700 shadow-brutal-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <BrutalCard variant="white" shadowSize="lg" className="space-y-6 p-6 sm:p-8">
          {/* Event Title */}
          <BrutalInput
            label="Event Name *"
            name="name"
            placeholder="e.g., Bengaluru AI Hackathon 2026, RoboCup India, CodeWars"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          {/* Category & Mode Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <BrutalSelect
              label="Category *"
              name="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </BrutalSelect>

            <BrutalSelect
              label="Format / Mode *"
              name="mode"
              value={formData.mode}
              onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
            >
              {modes.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </BrutalSelect>
          </div>

          {/* Date & Time and Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-heading text-xs font-black uppercase tracking-wider text-black mb-1.5">
                Event Start Date & Time *
              </label>
              <input
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full border-3 border-black bg-white px-3 py-2 text-xs sm:text-sm font-bold shadow-brutal-sm outline-none focus:bg-yellow-50"
                required
              />
              <p className="text-[10px] font-bold text-neutral-500 mt-1">
                Teams can recruit members until 24 hours prior to this start time.
              </p>
            </div>

            <BrutalInput
              label="Location / Venue *"
              name="location"
              placeholder="e.g., 'Bengaluru Palace Grounds' or 'Online via Discord'"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              required
            />
          </div>

          {/* Description */}
          <BrutalTextarea
            label="Event Description & Guidelines *"
            name="description"
            rows={4}
            placeholder="Describe the challenge, themes, eligibility, prize pool, schedule, or team guidelines..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
          />
        </BrutalCard>

        {/* Submit Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-4 border-black bg-white p-4 sm:p-6 shadow-brutal-lg">
          <Link href="/events">
            <BrutalButton type="button" variant="white" size="md">
              Cancel
            </BrutalButton>
          </Link>

          <BrutalButton
            type="submit"
            variant="purple"
            size="lg"
            disabled={loading}
            className="flex items-center gap-2"
          >
            <Trophy className="w-5 h-5" />
            {loading ? "Publishing Event..." : "PUBLISH EVENT NOW"}
          </BrutalButton>
        </div>
      </form>
    </div>
  );
}
