import { NextRequest, NextResponse } from "next/server";
import { tinydb } from "@/lib/tinydb";
import { getCurrentUser } from "@/lib/auth";
import { ReportSchema } from "@/lib/validation";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || (user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const reports = tinydb.collection("reports")
      .findMany()
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((r: any) => {
        const reporter = r.reporterId ? tinydb.collection("users").findUnique((u: any) => u.id === r.reporterId) : null;
        const reportedUser = r.reportedUserId ? tinydb.collection("users").findUnique((u: any) => u.id === r.reportedUserId) : null;
        const team = r.teamId ? tinydb.collection("teams").findUnique((t: any) => t.id === r.teamId) : null;
        return {
          ...r,
          reporter: reporter ? { id: reporter.id, name: reporter.name, username: reporter.username } : null,
          reportedUser: reportedUser ? { id: reportedUser.id, name: reportedUser.name, username: reportedUser.username, isSuspended: reportedUser.isSuspended } : null,
          team: team ? { id: team.id, name: team.name, status: team.status } : null,
        };
      });

    return NextResponse.json({ reports });
  } catch (error: any) {
    console.error("Reports fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Please log in to submit a report" }, { status: 401 });
    }

    const body = await req.json();
    const validated = ReportSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || "Invalid report data" },
        { status: 400 }
      );
    }

    const { reportedUserId, teamId, reason } = validated.data;

    const report = tinydb.collection("reports").insert({
      reporterId: user.id,
      reportedUserId: reportedUserId || null,
      teamId: teamId || null,
      reason,
      status: "PENDING",
    });

    return NextResponse.json({ success: true, report });
  } catch (error: any) {
    console.error("Report submit error:", error);
    return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id, status } = await req.json();

    if (!id || !["PENDING", "RESOLVED", "DISMISSED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const report = tinydb.collection("reports").update(id, { status });
    return NextResponse.json({ success: true, report });
  } catch (error: any) {
    console.error("Report update error:", error);
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
  }
}
