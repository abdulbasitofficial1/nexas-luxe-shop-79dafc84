/**
 * Direct gallery/file uploads for product images.
 *
 * Files picked by the admin are pushed straight to Firebase Storage under the
 * same `products/` folder used by the CSV mirroring pipeline, so the resulting
 * download URLs are interchangeable with manually pasted image URLs.
 */
import {
  getDownloadURL,
  ref,
  uploadBytesResumable,
  type FirebaseStorage,
} from "firebase/storage";
import { CATALOG_IMAGE_DIR } from "./product-images";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith("image/")) return `${file.name} is not an image.`;
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return `${file.name}: unsupported format.`;
  if (file.size > MAX_UPLOAD_BYTES) return `${file.name} is larger than 8MB.`;
  return null;
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
}

/** Upload one file, reporting 0–100 progress. Resolves with the download URL. */
export function uploadProductFile(
  storage: FirebaseStorage,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const path = `${CATALOG_IMAGE_DIR}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName(file.name)}`;
  const task = uploadBytesResumable(ref(storage, path), file, {
    contentType: file.type,
    cacheControl: "public,max-age=31536000,immutable",
  });

  return new Promise((resolve, reject) => {
    task.on(
      "state_changed",
      (snap) => {
        const pct = snap.totalBytes ? (snap.bytesTransferred / snap.totalBytes) * 100 : 0;
        onProgress?.(Math.round(pct));
      },
      reject,
      async () => {
        try {
          resolve(await getDownloadURL(task.snapshot.ref));
        } catch (err) {
          reject(err);
        }
      },
    );
  });
}
