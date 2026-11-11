import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/auth";
import { MessageSchema } from "@/lib/validation";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const otherUserId = searchParams.get("otherUserId");

    if (otherUserId) {
      // Get conversation with specific user
      const sentSnap = await adminDb
        .collection("messages")
        .where("senderId", "==", user.id)
        .where("receiverId", "==", otherUserId)
        .orderBy("createdAt", "asc")
        .get();

      const receivedSnap = await adminDb
        .collection("messages")
        .where("senderId", "==", otherUserId)
        .where("receiverId", "==", user.id)
        .orderBy("createdAt", "asc")
        .get();

      const allMsgs = [
        ...sentSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        ...receivedSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      ].sort((a: any, b: any) => {
        const aTs = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
        const bTs = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
        return aTs - bTs;
      });

      // Fetch sender/receiver profiles
      const senderDoc = await adminDb.collection("users").doc(user.id).get();
      const receiverDoc = await adminDb.collection("users").doc(otherUserId).get();
      const senderProfile = senderDoc.exists ? { id: senderDoc.id, name: senderDoc.data()!.name, username: senderDoc.data()!.username, avatar: senderDoc.data()!.avatar } : null;
      const receiverProfile = receiverDoc.exists ? { id: receiverDoc.id, name: receiverDoc.data()!.name, username: receiverDoc.data()!.username, avatar: receiverDoc.data()!.avatar } : null;

      const messages = allMsgs.map((m: any) => ({
        ...m,
        sender: m.senderId === user.id ? senderProfile : receiverProfile,
        receiver: m.receiverId === user.id ? senderProfile : receiverProfile,
      }));

      // Mark received as read
      const batch = adminDb.batch();
      receivedSnap.docs.forEach((d) => {
        if (!d.data().read) batch.update(d.ref, { read: true });
      });
      await batch.commit();

      return NextResponse.json({ messages });
    }

    // All conversations for current user
    const sentSnap = await adminDb
      .collection("messages")
      .where("senderId", "==", user.id)
      .orderBy("createdAt", "desc")
      .get();

    const receivedSnap = await adminDb
      .collection("messages")
      .where("receiverId", "==", user.id)
      .orderBy("createdAt", "desc")
      .get();

    const contactsMap = new Map<string, any>();

    for (const doc of sentSnap.docs) {
      const msg = { id: doc.id, ...doc.data() } as any;
      if (!contactsMap.has(msg.receiverId)) {
        const rDoc = await adminDb.collection("users").doc(msg.receiverId).get();
        const contact = rDoc.exists ? { id: rDoc.id, name: rDoc.data()!.name, username: rDoc.data()!.username, avatar: rDoc.data()!.avatar } : null;
        contactsMap.set(msg.receiverId, { contact, lastMessage: msg, unread: false });
      }
    }

    for (const doc of receivedSnap.docs) {
      const msg = { id: doc.id, ...doc.data() } as any;
      const existing = contactsMap.get(msg.senderId);
      const msgTs = msg.createdAt?.toMillis ? msg.createdAt.toMillis() : new Date(msg.createdAt).getTime();
      const existingTs = existing?.lastMessage?.createdAt?.toMillis
        ? existing.lastMessage.createdAt.toMillis()
        : new Date(existing?.lastMessage?.createdAt || 0).getTime();

      if (!existing || msgTs > existingTs) {
        const sDoc = await adminDb.collection("users").doc(msg.senderId).get();
        const contact = sDoc.exists ? { id: sDoc.id, name: sDoc.data()!.name, username: sDoc.data()!.username, avatar: sDoc.data()!.avatar } : null;
        contactsMap.set(msg.senderId, { contact, lastMessage: msg, unread: !msg.read });
      }
    }

    const conversations = Array.from(contactsMap.values()).sort((a, b) => {
      const aTs = a.lastMessage?.createdAt?.toMillis ? a.lastMessage.createdAt.toMillis() : new Date(a.lastMessage?.createdAt || 0).getTime();
      const bTs = b.lastMessage?.createdAt?.toMillis ? b.lastMessage.createdAt.toMillis() : new Date(b.lastMessage?.createdAt || 0).getTime();
      return bTs - aTs;
    });

    return NextResponse.json({ conversations });
  } catch (error: any) {
    console.error("Messages fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = MessageSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || "Invalid message data" },
        { status: 400 }
      );
    }

    const { receiverId, content } = validated.data;

    if (receiverId === user.id) {
      return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });
    }

    const now = FieldValue.serverTimestamp();

    const msgRef = await adminDb.collection("messages").add({
      senderId: user.id,
      receiverId,
      content,
      read: false,
      createdAt: now,
    });

    await adminDb.collection("notifications").add({
      userId: receiverId,
      type: "MESSAGE",
      title: `New message from ${user.name}`,
      message: content.length > 60 ? `${content.slice(0, 60)}...` : content,
      link: `/messages?chatWith=${user.id}`,
      read: false,
      createdAt: now,
    });

    return NextResponse.json({
      success: true,
      message: {
        id: msgRef.id,
        senderId: user.id,
        receiverId,
        content,
        read: false,
        sender: { id: user.id, name: (user as any).name, username: (user as any).username, avatar: (user as any).avatar },
      },
    });
  } catch (error: any) {
    console.error("Send message error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
