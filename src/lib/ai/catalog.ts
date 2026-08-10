import type { Product } from "../types";

export interface AIProductContext {
  id: string;
  name: string;
  price: number;
  category?: string;
  description?: string;
  tags?: string[];
  sku?: string;
  stock?: number;
  options?: {
    name: string;
    values: string[];
  }[];
}

/**
 * Converts real Nexas Store products into a small,
 * AI-friendly catalog.
 *
 * This does NOT create a second product database.
 * It only prepares existing Product objects for AI use.
 */
export function buildAICatalog(
  products: Product[]
): AIProductContext[] {
  return products.map((product) => ({
    id: product.id,
    name: product.name,
    price: product.price,
    category: product.category,
    description: product.description,
    tags: product.tags,
    sku: product.sku,
    stock: product.stock,
    options: product.options,
  }));
}

/**
 * Finds a real product from the existing catalog.
 * Never creates or invents a product.
 */
export function findAIProduct(
  products: Product[],
  productId: string
): Product | undefined {
  return products.find((product) => product.id === productId);
}

/**
 * Validates product IDs returned by an AI provider.
 *
 * Only IDs that actually exist in the Nexas catalog
 * are allowed to reach the customer.
 */
export function validateAIProductIds(
  products: Product[],
  productIds: string[] = []
): string[] {
  const validIds = new Set(products.map((product) => product.id));

  return productIds.filter((id) => validIds.has(id));
}
