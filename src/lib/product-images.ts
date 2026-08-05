/**
 * Catalog image mirroring.
 *
 * Imported products must never depend on a third-party CDN: every remote image
 * is downloaded (through the server proxy, because those CDNs block CORS) and
 * re-uploaded to Firebase Storage. Only Storage download URLs are persisted in
 * Firestore.
 *
 * Design notes:
 *  - Storage paths are derived from a stable hash of the source URL, so the
 *    same image is never uploaded twice — across products *or* across runs.
 *  - Failures skip that single image, never the product.
 *  - Uploads run in small concurrent batches to stay fast on 500+ products.
 */
import {
  getDownloadURL,
  ref,
  uploadBytes,
  type FirebaseStorage,
} from "firebase/storage";
import { fetchRemoteImage } from "./image-proxy.functions";

/** Firebase Storage folder that holds mirrored catalog images. */
export const CATALOG_IMAGE_DIR = "products";

/** Number of images fetched/uploaded in parallel. */
export const IMAGE_CONCURRENCY = 6;

/** Deterministic, collision-resistant-enough 64-bit-ish hash of a URL. */
function hashUrl(url: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < url.length; i++) {
    const c = url.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 + c + i, 0x85ebca6b) >>> 0;
  }
  return h1.toString(36) + h2.toString(36);
}

/** Guess a file extension from the URL or the response content type. */
function extensionFor(url: string, contentType?: string): string {
  const fromType = contentType?.split("/")[1]?.split("+")[0];
  if (fromType && /^(jpeg|jpg|png|webp|gif|avif)$/i.test(fromType)) {
    return fromType.toLowerCase() === "jpeg" ? "jpg" : fromType.toLowerCase();
  }
  const match = url.split("?")[0].match(/\.(jpe?g|png|webp|gif|avif)$/i);
  return match ? match[1].toLowerCase().replace("jpeg", "jpg") : "jpg";
}

function base64ToBlob(base64: string, contentType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: contentType });
}

/** True when the URL already points at Firebase Storage (nothing to mirror). */
export function isStorageUrl(url: string): boolean {
  return /firebasestorage\.googleapis\.com|\.firebasestorage\.app/i.test(url);
}

/** In-memory cache: source URL → Storage download URL (per page session). */
const mirrorCache = new Map<string, string>();

/**
 * Mirror a single remote image into Firebase Storage.
 * Returns the Storage download URL, or `null` when the image could not be
 * downloaded (the caller simply skips it).
 */
export async function mirrorImage(
  storage: FirebaseStorage,
  sourceUrl: string,
): Promise<string | null> {
  if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) return null;
  if (isStorageUrl(sourceUrl)) return sourceUrl; // already ours
  const cached = mirrorCache.get(sourceUrl);
  if (cached) return cached;

  const hash = hashUrl(sourceUrl);

  // 1) Already uploaded in a previous run? Reuse it — no duplicate upload.
  const guessRef = ref(storage, `${CATALOG_IMAGE_DIR}/${hash}.${extensionFor(sourceUrl)}`);
  try {
    const existing = await getDownloadURL(guessRef);
    mirrorCache.set(sourceUrl, existing);
    return existing;
  } catch {
    /* not uploaded yet — continue */
  }

  // 2) Download through the server proxy (CDNs block browser CORS).
  let payload: Awaited<ReturnType<typeof fetchRemoteImage>>;
  try {
    payload = await fetchRemoteImage({ data: { url: sourceUrl } });
  } catch {
    return null;
  }
  if (!payload.ok) return null;

  // 3) Upload to Storage and return the permanent download URL.
  try {
    const blob = base64ToBlob(payload.base64, payload.contentType);
    const path = `${CATALOG_IMAGE_DIR}/${hash}.${extensionFor(sourceUrl, payload.contentType)}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob, {
      contentType: payload.contentType,
      cacheControl: "public,max-age=31536000,immutable",
    });
    const url = await getDownloadURL(storageRef);
    mirrorCache.set(sourceUrl, url);
    return url;
  } catch {
    return null;
  }
}

export interface MirrorResult {
  /** Storage URLs, in the original order, with failures removed. */
  urls: string[];
  failed: number;
}

/**
 * Mirror a list of source URLs with bounded concurrency.
 * `onImageDone` fires once per attempted image so callers can show progress.
 */
export async function mirrorImages(
  storage: FirebaseStorage,
  sources: string[],
  onImageDone?: () => void,
  concurrency = IMAGE_CONCURRENCY,
): Promise<MirrorResult> {
  const unique = Array.from(new Set(sources.filter(Boolean)));
  const results = new Array<string | null>(unique.length).fill(null);
  let cursor = 0;

  const worker = async () => {
    while (cursor < unique.length) {
      const index = cursor++;
      results[index] = await mirrorImage(storage, unique[index]);
      onImageDone?.();
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, unique.length) }, worker),
  );

  const urls = results.filter((u): u is string => Boolean(u));
  return { urls, failed: unique.length - urls.length };
}
