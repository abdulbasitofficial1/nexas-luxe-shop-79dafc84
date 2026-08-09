import type { Product } from "../types";
import type { AIMessage, AIResponse } from "./types";
import { searchProducts } from "./search";
import {
  createGreetingResponse,
  createProductResponse,
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

function hasAny(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word));
}

function isGreeting(message: string): boolean {
  const text = normalize(message);

  return hasAny(text, [
    "hi",
    "hello",
    "hey",
    "salam",
    "assalam o alaikum",
    "assalamualaikum",
    "aoa",
    "kya haal",
    "kaise ho",
    "kaisay ho",
    "how are you",
    "good morning",
    "good evening",
  ]);
}

function isUnsupported(message: string): boolean {
  const text = normalize(message);

  return hasAny(text, [
    "write a poem",
    "write me a story",
    "solve my homework",
    "who is the president",
    "tell me a joke",
    "weather today",
    "news today",
    "play a game",
    "translate this",
    "coding",
    "programming",
  ]);
}

function extractBudget(message: string): number | undefined {
  const text = normalize(message);

  const patterns = [
    /under\s+(\d+(?:\.\d+)?)/i,
    /below\s+(\d+(?:\.\d+)?)/i,
    /less\s+than\s+(\d+(?:\.\d+)?)/i,
    /(\d+(?:\.\d+)?)\s*(?:rs|pkr|rupees)/i,
    /(\d+(?:\.\d+)?)\s*(?:tak|tk)/i,
    /(\d+(?:\.\d+)?)\s*(?:ke\s+andar|kay\s+andar)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

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
    "phone",
    "home",
    "kitchen",
    "jewelry",
    "jewellery",
    "shoes",
    "bags",
    "gifts",
    "gift",
    "watches",
    "watch",
  ];

  return categories.find((category) => text.includes(category));
}

function looksLikeProductQuestion(message: string): boolean {
  const text = normalize(message);

  if (extractBudget(message)) return true;
  if (extractCategory(message)) return true;

  return hasAny(text, [
    "product",
    "item",
    "price",
    "kitne ka",
    "kitnay ka",
    "cost",
    "rate",
    "buy",
    "chahiye",
    "chahta",
    "chahti",
    "dikhao",
    "dikhaye",
    "show",
    "stock",
    "color",
    "colour",
    "size",
    "budget",
    "sasta",
    "cheap",
    "best",
    "latest",
    "new arrivals",
    "gift",
    "cover",
    "case",
    "bag",
    "shoes",
    "watch",
  ]);
}

function storeAnswer(message: string): string | null {
  const text = normalize(message);

  if (
    hasAny(text, [
      "cod",
      "cash on delivery",
      "cash on dilivery",
      "cash delivery",
    ])
  ) {
    return "Ji haan 😊 Nexas Store par Cash on Delivery (COD) available hai. Aap order place karte waqt COD select kar sakte hain.";
  }

  if (hasAny(text, ["easypaisa", "easy paisa"])) {
    return "Ji haan 😊 EasyPaisa payment available hai.";
  }

  if (hasAny(text, ["jazzcash", "jazz cash"])) {
    return "Ji haan 😊 JazzCash payment available hai.";
  }

  if (
    hasAny(text, [
      "delivery",
      "deliver",
      "shipping",
      "parcel kab",
      "kitne din",
    ])
  ) {
    return "Nexas Store ki delivery aam tor par 3–5 working days leti hai. Pakistan mein nationwide delivery available hai.";
  }

  if (
    hasAny(text, [
      "return",
      "returns",
      "exchange",
      "refund",
    ])
  ) {
    return "Nexas Store par 7 days return policy available hai. Agar product mein issue ho to 7 din ke andar return request ki ja sakti hai.";
  }

  if (
    hasAny(text, [
      "cancel order",
      "order cancel",
      "cancel",
    ])
  ) {
    return "Order cancel karne ke liye seller se jaldi contact karein. Agar order dispatch na hua ho to cancellation possible hoti hai.";
  }

  if (
    hasAny(text, [
      "tracking",
      "track order",
      "tracking number",
      "tracking id",
      "mera order kahan",
    ])
  ) {
    return "Aap Track Order page par apni tracking ID enter karke order status check kar sakte hain.";
  }

  if (
    hasAny(text, [
      "payment",
      "payment methods",
      "pay kaise",
    ])
  ) {
    return "Nexas Store par Cash on Delivery, EasyPaisa aur JazzCash payment methods available hain.";
  }

  if (
    hasAny(text, [
      "nexas store kya",
      "store safe",
      "trusted",
      "secure",
    ])
  ) {
    return "Nexas Store ek online shopping store hai jahan premium products, secure ordering, Cash on Delivery aur 7 days return policy available hai.";
  }

  if (
    hasAny(text, [
      "seller",
      "support",
      "customer support",
      "contact",
    ])
  ) {
    return "Aap Chat with Seller ke through Nexas Store team se directly baat kar sakte hain. 😊";
  }

  return null;
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

  const answer = storeAnswer(message);

  if (answer) {
    return createStoreResponse(answer);
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

    const productIds = results.map((result) => result.product.id);

    const productNames = results
      .slice(0, 3)
      .map((result) => result.product.name)
      .join(", ");

    const budgetText = budget ? ` Rs ${budget} ke andar` : "";

    return createProductResponse(
      `Bilkul! Mujhe ye matching products mile${budgetText}: ${productNames}. 😊`,
      productIds
    );
  }

  return createSellerChatResponse();
}
