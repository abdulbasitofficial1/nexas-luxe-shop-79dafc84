export type AIIntent =
  | "greeting"
  | "product_search"
  | "product_question"
  | "store_question"
  | "unsupported"
  | "seller_chat";

export interface AIMessage {
  role: "user" | "assistant";
  content: string;

  // Assistant ke previous recommended products
  // ko "aur dikhao" ke liye remember karne ke liye.
  productIds?: string[];
}

export interface AIProductRecommendation {
  productId: string;
  reason?: string;
}

export interface AIResponse {
  text: string;
  intent: AIIntent;
  productIds: string[];
  sellerChatRequired: boolean;
  clarification?: string;

  // Kya aur products available hain?
  hasMoreProducts?: boolean;

  // Next batch ka starting position
  nextProductOffset?: number;
}

export interface AIProviderRequest {
  message: string;
  conversation?: AIMessage[];
  catalog?: unknown[];
  currentProductId?: string;
}

export interface AIProviderResponse {
  text: string;
  intent: AIIntent;
  productIds?: string[];
  sellerChatRequired?: boolean;
  clarification?: string;
  hasMoreProducts?: boolean;
  nextProductOffset?: number;
}

export interface SellerChatFallback {
  required: true;
  message: string;
}
