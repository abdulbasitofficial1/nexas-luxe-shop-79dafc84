```ts
import type { AIIntent, AIResponse } from "./types";

// =========================================================
// CONSTANTS
// =========================================================

const SELLER_CHAT_MESSAGE =
  "Iska exact answer mere paas abhi nahi hai. Aap Chat with Seller se hamari team se directly baat kar sakte hain. 😊";

const UNSUPPORTED_MESSAGE =
  "Sorry, main sirf Nexas Store ke products aur store-related questions mein help kar sakta hoon. 😊";

// =========================================================
// GREETING
// =========================================================

export function createGreetingResponse(
  message: string,
): AIResponse {
  const text = message.toLowerCase().trim();

  if (
    text.includes("kya haal") ||
    text.includes("kaise ho") ||
    text.includes("kaisay ho") ||
    text.includes("how are you")
  ) {
    return {
      text:
        "Main bilkul theek! 😊 Aap batayein, Nexas Store mein kya dhoondhna hai?",
      intent: "greeting",
      productIds: [],
      sellerChatRequired: false,
    };
  }

  return {
    text:
      "Hi! I'm Nexas AI Assistant — mujhe Abdul Basit ne develop kiya hai. 😊 Main aapko Nexas Store ke products dhoondhne mein help kar sakta hoon.",
    intent: "greeting",
    productIds: [],
    sellerChatRequired: false,
  };
}

// =========================================================
// SELLER CHAT
// =========================================================

export function createSellerChatResponse(): AIResponse {
  return {
    text: SELLER_CHAT_MESSAGE,
    intent: "seller_chat",
    productIds: [],
    sellerChatRequired: true,
  };
}

// =========================================================
// UNSUPPORTED
// =========================================================

export function createUnsupportedResponse(): AIResponse {
  return {
    text: UNSUPPORTED_MESSAGE,
    intent: "unsupported",
    productIds: [],
    sellerChatRequired: false,
  };
}

// =========================================================
// PRODUCT RESPONSE
// =========================================================

export function createProductResponse(
  text: string,
  productIds: string[],
  options?: {
    totalResults?: number;
    shownCount?: number;
    hasMoreProducts?: boolean;
  },
): AIResponse {
  return {
    text,
    intent: "product_search",
    productIds,
    sellerChatRequired: false,

    totalResults: options?.totalResults,
    shownCount: options?.shownCount,
    hasMoreProducts: options?.hasMoreProducts,
  };
}

// =========================================================
// SHOW MORE PRODUCTS
// =========================================================

export function createShowMoreProductsResponse(
  text: string,
  productIds: string[],
  options?: {
    totalResults?: number;
    shownCount?: number;
    hasMoreProducts?: boolean;
  },
): AIResponse {
  return {
    text,
    intent: "show_more_products",
    productIds,
    sellerChatRequired: false,

    totalResults: options?.totalResults,
    shownCount: options?.shownCount,
    hasMoreProducts: options?.hasMoreProducts,
  };
}

// =========================================================
// STORE QUESTION
// =========================================================

export function createStoreResponse(
  text: string,
): AIResponse {
  return {
    text,
    intent: "store_question",
    productIds: [],
    sellerChatRequired: false,
  };
}

// =========================================================
// PRODUCT QUESTION
// =========================================================

export function createProductQuestionResponse(
  text: string,
  productIds: string[],
): AIResponse {
  return {
    text,
    intent: "product_question",
    productIds,
    sellerChatRequired: false,
  };
}

// =========================================================
// NORMALIZE AI RESPONSE
// =========================================================

export function normalizeAIResponse(
  response: Partial<AIResponse>,
): AIResponse {
  const intent: AIIntent =
    response.intent ?? "store_question";

  const productIds = Array.isArray(response.productIds)
    ? response.productIds.filter(
        (id): id is string =>
          typeof id === "string" && id.trim().length > 0,
      )
    : [];

  return {
    text:
      typeof response.text === "string" &&
      response.text.trim()
        ? response.text.trim()
        : SELLER_CHAT_MESSAGE,

    intent,

    productIds,

    sellerChatRequired:
      response.sellerChatRequired === true,

    clarification:
      typeof response.clarification === "string" &&
      response.clarification.trim()
        ? response.clarification.trim()
        : undefined,

    totalResults:
      typeof response.totalResults === "number"
        ? response.totalResults
        : undefined,

    shownCount:
      typeof response.shownCount === "number"
        ? response.shownCount
        : undefined,

    hasMoreProducts:
      typeof response.hasMoreProducts === "boolean"
        ? response.hasMoreProducts
        : undefined,
  };
}
```
