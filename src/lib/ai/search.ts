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

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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
    .filter((product) => {
      // If a budget is provided, only return products
      // within that budget.
      if (
        typeof query.maxPrice === "number" &&
        product.price > query.maxPrice
      ) {
        return false;
      }

      // If a category is provided, prefer matching category.
      if (query.category && product.category) {
        const requestedCategory = normalize(query.category);
        const productCategory = normalize(product.category);

        const categoryMatches =
          productCategory.includes(requestedCategory) ||
          requestedCategory.includes(productCategory);

        if (!categoryMatches) {
          return false;
        }
      }

      return true;
    })
    .map((product) => {
      const searchable = productText(product);
      const normalizedName = normalize(product.name);

      let score = 0;

      for (const word of queryWords) {
        if (!word) continue;

        // Exact product-name match gets the highest score.
        if (normalizedName.includes(word)) {
          score += 10;
        }

        // General product information match.
        if (searchable.includes(word)) {
          score += 3;
        }

        // Category match.
        if (
          product.category &&
          normalize(product.category).includes(word)
        ) {
          score += 5;
        }

        // Tag match.
        if (
          product.tags?.some((tag) =>
            normalize(tag).includes(word)
          )
        ) {
          score += 4;
        }
      }

      // Reward products comfortably inside the requested budget.
      if (
        typeof query.maxPrice === "number" &&
        product.price <= query.maxPrice
      ) {
        score += 5;
      }

      // Category match bonus.
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
