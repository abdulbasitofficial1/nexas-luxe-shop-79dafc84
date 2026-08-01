import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  type Firestore,
} from "firebase/firestore";
import { useFirebase } from "./firebase";
import type { EventInput, StoreEvent } from "./event-types";

const COLLECTION = "events";

/** Real-time subscription to all configured store events. */
export function useEvents() {
  const { db, ready } = useFirebase();
  const [events, setEvents] = useState<StoreEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      if (ready) setLoading(false);
      return;
    }
    const q = query(collection(db, COLLECTION), orderBy("saleStartAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setEvents(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<StoreEvent, "id">) })),
        );
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [db, ready]);

  return { events, loading };
}

export async function createEvent(db: Firestore, input: EventInput) {
  const now = Date.now();
  await addDoc(collection(db, COLLECTION), { ...input, createdAt: now, updatedAt: now });
}

export async function updateEvent(db: Firestore, id: string, input: Partial<EventInput>) {
  await updateDoc(doc(db, COLLECTION, id), { ...input, updatedAt: Date.now() });
}

export async function deleteEvent(db: Firestore, id: string) {
  await deleteDoc(doc(db, COLLECTION, id));
}

/** A ticking clock shared by countdowns. */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
