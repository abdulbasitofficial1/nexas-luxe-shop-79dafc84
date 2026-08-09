```ts
export type AIIntent =
  | "greeting"
  | "product_search"
  | "product_question"
  | "store_question"
  | "unsupported"
  | "seller_chat"
  | "show_more_products";

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AIProductRecommendation {
  productId: string;
  reason?: string;
}

export interface AIResponse {
  text: string;
  intent: AIIntent;

  // Products that should be displayed in THIS response.
  // The AI can return only 2 products at a time.
  productIds: string[];

  sellerChatRequired: boolean;

  clarification?: string;

  // Total number of products found for the current search.
  totalResults?: number;

  // Number of products already shown to the user.
  shownCount?: number;

  // Whether more products are available.
  hasMoreProducts?: boolean;
}

export interface AIProviderRequest {
  message: string;
  conversation?: AIMessage[];
  catalog?: unknown[];
  currentProductId?: string;

  // IDs already displayed to the user.
  // Used to prevent the same product appearing again.
  shownProductIds?: string[];
}

export interface AIProviderResponse {
  text: string;
  intent: AIIntent;

  // Only the products that should be displayed now.
  productIds?: string[];

  sellerChatRequired?: boolean;

  clarification?: string;

  totalResults?: number;

  shownCount?: number;

  hasMoreProducts?: boolean;
}

export interface SellerChatFallback {
  required: true;
  message: string;
}
```
