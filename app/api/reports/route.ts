import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/auth";
import { ReportSchema } from "@/lib/validation";
import { FieldValue } from "firebase-admin/firestore";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || (user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const snap = await adminDb
      .collection("reports")
      .orderBy("createdAt", "desc")
      .get();

    const reports = await Promise.all(
      snap.docs.map(async (d) => {
        const r = { id: d.id, ...d.data() } as any;

        let reporter = null;
        if (r.reporterId) {
          const rDoc = await adminDb.collection("users").doc(r.reporterId).get();
          if (rDoc.exists) reporter = { id: rDoc.id, name: rDoc.data()!.name, username: rDoc.data()!.username };
        }

        let reportedUser = null;
        if (r.reportedUserId) {
          const ruDoc = await adminDb.collection("users").doc(r.reportedUserId).get();
          if (ruDoc.exists) reportedUser = { id: ruDoc.id, name: ruDoc.data()!.name, username: ruDoc.data()!.username, isSuspended: ruDoc.data()!.isSuspended };
        }

        let team = null;
        if (r.teamId) {
          const tDoc = await adminDb.collection("teams").doc(r.teamId).get();
          if (tDoc.exists) team = { id: tDoc.id, name: tDoc.data()!.name, status: tDoc.data()!.status };
        }

        return { ...r, reporter, reportedUser, team };
      })
    );

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
    const now = FieldValue.serverTimestamp();

    const reportRef = await adminDb.collection("reports").add({
      reporterId: user.id,
      reportedUserId: reportedUserId || null,
      teamId: teamId || null,
      reason,
      status: "PENDING",
      createdAt: now,
    });

    return NextResponse.json({ success: true, report: { id: reportRef.id } });
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

    await adminDb.collection("reports").doc(id).update({ status });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Report update error:", error);
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
  }
}
