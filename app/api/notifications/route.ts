import { NextRequest, NextResponse } from "next/server";
import { tinydb } from "@/lib/tinydb";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    const notifications = tinydb.collection("notifications")
      .findMany((n: any) => n.userId === user.id)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 30);

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

    if (markAllRead) {
      tinydb.collection("notifications").updateMany(
        (n: any) => n.userId === user.id && !n.read,
        { read: true }
      );
      return NextResponse.json({ success: true });
    }

    if (id) {
      tinydb.collection("notifications").update(id, { read: true });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error: any) {
    console.error("Notifications update error:", error);
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}
