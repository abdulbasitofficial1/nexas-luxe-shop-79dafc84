import {
  getDownloadURL,
  ref,
  uploadBytes,
  type FirebaseStorage,
} from "firebase/storage";
import { fetchRemoteImage } from "./image-proxy.functions";
import { cleanProductImageUrl } from "./product-display";

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

/** True when the URL already points at Firebase Storage (nothing to mirror). */
export function isStorageUrl(url: string): boolean {
  return /firebasestorage\.googleapis\.com|\.firebasestorage\.app|storage\.googleapis\.com/i.test(url);
}

/** In-memory cache: source URL → Storage download URL (per page session). */
const mirrorCache = new Map<string, string>();

/** Decode a base64 payload (from the server proxy) into a Blob. */
function base64ToBlob(base64: string, contentType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: contentType });
}

/** Fetch the image bytes: direct CORS fetch first, then the server-side proxy. */
async function downloadImage(sourceUrl: string): Promise<Blob | null> {
  try {
    const response = await fetch(sourceUrl, { mode: "cors" });
    if (response.ok) {
      const blob = await response.blob();
      if (blob.size > 0 && (!blob.type || blob.type.startsWith("image/"))) return blob;
    }
  } catch {
    /* CORS blocked or network error — fall through to the proxy */
  }

  try {
    const result = await fetchRemoteImage({ data: { url: sourceUrl } });
    if (result.ok) return base64ToBlob(result.base64, result.contentType);
  } catch {
    /* proxy failed too */
  }
  return null;
}

/**
 * Mirror a single remote image into Firebase Storage.
 * Returns the Storage download URL, or `null` when the image could not be
 * downloaded/uploaded. Storage URLs are returned unchanged.
 */
export async function mirrorImage(
  storage: FirebaseStorage,
  rawSourceUrl: string,
): Promise<string | null> {
  const sourceUrl = cleanProductImageUrl(rawSourceUrl);
  if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) return null;
  if (isStorageUrl(sourceUrl)) return sourceUrl;

  const cached = mirrorCache.get(sourceUrl);
  if (cached) return cached;

  const hash = hashUrl(sourceUrl);

  // 1. Already uploaded in a previous run?
  try {
    const existing = await getDownloadURL(
      ref(storage, `${CATALOG_IMAGE_DIR}/${hash}.${extensionFor(sourceUrl)}`),
    );
    mirrorCache.set(sourceUrl, existing);
    return existing;
  } catch {
    /* Not uploaded yet — continue */
  }

  // 2. Download (direct or via proxy) and upload.
  const blob = await downloadImage(sourceUrl);
  if (!blob) return null;

  try {
    const contentType = blob.type || "image/jpeg";
    const path = `${CATALOG_IMAGE_DIR}/${hash}.${extensionFor(sourceUrl, contentType)}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob, {
      contentType,
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
 */
export async function mirrorImages(
  storage: FirebaseStorage,
  sources: string[],
  onImageDone?: () => void,
  concurrency = IMAGE_CONCURRENCY,
): Promise<MirrorResult> {
  const unique = Array.from(new Set(sources.map((s) => cleanProductImageUrl(s)).filter(Boolean)));
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

/**
 * Mirror a set of source URLs and return a lookup map (source → Storage URL).
 * Failed sources are simply absent from the map.
 */
export async function mirrorImageMap(
  storage: FirebaseStorage,
  sources: string[],
  onImageDone?: () => void,
  concurrency = IMAGE_CONCURRENCY,
): Promise<Map<string, string>> {
  const unique = Array.from(new Set(sources.map((s) => cleanProductImageUrl(s)).filter(Boolean)));
  const map = new Map<string, string>();
  let cursor = 0;

  const worker = async () => {
    while (cursor < unique.length) {
      const index = cursor++;
      const src = unique[index];
      const url = await mirrorImage(storage, src);
      if (url) map.set(src, url);
      onImageDone?.();
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, unique.length) }, worker));
  return map;
}
