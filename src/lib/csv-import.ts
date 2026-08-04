/**
 * WooCommerce CSV → store product import pipeline.
 *
 * Pure parsing/mapping helpers live here so the dialog stays presentational.
 * Nothing in this module (or the data it writes) records where the CSV came
 * from — imported products are indistinguishable from manually added ones.
 */
import Papa from "papaparse";
import {
  collection,
  doc,
  getDocs,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import type { Product, ProductOption } from "./types";

/** Raw CSV row: WooCommerce exports use human-readable header names. */
export type CsvRow = Record<string, string>;

export type ProfitType = "fixed" | "percentage";

export interface ProfitSettings {
  type: ProfitType;
  value: number;
}

/** A product parsed from the CSV, ready to be written to Firestore. */
export interface ParsedProduct {
  sku: string;
  name: string;
  description: string;
  shortDescription: string;
  /** Base (cost) price straight from the CSV. */
  basePrice: number;
  /** Final store price after profit is applied. */
  price: number;
  salePrice?: number;
  stock?: number;
  tags: string[];
  images: string[];
  image: string;
  options: ProductOption[];
}

export interface ImportSummary {
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: string[];
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/** Case/spacing-insensitive column lookup (WooCommerce headers vary a lot). */
function col(row: CsvRow, ...names: string[]): string {
  for (const name of names) {
    const key = Object.keys(row).find(
      (k) => k.trim().toLowerCase().replace(/^\ufeff/, "") === name.toLowerCase(),
    );
    if (key && row[key] != null && String(row[key]).trim() !== "") {
      return String(row[key]).trim();
    }
  }
  return "";
}

/** Strip HTML tags/entities so descriptions render safely as plain text. */
export function stripHtml(html: string): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*(p|li|ul|div|h[1-6])\s*>/gi, "\n")
    .replace(/<\s*li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Parse a possibly formatted number ("Rs 2,000", "'-1") into a safe number. */
function num(value: string): number {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** Split comma/pipe separated CSV cell values. */
function splitList(value: string): string[] {
  if (!value) return [];
  return value
    .split(/\s*(?:\||,)\s*/)
    .map((v) => v.trim())
    .filter(Boolean);
}

/**
 * Decode common HTML entities that WooCommerce exports leave inside URLs.
 */
function decodeEntities(url: string): string {
  return url
    .replace(/&amp;/gi, "&")
    .replace(/&#0?38;/g, "&")
    .replace(/&quot;/gi, "")
    .trim();
}

/**
 * Normalise a single image URL.
 *
 * Markaz exports wrap every image in a proxy endpoint:
 *   https://www.markaz.app/api/export/image/<file>?src=<url-encoded CDN url>
 * The proxy is rate limited and can fail when a grid loads many images at
 * once, while the encoded `src` target is the stable CDN original — so when a
 * valid `src` is present we unwrap it and store the direct CDN URL instead.
 */
export function normalizeImageUrl(raw: string): string {
  let url = decodeEntities(raw).replace(/^["'<]+|["'>]+$/g, "").trim();
  if (!/^https?:\/\//i.test(url)) return "";

  const srcMatch = url.match(/[?&]src=([^&]+)/i);
  if (srcMatch) {
    try {
      const inner = decodeURIComponent(srcMatch[1]);
      if (/^https?:\/\//i.test(inner)) url = inner;
    } catch {
      /* malformed encoding — keep the original proxy URL */
    }
  }
  return url;
}

/**
 * Extract every image URL from a WooCommerce `Images` cell.
 *
 * Real-world exports separate images with commas, pipes, semicolons or plain
 * newlines, and each URL itself can contain commas inside its query string.
 * We therefore split on those separators only when the next token starts a new
 * URL, and fall back to scanning for `http` occurrences inside a chunk.
 */
export function splitImages(value: string): string[] {
  if (!value) return [];

  const chunks = value
    .replace(/\r/g, "\n")
    .split(/[\n|;]+|,(?=\s*(?:&quot;|["'])?\s*https?:\/\/)/i)
    .map((v) => v.trim())
    .filter(Boolean);

  const urls: string[] = [];
  for (const chunk of chunks) {
    // A chunk may still hold several URLs glued together (no clean separator).
    const found = chunk.match(/https?:\/\/[^\s"'<>|]+/gi) ?? [];
    for (const f of found) {
      const normalized = normalizeImageUrl(f);
      if (normalized && !urls.includes(normalized)) urls.push(normalized);
    }
  }
  return urls;
}


/** Apply the admin's profit setting to a base price. */
export function applyProfit(basePrice: number, profit: ProfitSettings): number {
  if (!Number.isFinite(basePrice) || basePrice <= 0) return 0;
  const value = Number.isFinite(profit.value) ? profit.value : 0;
  const final =
    profit.type === "fixed" ? basePrice + value : basePrice * (1 + value / 100);
  return Math.max(0, Math.round(final));
}

/** Read up to 6 `Attribute N name` / `Attribute N value(s)` pairs from a row. */
function readAttributes(row: CsvRow): ProductOption[] {
  const options: ProductOption[] = [];
  for (let i = 1; i <= 6; i++) {
    const name = col(row, `Attribute ${i} name`);
    const values = splitList(col(row, `Attribute ${i} value(s)`, `Attribute ${i} value`));
    if (name && values.length) options.push({ name, values });
  }
  return options;
}

/** Merge variation option values into an existing option list without duplicates. */
function mergeOptions(target: ProductOption[], extra: ProductOption[]) {
  for (const opt of extra) {
    const existing = target.find(
      (o) => o.name.toLowerCase() === opt.name.toLowerCase(),
    );
    if (existing) {
      for (const v of opt.values) {
        if (!existing.values.some((x) => x.toLowerCase() === v.toLowerCase())) {
          existing.values.push(v);
        }
      }
    } else {
      target.push({ name: opt.name, values: [...opt.values] });
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Parsing                                                                     */
/* -------------------------------------------------------------------------- */

export interface ParseResult {
  products: ParsedProduct[];
  skipped: number;
  errors: string[];
}

/** Parse a WooCommerce CSV file into store-ready products. */
export function parseCsvFile(file: File, profit: ProfitSettings): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      // Large files: worker keeps the UI responsive.
      worker: false,
      complete: (result) => {
        try {
          resolve(mapRows(result.data ?? [], profit, result.errors?.length ?? 0));
        } catch (err) {
          reject(err instanceof Error ? err : new Error("Failed to parse CSV"));
        }
      },
      error: (err) => reject(new Error(err.message || "Failed to read CSV file")),
    });
  });
}

/** Map raw rows → parsed products, folding variations into their parent. */
export function mapRows(
  rows: CsvRow[],
  profit: ProfitSettings,
  parseErrorCount = 0,
): ParseResult {
  const errors: string[] = [];
  let skipped = 0;

  if (!rows.length) throw new Error("The CSV file is empty or invalid.");

  const headerOk = rows.some((r) => col(r, "Name", "post_title", "Title"));
  if (!headerOk) {
    throw new Error(
      "This does not look like a WooCommerce product CSV (no Name column found).",
    );
  }

  const parents = new Map<string, ParsedProduct>();
  const order: string[] = [];
  const variations: CsvRow[] = [];

  for (const row of rows) {
    const type = col(row, "Type", "post_type").toLowerCase();
    if (type === "variation") {
      variations.push(row);
      continue;
    }

    const name = col(row, "Name", "post_title", "Title");
    if (!name) {
      skipped++;
      continue;
    }

    const sku = col(row, "SKU", "sku");
    const basePrice = num(col(row, "Regular price", "regular_price", "Price"));
    const salePriceRaw = num(col(row, "Sale price", "sale_price"));
    const images = splitImages(
      col(row, "Images", "Image", "Image URL", "Gallery Images", "Featured Image", "images"),
    );

    const stockRaw = col(row, "Stock", "stock_quantity");

    if (basePrice <= 0) {
      errors.push(`"${name}" has no valid price — imported at Rs 0.`);
    }

    const product: ParsedProduct = {
      sku,
      name,
      description: stripHtml(col(row, "Description", "post_content")),
      shortDescription: stripHtml(col(row, "Short description", "post_excerpt")),
      basePrice,
      price: applyProfit(basePrice, profit),
      ...(salePriceRaw > 0 ? { salePrice: applyProfit(salePriceRaw, profit) } : {}),
      ...(stockRaw ? { stock: num(stockRaw) } : {}),
      tags: splitList(col(row, "Tags")),
      images,
      image: images[0] ?? "",
      options: readAttributes(row),
    };

    const key = sku || name.toLowerCase();
    if (!parents.has(key)) order.push(key);
    parents.set(key, product);
  }

  // Fold variation rows into their parent product's options.
  for (const row of variations) {
    const parentRef = col(row, "Parent", "parent_sku").replace(/^id:/i, "").trim();
    const parent =
      parents.get(parentRef) ?? parents.get(parentRef.toLowerCase()) ?? undefined;
    if (!parent) {
      skipped++;
      continue;
    }
    mergeOptions(parent.options, readAttributes(row));
  }

  if (parseErrorCount) {
    errors.push(`${parseErrorCount} malformed row(s) in the CSV were ignored.`);
  }

  return {
    products: order.map((k) => parents.get(k)!).filter(Boolean),
    skipped,
    errors,
  };
}

/* -------------------------------------------------------------------------- */
/* Firestore write                                                             */
/* -------------------------------------------------------------------------- */

const BATCH_SIZE = 200; // Firestore hard limit is 500 writes per batch.

/**
 * Import products into Firestore.
 * Duplicate protection: match on SKU first, then on product name (case-insensitive).
 * Matching products are UPDATED, never duplicated.
 */
export async function importProducts(
  db: Firestore,
  items: ParsedProduct[],
  category: string,
  onProgress?: (done: number, total: number) => void,
): Promise<ImportSummary> {
  const summary: ImportSummary = {
    imported: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  // Snapshot existing products once to build duplicate lookup maps.
  const snap = await getDocs(collection(db, "products"));
  const bySku = new Map<string, string>();
  const byName = new Map<string, string>();
  snap.docs.forEach((d) => {
    const data = d.data() as Partial<Product>;
    if (data.sku) bySku.set(String(data.sku).toLowerCase(), d.id);
    if (data.name) byName.set(String(data.name).trim().toLowerCase(), d.id);
  });

  const col_ = collection(db, "products");
  let done = 0;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const chunk = items.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    const applied: { isUpdate: boolean }[] = [];

    for (const item of chunk) {
      try {
        if (!item.name) {
          summary.skipped++;
          continue;
        }
        const payload = {
          name: item.name,
          price: item.price,
          image: item.image,
          images: item.images,
          category,
          description: item.description || item.shortDescription,
          shortDescription: item.shortDescription,
          options: item.options,
          sku: item.sku,
          tags: item.tags,
          ...(item.salePrice != null ? { salePrice: item.salePrice } : {}),
          ...(item.stock != null ? { stock: item.stock } : {}),
        };

        const existingId =
          (item.sku && bySku.get(item.sku.toLowerCase())) ||
          byName.get(item.name.trim().toLowerCase());

        if (existingId) {
          batch.update(doc(db, "products", existingId), payload);
          applied.push({ isUpdate: true });
        } else {
          const ref = doc(col_);
          batch.set(ref, { ...payload, createdAt: Date.now() });
          // Register immediately so later rows in the same file dedupe too.
          if (item.sku) bySku.set(item.sku.toLowerCase(), ref.id);
          byName.set(item.name.trim().toLowerCase(), ref.id);
          applied.push({ isUpdate: false });
        }
      } catch (err) {
        summary.failed++;
        summary.errors.push(
          `${item.name}: ${err instanceof Error ? err.message : "unknown error"}`,
        );
      }
    }

    try {
      await batch.commit();
      applied.forEach((a) => (a.isUpdate ? summary.updated++ : summary.imported++));
    } catch (err) {
      // A failed batch must not stop the rest of the import.
      summary.failed += applied.length;
      summary.errors.push(
        `Batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${
          err instanceof Error ? err.message : "Firebase error"
        }`,
      );
    }

    done += chunk.length;
    onProgress?.(Math.min(done, items.length), items.length);
  }

  return summary;
}
