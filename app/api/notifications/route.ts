import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/auth";
import { FieldValue } from "firebase-admin/firestore";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    const snap = await adminDb
      .collection("notifications")
      .where("userId", "==", user.id)
      .orderBy("createdAt", "desc")
      .limit(30)
      .get();

    const notifications = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const unreadCount = notifications.filter((n: any) => !n.read).length;

    return NextResponse.json({ notifications, unreadCount });
  } catch (error: any) {
    console.error("Notifications fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, markAllRead } = await req.json();
    const now = FieldValue.serverTimestamp();

    if (markAllRead) {
      const snap = await adminDb
        .collection("notifications")
        .where("userId", "==", user.id)
        .where("read", "==", false)
        .get();
      const batch = adminDb.batch();
      snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
      await batch.commit();
      return NextResponse.json({ success: true });
    }

    if (id) {
      await adminDb.collection("notifications").doc(id).update({ read: true });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error: any) {
    console.error("Notifications update error:", error);
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}
