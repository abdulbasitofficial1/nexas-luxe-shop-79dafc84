import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, CheckCheck, ImagePlus, Loader2, MessageSquare, Search, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFirebase } from "@/lib/firebase";
import {
  formatMessageTime,
  sendChatMessage,
  setTyping,
  uploadChatImage,
  useChatMessages,
  useChatThread,
  useChatThreads,
  useIsTyping,
  validateChatImage,
  type ChatMeta,
  type ChatThread,
} from "@/lib/chat";
import { formatLastSeen, usePresence } from "@/lib/presence";

/** Admin dashboard panel: browse and answer every customer conversation. */
export function ChatsPanel() {
  const { db, storage } = useFirebase();
  const { threads, loading } = useChatThreads();
  const [selectedId, setSelectedId] = useState<string>("");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) =>
      [t.userName, t.userEmail, t.productName, t.lastMessage]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [threads, search]);

  useEffect(() => {
    if (!selectedId && filtered.length) setSelectedId(filtered[0].id);
  }, [filtered, selectedId]);

  const active = threads.find((t) => t.id === selectedId) ?? null;

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      {/* Conversation list */}
      <div className="rounded-xl border border-border/60 bg-card">
        <div className="border-b border-border/60 p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer or product"
              className="pl-9"
            />
          </div>
        </div>
        <div className="max-h-[520px] overflow-y-auto">
          {loading ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              <Loader2 className="mx-auto size-5 animate-spin" />
            </p>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No conversations yet.</p>
          ) : (
            filtered.map((t) => <ThreadRow key={t.id} thread={t} active={t.id === selectedId} onSelect={setSelectedId} />)
          )}
        </div>
      </div>

      {/* Conversation view */}
      {active ? (
        <AdminConversation
          key={active.id}
          thread={active}
          onSend={async (text, image) => {
            if (!db) return;
            const meta: ChatMeta = {
              userId: active.userId,
              userName: active.userName,
              userEmail: active.userEmail,
              productId: active.productId,
              productName: active.productName,
              productImage: active.productImage,
            };
            await sendChatMessage(db, meta, "admin", text, image);
          }}
          onUpload={async (file) => {
            if (!storage) throw new Error("Storage unavailable");
            return uploadChatImage(storage, active.id, file);
          }}
        />
      ) : (
        <div className="flex items-center justify-center rounded-xl border border-border/60 bg-card p-10 text-sm text-muted-foreground">
          <MessageSquare className="mr-2 size-4" /> Select a conversation
        </div>
      )}
    </div>
  );
}

/** One row in the conversation list: avatar, preview and unread badge. */
function ThreadRow({
  thread,
  active,
  onSelect,
}: {
  thread: ChatThread;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  const presence = usePresence(thread.userId);
  return (
    <button
      onClick={() => onSelect(thread.id)}
      className={`flex w-full items-center gap-3 border-b border-border/40 p-3 text-left transition-colors hover:bg-secondary/50 ${
        active ? "bg-secondary/60" : ""
      }`}
    >
      <div className="relative shrink-0">
        {thread.productImage ? (
          <img src={thread.productImage} alt="" className="size-11 rounded-lg object-cover" />
        ) : (
          <div className="size-11 rounded-lg bg-secondary" />
        )}
        <span
          className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card ${
            presence.online ? "bg-emerald-500" : "bg-muted-foreground/50"
          }`}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{thread.userName || "Customer"}</p>
        <p className="truncate text-xs text-muted-foreground">{thread.productName}</p>
        <p className="truncate text-xs text-muted-foreground/80">
          {thread.lastSender === "admin" ? "You: " : ""}
          {thread.lastMessage || "No messages yet"}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-[10px] text-muted-foreground">
          {thread.lastMessageAt ? formatMessageTime(thread.lastMessageAt) : ""}
        </span>
        {thread.unreadAdmin > 0 && (
          <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
            {thread.unreadAdmin}
          </span>
        )}
      </div>
    </button>
  );
}

/** Message thread + composer for the admin side. */
function AdminConversation({
  thread,
  onSend,
  onUpload,
}: {
  thread: ChatThread;
  onSend: (text: string, image?: string) => Promise<void>;
  onUpload: (file: File) => Promise<string>;
}) {
  const { db } = useFirebase();
  const { messages, loading } = useChatMessages(thread.id, "admin", true);
  const live = useChatThread(thread.id);
  const customerTyping = useIsTyping(live, "customer");
  const presence = usePresence(thread.userId);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<number | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, customerTyping]);

  const handleTyping = (value: string) => {
    setText(value);
    if (!db) return;
    void setTyping(db, thread.id, "admin", true);
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => {
      void setTyping(db, thread.id, "admin", false);
    }, 2500);
  };

  const submit = async (image?: string) => {
    if (!text.trim() && !image) return;
    setSending(true);
    try {
      await onSend(text, image);
      setText("");
      if (db) void setTyping(db, thread.id, "admin", false);
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleFile = async (file: File) => {
    const error = validateChatImage(file);
    if (error) {
      toast.error(error);
      return;
    }
    setSending(true);
    try {
      const url = await onUpload(file);
      await submit(url);
    } catch {
      toast.error("Image upload failed");
    } finally {
      setSending(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="flex max-h-[600px] flex-col rounded-xl border border-border/60 bg-card">
      <div className="flex items-center gap-3 border-b border-border/60 p-3">
        {thread.productImage ? (
          <img src={thread.productImage} alt="" className="size-10 rounded-lg object-cover" />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{thread.userName || "Customer"}</p>
          <p className="truncate text-xs text-muted-foreground">{thread.productName}</p>
        </div>
        <p className="flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
          <span
            className={`inline-block size-2 rounded-full ${
              presence.online ? "bg-emerald-500" : "bg-muted-foreground/50"
            }`}
          />
          {presence.online ? "Online" : formatLastSeen(presence.lastSeen)}
        </p>
      </div>

      <div className="min-h-[300px] flex-1 space-y-2 overflow-y-auto p-4">
        {loading ? (
          <Loader2 className="mx-auto size-5 animate-spin" />
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No messages yet.</p>
        ) : (
          messages.map((msg) => {
            const mine = msg.sender === "admin";
            return (
              <div
                key={msg.id}
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                  mine
                    ? "ml-auto rounded-br-sm bg-primary text-primary-foreground"
                    : "mr-auto rounded-bl-sm bg-secondary"
                }`}
              >
                {msg.image ? (
                  <a href={msg.image} target="_blank" rel="noreferrer">
                    <img src={msg.image} alt="Attachment" loading="lazy" className="mb-1 max-h-52 rounded-lg" />
                  </a>
                ) : null}
                {msg.text ? <p className="whitespace-pre-wrap break-words">{msg.text}</p> : null}
                <span
                  className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                    mine ? "text-primary-foreground/70" : "text-muted-foreground"
                  }`}
                >
                  {formatMessageTime(msg.createdAt)}
                  {mine ? (
                    msg.status === "read" ? (
                      <CheckCheck className="size-3 text-sky-300" />
                    ) : msg.status === "delivered" ? (
                      <CheckCheck className="size-3" />
                    ) : (
                      <Check className="size-3" />
                    )
                  ) : null}
                </span>
              </div>
            );
          })
        )}
        {customerTyping && (
          <div className="mr-auto flex w-fit items-center gap-1 rounded-2xl rounded-bl-sm bg-secondary px-3 py-2">
            {[0, 150, 300].map((d) => (
              <span
                key={d}
                className="size-1.5 animate-bounce rounded-full bg-muted-foreground"
                style={{ animationDelay: `${d}ms` }}
              />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 border-t border-border/60 p-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
        <Button
          variant="ghost"
          size="icon"
          disabled={sending}
          onClick={() => fileRef.current?.click()}
          aria-label="Attach image"
        >
          <ImagePlus className="size-4" />
        </Button>
        <Input
          value={text}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder="Reply to customer..."
          disabled={sending}
        />
        <Button variant="gold" size="icon" onClick={() => void submit()} disabled={sending} aria-label="Send reply">
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </div>
    </div>
  );
}
