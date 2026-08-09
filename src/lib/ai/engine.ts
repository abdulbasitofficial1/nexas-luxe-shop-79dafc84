import type { Product } from "../types";
import type {
  AIMessage,
  AIResponse,
} from "./types";
import { searchProducts } from "./search";
import {
  createGreetingResponse,
  createProductResponse,
  createProductQuestionResponse,
  createStoreResponse,
  createUnsupportedResponse,
  createSellerChatResponse,
} from "./response";

export interface NexasAIEngineRequest {
  message: string;
  products: Product[];
  conversation?: AIMessage[];
  currentProductId?: string;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isGreeting(message: string): boolean {
  const text = normalize(message);

  const greetings = [
    "hi",
    "hello",
    "hey",
    "salam",
    "assalam o alaikum",
    "assalamualaikum",
    "aoa",
    "kya haal",
    "kaise ho",
    "how are you",
    "good morning",
    "good evening",
  ];

  return greetings.some(
    (greeting) =>
      text === greeting ||
      text.startsWith(`${greeting} `)
  );
}

function isUnsupported(message: string): boolean {
  const text = normalize(message);

  const unrelatedPatterns = [
    "write a poem",
    "write me a story",
    "solve my homework",
    "who is the president",
    "tell me a joke",
    "weather today",
    "news today",
    "play a game",
    "translate this",
  ];

  return unrelatedPatterns.some((pattern) =>
    text.includes(pattern)
  );
}

function looksLikeProductQuestion(message: string): boolean {
  const text = normalize(message);

  const productWords = [
    "product",
    "item",
    "price",
    "cost",
    "rate",
    "buy",
    "chahiye",
    "chahta",
    "chahti",
    "dikhao",
    "dikhaye",
    "show",
    "available",
    "stock",
    "color",
    "colour",
    "size",
    "budget",
    "sasta",
    "cheap",
    "acha",
    "best",
    "phone",
    "mobile",
    "cover",
    "case",
    "gift",
  ];

  return productWords.some((word) =>
    text.includes(word)
  );
}

function looksLikeStoreQuestion(message: string): boolean {
  const text = normalize(message);

  const storeWords = [
    "delivery",
    "deliver",
    "cod",
    "cash on delivery",
    "return",
    "returns",
    "payment",
    "easypaisa",
    "jazzcash",
    "order",
    "cancel",
    "tracking",
    "seller",
    "nexas",
    "store",
  ];

  return storeWords.some((word) =>
    text.includes(word)
  );
}

function extractBudget(message: string): number | undefined {
  const normalized = normalize(message);

  const patterns = [
    /under\s+(\d+(?:\.\d+)?)/i,
    /below\s+(\d+(?:\.\d+)?)/i,
    /less than\s+(\d+(?:\.\d+)?)/i,
    /(\d+(?:\.\d+)?)\s*(?:rs|pkr|rupees)/i,
    /(\d+(?:\.\d+)?)\s*(?:tak|tk)/i,
    /(\d+(?:\.\d+)?)\s*(?:ke andar|kay andar)/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);

    if (match?.[1]) {
      const amount = Number(match[1]);

      if (Number.isFinite(amount) && amount > 0) {
        return amount;
      }
    }
  }

  return undefined;
}

function extractCategory(message: string): string | undefined {
  const text = normalize(message);

  const categories = [
    "electronics",
    "fashion",
    "clothing",
    "beauty",
    "accessories",
    "mobile",
    "phones",
    "home",
    "kitchen",
    "jewelry",
    "shoes",
    "bags",
    "gifts",
  ];

  return categories.find((category) =>
    text.includes(category)
  );
}

export function runNexasAIEngine(
  request: NexasAIEngineRequest
): AIResponse {
  const message = request.message.trim();

  if (!message) {
    return createSellerChatResponse();
  }

  if (isGreeting(message)) {
    return createGreetingResponse(message);
  }

  if (isUnsupported(message)) {
    return createUnsupportedResponse();
  }

  if (looksLikeProductQuestion(message)) {
    const budget = extractBudget(message);
    const category = extractCategory(message);

    const results = searchProducts(
      request.products,
      {
        text: message,
        maxPrice: budget,
        category,
      },
      6
    );

    if (results.length === 0) {
      return createSellerChatResponse();
    }

    const productIds = results.map(
      (result) => result.product.id
    );

    const productNames = results
      .slice(0, 3)
      .map((result) => result.product.name)
      .join(", ");

    const budgetText = budget
      ? ` Rs ${budget} ke andar`
      : "";

    return createProductResponse(
      `Bilkul! Mujhe ye matching products mile${budgetText}: ${productNames}. 😊`,
      productIds
    );
  }

  if (looksLikeStoreQuestion(message)) {
    return createStoreResponse(
      "Main Nexas Store ke products aur store-related information mein help kar sakta hoon. Agar aapke question ka exact answer mere available information mein na hua, main aapko Chat with Seller ka option dunga. 😊"
    );
  }

  return createSellerChatResponse();
}
