/**
 * Backward-compatible image repair for products already stored in Firestore.
 *
 * Scans every product, mirrors any non-Storage image URL to Firebase Storage
 * through the existing mirroring pipeline, and updates only the `image` /
 * `images` fields. Working Storage URLs are never replaced; a product whose
 * images all fail to mirror is left untouched.
 */
import {
  collection,
  doc,
  getDocs,
  updateDoc,
  type Firestore,
} from "firebase/firestore";
import type { FirebaseStorage } from "firebase/storage";
import { isStorageUrl, mirrorImage } from "./product-images";
import { cleanProductImageUrl } from "./product-display";

export interface RepairProgress {
  /** Products scanned so far. */
  processed: number;
  /** Total products in the collection. */
  total: number;
  /** Products whose image fields were rewritten. */
  updated: number;
  /** Individual images mirrored into Storage. */
  imagesRepaired: number;
  /** Individual images that could not be mirrored. */
  failed: number;
  /** Products that needed no change (already on Storage or no images). */
  skipped: number;
}

/** Products processed in parallel (each product mirrors its images sequentially). */
const PRODUCT_CONCURRENCY = 4;

/** Ordered, de-duplicated raw image list: `images[]` first, then `image`. */
function collectImages(data: Record<string, unknown>): string[] {
  const out: string[] = [];
  const push = (v: unknown) => {
    const url = cleanProductImageUrl(v);
    if (url && !out.includes(url)) out.push(url);
  };
  if (Array.isArray(data.images)) data.images.forEach(push);
  push(data.image);
  // Legacy field names used by older product forms.
  push((data as { imageUrl?: unknown }).imageUrl);
  push((data as { img?: unknown }).img);
  return out;
}

export async function repairProductImages(
  db: Firestore,
  storage: FirebaseStorage,
  onProgress?: (p: RepairProgress) => void,
  shouldStop?: () => boolean,
): Promise<RepairProgress> {
  const snap = await getDocs(collection(db, "products"));
  const docs = snap.docs;
  const progress: RepairProgress = {
    processed: 0,
    total: docs.length,
    updated: 0,
    imagesRepaired: 0,
    failed: 0,
    skipped: 0,
  };
  const emit = () => onProgress?.({ ...progress });
  emit();

  let cursor = 0;
  const worker = async () => {
    while (cursor < docs.length) {
      if (shouldStop?.()) return;
      const d = docs[cursor++];
      const data = d.data() as Record<string, unknown>;
      const originals = collectImages(data);

      const needsWork = originals.some((u) => !isStorageUrl(u));
      const storedImages = Array.isArray(data.images) ? data.images : [];
      const storedMain = typeof data.image === "string" ? data.image : "";
      const cleanChanged =
        originals.length > 0 &&
        (storedMain !== originals[0] ||
          storedImages.length !== originals.length ||
          storedImages.some((v, i) => v !== originals[i]));

      if (!originals.length || (!needsWork && !cleanChanged)) {
        progress.skipped += 1;
        progress.processed += 1;
        emit();
        continue;
      }

      const repaired: string[] = [];
      for (const src of originals) {
        if (isStorageUrl(src)) {
          if (!repaired.includes(src)) repaired.push(src);
          continue;
        }
        const url = await mirrorImage(storage, src);
        if (url) {
          if (!repaired.includes(url)) repaired.push(url);
          progress.imagesRepaired += 1;
        } else {
          progress.failed += 1;
          // Keep the original so the product never loses a picture entirely.
          if (!repaired.includes(src)) repaired.push(src);
        }
      }

      const changed =
        repaired.length !== storedImages.length ||
        repaired.some((v, i) => v !== storedImages[i]) ||
        repaired[0] !== storedMain;

      if (changed && repaired.length) {
        try {
          await updateDoc(doc(db, "products", d.id), {
            image: repaired[0],
            images: repaired,
          });
          progress.updated += 1;
        } catch {
          progress.failed += 1;
        }
      } else {
        progress.skipped += 1;
      }
      progress.processed += 1;
      emit();
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(PRODUCT_CONCURRENCY, docs.length) }, worker),
  );
  emit();
  return progress;
}
