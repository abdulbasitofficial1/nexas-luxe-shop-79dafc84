```ts
import type { Product } from "../types";
import type {
  AIMessage,
  AIResponse,
} from "./types";

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

// =========================================================
// TEXT NORMALIZER
// =========================================================

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// =========================================================
// GREETINGS
// =========================================================

```ts
function isGreeting(
  message: string,
): boolean {
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
      text === greeting ||
      text.startsWith(`${greeting} `),
  );
}
```


// =========================================================
// MORE PRODUCTS
// =========================================================

function isMoreProductsRequest(
  message: string,
): boolean {
  const text = normalize(message);

  const patterns = [
    "aur dikhao",
    "or dikhao",
    "aur dikhado",
    "or dikhado",
    "aur products",
    "or products",
    "more products",
    "show more",
    "show me more",
    "more",
    "next",
    "next products",
    "aglay products",
    "agle products",
    "baqi products",
    "baki products",
    "aur options",
    "more options",
    "aur dikha do",
    "or dikha do",
  ];

  return patterns.some(
    (pattern) =>
      text === pattern ||
      text.includes(pattern),
  );
}

// =========================================================
// UNSUPPORTED
// =========================================================

function isUnsupported(
  message: string,
): boolean {
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

  return unrelatedPatterns.some(
    (pattern) => text.includes(pattern),
  );
}

// =========================================================
// PRODUCT QUESTION
// =========================================================

function looksLikeProductQuestion(
  message: string,
): boolean {
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

  return productWords.some(
    (word) => text.includes(word),
  );
}

// =========================================================
// STORE QUESTIONS
// =========================================================

function looksLikeStoreQuestion(
  message: string,
): boolean {
  const text = normalize(message);

  const storeWords = [
    // -----------------------------------------------------
    // Existing store questions
    // -----------------------------------------------------

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

    // -----------------------------------------------------
    // Store information
    // -----------------------------------------------------

    "store kya hai",
    "store kis cheez ka hai",
    "store par kya milta hai",
    "store mein kya milta hai",
    "store me kya milta hai",
    "aap kya sell karte ho",
    "kya sell karte ho",
    "kya bechte ho",
    "kon se products hain",
    "kaun se products hain",
    "kis type ke products hain",

    // -----------------------------------------------------
    // Store location
    // -----------------------------------------------------

    "store kahan hai",
    "store kaha hai",
    "shop kahan hai",
    "shop kaha hai",
    "location",
    "store location",
    "shop location",
    "address",
    "store address",
    "shop address",
    "physical store",
    "physical shop",
    "physical location",
    "visit store",
    "store visit",
    "shop visit",

    // -----------------------------------------------------
    // Store timing
    // -----------------------------------------------------

    "store timing",
    "shop timing",
    "store timings",
    "shop timings",
    "store kab open",
    "shop kab open",
    "store kab band",
    "shop kab band",
    "opening time",
    "closing time",
    "open kab",
    "band kab",
    "kis time open",
    "kis waqt open",
    "sunday open",
    "sunday ko open",
    "weekend open",
    "weekend par open",

    // -----------------------------------------------------
    // Contact / customer support
    // -----------------------------------------------------

    "contact number",
    "phone number",
    "mobile number",
    "helpline",
    "customer care",
    "customer service",
    "customer support",
    "support team",
    "support number",
    "whatsapp",
    "whatsapp number",
    "whatsapp par",
    "seller se baat",
    "human agent",
    "human support",
    "agent se baat",
    "representative",
    "representative se baat",
    "team se baat",

    // -----------------------------------------------------
    // Complaints
    // -----------------------------------------------------

    "complaint",
    "complain",
    "shikayat",
    "issue report",
    "problem report",
    "complaint kaise",
    "complaint kahan",
    "issue kahan",
    "problem kahan",
    "masla",
    "masla hai",
    "issue hai",
    "problem hai",

    // -----------------------------------------------------
    // Delivery extra questions
    // -----------------------------------------------------

    "free delivery",
    "free shipping",
    "shipping free",
    "delivery free",
    "delivery available",
    "delivery kin cities",
    "kin cities mein delivery",
    "kin cities me delivery",
    "which cities delivery",
    "remote area",
    "remote areas",
    "same day delivery",
    "urgent delivery",
    "fast delivery",
    "delivery late",
    "delivery late ho",
    "delivery delay",
    "delivery delayed",
    "weekend delivery",
    "saturday delivery",
    "sunday delivery",
    "international delivery",
    "outside pakistan delivery",
    "pakistan delivery",

    // -----------------------------------------------------
    // Payment extra questions
    // -----------------------------------------------------

    "online payment",
    "payment kaise",
    "payment methods",
    "payment method",
    "payment options",
    "bank transfer",
    "bank payment",
    "online transfer",
    "payment safe",
    "payment secure",
    "payment fail",
    "payment failed",
    "payment confirm",
    "payment confirmation",
    "payment pending",
    "advance payment",
    "advance dena",
    "advance payment karni",
    "cod available",
    "cash payment",

    // -----------------------------------------------------
    // Order extra questions
    // -----------------------------------------------------

    "order place",
    "order place karna",
    "order kaise place",
    "order kaise karun",
    "order kaise karna",
    "order confirm",
    "order confirmation",
    "order status",
    "order check",
    "order check karna",
    "mera order",
    "my order",
    "order nahi aya",
    "order nahi aaya",
    "order receive nahi",
    "order late",
    "order delay",
    "order address",
    "address change",
    "address update",
    "order modify",
    "order change",
    "tracking number",
    "tracking id",
    "track my order",

    // -----------------------------------------------------
    // Return / exchange / refund extra questions
    // -----------------------------------------------------

    "return policy",
    "return kaise",
    "product return",
    "return karna",
    "return kitne din",
    "return period",
    "exchange policy",
    "exchange kaise",
    "exchange karna",
    "exchange kitne din",
    "wrong product",
    "galat product",
    "damaged product",
    "damage product",
    "broken product",
    "defective product",
    "refund policy",
    "refund kaise",
    "refund kab",
    "refund kitne din",
    "refund method",
    "paise wapis",
    "money back",

    // -----------------------------------------------------
    // Trust / security
    // -----------------------------------------------------

    "trusted store",
    "trustworthy store",
    "store trusted",
    "genuine store",
    "real store",
    "fake store",
    "original store",
    "safe store",
    "store safe",
    "payment secure",
    "payment safe",
    "data safe",
    "information safe",
    "personal information",
    "personal data",
    "privacy",
    "privacy policy",
    "data privacy",
    "secure payment",
    "security",

    // -----------------------------------------------------
    // Offers / discounts
    // -----------------------------------------------------

    "discount",
    "discounts",
    "discount available",
    "discount hai",
    "offer",
    "offers",
    "offer hai",
    "special offer",
    "special offers",
    "sale",
    "sale lagi",
    "sale chal rahi",
    "promotion",
    "promotions",
    "promo",
    "promo code",
    "coupon",
    "coupon code",
    "discount code",
    "free shipping offer",
    "new customer discount",
    "first order discount",
    "eid offer",
    "special sale",

    // -----------------------------------------------------
    // Wholesale / bulk / business
    // -----------------------------------------------------

    "wholesale",
    "wholesale available",
    "wholesale price",
    "bulk order",
    "bulk orders",
    "bulk purchase",
    "large order",
    "large orders",
    "quantity order",
    "business order",
    "business orders",
    "reseller",
    "reselling",
    "retail",
    "dealer",
    "dealership",

    // -----------------------------------------------------
    // Store type / availability
    // -----------------------------------------------------

    "online store",
    "online shop",
    "website store",
    "physical shop",
    "physical store",
    "offline store",
    "online hai",
    "physical hai",

    // -----------------------------------------------------
    // General store questions
    // -----------------------------------------------------

    "nexas store kya hai",
    "nexas kya hai",
    "nexas kis country",
    "store kab se",
    "store kitna purana",
    "aapka store",
    "aapke store",
    "aapki shop",
    "shop ke bare mein",
    "store ke bare mein",
    "store information",
    "store info",
  ];

  return storeWords.some(
    (word) => text.includes(word),
  );
}

// =========================================================
// BUDGET EXTRACTION
// =========================================================

function extractBudget(
  message: string,
): number | undefined {
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

      if (
        Number.isFinite(amount) &&
        amount > 0
      ) {
        return amount;
      }
    }
  }

  return undefined;
}

// =========================================================
// CATEGORY EXTRACTION
// =========================================================

function extractCategory(
  message: string,
): string | undefined {
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

  return categories.find(
    (category) =>
      text.includes(category),
  );
}

// =========================================================
// SHOULD SEARCH
// =========================================================

function shouldSearchProducts(
  message: string,
): boolean {
  return (
    looksLikeProductQuestion(message) ||
    Boolean(extractBudget(message)) ||
    Boolean(extractCategory(message))
  );
}

// =========================================================
// FIND PREVIOUS PRODUCT SEARCH
// =========================================================

function getPreviousSearchMessage(
  conversation: AIMessage[],
): string | undefined {
  for (
    let index = conversation.length - 1;
    index >= 0;
    index--
  ) {
    const message =
      conversation[index];

    if (message.role === "user") {
      const content =
        message.content.trim();

      if (
        content &&
        !isMoreProductsRequest(content)
      ) {
        return content;
      }
    }
  }

  return undefined;
}

// =========================================================
// GET ALREADY SHOWN PRODUCTS
// =========================================================

function getPreviouslyShownIds(
  conversation: AIMessage[],
): string[] {
  const ids: string[] = [];

  for (const message of conversation) {
    if (
      message.role === "assistant" &&
      Array.isArray(message.productIds)
    ) {
      ids.push(
        ...message.productIds,
      );
    }
  }

  return Array.from(new Set(ids));
}

// =========================================================
// MAIN ENGINE
// =========================================================

export function runNexasAIEngine(
  request: NexasAIEngineRequest,
): AIResponse {
  const message =
    request.message.trim();

  const conversation =
    request.conversation ?? [];

  if (!message) {
    return createSellerChatResponse();
  }

  // =======================================================
  // MORE PRODUCTS
  // =======================================================

  if (isMoreProductsRequest(message)) {
    const previousSearch =
      getPreviousSearchMessage(
        conversation,
      );

    if (!previousSearch) {
      return createProductResponse(
        "Pehle mujhe bata dein ke aap kis type ke products dekhna chahte hain. 😊",
        [],
      );
    }

    const budget =
      extractBudget(previousSearch);

    const category =
      extractCategory(previousSearch);

    const results = searchProducts(
      request.products,
      {
        text: previousSearch,
        maxPrice: budget,
        category,
      },
      50,
    );

    if (results.length === 0) {
      return createProductResponse(
        "Sorry, mujhe matching products nahi mil rahe. 😔",
        [],
      );
    }

    const previouslyShownIds =
      getPreviouslyShownIds(
        conversation,
      );

    const remainingResults =
      results.filter(
        (result) =>
          !previouslyShownIds.includes(
            result.product.id,
          ),
      );

    if (remainingResults.length === 0) {
      return createProductResponse(
        "😊 Is search ke saare matching products main aapko dikha chuka hoon. Agar aap kisi aur category ya budget mein products chahte hain to mujhe bata dein.",
        [],
      );
    }

    const nextProducts =
      remainingResults.slice(0, 2);

    const nextIds =
      nextProducts.map(
        (result) =>
          result.product.id,
      );

    const hasMore =
      remainingResults.length > 2;

    const productNames =
      nextProducts
        .map(
          (result) =>
            result.product.name,
        )
        .join(", ");

    const moreMessage = hasMore
      ? " Agar ye bhi pasand na aayein to **“aur dikhao”** likhein, main next products dikha deta hoon. 😊"
      : " Ye is search ke last matching products hain. 😊";

    return createProductResponse(
      `Bilkul! Ye rahe aur products: ${productNames}. 😊${moreMessage}`,
      nextIds,
      {
        hasMoreProducts: hasMore,
        nextProductOffset:
          previouslyShownIds.length +
          nextIds.length,
      },
    );
  }

  // =======================================================
  // GREETING
  // =======================================================

  if (isGreeting(message)) {
    return createGreetingResponse(
      message,
    );
  }

  // =======================================================
  // UNSUPPORTED
  // =======================================================

  if (isUnsupported(message)) {
    return createUnsupportedResponse();
  }

  // =======================================================
  // PRODUCT SEARCH
  // =======================================================

  if (
    shouldSearchProducts(message)
  ) {
    const budget =
      extractBudget(message);

    const category =
      extractCategory(message);

    const results = searchProducts(
      request.products,
      {
        text: message,
        maxPrice: budget,
        category,
      },
      50,
    );

    if (results.length === 0) {
      return createProductResponse(
        budget
          ? `Sorry, mujhe Rs ${budget.toLocaleString()} ke andar matching product nahi mila. 😔 Aap apni budget range increase karke try kar sakte hain.`
          : "Sorry, mujhe is waqt matching product nahi mila. 😔 Aap kisi aur product ya category ka naam try karein.",
        [],
      );
    }

    // ---------------------------------------------
    // ONLY FIRST 2 PRODUCTS
    // ---------------------------------------------

    const firstProducts =
      results.slice(0, 2);

    const productIds =
      firstProducts.map(
        (result) =>
          result.product.id,
      );

    const productNames =
      firstProducts
        .map(
          (result) =>
            result.product.name,
        )
        .join(", ");

    const hasMore =
      results.length > 2;

    const budgetText = budget
      ? ` Rs ${budget.toLocaleString()} ke andar`
      : "";

    const categoryText = category
      ? ` ${category}`
      : "";

    const moreText = hasMore
      ? " Agar ye products pasand na aayein to **“aur dikhao”** likhein, main aur products dikha deta hoon. 😊"
      : "";

    return createProductResponse(
      `Bilkul! Mujhe${categoryText}${budgetText} matching products mile. Pehle main aapko 2 products dikhata hoon: ${productNames}. 😊${moreText}`,
      productIds,
      {
        hasMoreProducts: hasMore,
        nextProductOffset: 2,
      },
    );
  }

  // =======================================================
  // STORE QUESTIONS
  // =======================================================

  if (
    looksLikeStoreQuestion(message)
  ) {
    return createStoreResponse(
      "Bilkul! Main Nexas Store ke delivery, payment, COD, returns, orders, tracking, store location, timings, contact, offers, security, wholesale aur seller-related questions mein help kar sakta hoon. Agar exact information available na hui to aap Chat with Seller se hamari team se directly baat kar sakte hain. 😊",
    );
  }

  // =======================================================
  // UNKNOWN
  // =======================================================

  return createSellerChatResponse();
}
```
