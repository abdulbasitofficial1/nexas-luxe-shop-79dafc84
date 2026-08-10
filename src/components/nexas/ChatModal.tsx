import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Check, CheckCheck, ImagePlus, Loader2, Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFirebase } from "@/lib/firebase";
import {
  buildChatId,
  ensureChatThread,
  formatMessageTime,
  sendChatMessage,
  setTyping,
  uploadChatImage,
  useChatMessages,
  useChatThread,
  useIsTyping,
  validateChatImage,
  type ChatMeta,
} from "@/lib/chat";
import { ADMIN_PRESENCE_ID, formatLastSeen, usePresence, usePresenceHeartbeat } from "@/lib/presence";
import type { Product } from "@/lib/types";

/**
 * Real-time customer ⇄ seller chat for a single product.
 * Each customer/product pair gets its own conversation thread.
 */
export function ChatModal({
  open,
  onOpenChange,
  product,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Pick<Product, "id" | "name" | "image"> | null;
}) {
  const { db, storage, user } = useFirebase();
  const signedIn = Boolean(user && product);
  const chatId = signedIn ? buildChatId(user!.uid, product!.id) : null;

  const { messages, loading } = useChatMessages(chatId, "customer", open);
  const thread = useChatThread(chatId);
  const adminTyping = useIsTyping(thread, "admin");
  const adminPresence = usePresence(open ? ADMIN_PRESENCE_ID : null);

  // Publish the customer's own presence while the chat is open.
  usePresenceHeartbeat(open && user ? user.uid : null, user?.displayName ?? undefined);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<number | null>(null);

  const meta: ChatMeta | null =
    user && product
      ? {
          userId: user.uid,
          userName: user.displayName || user.email?.split("@")[0] || "Customer",
          userEmail: user.email ?? "",
          productId: product.id,
          productName: product.name,
          productImage: product.image ?? "",
        }
      : null;

  // Create the thread as soon as the customer opens the chat.
  useEffect(() => {
    if (open && db && meta) void ensureChatThread(db, meta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, db, chatId]);

  // Auto scroll to the newest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, adminTyping, open]);

  /** Debounced typing ping. */
  const handleTyping = (value: string) => {
    setText(value);
    if (!db || !chatId) return;
    void setTyping(db, chatId, "customer", true);
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => {
      void setTyping(db, chatId, "customer", false);
    }, 2500);
  };

  const submit = async (image?: string) => {
    if (!db || !meta) return;
    if (!text.trim() && !image) return;
    setSending(true);
    try {
      await sendChatMessage(db, meta, "customer", text, image);
      setText("");
      if (chatId) void setTyping(db, chatId, "customer", false);
    } catch {
      toast.error("Message could not be sent. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleFile = async (file: File) => {
    if (!storage || !chatId) return;
    const error = validateChatImage(file);
    if (error) {
      toast.error(error);
      return;
    }
    setSending(true);
    try {
      const url = await uploadChatImage(storage, chatId, file);
      await submit(url);
    } catch {
      toast.error("Image upload failed.");
    } finally {
      setSending(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-md flex-col gap-3 p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border/60 p-4 pb-3 text-left">
          <DialogTitle className="flex items-center gap-3 font-display">
            {product?.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="size-10 shrink-0 rounded-lg object-cover"
              />
            ) : null}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base">Chat with Seller</span>
              <span className="block truncate text-xs font-normal text-muted-foreground">
                {product?.name}
              </span>
            </span>
          </DialogTitle>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className={`inline-block size-2 rounded-full ${
                adminPresence.online ? "bg-emerald-500" : "bg-muted-foreground/50"
              }`}
            />
            {adminPresence.online ? "Online" : formatLastSeen(adminPresence.lastSeen)}
          </p>
        </DialogHeader>

        {!signedIn ? (
          <div className="space-y-3 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Please sign in to chat with the seller about this product.
            </p>
            <Button asChild variant="gold" onClick={() => onOpenChange(false)}>
              <Link to="/account">Sign in</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="min-h-[280px] flex-1 space-y-2 overflow-y-auto px-4">
              {loading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  <Loader2 className="mx-auto size-5 animate-spin" />
                </p>
              ) : messages.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Ask anything about this product — we usually reply quickly.
                </p>
              ) : (
                messages.map((msg) => {
                  const mine = msg.sender === "customer";
                  return (
                    <div
                      key={msg.id}
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                        mine
                          ? "ml-auto rounded-br-sm bg-primary text-primary-foreground"
                          : "mr-auto rounded-bl-sm bg-secondary text-foreground"
                      }`}
                    >
                      {msg.image ? (
                        <a href={msg.image} target="_blank" rel="noreferrer">
                          <img
                            src={msg.image}
                            alt="Attachment"
                            loading="lazy"
                            className="mb-1 max-h-52 rounded-lg object-cover"
                          />
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

              {adminTyping && (
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
                type="button"
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
                placeholder="Type a message..."
                disabled={sending}
              />
              <Button
                variant="gold"
                size="icon"
                onClick={() => void submit()}
                disabled={sending || !text.trim()}
                aria-label="Send message"
              >
                {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
