/**
 * Product review system.
 *
 * Reviews are tied to a delivered order (verified buyers only), support
 * 1–5 star ratings, text and optional photo uploads to Firebase Storage.
 */
import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
  type Firestore,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes, type FirebaseStorage } from "firebase/storage";
import { useFirebase } from "./firebase";
import type { Review } from "./types";

export const MAX_REVIEW_IMAGES = 4;
export const MAX_REVIEW_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
export const ALLOWED_REVIEW_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export interface ReviewStats {
  total: number;
  average: number;
  /** Count of reviews per star value, keyed 1–5. */
  breakdown: Record<number, number>;
}

/** Merge the legacy single `image` field with the newer `images` array. */
export function reviewImages(review: Review): string[] {
  const list = [...(review.images ?? [])];
  if (review.image && !list.includes(review.image)) list.unshift(review.image);
  return list.filter(Boolean);
}

/** A review is visible unless an admin explicitly unapproved it. */
export function isVisible(review: Review): boolean {
  return review.approved !== false;
}

export function computeStats(reviews: Review[]): ReviewStats {
  const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  for (const r of reviews) {
    const rating = Math.min(5, Math.max(1, Math.round(r.rating || 0)));
    breakdown[rating] += 1;
    sum += rating;
  }
  return {
    total: reviews.length,
    average: reviews.length ? sum / reviews.length : 0,
    breakdown,
  };
}

const sortNewest = (a: Review, b: Review) => (b.createdAt ?? 0) - (a.createdAt ?? 0);

const mapDocs = (docs: { id: string; data: () => unknown }[]): Review[] =>
  docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Review, "id">) }));

/**
 * Real-time reviews for a single product.
 * Sorting happens client-side so no composite Firestore index is needed.
 */
export function useProductReviews(productId?: string) {
  const { db, ready } = useFirebase();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !productId) {
      if (ready) setLoading(false);
      setReviews([]);
      return;
    }
    setLoading(true);
    const q = query(collection(db, "reviews"), where("productId", "==", productId));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setReviews(mapDocs(snap.docs).filter(isVisible).sort(sortNewest));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [db, ready, productId]);

  const stats = useMemo(() => computeStats(reviews), [reviews]);
  return { reviews, stats, loading };
}

/** Real-time reviews written by the signed-in customer. */
export function useMyReviews() {
  const { db, ready, user } = useFirebase();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !user) {
      if (ready) setLoading(false);
      setReviews([]);
      return;
    }
    setLoading(true);
    const q = query(collection(db, "reviews"), where("userId", "==", user.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setReviews(mapDocs(snap.docs).sort(sortNewest));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [db, ready, user]);

  return { reviews, loading };
}

export function validateReviewImage(file: File): string | null {
  if (!ALLOWED_REVIEW_IMAGE_TYPES.includes(file.type))
    return `${file.name}: only JPG, PNG or WEBP images are allowed.`;
  if (file.size > MAX_REVIEW_IMAGE_BYTES) return `${file.name}: image must be under 5MB.`;
  return null;
}

/** Upload review photos and return their public download URLs. */
export async function uploadReviewImages(
  storage: FirebaseStorage,
  userId: string,
  files: File[],
  onProgress?: (done: number, total: number) => void,
): Promise<string[]> {
  const urls: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `reviews/${userId}/${Date.now()}-${i}-${safeName}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file, { contentType: file.type });
    urls.push(await getDownloadURL(storageRef));
    onProgress?.(i + 1, files.length);
  }
  return urls;
}

export interface ProductReviewInput {
  productId: string;
  productName: string;
  orderId: string;
  userId: string;
  customerName: string;
  rating: number;
  message: string;
  images?: string[];
}

export async function submitProductReview(db: Firestore, input: ProductReviewInput) {
  if (!input.productId) throw new Error("This order is missing product information.");
  if (input.rating < 1 || input.rating > 5) throw new Error("Please select a star rating.");
  if (!input.message.trim()) throw new Error("Please write your review.");

  await addDoc(collection(db, "reviews"), {
    productId: input.productId,
    productName: input.productName,
    orderId: input.orderId,
    userId: input.userId,
    customerName: input.customerName || "Customer",
    rating: input.rating,
    message: input.message.trim().slice(0, 1000),
    images: input.images ?? [],
    image: input.images?.[0] ?? "",
    approved: true,
    createdAt: Date.now(),
  });
}

export async function updateOwnReview(
  db: Firestore,
  id: string,
  data: { rating: number; message: string; images: string[] },
) {
  await updateDoc(doc(db, "reviews", id), {
    rating: data.rating,
    message: data.message.trim().slice(0, 1000),
    images: data.images,
    image: data.images[0] ?? "",
    updatedAt: Date.now(),
  });
}

export async function deleteOwnReview(db: Firestore, id: string) {
  await deleteDoc(doc(db, "reviews", id));
}
