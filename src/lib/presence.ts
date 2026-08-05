/**
 * Firebase presence (online / offline / last seen).
 *
 * Implemented on Firestore with a lightweight heartbeat so no extra Realtime
 * Database instance is required:
 *  - while a tab is visible the client refreshes `presence/{id}` every 25s
 *  - hiding the tab or closing the browser writes an "offline" marker
 *  - a stale heartbeat (older than 60s) is treated as offline, which covers
 *    crashes and lost connections where the unload handler never ran
 */
import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc, type Firestore } from "firebase/firestore";
import { useFirebase } from "./firebase";

/** Presence document id used by the store owner / support agent. */
export const ADMIN_PRESENCE_ID = "admin";

/** A heartbeat older than this means the user is gone. */
const STALE_MS = 60_000;
const HEARTBEAT_MS = 25_000;

export interface PresenceState {
  online: boolean;
  lastSeen: number | null;
}

interface PresenceDoc {
  state?: "online" | "offline";
  updatedAt?: number;
  lastSeen?: number;
  name?: string;
}

async function write(
  db: Firestore,
  id: string,
  state: "online" | "offline",
  name?: string,
) {
  await setDoc(
    doc(db, "presence", id),
    {
      state,
      updatedAt: Date.now(),
      lastSeen: Date.now(),
      ...(name ? { name } : {}),
    },
    { merge: true },
  );
}

/**
 * Publish presence for `id` while this component is mounted.
 * Pass `null` to disable (e.g. signed-out visitors).
 */
export function usePresenceHeartbeat(id: string | null, name?: string) {
  const { db } = useFirebase();

  useEffect(() => {
    if (!db || !id) return;
    let stopped = false;

    const beat = () => {
      if (stopped || typeof document === "undefined") return;
      void write(db, id, document.visibilityState === "hidden" ? "offline" : "online", name);
    };

    beat();
    const timer = window.setInterval(beat, HEARTBEAT_MS);

    const onVisibility = () => beat();
    const onLeave = () => {
      void write(db, id, "offline", name);
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onLeave);
    window.addEventListener("beforeunload", onLeave);
    window.addEventListener("online", onVisibility);

    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onLeave);
      window.removeEventListener("beforeunload", onLeave);
      window.removeEventListener("online", onVisibility);
      void write(db, id, "offline", name);
    };
  }, [db, id, name]);
}

/** Live presence for another participant. */
export function usePresence(id: string | null): PresenceState {
  const { db } = useFirebase();
  const [raw, setRaw] = useState<PresenceDoc | null>(null);
  const [, force] = useState(0);

  useEffect(() => {
    if (!db || !id) {
      setRaw(null);
      return;
    }
    return onSnapshot(
      doc(db, "presence", id),
      (snap) => setRaw(snap.exists() ? (snap.data() as PresenceDoc) : null),
      () => setRaw(null),
    );
  }, [db, id]);

  // Re-evaluate staleness on a timer so "online" decays to "offline".
  useEffect(() => {
    const t = window.setInterval(() => force((n) => n + 1), 20_000);
    return () => window.clearInterval(t);
  }, []);

  const updatedAt = raw?.updatedAt ?? 0;
  return {
    online: raw?.state === "online" && Date.now() - updatedAt < STALE_MS,
    lastSeen: raw?.lastSeen ?? raw?.updatedAt ?? null,
  };
}

/** Human friendly "last seen" label. */
export function formatLastSeen(ts: number | null): string {
  if (!ts) return "Offline";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Last seen just now";
  if (mins < 60) return `Last seen ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Last seen ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Last seen yesterday";
  if (days < 7) return `Last seen ${days}d ago`;
  return `Last seen ${new Date(ts).toLocaleDateString()}`;
}
