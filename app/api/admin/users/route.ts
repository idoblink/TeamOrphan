import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/redis";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || (user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const users = db.collection("users").findMany().map((u: any) => {
      const createdTeamsCount = db.collection("teams").count((t: any) => t.creatorId === u.id);
      const membershipsCount = db.collection("teamMembers").count((m: any) => m.userId === u.id);
      const reportsAgainstCount = db.collection("reports").count((r: any) => r.reportedUserId === u.id);

      return {
        id: u.id,
        name: u.name,
        username: u.username,
        email: u.email,
        role: u.role,
        isSuspended: u.isSuspended,
        createdAt: u.createdAt,
        _count: {
          createdTeams: createdTeamsCount,
          memberships: membershipsCount,
          reportsAgainst: reportsAgainstCount,
        },
      };
    });

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

    const data: any = {};
    if (typeof isSuspended === "boolean") data.isSuspended = isSuspended;
    if (role && ["USER", "ADMIN"].includes(role)) data.role = role;

    db.collection("users").update(userId, data);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Admin user update error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
