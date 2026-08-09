import type { Product } from "../types";

import type {
  AIMessage,
  AIResponse,
} from "./types";

import {
  runNexasAIEngine,
} from "./engine";

export interface NexasAssistantRequest {
  message: string;
  products: Product[];
  conversation?: AIMessage[];
  currentProductId?: string;
}

export function runNexasAssistant(
  request: NexasAssistantRequest,
): AIResponse {
  return runNexasAIEngine({
    message: request.message,
    products: request.products,
    conversation:
      request.conversation ?? [],
    currentProductId:
      request.currentProductId,
  });
}

export function getRecommendedProducts(
  response: AIResponse,
  products: Product[],
): Product[] {
  if (
    !response.productIds.length
  ) {
    return [];
  }

  const productMap = new Map(
    products.map((product) => [
      product.id,
      product,
    ]),
  );

  return response.productIds
    .map((id) =>
      productMap.get(id),
    )
    .filter(
      (
        product,
      ): product is Product =>
        Boolean(product),
    );
}
