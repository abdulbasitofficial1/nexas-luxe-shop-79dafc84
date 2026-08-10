import type { AIIntent, AIResponse } from "./types";

const SELLER_CHAT_MESSAGE =
  "Iska exact answer mere paas abhi nahi hai. Aap Chat with Seller se hamari team se directly baat kar sakte hain. 😊";

const UNSUPPORTED_MESSAGE =
  "Sorry, main sirf Nexas Store ke products aur store-related questions mein help kar sakta hoon. 😊";

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

export function createSellerChatResponse(): AIResponse {
  return {
    text: SELLER_CHAT_MESSAGE,
    intent: "seller_chat",
    productIds: [],
    sellerChatRequired: true,
  };
}

export function createUnsupportedResponse(): AIResponse {
  return {
    text: UNSUPPORTED_MESSAGE,
    intent: "unsupported",
    productIds: [],
    sellerChatRequired: false,
  };
}

export function createProductResponse(
  text: string,
  productIds: string[],
  options?: {
    hasMoreProducts?: boolean;
    nextProductOffset?: number;
  },
): AIResponse {
  return {
    text,
    intent: "product_search",
    productIds,
    sellerChatRequired: false,
    hasMoreProducts:
      options?.hasMoreProducts ?? false,
    nextProductOffset:
      options?.nextProductOffset ?? 0,
  };
}

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

export function normalizeAIResponse(
  response: Partial<AIResponse>,
): AIResponse {
  const intent: AIIntent =
    response.intent ?? "store_question";

  return {
    text:
      typeof response.text === "string" &&
      response.text.trim()
        ? response.text.trim()
        : SELLER_CHAT_MESSAGE,

    intent,

    productIds: Array.isArray(
      response.productIds,
    )
      ? response.productIds.filter(
          (id): id is string =>
            typeof id === "string",
        )
      : [],

    sellerChatRequired:
      response.sellerChatRequired === true,

    clarification:
      typeof response.clarification === "string"
        ? response.clarification
        : undefined,

    hasMoreProducts:
      response.hasMoreProducts === true,

    nextProductOffset:
      typeof response.nextProductOffset ===
      "number"
        ? response.nextProductOffset
        : 0,
  };
}
