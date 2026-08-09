import type { Product } from "../types";

export interface ProductSearchQuery {
  text: string;
  maxPrice?: number;
  category?: string;
  keywords?: string[];
}

export interface ProductSearchResult {
  product: Product;
  score: number;
}

/**
 * Normalizes English, Roman Urdu and Hinglish text
 * for basic local product matching.
 */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Creates searchable text from a real Nexas product.
 */
function productText(product: Product): string {
  return normalize(
    [
      product.name,
      product.category,
      product.description,
      ...(product.tags ?? []),
      product.sku,
      ...(product.options ?? []).flatMap((option) => [
        option.name,
        ...option.values,
      ]),
    ]
      .filter(Boolean)
      .join(" ")
  );
}

/**
 * Performs a lightweight local search against the
 * existing Nexas Store products.
 *
 * This is NOT a second database.
 * It searches the Product[] already supplied by the app.
 */
export function searchProducts(
  products: Product[],
  query: ProductSearchQuery,
  limit = 8
): ProductSearchResult[] {
  const normalizedQuery = normalize(query.text);

  const queryWords = [
    ...normalizedQuery.split(" ").filter(Boolean),
    ...(query.keywords ?? []).map(normalize),
  ];

  return products
    .map((product) => {
      const searchable = productText(product);
      let score = 0;

      for (const word of queryWords) {
        if (!word) continue;

        if (normalize(product.name).includes(word)) {
          score += 10;
        }

        if (searchable.includes(word)) {
          score += 3;
        }

        if (
          product.category &&
          normalize(product.category).includes(word)
        ) {
          score += 5;
        }

        if (
          product.tags?.some((tag) =>
            normalize(tag).includes(word)
          )
        ) {
          score += 4;
        }
      }

      if (
        typeof query.maxPrice === "number" &&
        product.price <= query.maxPrice
      ) {
        score += 5;
      }

      if (
        query.category &&
        product.category &&
        normalize(product.category).includes(
          normalize(query.category)
        )
      ) {
        score += 8;
      }

      return {
        product,
        score,
      };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
