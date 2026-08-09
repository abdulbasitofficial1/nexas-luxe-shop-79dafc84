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

/* ---------------------------------------
   Text Normalizer
---------------------------------------- */

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ---------------------------------------
   Greetings
---------------------------------------- */

function isGreeting(message: string): boolean {
  const text = normalize(message);

  const greetings = [
    "hi",
    "hello",
    "hey",
    "salam",
    "aoa",
    "assalam o alaikum",
    "assalamualaikum",
    "kya haal",
    "kaise ho",
    "kaisay ho",
    "how are you",
    "good morning",
    "good evening",
    "good afternoon",
  ];

  return greetings.some(
    (greeting) =>
      text === greeting || text.startsWith(`${greeting} `),
  );
}

/* ---------------------------------------
   Unsupported Questions
---------------------------------------- */

function isUnsupported(message: string): boolean {
  const text = normalize(message);

  const unrelatedPatterns = [
    "write a poem",
    "write me a poem",
    "write a story",
    "write me a story",
    "solve my homework",
    "homework",
    "who is the president",
    "tell me a joke",
    "weather today",
    "weather",
    "news today",
    "latest news",
    "play a game",
    "translate this",
    "coding",
    "programming",
    "javascript",
    "python code",
    "make an app",
    "make a website",
    "math question",
    "solve this math",
  ];

  return unrelatedPatterns.some((pattern) =>
    text.includes(pattern),
  );
}

/* ---------------------------------------
   Product Questions
---------------------------------------- */

function looksLikeProductQuestion(message: string): boolean {
  const text = normalize(message);

  const productWords = [
    "product",
    "products",
    "item",
    "items",
    "price",
    "price kya",
    "kitne ka",
    "kitnay ka",
    "kitni price",
    "cost",
    "rate",
    "buy",
    "purchase",
    "chahiye",
    "chahta",
    "chahti",
    "dikhao",
    "dikhaye",
    "dikha do",
    "show",
    "available",
    "availability",
    "stock",
    "color",
    "colour",
    "size",
    "budget",
    "range",
    "sasta",
    "sasti",
    "cheap",
    "acha",
    "achi",
    "best",
    "recommend",
    "suggest",
    "phone",
    "phones",
    "mobile",
    "mobiles",
    "cover",
    "case",
    "gift",
    "bag",
    "bags",
    "shoes",
    "shoe",
    "jewelry",
    "jewellery",
    "watch",
    "watches",
    "speaker",
    "headphone",
    "headphones",
    "earbuds",
    "charger",
    "power bank",
    "dress",
    "clothes",
    "shirt",
    "suit",
  ];

  return productWords.some((word) => text.includes(word));
}

/* ---------------------------------------
   Store Questions
---------------------------------------- */

function looksLikeStoreQuestion(message: string): boolean {
  const text = normalize(message);

  const storeWords = [
    "delivery",
    "deliver",
    "delivery kitne",
    "delivery kab",
    "kitne din",
    "cash on delivery",
    "cod",
    "payment",
    "payments",
    "easypaisa",
    "jazzcash",
    "order",
    "orders",
    "order kaise",
    "cancel",
    "cancellation",
    "return",
    "returns",
    "refund",
    "exchange",
    "tracking",
    "track order",
    "seller",
    "nexas",
    "nexas store",
    "store",
    "shipping",
    "shipping charges",
    "delivery charges",
    "secure",
    "safe",
    "7 days",
    "seven days",
    "contact",
    "support",
  ];

  return storeWords.some((word) =>
    text.includes(word),
  );
}

/* ---------------------------------------
   Budget Extraction
---------------------------------------- */

function extractBudget(message: string): number | undefined {
  const text = normalize(message);

  const patterns = [
    /under\s+(\d+(?:\.\d+)?)/i,
    /below\s+(\d+(?:\.\d+)?)/i,
    /less\s+than\s+(\d+(?:\.\d+)?)/i,

    /(\d+(?:\.\d+)?)\s*(?:rs|pkr|rupees)/i,
    /(?:rs|pkr|rupees)\s*(\d+(?:\.\d+)?)/i,

    /(\d+(?:\.\d+)?)\s*(?:tak|tk)/i,
    /(\d+(?:\.\d+)?)\s*(?:ke\s+andar|kay\s+andar)/i,

    /(\d+(?:\.\d+)?)\s*(?:range|budget)/i,

    /(\d+(?:\.\d+)?)\s*(?:se\s+kam|say\s+kam)/i,
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

/* ---------------------------------------
   Category Extraction
---------------------------------------- */

function extractCategory(message: string): string | undefined {
  const text = normalize(message);

  const categories = [
    "electronics",
    "electronic",
    "fashion",
    "clothing",
    "beauty",
    "accessories",
    "accessory",
    "mobile",
    "mobiles",
    "phone",
    "phones",
    "home",
    "kitchen",
    "jewelry",
    "jewellery",
    "shoes",
    "shoe",
    "bags",
    "bag",
    "gifts",
    "gift",
  ];

  return categories.find((category) =>
    text.includes(category),
  );
}

/* ---------------------------------------
   Search Intent
---------------------------------------- */

function shouldSearchProducts(message: string): boolean {
  return (
    looksLikeProductQuestion(message) ||
    Boolean(extractBudget(message)) ||
    Boolean(extractCategory(message))
  );
}

/* ---------------------------------------
   Main Nexas AI Engine
---------------------------------------- */

export function runNexasAIEngine(
  request: NexasAIEngineRequest,
): AIResponse {
  const message = request.message.trim();

  if (!message) {
    return createSellerChatResponse();
  }

  /* Greeting */
  if (isGreeting(message)) {
    return createGreetingResponse(message);
  }

  /* Unsupported */
  if (isUnsupported(message)) {
    return createUnsupportedResponse();
  }

  /* ---------------------------------------
     Product Search
  ---------------------------------------- */

  if (shouldSearchProducts(message)) {
    const budget = extractBudget(message);
    const category = extractCategory(message);

    const results = searchProducts(
      request.products,
      {
        text: message,
        maxPrice: budget,
        category,
      },
      6,
    );

    /* No products found */
    if (results.length === 0) {
      return createProductResponse(
        budget
          ? `Sorry, mujhe Rs ${budget.toLocaleString()} ke andar matching product nahi mila. 😔 Aap apni budget range increase karke try kar sakte hain.`
          : "Sorry, mujhe is waqt matching product nahi mila. 😔 Aap kisi aur product ya category ka naam try karein.",
        [],
      );
    }

    /* Product IDs */
    const productIds = results.map(
      (result) => result.product.id,
    );

    /* Product names */
    const productNames = results
      .slice(0, 3)
      .map((result) => result.product.name)
      .join(", ");

    /* Budget text */
    const budgetText = budget
      ? ` Rs ${budget.toLocaleString()} ke andar`
      : "";

    /* Category text */
    const categoryText = category
      ? ` ${category}`
      : "";

    return createProductResponse(
      `Bilkul! Mujhe${categoryText} mein${budgetText} ye matching products mile: ${productNames}. 😊 Neeche products ki picture aur price bhi dekh sakte hain.`,
      productIds,
    );
  }

  /* ---------------------------------------
     Store Questions
  ---------------------------------------- */

  if (looksLikeStoreQuestion(message)) {
    return createStoreResponse(
      "Bilkul! Main Nexas Store ke delivery, payment, COD, returns, orders, tracking aur seller-related questions mein help kar sakta hoon. Agar exact information available na hui to aap Chat with Seller se hamari team se directly baat kar sakte hain. 😊",
    );
  }

  /* ---------------------------------------
     Unknown Question
  ---------------------------------------- */

  return createSellerChatResponse();
}
