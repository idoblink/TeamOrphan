import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/auth";
import { FieldValue } from "firebase-admin/firestore";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || (user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const snap = await adminDb.collection("users").orderBy("createdAt", "desc").get();

    const users = await Promise.all(
      snap.docs.map(async (d) => {
        const u = { id: d.id, ...d.data() } as any;

        const teamsSnap = await adminDb.collection("teams").where("creatorId", "==", d.id).get();
        const membershipsSnap = await adminDb.collection("teamMembers").where("userId", "==", d.id).get();
        const reportsSnap = await adminDb.collection("reports").where("reportedUserId", "==", d.id).get();

        return {
          id: u.id,
          name: u.name,
          username: u.username,
          email: u.email,
          role: u.role,
          isSuspended: u.isSuspended,
          createdAt: u.createdAt,
          _count: {
            createdTeams: teamsSnap.size,
            memberships: membershipsSnap.size,
            reportsAgainst: reportsSnap.size,
          },
        };
      })
    );

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error("Admin users fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { userId, isSuspended, role } = await req.json();

    const data: any = { updatedAt: FieldValue.serverTimestamp() };
    if (typeof isSuspended === "boolean") data.isSuspended = isSuspended;
    if (role && ["USER", "ADMIN"].includes(role)) data.role = role;

    await adminDb.collection("users").doc(userId).update(data);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Admin user update error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
