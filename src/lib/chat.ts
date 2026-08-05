/**
 * Real-time in-app chat (customer ⇄ store admin).
 *
 * Data model (Firestore):
 *   chats/{chatId}                         — one thread per customer + product
 *   chats/{chatId}/messages/{messageId}    — unlimited messages
 *
 * chatId = `${userId}__${productId}` so every product a customer asks about
 * gets its own conversation, and two customers never share a thread.
 *
 * Message status: sent → delivered (recipient's app received it) → read
 * (recipient had the thread open).
 */
import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import {
  getDownloadURL,
  ref,
  uploadBytes,
  type FirebaseStorage,
} from "firebase/storage";
import { useFirebase } from "./firebase";

export type ChatRole = "customer" | "admin";
export type MessageStatus = "sent" | "delivered" | "read";

export interface ChatThread {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  productId: string;
  productName: string;
  productImage: string;
  lastMessage: string;
  lastSender: ChatRole | "";
  lastMessageAt: number;
  /** Unread counters, one per side. */
  unreadAdmin: number;
  unreadCustomer: number;
  /** Timestamp of the last "typing" ping from each side. */
  customerTyping?: number;
  adminTyping?: number;
  createdAt?: number;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  sender: ChatRole;
  senderName: string;
  text: string;
  image?: string;
  status: MessageStatus;
  createdAt: number;
}

/** A typing ping is only considered live for a few seconds. */
export const TYPING_TTL_MS = 6_000;

export const MAX_CHAT_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_CHAT_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

/** Deterministic thread id for a customer/product pair. */
export function buildChatId(userId: string, productId: string): string {
  return `${userId}__${productId}`;
}

export interface ChatMeta {
  userId: string;
  userName: string;
  userEmail: string;
  productId: string;
  productName: string;
  productImage: string;
}

/** Create the thread document if it does not exist yet. */
export async function ensureChatThread(db: Firestore, meta: ChatMeta): Promise<string> {
  const id = buildChatId(meta.userId, meta.productId);
  const refDoc = doc(db, "chats", id);
  const snap = await getDoc(refDoc);
  if (!snap.exists()) {
    await setDoc(refDoc, {
      ...meta,
      lastMessage: "",
      lastSender: "",
      lastMessageAt: Date.now(),
      unreadAdmin: 0,
      unreadCustomer: 0,
      customerTyping: 0,
      adminTyping: 0,
      createdAt: Date.now(),
    });
  } else {
    // Keep denormalised product/customer info fresh.
    await updateDoc(refDoc, {
      userName: meta.userName,
      userEmail: meta.userEmail,
      productName: meta.productName,
      productImage: meta.productImage,
    });
  }
  return id;
}

export function validateChatImage(file: File): string | null {
  if (!ALLOWED_CHAT_IMAGE_TYPES.includes(file.type))
    return "Only JPG, PNG or WEBP images can be sent.";
  if (file.size > MAX_CHAT_IMAGE_BYTES) return "Image must be under 5MB.";
  return null;
}

/** Upload a chat attachment and return its download URL. */
export async function uploadChatImage(
  storage: FirebaseStorage,
  chatId: string,
  file: File,
): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storageRef = ref(storage, `chats/${chatId}/${Date.now()}-${safeName}`);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}

/** Send a message and update the thread summary + unread counter. */
export async function sendChatMessage(
  db: Firestore,
  meta: ChatMeta,
  sender: ChatRole,
  text: string,
  image?: string,
): Promise<void> {
  const body = text.trim().slice(0, 2000);
  if (!body && !image) return;

  const chatId = await ensureChatThread(db, meta);
  const now = Date.now();

  await addDoc(collection(db, "chats", chatId, "messages"), {
    chatId,
    sender,
    senderName: sender === "admin" ? "Nexas Support" : meta.userName || "Customer",
    text: body,
    image: image ?? "",
    status: "sent" as MessageStatus,
    createdAt: now,
  });

  const threadRef = doc(db, "chats", chatId);
  const snap = await getDoc(threadRef);
  const data = snap.data() as Partial<ChatThread> | undefined;

  await updateDoc(threadRef, {
    lastMessage: body || "📷 Photo",
    lastSender: sender,
    lastMessageAt: now,
    unreadAdmin:
      sender === "customer" ? (data?.unreadAdmin ?? 0) + 1 : data?.unreadAdmin ?? 0,
    unreadCustomer:
      sender === "admin" ? (data?.unreadCustomer ?? 0) + 1 : data?.unreadCustomer ?? 0,
    [sender === "customer" ? "customerTyping" : "adminTyping"]: 0,
  });
}

/** Publish/clear a typing indicator for one side of the conversation. */
export async function setTyping(
  db: Firestore,
  chatId: string,
  role: ChatRole,
  typing: boolean,
): Promise<void> {
  try {
    await updateDoc(doc(db, "chats", chatId), {
      [role === "customer" ? "customerTyping" : "adminTyping"]: typing ? Date.now() : 0,
    });
  } catch {
    /* thread may not exist yet — harmless */
  }
}

/**
 * Mark the other side's messages as delivered/read and reset the unread badge.
 * `viewer` is the role of the person currently looking at the thread.
 */
export async function markThreadRead(
  db: Firestore,
  chatId: string,
  viewer: ChatRole,
  messages: ChatMessage[],
): Promise<void> {
  const other: ChatRole = viewer === "admin" ? "customer" : "admin";
  const pending = messages.filter((m) => m.sender === other && m.status !== "read");

  if (pending.length) {
    const batch = writeBatch(db);
    for (const m of pending.slice(0, 400)) {
      batch.update(doc(db, "chats", chatId, "messages", m.id), { status: "read" });
    }
    try {
      await batch.commit();
    } catch {
      /* ignore — a retry happens on the next snapshot */
    }
  }

  try {
    await updateDoc(doc(db, "chats", chatId), {
      [viewer === "admin" ? "unreadAdmin" : "unreadCustomer"]: 0,
    });
  } catch {
    /* thread not created yet */
  }
}

/** Mark the other side's messages as delivered (recipient app is connected). */
async function markDelivered(db: Firestore, chatId: string, viewer: ChatRole, messages: ChatMessage[]) {
  const other: ChatRole = viewer === "admin" ? "customer" : "admin";
  const pending = messages.filter((m) => m.sender === other && m.status === "sent");
  if (!pending.length) return;
  const batch = writeBatch(db);
  for (const m of pending.slice(0, 400)) {
    batch.update(doc(db, "chats", chatId, "messages", m.id), { status: "delivered" });
  }
  try {
    await batch.commit();
  } catch {
    /* ignore */
  }
}

/**
 * Live messages for a thread.
 * When `active` is true the viewer has the conversation open, so incoming
 * messages are automatically flagged as read.
 */
export function useChatMessages(chatId: string | null, viewer: ChatRole, active = true) {
  const { db, ready } = useFirebase();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !chatId) {
      if (ready) setLoading(false);
      setMessages([]);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc"),
      limit(500),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ChatMessage, "id">),
        }));
        setMessages(list);
        setLoading(false);
        if (active) void markThreadRead(db, chatId, viewer, list);
        else void markDelivered(db, chatId, viewer, list);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [db, ready, chatId, viewer, active]);

  return { messages, loading };
}

/**
 * Live thread list.
 * Admin passes no `userId` (sees everything); a customer passes their uid.
 */
export function useChatThreads(userId?: string) {
  const { db, ready } = useFirebase();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || (userId !== undefined && !userId)) {
      if (ready) setLoading(false);
      setThreads([]);
      return;
    }
    setLoading(true);
    const base = collection(db, "chats");
    const q = userId ? query(base, where("userId", "==", userId)) : query(base);
    const unsub = onSnapshot(
      q,
      (snap) => {
        setThreads(
          snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<ChatThread, "id">) }))
            // Sorted client-side so no composite index is needed.
            .sort((a, b) => (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0)),
        );
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [db, ready, userId]);

  return { threads, loading };
}

/** Live single-thread subscription (for typing indicators & unread counts). */
export function useChatThread(chatId: string | null) {
  const { db } = useFirebase();
  const [thread, setThread] = useState<ChatThread | null>(null);

  useEffect(() => {
    if (!db || !chatId) {
      setThread(null);
      return;
    }
    return onSnapshot(
      doc(db, "chats", chatId),
      (snap) =>
        setThread(snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<ChatThread, "id">) }) : null),
      () => setThread(null),
    );
  }, [db, chatId]);

  return thread;
}

/** True when the other side pinged "typing" within the TTL window. */
export function useIsTyping(thread: ChatThread | null, other: ChatRole): boolean {
  const stamp = other === "customer" ? thread?.customerTyping : thread?.adminTyping;
  const [, tick] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => tick((n) => n + 1), 1500);
    return () => window.clearInterval(t);
  }, []);

  return useMemo(() => !!stamp && Date.now() - stamp < TYPING_TTL_MS, [stamp]);
}

/** Total unread messages for one side across all threads. */
export function unreadTotal(threads: ChatThread[], role: ChatRole): number {
  return threads.reduce(
    (sum, t) => sum + (role === "admin" ? t.unreadAdmin ?? 0 : t.unreadCustomer ?? 0),
    0,
  );
}

/** Short time label used in message bubbles. */
export function formatMessageTime(ts: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : `${d.toLocaleDateString([], { day: "2-digit", month: "short" })} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}
