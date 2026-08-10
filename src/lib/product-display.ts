import type { Product } from "./types";

/**
 * Cleans a single catalog image URL from Firebase / CSV imports.
 * Handles quotes, markdown links, brackets, and stray whitespace.
 */
export function cleanProductImageUrl(value?: unknown): string {
  if (value == null) return "";

  let url = String(value).trim();
  if (!url) return "";

  url = url.replace(/^["'`]+|["'`]+$/g, "").trim();
  url = url.replace(/^\[+|\]+$/g, "").trim();

  const markdownLink = url.match(
    /^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/i,
  );
  if (markdownLink?.[2]) {
    return markdownLink[2].trim();
  }

  const markdownImage = url.match(
    /^!\[[^\]]*\]\((https?:\/\/[^)]+)\)$/i,
  );
  if (markdownImage?.[1]) {
    return markdownImage[1].trim();
  }

  const extractedUrl = url.match(/https?:\/\/[^\s)\]"']+/i);
  if (extractedUrl?.[0]) {
    return extractedUrl[0].trim();
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return "";
}

/** All usable image URLs for a product (`images[]` first, then `image`). */
export function getProductImageUrls(product: Product): string[] {
  const images: string[] = [];

  if (Array.isArray(product.images)) {
    for (const rawImage of product.images) {
      const image = cleanProductImageUrl(rawImage);
      if (image && !images.includes(image)) {
        images.push(image);
      }
    }
  }

  const mainImage = cleanProductImageUrl(product.image);
  if (mainImage && !images.includes(mainImage)) {
    images.push(mainImage);
  }

  return images;
}

/** Parse catalog price safely (handles numeric and string values). */
export function parseProductPrice(price: unknown): number | null {
  if (typeof price === "number") {
    return Number.isFinite(price) && price >= 0 ? price : null;
  }

  if (typeof price === "string") {
    const cleaned = price.replace(/[^\d.]/g, "");
    if (!cleaned) return null;

    const parsed = Number(cleaned);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }

  return null;
}

/** Format price for display, e.g. "Rs 1,500". */
export function formatProductPrice(price: unknown): string {
  const parsed = parseProductPrice(price);
  if (parsed == null) return "Price unavailable";
  return `Rs ${parsed.toLocaleString()}`;
}
