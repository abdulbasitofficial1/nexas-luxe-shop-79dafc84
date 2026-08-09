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
  return words.some((word) => text.includes(normalize(word)));
}

/* -------------------------------------------------------
   GREETINGS
------------------------------------------------------- */

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
    "good afternoon",
    "good evening",
  ];

  return greetings.some(
    (greeting) =>
      text === greeting || text.startsWith(`${greeting} `),
  );
}

/* -------------------------------------------------------
   UNSUPPORTED QUESTIONS
------------------------------------------------------- */

function isUnsupported(message: string): boolean {
  const text = normalize(message);

  const unsupported = [
    "write a poem",
    "write me a poem",
    "poem likho",
    "write a story",
    "story likho",
    "solve my homework",
    "homework solve",
    "who is the president",
    "tell me a joke",
    "joke sunao",
    "weather today",
    "today weather",
    "news today",
    "play a game",
    "game khelo",
    "translate this",
    "coding",
    "programming",
    "javascript",
    "python code",
  ];

  return hasAny(text, unsupported);
}

/* -------------------------------------------------------
   BUDGET
------------------------------------------------------- */

function extractBudget(message: string): number | undefined {
  const text = normalize(message);

  const patterns = [
    /under\s+(\d+(?:\.\d+)?)/i,
    /below\s+(\d+(?:\.\d+)?)/i,
    /less\s+than\s+(\d+(?:\.\d+)?)/i,
    /(\d+(?:\.\d+)?)\s*(?:rs|pkr|rupees)/i,
    /(\d+(?:\.\d+)?)\s*(?:tak|tk)/i,
    /(\d+(?:\.\d+)?)\s*(?:ke andar|kay andar)/i,
    /(\d+(?:\.\d+)?)\s*(?:mein|may|me)/i,
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

/* -------------------------------------------------------
   CATEGORY
------------------------------------------------------- */

function extractCategory(message: string): string | undefined {
  const text = normalize(message);

  const categories = [
    "electronics",
    "electronic",
    "fashion",
    "clothing",
    "clothes",
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
    "watches",
    "watch",
  ];

  return categories.find((category) =>
    text.includes(category),
  );
}

/* -------------------------------------------------------
   PRODUCT QUESTIONS
------------------------------------------------------- */

function looksLikeProductQuestion(message: string): boolean {
  const text = normalize(message);

  if (extractBudget(message)) {
    return true;
  }

  if (extractCategory(message)) {
    return true;
  }

  const productWords = [
    "product",
    "products",
    "item",
    "items",
    "price",
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
    "suggest",
    "suggestion",
    "recommend",
    "recommendation",
    "available",
    "stock",
    "color",
    "colour",
    "size",
    "budget",
    "sasta",
    "sasti",
    "cheap",
    "affordable",
    "best",
    "popular",
    "trending",
    "latest",
    "new",
    "new arrivals",
    "sale",
    "discount",
    "offer",
    "gift",
    "cover",
    "case",
    "watch",
    "watches",
    "shoes",
    "shoe",
    "bag",
    "bags",
    "jewelry",
    "jewellery",
  ];

  return hasAny(text, productWords);
}

/* -------------------------------------------------------
   STORE QUESTIONS
------------------------------------------------------- */

function getStoreAnswer(message: string): string | null {
  const text = normalize(message);

  /* COD */

  if (
    hasAny(text, [
      "cod",
      "cash on delivery",
      "cash on dilivery",
      "cash delivery",
      "delivery par cash",
      "parcel par cash",
      "cash dena",
    ])
  ) {
    return (
      "Ji haan 😊 Nexas Store par Cash on Delivery (COD) available hai. " +
      "Aap order place karte waqt COD select kar sakte hain."
    );
  }

  /* EasyPaisa */

  if (
    hasAny(text, [
      "easypaisa",
      "easy paisa",
      "easy pay",
    ])
  ) {
    return "Ji haan 😊 EasyPaisa payment available hai.";
  }

  /* JazzCash */

  if (
    hasAny(text, [
      "jazzcash",
      "jazz cash",
    ])
  ) {
    return "Ji haan 😊 JazzCash payment available hai.";
  }

  /* Payment */

  if (
    hasAny(text, [
      "payment methods",
      "payment method",
      "payment kaise",
      "pay kaise",
      "payment options",
      "online payment",
      "advance payment",
      "payment",
    ])
  ) {
    return (
      "Nexas Store par Cash on Delivery, EasyPaisa aur JazzCash " +
      "payment methods available hain. 😊"
    );
  }

  /* Delivery */

  if (
    hasAny(text, [
      "delivery kitne din",
      "delivery kitnay din",
      "delivery time",
      "delivery kab",
      "parcel kab",
      "order kab milega",
      "kab milega",
      "kitne din mein",
      "kitnay din mein",
      "shipping time",
      "delivery",
      "deliver",
      "shipping",
    ])
  ) {
    return (
      "Nexas Store ki delivery aam tor par 3–5 working days leti hai. " +
      "Pakistan mein nationwide delivery available hai. 🚚"
    );
  }

  /* Delivery Charges */

  if (
    hasAny(text, [
      "delivery charges",
      "delivery charge",
      "shipping charges",
      "shipping charge",
      "delivery fee",
      "shipping fee",
      "free delivery",
      "free shipping",
    ])
  ) {
    return (
      "Delivery charges order aur location ke mutabiq apply ho sakte hain. " +
      "Checkout par final delivery charge show hota hai."
    );
  }

  /* Pakistan Delivery */

  if (
    hasAny(text, [
      "pakistan mein delivery",
      "pakistan delivery",
      "nationwide delivery",
      "whole pakistan",
      "all pakistan",
      "karachi delivery",
      "lahore delivery",
      "islamabad delivery",
    ])
  ) {
    return "Ji haan 😊 Nexas Store Pakistan mein nationwide delivery provide karta hai.";
  }

  /* Returns */

  if (
    hasAny(text, [
      "return policy",
      "return kaise",
      "product return",
      "return kar sakta",
      "return kar sakti",
      "wapis kar",
      "wapas kar",
      "exchange",
      "refund",
      "7 days return",
      "7 day return",
      "return",
    ])
  ) {
    return (
      "Nexas Store par 7 days return policy available hai. " +
      "Agar product mein issue ho to policy ke mutabiq 7 din ke andar return request ki ja sakti hai."
    );
  }

  /* Damaged / Wrong Product */

  if (
    hasAny(text, [
      "damaged product",
      "product damaged",
      "wrong product",
      "galat product",
      "broken product",
      "defective product",
      "defect",
    ])
  ) {
    return (
      "Agar aapko damaged, defective ya wrong product receive ho, " +
      "to foran Nexas Store team se Chat with Seller ke through contact karein. 😊"
    );
  }

  /* Order placement */

  if (
    hasAny(text, [
      "order kaise",
      "order kaise place",
      "order place",
      "order karna",
      "order karun",
      "order kaise karun",
      "purchase kaise",
    ])
  ) {
    return (
      "Order karne ke liye product open karein, quantity/options select karein " +
      "aur Buy/Order button par click karein. Phir apni delivery information submit karein. 🛒"
    );
  }

  /* Cancel */

  if (
    hasAny(text, [
      "order cancel",
      "cancel order",
      "order cancellation",
      "cancel karna",
      "cancel karun",
      "order cancel kar sakta",
      "cancel",
    ])
  ) {
    return (
      "Order cancellation ke liye seller se jaldi contact karein. " +
      "Agar order dispatch nahi hua ho to cancellation possible ho sakti hai."
    );
  }

  /* Tracking */

  if (
    hasAny(text, [
      "track order",
      "order track",
      "tracking number",
      "tracking id",
      "tracking",
      "mera order kahan",
      "order kahan hai",
      "order status",
    ])
  ) {
    return (
      "Aap Track Order page par apni Tracking ID enter karke " +
      "order ka current status check kar sakte hain. 📦"
    );
  }

  /* Store information */

  if (
    hasAny(text, [
      "nexas store kya",
      "nexas kya hai",
      "store kya hai",
      "tumhara store",
      "your store",
      "online store",
      "nexas store",
    ])
  ) {
    return (
      "Nexas Store ek premium online shopping store hai jahan " +
      "different categories ke products, secure ordering, " +
      "Cash on Delivery aur 7 days return policy available hai. 😊"
    );
  }

  /* Product authenticity */

  if (
    hasAny(text, [
      "products original",
      "product original",
      "original products",
      "genuine products",
      "quality",
      "products safe",
      "product safe",
    ])
  ) {
    return (
      "Nexas Store quality-focused shopping experience provide karta hai. " +
      "Kisi specific product ki details ke liye uska product page check karein " +
      "ya Chat with Seller se confirm kar sakte hain."
    );
  }

  /* Seller / support */

  if (
    hasAny(text, [
      "seller",
      "seller se baat",
      "seller ko message",
      "customer support",
      "support",
      "help",
      "contact",
      "team se baat",
    ])
  ) {
    return (
      "Bilkul 😊 Aap Chat with Seller ke through Nexas Store team se directly baat kar sakte hain."
    );
  }

  return null;
}

/* -------------------------------------------------------
   MAIN ENGINE
------------------------------------------------------- */

export function runNexasAIEngine(
  request: NexasAIEngineRequest,
): AIResponse {
  const message = request.message.trim();

  if (!message) {
    return createSellerChatResponse();
  }

  /* 1. Greeting */

  if (isGreeting(message)) {
    return createGreetingResponse(message);
  }

  /* 2. Unsupported */

  if (isUnsupported(message)) {
    return createUnsupportedResponse();
  }

  /* 3. Store questions FIRST
     Important: COD/delivery/payment ko
     product search mein nahi bhejna.
  */

  const storeAnswer = getStoreAnswer(message);

  if (storeAnswer) {
    return createStoreResponse(storeAnswer);
  }

  /* 4. Product search */

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
      6,
    );

    /* No products found */

    if (results.length === 0) {
      return createSellerChatResponse();
    }

    const productIds = results.map(
      (result) => result.product.id,
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
      productIds,
    );
  }

  /* 5. Unknown */

  return createSellerChatResponse();
}
