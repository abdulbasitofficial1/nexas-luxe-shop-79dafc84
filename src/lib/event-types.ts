import type { Product } from "./types";

export type EventAnimation =
  | "confetti"
  | "fireworks"
  | "balloons"
  | "snow"
  | "sparkles"
  | "none";

export type EventButtonStyle = "solid" | "outline" | "glass" | "gradient";
export type EventBackgroundStyle = "gradient" | "solid" | "image" | "mesh";
export type EventDiscountType = "percentage" | "fixed";
export type EventApplyTo = "all" | "categories" | "products";

/** Admin-controlled lifecycle. The live phase is derived from dates. */
export type EventLifecycle = "draft" | "scheduled" | "cancelled";

/** Fully resolved runtime phase. */
export type EventPhase =
  | "draft"
  | "scheduled"
  | "countdown"
  | "live"
  | "expired"
  | "cancelled";

export interface EventTheme {
  primary: string;
  secondary: string;
  accent: string;
  buttonStyle: EventButtonStyle;
  backgroundStyle: EventBackgroundStyle;
  animation: EventAnimation;
}

export interface EventDiscount {
  type: EventDiscountType;
  value: number;
  applyTo: EventApplyTo;
  categories: string[];
  productIds: string[];
}

export interface StoreEvent {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  slug: string;
  bannerImage: string;
  backgroundImage: string;
  logoImage: string;

  /** Epoch ms. */
  countdownStartAt: number;
  saleStartAt: number;
  saleEndAt: number;

  discount: EventDiscount;
  theme: EventTheme;

  status: EventLifecycle;
  enabled: boolean;

  createdAt?: number;
  updatedAt?: number;
}

export type EventInput = Omit<StoreEvent, "id" | "createdAt" | "updatedAt">;

export const EVENT_ANIMATIONS: EventAnimation[] = [
  "confetti",
  "fireworks",
  "balloons",
  "snow",
  "sparkles",
  "none",
];

export const EVENT_BUTTON_STYLES: EventButtonStyle[] = [
  "solid",
  "outline",
  "glass",
  "gradient",
];

export const EVENT_BACKGROUND_STYLES: EventBackgroundStyle[] = [
  "gradient",
  "solid",
  "image",
  "mesh",
];

export const EVENT_PRESETS: { label: string; theme: EventTheme; subtitle: string }[] = [
  {
    label: "Independence Day",
    subtitle: "Celebrate freedom with unbeatable savings",
    theme: {
      primary: "#0f7a3d",
      secondary: "#043d1f",
      accent: "#ffffff",
      buttonStyle: "gradient",
      backgroundStyle: "gradient",
      animation: "fireworks",
    },
  },
  {
    label: "Eid ul Fitr",
    subtitle: "Eid Mubarak — shop the festive collection",
    theme: {
      primary: "#c9a227",
      secondary: "#1b2a4a",
      accent: "#f7e7a1",
      buttonStyle: "gradient",
      backgroundStyle: "mesh",
      animation: "sparkles",
    },
  },
  {
    label: "Eid ul Adha",
    subtitle: "Blessed savings for the whole family",
    theme: {
      primary: "#0e7c86",
      secondary: "#062b30",
      accent: "#ffd76e",
      buttonStyle: "solid",
      backgroundStyle: "gradient",
      animation: "confetti",
    },
  },
  {
    label: "Ramadan Sale",
    subtitle: "Ramadan Kareem — exclusive offers all month",
    theme: {
      primary: "#7c5cff",
      secondary: "#150f33",
      accent: "#ffd76e",
      buttonStyle: "glass",
      backgroundStyle: "mesh",
      animation: "sparkles",
    },
  },
  {
    label: "Black Friday",
    subtitle: "The biggest discounts of the year",
    theme: {
      primary: "#f5c518",
      secondary: "#0a0a0a",
      accent: "#ff3b3b",
      buttonStyle: "solid",
      backgroundStyle: "solid",
      animation: "confetti",
    },
  },
  {
    label: "New Year",
    subtitle: "New year, new deals",
    theme: {
      primary: "#e9c46a",
      secondary: "#12123a",
      accent: "#8ecae6",
      buttonStyle: "gradient",
      backgroundStyle: "gradient",
      animation: "fireworks",
    },
  },
  {
    label: "Christmas",
    subtitle: "Merry deals & festive prices",
    theme: {
      primary: "#c1121f",
      secondary: "#0b3d2c",
      accent: "#ffffff",
      buttonStyle: "solid",
      backgroundStyle: "gradient",
      animation: "snow",
    },
  },
  {
    label: "Store Anniversary",
    subtitle: "Thank you for shopping with NexasStore",
    theme: {
      primary: "#d4af37",
      secondary: "#101010",
      accent: "#ffe9a8",
      buttonStyle: "gradient",
      backgroundStyle: "mesh",
      animation: "balloons",
    },
  },
  {
    label: "Flash Sale",
    subtitle: "Limited time only — grab it fast",
    theme: {
      primary: "#ff6b00",
      secondary: "#14090a",
      accent: "#ffe066",
      buttonStyle: "solid",
      backgroundStyle: "gradient",
      animation: "sparkles",
    },
  },
  {
    label: "Custom Event",
    subtitle: "",
    theme: {
      primary: "#d4af37",
      secondary: "#0d0d0d",
      accent: "#f5e0a3",
      buttonStyle: "gradient",
      backgroundStyle: "gradient",
      animation: "confetti",
    },
  },
];

export const DEFAULT_EVENT_THEME: EventTheme = EVENT_PRESETS[EVENT_PRESETS.length - 1]!.theme;

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Resolve the current runtime phase of an event. */
export function getEventPhase(event: StoreEvent, now: number): EventPhase {
  if (event.status === "cancelled") return "cancelled";
  if (event.status === "draft" || !event.enabled) return "draft";
  if (now >= event.saleEndAt) return "expired";
  if (now >= event.saleStartAt) return "live";
  if (event.countdownStartAt && now >= event.countdownStartAt) return "countdown";
  return "scheduled";
}

export const PHASE_LABEL: Record<EventPhase, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  countdown: "Countdown Active",
  live: "Live",
  expired: "Expired",
  cancelled: "Cancelled",
};

export const PHASE_CLASS: Record<EventPhase, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  countdown: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  live: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  expired: "bg-zinc-500/15 text-zinc-400 border border-zinc-500/30",
  cancelled: "bg-red-500/15 text-red-400 border border-red-500/30",
};

export interface EventPricing {
  original: number;
  final: number;
  save: number;
  percent: number;
}

/** True when the event's discount rules target this product. */
export function eventTargetsProduct(event: StoreEvent, product: Product): boolean {
  const d = event.discount;
  if (d.applyTo === "all") return true;
  if (d.applyTo === "categories") return d.categories.includes(product.category);
  return d.productIds.includes(product.id);
}

/**
 * Dynamically compute the discounted price. The original price stored in
 * Firestore is never mutated.
 */
export function getEventPricing(
  event: StoreEvent | null,
  product: Pick<Product, "id" | "price" | "category">,
  now: number,
  { force = false }: { force?: boolean } = {},
): EventPricing | null {
  if (!event) return null;
  if (!force && getEventPhase(event, now) !== "live") return null;
  if (!eventTargetsProduct(event, product as Product)) return null;

  const value = Number(event.discount.value) || 0;
  if (value <= 0) return null;

  const original = product.price;
  const rawFinal =
    event.discount.type === "percentage"
      ? original - (original * Math.min(value, 95)) / 100
      : original - value;

  const final = Math.max(1, Math.round(rawFinal));
  if (final >= original) return null;

  const save = original - final;
  return { original, final, save, percent: Math.round((save / original) * 100) };
}

export interface TimeParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

export function splitDuration(ms: number): TimeParts {
  const total = Math.max(0, ms);
  const s = Math.floor(total / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    total,
  };
}

export function makeEmptyEvent(): EventInput {
  const now = Date.now();
  const hour = 60 * 60 * 1000;
  return {
    name: "",
    subtitle: "",
    description: "",
    slug: "",
    bannerImage: "",
    backgroundImage: "",
    logoImage: "",
    countdownStartAt: now,
    saleStartAt: now + 24 * hour,
    saleEndAt: now + 72 * hour,
    discount: {
      type: "percentage",
      value: 20,
      applyTo: "all",
      categories: [],
      productIds: [],
    },
    theme: { ...DEFAULT_EVENT_THEME },
    status: "draft",
    enabled: false,
  };
}
