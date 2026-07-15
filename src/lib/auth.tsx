import { useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  updateEmail as fbUpdateEmail,
  updatePassword as fbUpdatePassword,
  updateProfile,
  type Auth,
  type User,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  type Firestore,
} from "firebase/firestore";
import { useFirebase } from "./firebase";
import type { Address, Order, UserProfile, WishlistItem } from "./types";

/* -------------------- Auth actions -------------------- */

async function upsertProfile(db: Firestore, user: User, extra?: Partial<UserProfile>) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  const base: UserProfile = {
    uid: user.uid,
    name: extra?.name ?? user.displayName ?? "",
    email: user.email ?? "",
    photoURL: extra?.photoURL ?? user.photoURL ?? "",
    createdAt: snap.exists() ? (snap.data() as UserProfile).createdAt : Date.now(),
  };
  if (snap.exists()) {
    // Only refresh mutable fields; keep original createdAt.
    await setDoc(ref, { ...snap.data(), ...base, createdAt: (snap.data() as UserProfile).createdAt }, { merge: true });
  } else {
    await setDoc(ref, base);
  }
}

export async function signUp(auth: Auth, db: Firestore, name: string, email: string, password: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (name) await updateProfile(cred.user, { displayName: name });
  await upsertProfile(db, cred.user, { name });
}

export async function signIn(auth: Auth, db: Firestore, email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await upsertProfile(db, cred.user);
}

export async function signInWithGoogle(auth: Auth, db: Firestore) {
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  await upsertProfile(db, cred.user);
}

export async function resetPassword(auth: Auth, email: string) {
  await sendPasswordResetEmail(auth, email);
}

export async function signOut(auth: Auth) {
  await fbSignOut(auth);
}

export async function updateUserProfile(
  auth: Auth,
  db: Firestore,
  updates: { name?: string; photoURL?: string },
) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  await updateProfile(user, {
    displayName: updates.name ?? user.displayName,
    photoURL: updates.photoURL ?? user.photoURL,
  });
  await setDoc(
    doc(db, "users", user.uid),
    {
      name: updates.name ?? user.displayName ?? "",
      photoURL: updates.photoURL ?? user.photoURL ?? "",
    },
    { merge: true },
  );
}

export async function updateUserEmail(auth: Auth, db: Firestore, email: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  await fbUpdateEmail(user, email);
  await setDoc(doc(db, "users", user.uid), { email }, { merge: true });
}

export async function updateUserPassword(auth: Auth, password: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  await fbUpdatePassword(user, password);
}

/* -------------------- Profile / data hooks -------------------- */

export function useUserProfile() {
  const { db, user, ready } = useFirebase();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !user) {
      if (ready) setLoading(false);
      setProfile(null);
      return;
    }
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      setProfile(snap.exists() ? (snap.data() as UserProfile) : null);
      setLoading(false);
    });
    return unsub;
  }, [db, user, ready]);

  return { profile, loading };
}

export function useUserOrders() {
  const { db, user } = useFirebase();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !user) {
      setOrders([]);
      setLoading(false);
      return;
    }
    // Avoid composite index by filtering only, sort client-side.
    const q = query(collection(db, "orders"), where("userId", "==", user.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Order, "id">) }));
        list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
        setOrders(list);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [db, user]);

  return { orders, loading };
}

export function useAddresses() {
  const { db, user } = useFirebase();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !user) {
      setAddresses([]);
      setLoading(false);
      return;
    }
    const q = query(collection(db, "users", user.uid, "addresses"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setAddresses(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Address, "id">) })));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [db, user]);

  return { addresses, loading };
}

export async function addAddress(db: Firestore, uid: string, input: Omit<Address, "id" | "createdAt">) {
  await addDoc(collection(db, "users", uid, "addresses"), { ...input, createdAt: Date.now() });
}
export async function updateAddress(db: Firestore, uid: string, id: string, input: Omit<Address, "id" | "createdAt">) {
  await updateDoc(doc(db, "users", uid, "addresses", id), { ...input });
}
export async function deleteAddress(db: Firestore, uid: string, id: string) {
  await deleteDoc(doc(db, "users", uid, "addresses", id));
}

export function useWishlist() {
  const { db, user } = useFirebase();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !user) {
      setItems([]);
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(
      collection(db, "users", user.uid, "wishlist"),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<WishlistItem, "id">) }));
        list.sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0));
        setItems(list);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [db, user]);

  return { items, loading };
}

export async function addToWishlist(
  db: Firestore,
  uid: string,
  item: { id: string; name: string; price: number; image: string },
) {
  await setDoc(doc(db, "users", uid, "wishlist", item.id), {
    name: item.name,
    price: item.price,
    image: item.image,
    addedAt: Date.now(),
  });
}
export async function removeFromWishlist(db: Firestore, uid: string, productId: string) {
  await deleteDoc(doc(db, "users", uid, "wishlist", productId));
}
