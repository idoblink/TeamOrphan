"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { BrutalCard } from "@/components/ui/BrutalCard";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { Avatar } from "@/components/ui/Avatar";
import { formatTimeAgo, formatDate } from "@/lib/utils";
import { Send, MessageSquare, Inbox, RefreshCw, User } from "lucide-react";

function MessagesContent() {
  const searchParams = useSearchParams();
  const chatWithParam = searchParams.get("chatWith");
  const router = useRouter();

  const [conversations, setConversations] = useState<any[]>([]);
  const [activeContactId, setActiveContactId] = useState<string | null>(chatWithParam || null);
  const [activeContactUser, setActiveContactUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch all conversations
  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/messages");
      if (res.ok) {
        const data = await res.json();
        const validConvs = (data.conversations || []).filter((c: any) => c.contact != null);
        setConversations(validConvs);

        if (!activeContactId && validConvs.length > 0) {
          setActiveContactId(validConvs[0].contact.id);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages with active contact
  const fetchActiveMessages = async (contactId: string) => {
    try {
      const res = await fetch(`/api/messages?otherUserId=${contactId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        if (data.otherUser) {
          setActiveContactUser(data.otherUser);
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (chatWithParam) {
      setActiveContactId(chatWithParam);
    }
  }, [chatWithParam]);

  useEffect(() => {
    if (activeContactId) {
      fetchActiveMessages(activeContactId);
      const interval = setInterval(() => {
        fetchActiveMessages(activeContactId);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [activeContactId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeContactId) return;

    const contentToSend = newMessage.trim();
    setNewMessage("");
    setSending(true);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: activeContactId,
          content: contentToSend,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setMessages((prev) => [...prev, data.message]);
        }
        fetchActiveMessages(activeContactId);
        fetchConversations();
      }
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  const activeConversation = conversations.find((c) => c.contact?.id === activeContactId);
  const displayContact = activeConversation?.contact || activeContactUser;

  return (
    <div className="py-8 px-4 sm:px-6 max-w-7xl mx-auto space-y-6">
      <div className="border-4 border-black bg-brutal-cyan p-6 shadow-brutal-xl">
        <h1 className="font-heading text-3xl sm:text-4xl font-black uppercase tracking-tight text-black">
          DIRECT MESSAGES
        </h1>
        <p className="text-xs font-bold text-neutral-800 mt-0.5">
          Coordinate hackathon strategies and squad recruitment directly with teammates and applicants.
        </p>
      </div>

      <div className="border-4 border-black bg-white shadow-brutal-xl grid grid-cols-1 md:grid-cols-12 min-h-[620px]">
        {/* Sidebar Conversations List */}
        <div className="md:col-span-4 border-b-4 md:border-b-0 md:border-r-4 border-black bg-yellow-50 flex flex-col">
          <div className="p-3 border-b-2 border-black flex items-center justify-between bg-brutal-yellow">
            <span className="font-heading text-xs font-black uppercase tracking-wider text-black">
              Conversations ({conversations.length})
            </span>
            <button
              onClick={fetchConversations}
              className="p-1 hover:bg-black hover:text-white transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y-2 divide-black/20">
            {loading ? (
              <p className="p-4 text-xs font-bold text-neutral-500 text-center">
                Loading chats...
              </p>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center text-xs font-bold text-neutral-600 space-y-3">
                <Inbox className="w-8 h-8 mx-auto text-neutral-500" />
                <p>No active conversations yet.</p>
                <p className="text-[11px] text-neutral-500">
                  Quick start: message one of our active student builders below:
                </p>
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={() => setActiveContactId("usr_alex")}
                    className="border-2 border-black bg-white p-2 text-xs font-black uppercase hover:bg-brutal-yellow text-left shadow-[2px_2px_0px_#000]"
                  >
                    💬 Message Alex Vance (Neural Ninjas)
                  </button>
                  <button
                    onClick={() => setActiveContactId("usr_marcus")}
                    className="border-2 border-black bg-white p-2 text-xs font-black uppercase hover:bg-brutal-yellow text-left shadow-[2px_2px_0px_#000]"
                  >
                    💬 Message Marcus Chen (ML Builder)
                  </button>
                </div>
              </div>
            ) : (
              conversations.map((conv) => {
                const isActive = conv.contact?.id === activeContactId;
                return (
                  <button
                    key={conv.contact.id}
                    onClick={() => {
                      setActiveContactId(conv.contact.id);
                      setActiveContactUser(conv.contact);
                    }}
                    className={`w-full text-left p-3.5 flex items-center gap-3 transition-colors ${
                      isActive
                        ? "bg-white border-l-4 border-l-black font-black"
                        : "hover:bg-yellow-100"
                    }`}
                  >
                    <Avatar name={conv.contact.name || "User"} src={conv.contact.avatar} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-heading text-xs font-black uppercase text-black truncate">
                          {conv.contact.name || "Builder"}
                        </span>
                        <span className="text-[10px] text-neutral-500 shrink-0">
                          {formatTimeAgo(conv.lastMessage?.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 truncate mt-0.5">
                        {conv.lastMessage?.content}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Main Chat Stream */}
        <div className="md:col-span-8 flex flex-col bg-white">
          {activeContactId ? (
            <>
              {/* Chat Header */}
              <div className="p-3.5 border-b-3 border-black bg-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar
                    name={displayContact?.name || "Builder"}
                    src={displayContact?.avatar}
                    size="sm"
                  />
                  <div>
                    <h3 className="font-heading text-sm font-black uppercase text-black">
                      {displayContact?.name || "Chat"}
                    </h3>
                    {displayContact?.username && (
                      <span className="text-[11px] font-bold text-neutral-500">
                        @{displayContact.username}
                      </span>
                    )}
                  </div>
                </div>

                {displayContact?.username && (
                  <button
                    onClick={() => router.push(`/profile/${displayContact.username}`)}
                    className="border-2 border-black bg-brutal-yellow px-2.5 py-1 text-xs font-black uppercase hover:bg-black hover:text-white transition-colors"
                  >
                    View Profile →
                  </button>
                )}
              </div>

              {/* Message Bubbles Feed */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#FFFDF5] min-h-[380px] max-h-[460px]">
                {messages.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <p className="text-xs font-bold text-neutral-500">
                      No messages in this chat yet.
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      Send a message to introduce yourself or coordinate your hackathon squad!
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId !== activeContactId;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`border-2 border-black p-3 max-w-md shadow-brutal-sm text-xs font-semibold ${
                            isMe
                              ? "bg-brutal-yellow text-black text-right"
                              : "bg-white text-black text-left"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <div
                            className={`text-[9px] font-bold mt-1 text-neutral-600 ${
                              isMe ? "text-right" : "text-left"
                            }`}
                          >
                            {formatDate(msg.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Footer */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 border-t-3 border-black bg-white flex gap-2"
              >
                <input
                  type="text"
                  placeholder={`Message ${displayContact?.name || "builder"}...`}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 border-3 border-black bg-white px-3.5 py-2 text-sm font-bold shadow-brutal outline-none"
                  disabled={sending}
                />
                <BrutalButton
                  type="submit"
                  variant="yellow"
                  size="md"
                  disabled={sending || !newMessage.trim()}
                >
                  <Send className="w-4 h-4" />
                  {sending ? "Sending..." : "Send"}
                </BrutalButton>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 text-neutral-500">
              <MessageSquare className="w-12 h-12 stroke-[2]" />
              <h3 className="font-heading text-lg font-black uppercase text-black">
                SELECT A CONVERSATION
              </h3>
              <p className="text-xs font-semibold max-w-sm">
                Choose a contact from the sidebar or click &ldquo;Message&rdquo; on any builder profile to start a discussion.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-10 text-center font-heading text-xs font-black uppercase">
          Loading messages...
        </div>
      }
    >
      <MessagesContent />
    </Suspense>
  );
}
