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
}

export interface SellerChatFallback {
  required: true;
  message: string;
}
