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
      product.shortDescription,
      product.sku,
      ...(product.tags ?? []),

      ...(product.options ?? []).flatMap(
        (option) => [
          option.name,
          ...option.values,
        ],
      ),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function getWords(value: string): string[] {
  return normalize(value)
    .split(" ")
    .filter((word) => word.length >= 2);
}

export function searchProducts(
  products: Product[],
  query: ProductSearchQuery,
  limit = 50,
): ProductSearchResult[] {
  const normalizedQuery = normalize(
    query.text,
  );

  const queryWords = Array.from(
    new Set([
      ...getWords(normalizedQuery),
      ...(query.keywords ?? []).flatMap(
        getWords,
      ),
    ]),
  );

  const requestedCategory = query.category
    ? normalize(query.category)
    : "";

  const results: ProductSearchResult[] = [];

  for (const product of products) {
    const productName = normalize(
      product.name,
    );

    const productCategory = normalize(
      product.category,
    );

    const searchable = productText(product);

    // -----------------------------
    // PRICE FILTER
    // -----------------------------

    if (
      typeof query.maxPrice === "number" &&
      Number(product.price) > query.maxPrice
    ) {
      continue;
    }

    // -----------------------------
    // CATEGORY FILTER
    // -----------------------------

    if (requestedCategory) {
      const categoryMatch =
        productCategory.includes(
          requestedCategory,
        ) ||
        requestedCategory.includes(
          productCategory,
        ) ||
        searchable.includes(
          requestedCategory,
        );

      if (!categoryMatch) {
        continue;
      }
    }

    let score = 0;

    // -----------------------------
    // WORD MATCHING
    // -----------------------------

    for (const word of queryWords) {
      if (!word) continue;

      if (productName === word) {
        score += 25;
      } else if (
        productName.includes(word)
      ) {
        score += 15;
      }

      if (searchable.includes(word)) {
        score += 4;
      }

      if (
        productCategory.includes(word)
      ) {
        score += 8;
      }

      if (
        product.tags?.some((tag) =>
          normalize(tag).includes(word),
        )
      ) {
        score += 7;
      }

      if (
        product.options?.some((option) =>
          [
            option.name,
            ...option.values,
          ].some((value) =>
            normalize(value).includes(word),
          ),
        )
      ) {
        score += 5;
      }
    }

    // -----------------------------
    // CATEGORY BONUS
    // -----------------------------

    if (
      requestedCategory &&
      (
        productCategory.includes(
          requestedCategory,
        ) ||
        searchable.includes(
          requestedCategory,
        )
      )
    ) {
      score += 20;
    }

    // -----------------------------
    // BUDGET BONUS
    // -----------------------------

    if (
      typeof query.maxPrice === "number"
    ) {
      const price = Number(product.price);

      if (price <= query.maxPrice) {
        score += 5;
      }

      if (
        price <=
        query.maxPrice * 0.5
      ) {
        score += 2;
      }
    }

    // -----------------------------
    // PRODUCT EXISTENCE
    // -----------------------------

    if (
      product.name ||
      product.category
    ) {
      score += 1;
    }

    if (score > 0) {
      results.push({
        product,
        score,
      });
    }
  }

  return results
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return (
        Number(a.product.price) -
        Number(b.product.price)
      );
    })
    .slice(0, limit);
}
