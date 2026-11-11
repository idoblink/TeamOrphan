import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/redis";
import { setSessionCookie, saveAccountToRegistry } from "@/lib/auth";
import { RegisterSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = RegisterSchema.safeParse(body);

    if (!validated.success) {
      const err = validated.error.errors[0]?.message || "Invalid registration data";
      return NextResponse.json({ error: err }, { status: 400 });
    }

    const { name, email, password, username, college, location, skills, interests, bio } =
      validated.data;

    await db.sync(true);

    const emailLower = email.toLowerCase();
    const usernameLower = username.toLowerCase();

    // Check existing email
    const existingEmail = db.collection("users").findFirst((u: any) => u.email?.toLowerCase() === emailLower);
    if (existingEmail) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    // Check existing username
    const existingUsername = db.collection("users").findFirst((u: any) => u.username?.toLowerCase() === usernameLower);
    if (existingUsername) {
      return NextResponse.json({ error: "Username already taken" }, { status: 400 });
    }

    const bcrypt = await import("bcryptjs");
    const passwordHash = await bcrypt.hash(password, 10);

    const user = db.collection("users").insert({
      name,
      email: emailLower,
      username: usernameLower,
      passwordHash,
      avatar: null,
      bio: bio || null,
      college: college || null,
      location: location || null,
      skills: JSON.stringify(skills),
      interests: JSON.stringify(interests || []),
      role: "USER",
      isSuspended: false,
    });

    await db.persist();

    await setSessionCookie({
      userId: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
      bio: user.bio,
      college: user.college,
      location: user.location,
      skills: user.skills,
      interests: user.interests,
    });

    await saveAccountToRegistry({
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      passwordHash: user.passwordHash,
      role: user.role,
      bio: user.bio,
      college: user.college,
      location: user.location,
      skills: user.skills,
      interests: user.interests,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
