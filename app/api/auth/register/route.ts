import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { RegisterSchema } from "@/lib/validation";
import { FieldValue } from "firebase-admin/firestore";

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

    const emailLower = email.toLowerCase();
    const usernameLower = username.toLowerCase();

    // Check existing email
    const emailSnap = await adminDb
      .collection("users")
      .where("email", "==", emailLower)
      .limit(1)
      .get();
    if (!emailSnap.empty) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    // Check existing username
    const usernameSnap = await adminDb
      .collection("users")
      .where("username", "==", usernameLower)
      .limit(1)
      .get();
    if (!usernameSnap.empty) {
      return NextResponse.json({ error: "Username already taken" }, { status: 400 });
    }

    const bcrypt = await import("bcryptjs");
    const passwordHash = await bcrypt.hash(password, 10);

    const userRef = adminDb.collection("users").doc();
    const now = FieldValue.serverTimestamp();

    const userData = {
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
      createdAt: now,
      updatedAt: now,
    };

    await userRef.set(userData);

    await setSessionCookie({
      userId: userRef.id,
      email: emailLower,
      username: usernameLower,
      role: "USER",
    });

    return NextResponse.json({
      success: true,
      user: {
        id: userRef.id,
        name,
        username: usernameLower,
        email: emailLower,
        role: "USER",
      },
    });
  } catch (error: any) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
