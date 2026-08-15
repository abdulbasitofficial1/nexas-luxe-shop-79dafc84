/**
 * Markaz / WooCommerce CSV → Nexas Store product importer.
 *
 * IMPORTANT:
 * - Images are NOT downloaded.
 * - Images are NOT uploaded to Firebase Storage.
 * - Original image URLs from the CSV are saved directly.
 * - Products are matched by SKU first, then by name.
 * - Existing products are updated instead of duplicated.
 */

import Papa from "papaparse";
import {
  collection,
  doc,
  getDocs,
  writeBatch,
  type Firestore,
} from "firebase/firestore";

import type {
  Product,
  ProductOption,
} from "./types";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type CsvRow = Record<string, string>;

export type ProfitType = "fixed" | "percentage";

export interface ProfitSettings {
  type: ProfitType;
  value: number;
}

export interface ParsedProduct {
  sku: string;
  name: string;

  description: string;
  shortDescription: string;

  basePrice: number;
  price: number;

  salePrice?: number;
  stock?: number;

  tags: string[];

  /**
   * Original image URLs from CSV.
   * These are NOT downloaded or uploaded.
   */
  images: string[];

  /**
   * First original image URL.
   */
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

export interface ParseResult {
  products: ParsedProduct[];
  skipped: number;
  errors: string[];
}

/* -------------------------------------------------------------------------- */
/* CSV helpers                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Find a CSV column without caring about:
 * - uppercase/lowercase
 * - BOM
 * - extra spaces
 */
function col(
  row: CsvRow,
  ...names: string[]
): string {
  for (const name of names) {
    const wanted = name
      .trim()
      .toLowerCase()
      .replace(/^\ufeff/, "");

    const key = Object.keys(row).find(
      (k) =>
        k
          .trim()
          .toLowerCase()
          .replace(/^\ufeff/, "") === wanted,
    );

    if (
      key &&
      row[key] != null &&
      String(row[key]).trim() !== ""
    ) {
      return String(row[key]).trim();
    }
  }

  return "";
}

/* -------------------------------------------------------------------------- */
/* HTML / Description cleanup                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Convert WooCommerce / Markaz HTML into readable plain text.
 */
export function stripHtml(html: string): string {
  if (!html) return "";

  let text = html;

  // BR tags
  text = text.replace(
    /<\s*br\s*\/?>/gi,
    "\n",
  );

  // Closing block/list tags
  text = text.replace(
    /<\/\s*(p|li|ul|ol|div|h[1-6])\s*>/gi,
    "\n",
  );

  // List item
  text = text.replace(
    /<\s*li[^>]*>/gi,
    "• ",
  );

  // Remove remaining HTML
  text = text.replace(
    /<[^>]+>/g,
    "",
  );

  // Common HTML entities
  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");

  // Decode common numeric entities
  text = text.replace(
    /&#(\d+);/g,
    (_, code: string) =>
      String.fromCharCode(
        Number(code),
      ),
  );

  // Clean excessive whitespace
  text = text
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}

/* -------------------------------------------------------------------------- */
/* Number helpers                                                             */
/* -------------------------------------------------------------------------- */

function num(value: string): number {
  if (!value) return 0;

  const cleaned = String(value)
    .replace(/,/g, "")
    .replace(/[^0-9.-]/g, "");

  const n = Number.parseFloat(cleaned);

  return Number.isFinite(n) ? n : 0;
}

/* -------------------------------------------------------------------------- */
/* List helpers                                                               */
/* -------------------------------------------------------------------------- */

function splitList(
  value: string,
): string[] {
  if (!value) return [];

  return value
    .split(/[|,;]+/)
    .map((v) => v.trim())
    .filter(Boolean);
}

/* -------------------------------------------------------------------------- */
/* URL helpers                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Decode common HTML entities inside URLs.
 */
function decodeEntities(
  url: string,
): string {
  return url
    .replace(/&amp;/gi, "&")
    .replace(/&#0?38;/gi, "&")
    .replace(/&quot;/gi, "")
    .trim();
}

/**
 * Clean a single image URL.
 *
 * IMPORTANT:
 * This function ONLY cleans the URL.
 *
 * It does NOT:
 * - fetch the image
 * - download the image
 * - upload the image
 */
export function normalizeImageUrl(
  raw: string,
): string {
  if (!raw) return "";

  let url = decodeEntities(raw)
    .replace(/^["'<]+|["'>]+$/g, "")
    .trim();

  if (
    !/^https?:\/\//i.test(url)
  ) {
    return "";
  }

  /*
   * Some Markaz exports may contain:
   *
   * https://www.markaz.app/...?...&src=https%3A%2F%2F...
   *
   * If a src URL exists, use the original URL.
   *
   * Still NO downloading happens here.
   */
  const srcMatch = url.match(
    /[?&]src=([^&]+)/i,
  );

  if (srcMatch) {
    try {
      const inner =
        decodeURIComponent(
          srcMatch[1],
        );

      if (
        /^https?:\/\//i.test(inner)
      ) {
        url = inner;
      }
    } catch {
      // Keep original URL.
    }
  }

  return url;
}

/**
 * Extract multiple image URLs from a CSV cell.
 *
 * Supports:
 * - comma
 * - pipe
 * - semicolon
 * - newline
 *
 * URLs are kept as URLs.
 * Nothing is downloaded.
 */
export function splitImages(
  value: string,
): string[] {
  if (!value) return [];

  const urls: string[] = [];

  const found =
    value.match(
      /https?:\/\/[^\s"'<>|]+/gi,
    ) ?? [];

  for (const raw of found) {
    const cleaned =
      normalizeImageUrl(raw);

    if (
      cleaned &&
      !urls.includes(cleaned)
    ) {
      urls.push(cleaned);
    }
  }

  /*
   * Fallback for cells where URLs are separated
   * by commas/pipes but regex above did not catch
   * them correctly.
   */
  if (urls.length === 0) {
    const chunks = value
      .replace(/\r/g, "\n")
      .split(/[\n|;]+/);

    for (const chunk of chunks) {
      const cleaned =
        normalizeImageUrl(
          chunk.trim(),
        );

      if (
        cleaned &&
        !urls.includes(cleaned)
      ) {
        urls.push(cleaned);
      }
    }
  }

  return urls;
}

/* -------------------------------------------------------------------------- */
/* Profit                                                                     */
/* -------------------------------------------------------------------------- */

export function applyProfit(
  basePrice: number,
  profit: ProfitSettings,
): number {
  if (
    !Number.isFinite(basePrice) ||
    basePrice <= 0
  ) {
    return 0;
  }

  const value =
    Number.isFinite(profit.value)
      ? profit.value
      : 0;

  const final =
    profit.type === "fixed"
      ? basePrice + value
      : basePrice *
        (1 + value / 100);

  return Math.max(
    0,
    Math.round(final),
  );
}

/* -------------------------------------------------------------------------- */
/* Attributes / options                                                       */
/* -------------------------------------------------------------------------- */

function readAttributes(
  row: CsvRow,
): ProductOption[] {
  const options: ProductOption[] = [];

  for (let i = 1; i <= 6; i++) {
    const name = col(
      row,
      `Attribute ${i} name`,
      `Attribute ${i} Name`,
    );

    const values = splitList(
      col(
        row,
        `Attribute ${i} value(s)`,
        `Attribute ${i} value`,
        `Attribute ${i} Values`,
      ),
    );

    if (
      name &&
      values.length > 0
    ) {
      options.push({
        name,
        values,
      });
    }
  }

  return options;
}

/**
 * Merge variation options into parent product.
 */
function mergeOptions(
  target: ProductOption[],
  extra: ProductOption[],
): void {
  for (const option of extra) {
    const existing =
      target.find(
        (item) =>
          item.name
            .toLowerCase() ===
          option.name
            .toLowerCase(),
      );

    if (existing) {
      for (const value of option.values) {
        const exists =
          existing.values.some(
            (x) =>
              x.toLowerCase() ===
              value.toLowerCase(),
          );

        if (!exists) {
          existing.values.push(
            value,
          );
        }
      }
    } else {
      target.push({
        name: option.name,
        values: [
          ...option.values,
        ],
      });
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Parse CSV file                                                             */
/* -------------------------------------------------------------------------- */

export function parseCsvFile(
  file: File,
  profit: ProfitSettings,
): Promise<ParseResult> {
  return new Promise(
    (resolve, reject) => {
      Papa.parse<CsvRow>(
        file,
        {
          header: true,
          skipEmptyLines: true,
          worker: false,

          complete: (result) => {
            try {
              const parsed =
                mapRows(
                  result.data ?? [],
                  profit,
                  result.errors?.length ??
                    0,
                );

              resolve(parsed);
            } catch (error) {
              reject(
                error instanceof
                Error
                  ? error
                  : new Error(
                      "Failed to parse CSV.",
                    ),
              );
            }
          },

          error: (error) => {
            reject(
              new Error(
                error.message ||
                  "Failed to read CSV file.",
              ),
            );
          },
        },
      );
    },
  );
}

/* -------------------------------------------------------------------------- */
/* Map CSV rows                                                               */
/* -------------------------------------------------------------------------- */

export function mapRows(
  rows: CsvRow[],
  profit: ProfitSettings,
  parseErrorCount = 0,
): ParseResult {
  const errors: string[] = [];
  let skipped = 0;

  if (!rows.length) {
    throw new Error(
      "The CSV file is empty or invalid.",
    );
  }

  const headerOk = rows.some(
    (row) =>
      Boolean(
        col(
          row,
          "Name",
          "post_title",
          "Title",
          "Product Name",
        ),
      ),
  );

  if (!headerOk) {
    throw new Error(
      "This does not look like a WooCommerce/Markaz product CSV. No product Name column was found.",
    );
  }

  const parents =
    new Map<
      string,
      ParsedProduct
    >();

  const order: string[] = [];

  const variations: CsvRow[] =
    [];

  /* ---------------------------------------------------------------------- */
  /* First pass                                                             */
  /* ---------------------------------------------------------------------- */

  for (const row of rows) {
    const type = col(
      row,
      "Type",
      "post_type",
      "Product Type",
    ).toLowerCase();

    if (
      type === "variation" ||
      type === "variable_variation"
    ) {
      variations.push(row);
      continue;
    }

    const name = col(
      row,
      "Name",
      "post_title",
      "Title",
      "Product Name",
    );

    if (!name) {
      skipped++;
      continue;
    }

    /* -------------------------------------------------------------------- */
    /* SKU / Product Code                                                   */
    /* -------------------------------------------------------------------- */

    const sku =
      col(
        row,
        "SKU",
        "sku",
        "Product Code",
        "Product code",
        "Code",
      );

    /* -------------------------------------------------------------------- */
    /* Price                                                                */
    /* -------------------------------------------------------------------- */

    const basePrice =
      num(
        col(
          row,
          "Regular price",
          "regular_price",
          "Regular Price",
          "Price",
          "price",
          "Sale Price",
        ),
      );

    const salePriceRaw =
      num(
        col(
          row,
          "Sale price",
          "sale_price",
          "Sale Price",
        ),
      );

    if (basePrice <= 0) {
      errors.push(
        `"${name}" has no valid price — imported at Rs 0.`,
      );
    }

    /* -------------------------------------------------------------------- */
    /* Images                                                               */
    /* -------------------------------------------------------------------- */

    const images =
      splitImages(
        col(
          row,
          "Images",
          "Image",
          "Image URL",
          "Image Url",
          "Gallery Images",
          "Featured Image",
          "images",
          "Images URL",
        ),
      );

    /* -------------------------------------------------------------------- */
    /* Stock                                                                */
    /* -------------------------------------------------------------------- */

    const stockRaw =
      col(
        row,
        "Stock",
        "stock_quantity",
        "Stock quantity",
        "Quantity",
      );

    /* -------------------------------------------------------------------- */
    /* Description                                                          */
    /* -------------------------------------------------------------------- */

    const description =
      stripHtml(
        col(
          row,
          "Description",
          "description",
          "post_content",
          "Content",
          "Product Description",
        ),
      );

    const shortDescription =
      stripHtml(
        col(
          row,
          "Short description",
          "Short Description",
          "post_excerpt",
          "Excerpt",
        ),
      );

    /* -------------------------------------------------------------------- */
    /* Tags                                                                 */
    /* -------------------------------------------------------------------- */

    const tags =
      splitList(
        col(
          row,
          "Tags",
          "Tag",
          "Product tags",
        ),
      );

    /* -------------------------------------------------------------------- */
    /* Options                                                              */
    /* -------------------------------------------------------------------- */

    const options =
      readAttributes(row);

    /* -------------------------------------------------------------------- */
    /* Product                                                              */
    /* -------------------------------------------------------------------- */

    const product: ParsedProduct =
      {
        sku,

        name,

        description:
          description ||
          shortDescription,

        shortDescription,

        basePrice,

        price:
          applyProfit(
            basePrice,
            profit,
          ),

        ...(salePriceRaw > 0
          ? {
              salePrice:
                applyProfit(
                  salePriceRaw,
                  profit,
                ),
            }
          : {}),

        ...(stockRaw
          ? {
              stock:
                num(stockRaw),
            }
          : {}),

        tags,

        /*
         * IMPORTANT:
         * Original URLs only.
         * No download.
         * No Firebase Storage.
         */
        images,

        image:
          images[0] ?? "",

        options,
      };

    /*
     * Duplicate key:
     * SKU first, otherwise product name.
     */
    const key =
      sku ||
      name
        .trim()
        .toLowerCase();

    if (!parents.has(key)) {
      order.push(key);
    }

    parents.set(
      key,
      product,
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Merge variations                                                       */
  /* ---------------------------------------------------------------------- */

  for (const row of variations) {
    const parentRef =
      col(
        row,
        "Parent",
        "parent_sku",
        "Parent SKU",
        "parent",
      )
        .replace(
          /^id:/i,
          "",
        )
        .trim();

    const parent =
      parents.get(parentRef) ??
      parents.get(
        parentRef.toLowerCase(),
      ) ??
      parents.get(
        col(
          row,
          "Name",
          "post_title",
          "Title",
        )
          .trim()
          .toLowerCase(),
      );

    if (!parent) {
      skipped++;
      continue;
    }

    /* Merge options */
    mergeOptions(
      parent.options,
      readAttributes(row),
    );

    /* Merge variation images */
    const variationImages =
      splitImages(
        col(
          row,
          "Images",
          "Image",
          "Image URL",
          "Gallery Images",
          "images",
        ),
      );

    for (const image of variationImages) {
      if (
        !parent.images.includes(
          image,
        )
      ) {
        parent.images.push(
          image,
        );
      }
    }

    if (
      !parent.image &&
      parent.images.length
    ) {
      parent.image =
        parent.images[0];
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Validate                                                               */
  /* ---------------------------------------------------------------------- */

  for (const product of parents.values()) {
    if (!product.image) {
      errors.push(
        `"${product.name}" has no usable image URL in the CSV.`,
      );
    }
  }

  if (parseErrorCount > 0) {
    errors.push(
      `${parseErrorCount} malformed row(s) in the CSV were ignored.`,
    );
  }

  return {
    products: order
      .map(
        (key) =>
          parents.get(key)!,
      )
      .filter(Boolean),

    skipped,

    errors,
  };
}

/* -------------------------------------------------------------------------- */
/* Firestore import                                                           */
/* -------------------------------------------------------------------------- */

const BATCH_SIZE = 200;

/**
 * Import products into Firestore.
 *
 * Duplicate protection:
 * 1. SKU
 * 2. Product name
 *
 * Existing products are updated.
 * New products are created.
 */
export async function importProducts(
  db: Firestore,
  items: ParsedProduct[],
  category: string,
  onProgress?: (
    done: number,
    total: number,
  ) => void,
): Promise<ImportSummary> {
  const summary: ImportSummary =
    {
      imported: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

  /* ---------------------------------------------------------------------- */
  /* Existing products                                                      */
  /* ---------------------------------------------------------------------- */

  const snap =
    await getDocs(
      collection(
        db,
        "products",
      ),
    );

  const bySku =
    new Map<string, string>();

  const byName =
    new Map<string, string>();

  snap.docs.forEach(
    (document) => {
      const data =
        document.data() as Partial<Product>;

      if (data.sku) {
        bySku.set(
          String(data.sku)
            .trim()
            .toLowerCase(),
          document.id,
        );
      }

      if (data.name) {
        byName.set(
          String(data.name)
            .trim()
            .toLowerCase(),
          document.id,
        );
      }
    },
  );

  const productsCollection =
    collection(
      db,
      "products",
    );

  let done = 0;

  /* ---------------------------------------------------------------------- */
  /* Batches                                                                */
  /* ---------------------------------------------------------------------- */

  for (
    let i = 0;
    i < items.length;
    i += BATCH_SIZE
  ) {
    const chunk =
      items.slice(
        i,
        i + BATCH_SIZE,
      );

    const batch =
      writeBatch(db);

    const applied: {
      isUpdate: boolean;
    }[] = [];

    for (const item of chunk) {
      try {
        if (!item.name) {
          summary.skipped++;
          continue;
        }

        /* -------------------------------------------------------------- */
        /* Firestore payload                                               */
        /* -------------------------------------------------------------- */

        const payload = {
          name: item.name,

          price: item.price,

          /*
           * ORIGINAL IMAGE URL.
           *
           * No Firebase Storage conversion.
           */
          image: item.image,

          /*
           * ORIGINAL IMAGE URLs.
           */
          images: item.images,

          category,

          description:
            item.description ||
            item.shortDescription,

          shortDescription:
            item.shortDescription,

          options:
            item.options,

          sku:
            item.sku,

          tags:
            item.tags,

          ...(item.salePrice !=
          null
            ? {
                salePrice:
                  item.salePrice,
              }
            : {}),

          ...(item.stock !=
          null
            ? {
                stock:
                  item.stock,
              }
            : {}),
        };

        /* -------------------------------------------------------------- */
        /* Find existing product                                           */
        /* -------------------------------------------------------------- */

        const skuKey =
          item.sku
            ? item.sku
                .trim()
                .toLowerCase()
            : "";

        const nameKey =
          item.name
            .trim()
            .toLowerCase();

        const existingId =
          (skuKey
            ? bySku.get(
                skuKey,
              )
            : undefined) ||
          byName.get(
            nameKey,
          );

        /* -------------------------------------------------------------- */
        /* Update existing                                                 */
        /* -------------------------------------------------------------- */

        if (existingId) {
          batch.update(
            doc(
              db,
              "products",
              existingId,
            ),
            payload,
          );

          applied.push({
            isUpdate: true,
          });

          continue;
        }

        /* -------------------------------------------------------------- */
        /* Create new                                                       */
        /* -------------------------------------------------------------- */

        const productRef =
          doc(
            productsCollection,
          );

        batch.set(
          productRef,
          {
            ...payload,
            createdAt:
              Date.now(),
          },
        );

        /* Register immediately for deduplication */
        if (skuKey) {
          bySku.set(
            skuKey,
            productRef.id,
          );
        }

        byName.set(
          nameKey,
          productRef.id,
        );

        applied.push({
          isUpdate: false,
        });
      } catch (error) {
        summary.failed++;

        summary.errors.push(
          `${item.name}: ${
            error instanceof Error
              ? error.message
              : "Unknown error"
          }`,
        );
      }
    }

    /* ------------------------------------------------------------------ */
    /* Commit batch                                                        */
    /* ------------------------------------------------------------------ */

    try {
      await batch.commit();

      for (const result of applied) {
        if (result.isUpdate) {
          summary.updated++;
        } else {
          summary.imported++;
        }
      }
    } catch (error) {
      summary.failed +=
        applied.length;

      summary.errors.push(
        `Batch ${
          Math.floor(
            i / BATCH_SIZE,
          ) + 1
        } failed: ${
          error instanceof Error
            ? error.message
            : "Firebase error"
        }`,
      );
    }

    done += chunk.length;

    onProgress?.(
      Math.min(
        done,
        items.length,
      ),
      items.length,
    );
  }

  return summary;
}
