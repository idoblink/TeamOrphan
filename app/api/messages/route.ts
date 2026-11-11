import { NextRequest, NextResponse } from "next/server";
import { tinydb } from "@/lib/tinydb";
import { getCurrentUser } from "@/lib/auth";
import { MessageSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await tinydb.sync();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const otherUserId = searchParams.get("otherUserId");

    if (otherUserId) {
      const messages = tinydb.collection("messages")
        .findMany((m: any) =>
          (m.senderId === user.id && m.receiverId === otherUserId) ||
          (m.senderId === otherUserId && m.receiverId === user.id)
        )
        .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      // Mark received as read
      tinydb.collection("messages").updateMany(
        (m: any) => m.senderId === otherUserId && m.receiverId === user.id && !m.read,
        { read: true }
      );

      const senderProfile = tinydb.collection("users").findUnique((u: any) => u.id === user.id) || {
        id: user.id,
        name: (user as any).name || "You",
        username: (user as any).username || "me",
        avatar: (user as any).avatar || null,
      };

      let receiverProfile = tinydb.collection("users").findUnique((u: any) => u.id === otherUserId);
      if (!receiverProfile) {
        receiverProfile = {
          id: otherUserId,
          name: "Builder",
          username: "builder",
          avatar: null,
        };
      }

      const enrichedMessages = messages.map((m: any) => ({
        ...m,
        sender: m.senderId === user.id ? senderProfile : receiverProfile,
        receiver: m.receiverId === user.id ? senderProfile : receiverProfile,
      }));

      return NextResponse.json({
        messages: enrichedMessages,
        otherUser: {
          id: receiverProfile.id,
          name: receiverProfile.name,
          username: receiverProfile.username,
          avatar: receiverProfile.avatar,
        },
      });
    }

    // All conversations
    const userMessages = tinydb.collection("messages")
      .findMany((m: any) => m.senderId === user.id || m.receiverId === user.id)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const contactsMap = new Map<string, any>();

    for (const msg of userMessages) {
      const contactId = msg.senderId === user.id ? msg.receiverId : msg.senderId;
      if (!contactsMap.has(contactId)) {
        let contact = tinydb.collection("users").findUnique((u: any) => u.id === contactId);
        if (!contact) {
          contact = {
            id: contactId,
            name: "Builder",
            username: "builder",
            avatar: null,
          };
        }
        contactsMap.set(contactId, {
          contact: {
            id: contact.id,
            name: contact.name,
            username: contact.username,
            avatar: contact.avatar,
          },
          lastMessage: msg,
          unread: msg.receiverId === user.id && !msg.read,
        });
      }
    }

    const conversations = Array.from(contactsMap.values());
    return NextResponse.json({ conversations });
  } catch (error: any) {
    console.error("Messages fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await tinydb.sync(true);
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

    const message = tinydb.collection("messages").insert({
      senderId: user.id,
      receiverId,
      content,
      read: false,
    });

    tinydb.collection("notifications").insert({
      userId: receiverId,
      type: "MESSAGE",
      title: `New message from ${(user as any).name || "a builder"}`,
      message: content.length > 60 ? `${content.slice(0, 60)}...` : content,
      link: `/messages?chatWith=${user.id}`,
      read: false,
    });

    await tinydb.persist();

    return NextResponse.json({
      success: true,
      message: {
        ...message,
        sender: {
          id: user.id,
          name: (user as any).name,
          username: (user as any).username,
          avatar: (user as any).avatar,
        },
      },
    });
  } catch (error: any) {
    console.error("Send message error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
