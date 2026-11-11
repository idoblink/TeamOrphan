import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { comparePassword, setSessionCookie } from "@/lib/auth";
import { LoginSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = LoginSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ error: "Please enter email/username and password" }, { status: 400 });
    }

    const { login, password } = validated.data;
    const loginLower = login.toLowerCase();

    // Try email first, then username
    let userSnap = await adminDb
      .collection("users")
      .where("email", "==", loginLower)
      .limit(1)
      .get();

    if (userSnap.empty) {
      userSnap = await adminDb
        .collection("users")
        .where("username", "==", loginLower)
        .limit(1)
        .get();
    }

    if (userSnap.empty) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const userDoc = userSnap.docs[0];
    const user = { id: userDoc.id, ...userDoc.data() } as any;

    if (user.isSuspended) {
      return NextResponse.json(
        { error: "This account has been suspended by administration." },
        { status: 403 }
      );
    }

    const bcrypt = await import("bcryptjs");
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    await setSessionCookie({
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
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
    console.error("Login error:", error);
    return NextResponse.json({ error: "Failed to log in" }, { status: 500 });
  }
}
