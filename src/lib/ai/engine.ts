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
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// =========================================================
// GREETING
// =========================================================

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
    "asalamualaikum",
    "kya haal",
    "kaise ho",
    "kaisay ho",
    "kaisa ho",
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

// =========================================================
// MORE PRODUCTS
// =========================================================

function isMoreProductsRequest(message: string): boolean {
  const text = normalize(message);

  const patterns = [
    "aur dikhao",
    "or dikhao",
    "awr dikhao",
    "aur dikhado",
    "or dikhado",
    "aur dikha do",
    "or dikha do",
    "aur products",
    "or products",
    "more products",
    "show more",
    "show me more",
    "more options",
    "aur options",
    "next products",
    "next",
    "aglay products",
    "agle products",
    "baqi products",
    "baki products",
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

  return unrelatedPatterns.some(
    (pattern) => text.includes(pattern),
  );
}

// =========================================================
// PRODUCT QUESTION
// =========================================================

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
    "dikha",
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
    "recommendation",
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

function looksLikeStoreQuestion(message: string): boolean {
  const text = normalize(message);

  const storeWords = [
    "delivery",
    "deliver",
    "cash on delivery",
    "cod",
    "payment",
    "payments",
    "easypaisa",
    "jazzcash",
    "order",
    "orders",
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

    "store timing",
    "shop timing",
    "store timings",
    "shop timings",
    "opening time",
    "closing time",
    "open kab",
    "band kab",

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
    "seller se baat",
    "human support",

    "complaint",
    "complain",
    "shikayat",
    "issue",
    "problem",
    "masla",

    "free delivery",
    "free shipping",
    "delivery available",
    "same day delivery",
    "urgent delivery",
    "fast delivery",
    "delivery late",
    "delivery delay",
    "weekend delivery",
    "international delivery",
    "outside pakistan delivery",
    "pakistan delivery",

    "online payment",
    "payment kaise",
    "payment methods",
    "payment method",
    "payment options",
    "bank transfer",
    "online transfer",
    "payment safe",
    "payment secure",
    "payment failed",
    "payment pending",
    "advance payment",
    "cod available",

    "order place",
    "order place karna",
    "order kaise place",
    "order kaise karun",
    "order kaise karna",
    "order confirm",
    "order confirmation",
    "order status",
    "order check",
    "mera order",
    "my order",
    "order nahi aya",
    "order nahi aaya",
    "order late",
    "order delay",
    "address change",
    "address update",
    "order modify",
    "order change",
    "tracking number",
    "tracking id",
    "track my order",

    "return policy",
    "return kaise",
    "product return",
    "return karna",
    "return kitne din",
    "exchange policy",
    "exchange kaise",
    "wrong product",
    "galat product",
    "damaged product",
    "broken product",
    "defective product",
    "refund policy",
    "refund kaise",
    "refund kab",
    "paise wapis",
    "money back",

    "trusted store",
    "trustworthy store",
    "genuine store",
    "real store",
    "fake store",
    "original store",
    "safe store",
    "data safe",
    "information safe",
    "personal information",
    "personal data",
    "privacy",
    "privacy policy",
    "data privacy",
    "secure payment",
    "security",

    "discount",
    "discounts",
    "offer",
    "offers",
    "special offer",
    "sale",
    "promotion",
    "promo code",
    "coupon",
    "coupon code",
    "discount code",
    "eid offer",

    "wholesale",
    "wholesale price",
    "bulk order",
    "bulk orders",
    "bulk purchase",
    "business order",
    "reseller",
    "reselling",
    "dealer",

    "online store",
    "online shop",
    "physical shop",
    "physical store",
    "offline store",

    "store information",
    "store info",
    "store ke bare mein",
    "shop ke bare mein",
  ];

  return storeWords.some(
    (word) => text.includes(word),
  );
}

// =========================================================
// BUDGET RANGE
// =========================================================

interface BudgetRange {
  min?: number;
  max?: number;
}

function extractBudgetRange(
  message: string,
): BudgetRange {
  const text = normalize(message);

  const rangePatterns = [
    /(\d[\d,]*)\s*(?:to|-|se)\s*(\d[\d,]*)/,
    /(\d[\d,]*)\s*(?:se)\s*(\d[\d,]*)\s*(?:tak)?/,
  ];

  for (const pattern of rangePatterns) {
    const match = text.match(pattern);

    if (match?.[1] && match?.[2]) {
      const min = Number(
        match[1].replace(/,/g, ""),
      );

      const max = Number(
        match[2].replace(/,/g, ""),
      );

      if (
        Number.isFinite(min) &&
        Number.isFinite(max) &&
        min > 0 &&
        max > 0
      ) {
        return {
          min: Math.min(min, max),
          max: Math.max(min, max),
        };
      }
    }
  }

  const maxPatterns = [
    /under\s+(\d[\d,]*)/,
    /below\s+(\d[\d,]*)/,
    /less\s+than\s+(\d[\d,]*)/,
    /(\d[\d,]*)\s*(?:tak|tk)/,
    /(\d[\d,]*)\s*(?:ke andar|kay andar)/,
    /(\d[\d,]*)\s*(?:se kam|say kam)/,
    /(?:rs|pkr|rupees)\s*(\d[\d,]*)/,
    /(\d[\d,]*)\s*(?:rs|pkr|rupees)/,
  ];

  for (const pattern of maxPatterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      const max = Number(
        match[1].replace(/,/g, ""),
      );

      if (
        Number.isFinite(max) &&
        max > 0
      ) {
        return { max };
      }
    }
  }

  return {};
}

// =========================================================
// CATEGORY MAPPING
// =========================================================

function extractCategory(
  message: string,
): string | undefined {
  const text = normalize(message);

  const categoryMap: Record<string, string> = {
    electronics: "electronics",
    electronic: "electronics",

    phone: "electronics",
    phones: "electronics",
    mobile: "electronics",
    mobiles: "electronics",
    headphone: "electronics",
    headphones: "electronics",
    earbuds: "electronics",
    speaker: "electronics",
    charger: "electronics",
    "power bank": "electronics",

    fashion: "fashion",
    clothing: "clothing",
    clothes: "clothing",
    dress: "clothing",
    shirt: "clothing",
    suit: "clothing",

    beauty: "beauty",

    accessories: "accessories",
    accessory: "accessories",
    watch: "accessories",
    watches: "accessories",

    home: "home",
    kitchen: "kitchen",

    jewelry: "jewelry",
    jewellery: "jewelry",

    shoes: "shoes",
    shoe: "shoes",

    bags: "bags",
    bag: "bags",

    gifts: "gifts",
    gift: "gifts",
  };

  for (const [keyword, category] of Object.entries(
    categoryMap,
  )) {
    if (text.includes(keyword)) {
      return category;
    }
  }

  return undefined;
}

// =========================================================
// SORT INTENT
// =========================================================

type SortMode =
  | "price-low"
  | "price-high"
  | "best"
  | undefined;

function extractSortMode(
  message: string,
): SortMode {
  const text = normalize(message);

  if (
    text.includes("cheapest") ||
    text.includes("cheaper") ||
    text.includes("sasta") ||
    text.includes("sasti") ||
    text.includes("lowest price") ||
    text.includes("low price") ||
    text.includes("sabse kam")
  ) {
    return "price-low";
  }

  if (
    text.includes("expensive") ||
    text.includes("highest price") ||
    text.includes("high price") ||
    text.includes("mehnga") ||
    text.includes("mehngi") ||
    text.includes("sabse zyada")
  ) {
    return "price-high";
  }

  if (
    text.includes("best") ||
    text.includes("recommended") ||
    text.includes("recommend") ||
    text.includes("acha") ||
    text.includes("achi") ||
    text.includes("top")
  ) {
    return "best";
  }

  return undefined;
}

// =========================================================
// SORT PRODUCTS
// =========================================================

function sortResults(
  results: ReturnType<typeof searchProducts>,
  mode: SortMode,
) {
  if (!mode) {
    return results;
  }

  return [...results].sort((a, b) => {
    const priceA = Number(a.product.price) || 0;
    const priceB = Number(b.product.price) || 0;

    if (mode === "price-low") {
      return priceA - priceB;
    }

    if (mode === "price-high") {
      return priceB - priceA;
    }

    return priceA - priceB;
  });
}

// =========================================================
// PRODUCT QUESTION / DETAILS
// =========================================================

function isProductDetailQuestion(
  message: string,
): boolean {
  const text = normalize(message);

  const patterns = [
    "iska price",
    "iski price",
    "iska rate",
    "iski details",
    "product details",
    "details batao",
    "details bata dein",
    "description",
    "features",
    "feature",
    "colors",
    "colours",
    "color hai",
    "colour hai",
    "size hai",
    "sizes",
    "options",
    "option",
    "is mein kya hai",
    "isme kya hai",
    "is ke bare mein",
    "iske bare mein",
    "about this",
  ];

  return patterns.some(
    (pattern) => text.includes(pattern),
  );
}

// =========================================================
// ADD TO CART INTENT
// =========================================================

function isAddToCartRequest(
  message: string,
): boolean {
  const text = normalize(message);

  const patterns = [
    "add to cart",
    "add this to cart",
    "cart mein add",
    "cart me add",
    "cart mein daal",
    "cart me daal",
    "cart mein dal",
    "cart me dal",
    "cart mein rakh",
    "cart me rakh",
    "isko cart",
    "ye cart",
  ];

  return patterns.some(
    (pattern) => text.includes(pattern),
  );
}

// =========================================================
// COMPARISON INTENT
// =========================================================

function isComparisonRequest(
  message: string,
): boolean {
  const text = normalize(message);

  const patterns = [
    "compare",
    "comparison",
    "compare karo",
    "compare kar do",
    "dono mein",
    "dono me",
    "which is better",
    "kon better",
    "kaun better",
    "better konsa",
    "best konsa",
    "best kaunsa",
    "difference",
    "farq",
  ];

  return patterns.some(
    (pattern) => text.includes(pattern),
  );
}

// =========================================================
// TRACKING ID
// =========================================================

function extractTrackingId(
  message: string,
): string | undefined {
  const match = message.match(
    /\bNX\d{6}\b/i,
  );

  return match?.[0]?.toUpperCase();
}

// =========================================================
// PREVIOUS SEARCH
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
// PREVIOUSLY SHOWN PRODUCTS
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

  return Array.from(
    new Set(ids),
  );
}

// =========================================================
// CURRENT PRODUCT
// =========================================================

function getCurrentProduct(
  products: Product[],
  currentProductId?: string,
): Product | undefined {
  if (!currentProductId) {
    return undefined;
  }

  return products.find(
    (product) =>
      product.id === currentProductId,
  );
}

// =========================================================
// SEARCH DECISION
// =========================================================

function shouldSearchProducts(
  message: string,
): boolean {
  const budget =
    extractBudgetRange(message);

  return (
    looksLikeProductQuestion(message) ||
    Boolean(budget.min) ||
    Boolean(budget.max) ||
    Boolean(extractCategory(message)) ||
    Boolean(extractSortMode(message))
  );
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

  const text = normalize(message);

  if (!message) {
    return createSellerChatResponse();
  }

  // =======================================================
  // TRACKING ID
  // =======================================================

  const trackingId =
    extractTrackingId(message);

  if (trackingId) {
    return createStoreResponse(
      `Aapka tracking ID **${trackingId}** hai. Main order tracking ke liye aapko Seller/Order Tracking section use karne mein help kar sakta hoon. 😊`,
    );
  }

  // =======================================================
  // CURRENT PRODUCT CONTEXT
  // =======================================================

  const currentProduct =
    getCurrentProduct(
      request.products,
      request.currentProductId,
    );

  if (
    currentProduct &&
    isProductDetailQuestion(message)
  ) {
    const productId =
      currentProduct.id;

    return createProductResponse(
      `Bilkul! **${currentProduct.name}** ke baare mein aap product page par available price, description aur options check kar sakte hain. 😊`,
      [productId],
    );
  }

  // =======================================================
  // ADD TO CART
  // =======================================================

  if (
    isAddToCartRequest(message)
  ) {
    if (currentProduct) {
      return createProductResponse(
        `Bilkul! **${currentProduct.name}** ko cart mein add karne ke liye product page ka **Add to Cart** button use karein. 🛒😊`,
        [currentProduct.id],
      );
    }

    return createSellerChatResponse();
  }

  // =======================================================
  // COMPARISON
  // =======================================================

  if (
    isComparisonRequest(message)
  ) {
    const results = searchProducts(
      request.products,
      {
        text: message,
      },
      10,
    );

    const products = results
      .slice(0, 2)
      .map(
        (result) =>
          result.product,
      );

    if (products.length >= 2) {
      const names = products
        .map(
          (product) =>
            `${product.name} (Rs ${Number(product.price).toLocaleString()})`,
        )
        .join(" vs ");

      return createProductResponse(
        `Bilkul! Main in dono products ko compare karne mein help kar sakta hoon: **${names}**. 😊`,
        products.map(
          (product) =>
            product.id,
        ),
      );
    }

    return createSellerChatResponse();
  }

  // =======================================================
  // MORE PRODUCTS
  // =======================================================

  if (
    isMoreProductsRequest(message)
  ) {
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
      extractBudgetRange(
        previousSearch,
      );

    const category =
      extractCategory(
        previousSearch,
      );

    const sortMode =
      extractSortMode(
        previousSearch,
      );

    const results = searchProducts(
      request.products,
      {
        text: previousSearch,
        maxPrice: budget.max,
        category,
      },
      50,
    );

    const sortedResults =
      sortResults(
        results,
        sortMode,
      );

    const previouslyShownIds =
      getPreviouslyShownIds(
        conversation,
      );

    const remainingResults =
      sortedResults.filter(
        (result) =>
          !previouslyShownIds.includes(
            result.product.id,
          ),
      );

    if (
      remainingResults.length === 0
    ) {
      return createProductResponse(
        "😊 Is search ke saare matching products main aapko dikha chuka hoon. Aap koi aur category ya budget try kar sakte hain.",
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

    return createProductResponse(
      `Bilkul! Ye rahe aur products: **${productNames}**. 😊${
        hasMore
          ? ' Agar aur dekhna hai to **"aur dikhao"** likhein.'
          : " Ye last matching products hain."
      }`,
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
      extractBudgetRange(message);

    const category =
      extractCategory(message);

    const sortMode =
      extractSortMode(message);

    const results = searchProducts(
      request.products,
      {
        text: message,
        minPrice: budget.min,
        maxPrice: budget.max,
        category,
      },
      50,
    );

    const sortedResults =
      sortResults(
        results,
        sortMode,
      );

    if (
      sortedResults.length === 0
    ) {
      if (budget.max) {
        return createProductResponse(
          `Sorry, mujhe Rs ${budget.max.toLocaleString()} ke andar matching product nahi mila. 😔 Aap budget range increase karke try kar sakte hain.`,
          [],
        );
      }

      return createProductResponse(
        "Sorry, mujhe is waqt matching product nahi mila. 😔 Aap kisi aur product ya category ka naam try karein.",
        [],
      );
    }

    const firstProducts =
      sortedResults.slice(0, 2);

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
      sortedResults.length > 2;

    let filterText = "";

    if (budget.min && budget.max) {
      filterText += ` Rs ${budget.min.toLocaleString()} se Rs ${budget.max.toLocaleString()} ke darmiyan`;
    } else if (budget.max) {
      filterText += ` Rs ${budget.max.toLocaleString()} ke andar`;
    }

    if (category) {
      filterText += ` ${category}`;
    }

    let sortText = "";

    if (sortMode === "price-low") {
      sortText =
        " Sabse affordable options pehle hain.";
    }

    if (sortMode === "price-high") {
      sortText =
        " Higher-price options pehle hain.";
    }

    if (sortMode === "best") {
      sortText =
        " Ye recommended options hain.";
    }

    return createProductResponse(
      `Bilkul! Mujhe${filterText} matching products mile. Pehle main aapko 2 products dikhata hoon: **${productNames}**. 😊${sortText}${
        hasMore
          ? ' Agar aur products chahiye hon to **"aur dikhao"** likhein.'
          : ""
      }`,
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
      "Bilkul! Main Nexas Store ke delivery, payment, COD, returns, orders, tracking, store location, timings, contact, offers, security, wholesale aur seller-related questions mein help kar sakta hoon. Agar exact information available na hui to **Chat with Seller** se hamari team se directly baat kar sakte hain. 😊",
    );
  }

  // =======================================================
  // SIMPLE FOLLOW-UP
  // =======================================================

  if (
    text === "3000" ||
    text === "2000" ||
    text === "5000" ||
    /^\d+$/.test(text)
  ) {
    const previousSearch =
      getPreviousSearchMessage(
        conversation,
      );

    if (previousSearch) {
      const budget =
        Number(text);

      const results =
        searchProducts(
          request.products,
          {
            text: previousSearch,
            maxPrice: budget,
          },
          50,
        );

      if (results.length > 0) {
        const first =
          results.slice(0, 2);

        const ids =
          first.map(
            (result) =>
              result.product.id,
          );

        const names =
          first
            .map(
              (result) =>
                result.product.name,
            )
            .join(", ");

        return createProductResponse(
          `Bilkul! Rs ${budget.toLocaleString()} ke budget mein mujhe ye products mile: **${names}**. 😊`,
          ids,
          {
            hasMoreProducts:
              results.length > 2,
            nextProductOffset: 2,
          },
        );
      }
    }
  }

  // =======================================================
  // UNKNOWN
  // =======================================================

  return createSellerChatResponse();
}
