"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrutalCard } from "@/components/ui/BrutalCard";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { BrutalInput, BrutalTextarea } from "@/components/ui/BrutalInput";
import { SkillTag } from "@/components/ui/SkillTag";
import { UserPlus, Plus, AlertCircle } from "lucide-react";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    college: "",
    location: "",
    bio: "",
  });

  const [skills, setSkills] = useState<string[]>(["Python", "React"]);
  const [newSkill, setNewSkill] = useState("");
  const [interests, setInterests] = useState<string[]>(["Hackathons", "AI"]);
  const [newInterest, setNewInterest] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleAddInterest = (e: React.KeyboardEvent | React.MouseEvent) => {
    if (("key" in e && e.key === "Enter") || e.type === "click") {
      e.preventDefault();
      const trimmed = newInterest.trim();
      if (trimmed && !interests.includes(trimmed)) {
        setInterests([...interests, trimmed]);
        setNewInterest("");
      }
    }
  };

  const handleRemoveInterest = (item: string) => {
    setInterests(interests.filter((i) => i !== item));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (skills.length === 0) {
      setError("Please add at least 1 skill.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          skills,
          interests,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-12 px-4 sm:px-6 flex items-center justify-center">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-block border-3 border-black bg-brutal-pink px-3 py-1 text-2xl font-black tracking-tight text-white shadow-brutal">
            JOIN TEAMSYNC
          </div>
          <h1 className="font-heading text-3xl font-black uppercase text-black">
            CREATE YOUR PROFILE
          </h1>
          <p className="text-xs font-bold text-neutral-600">
            Never compete one member short again. Build your profile and start matching.
          </p>
        </div>

        <BrutalCard variant="white" shadowSize="xl" className="space-y-5">
          {error && (
            <div className="flex items-start gap-2 border-2 border-black bg-red-100 p-3 text-xs font-black text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <BrutalInput
                label="Full Name *"
                placeholder="e.g. Alex Morgan"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <BrutalInput
                label="Username *"
                placeholder="e.g. alex_builder"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <BrutalInput
                label="Email Address *"
                type="email"
                placeholder="you@university.edu"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <BrutalInput
                label="Password *"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <BrutalInput
                label="College / Organization"
                placeholder="e.g. Tech Institute / University"
                value={formData.college}
                onChange={(e) => setFormData({ ...formData, college: e.target.value })}
              />
              <BrutalInput
                label="Location / City"
                placeholder="e.g. San Francisco, CA or Bangalore"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>

            {/* Skills Chip Input */}
            <div className="space-y-2">
              <label className="block font-heading text-xs font-black uppercase tracking-wider text-black">
                Your Skills * (Press Enter or Add)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Python, Next.js, Figma, Robotics..."
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={handleAddSkill}
                  className="flex-1 border-3 border-black bg-white px-3.5 py-2 text-sm font-bold shadow-brutal outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="border-3 border-black bg-brutal-yellow px-4 py-2 font-heading text-xs font-black uppercase shadow-brutal hover:bg-yellow-300"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {skills.map((skill, idx) => (
                  <SkillTag
                    key={idx}
                    skill={skill}
                    onRemove={() => handleRemoveSkill(skill)}
                  />
                ))}
              </div>
            </div>

            {/* Interests Chip Input */}
            <div className="space-y-2">
              <label className="block font-heading text-xs font-black uppercase tracking-wider text-black">
                Interests & Event Types
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Hackathons, Esports, AI, Robotics..."
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  onKeyDown={handleAddInterest}
                  className="flex-1 border-3 border-black bg-white px-3.5 py-2 text-sm font-bold shadow-brutal outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddInterest}
                  className="border-3 border-black bg-brutal-cyan px-4 py-2 font-heading text-xs font-black uppercase shadow-brutal hover:bg-cyan-300"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {interests.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 border-2 border-black bg-neutral-100 px-2.5 py-1 text-xs font-bold uppercase shadow-[2px_2px_0px_#000]"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveInterest(item)}
                      className="hover:text-red-600 font-black ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <BrutalTextarea
              label="Bio / Introduction"
              placeholder="Tell others what you like building, hackathon achievements, and what teams you are looking for..."
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={3}
            />

            <BrutalButton
              type="submit"
              variant="yellow"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              <UserPlus className="w-4 h-4" />
              {loading ? "CREATING PROFILE..." : "COMPLETE REGISTRATION"}
            </BrutalButton>
          </form>

          <div className="border-t-2 border-black pt-3 text-center text-xs font-bold text-neutral-700">
            Already have an account?{" "}
            <Link href="/login" className="font-black text-black underline decoration-2 hover:text-brutal-pink">
              LOG IN HERE
            </Link>
          </div>
        </BrutalCard>
      </div>
    </div>
  );
}
