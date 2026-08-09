import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { RotateCcw, ShieldCheck, Truck, Wallet } from "lucide-react";
import { HeroSlider, type HeroSlide } from "@/components/nexas/HeroSlider";
import { CategoryStrip } from "@/components/nexas/CategoryStrip";
import { ProductRail } from "@/components/nexas/ProductRail";
import { Reviews } from "@/components/nexas/Reviews";
import { ContactSection } from "@/components/nexas/ContactSection";
import { useProducts } from "@/lib/store";
import { useOptionalEventEngine } from "@/lib/event-context";
import { EventCountdownSection } from "@/components/nexas/event/EventCountdownSection";
import { getEventPhase } from "@/lib/event-types";
import { AIAssistantWidget } from "@/components/nexas/ai/AIAssistantWidget";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nexas Luxe Shop — Premium Online Shopping in Pakistan" },
      {
        name: "description",
        content:
          "Shop flash deals, trending products, new arrivals and best sellers at Nexas Luxe. Fast nationwide delivery, Cash on Delivery and secure checkout.",
      },
      { property: "og:title", content: "Nexas Luxe Shop — Premium Online Shopping in Pakistan" },
      {
        property: "og:description",
        content:
          "Flash deals, trending products and best sellers with fast nationwide delivery across Pakistan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const perks = [
  { icon: Truck, title: "Fast Delivery", text: "Nationwide shipping across Pakistan." },
  { icon: Wallet, title: "Flexible Payment", text: "EasyPaisa, JazzCash & Cash on Delivery." },
  { icon: RotateCcw, title: "7 Day Returns", text: "Easy returns within 7 days." },
  { icon: ShieldCheck, title: "Secure Orders", text: "Your details are always protected." },
];

function Index() {
  const { products, loading } = useProducts();
  const engine = useOptionalEventEngine();

  const activeEvent =
    engine?.activeEvent &&
    ["live", "countdown"].includes(getEventPhase(engine.activeEvent, engine.now))
      ? engine.activeEvent
      : null;

  const categories = useMemo(() => {
    const map = new Map<string, { count: number; image?: string }>();
    products.forEach((p) => {
      const entry = map.get(p.category);
      if (entry) entry.count += 1;
      else map.set(p.category, { count: 1, image: p.image });
    });
    return Array.from(map.entries()).map(([name, v]) => ({ name, ...v }));
  }, [products]);

  const slides = useMemo<HeroSlide[]>(() => {
    const base: HeroSlide[] = [
      {
        id: "luxury",
        eyebrow: "Pakistan's Premium Online Store",
        heading: "Luxury Shopping,",
        highlight: "Delivered",
        subtitle:
          "A handpicked collection of premium products. Elegant, secure and effortless shopping across Pakistan.",
        cta: "Shop Now",
        to: "/products",
        image: products[0]?.image,
      },
      {
        id: "cod",
        eyebrow: "Cash on Delivery",
        heading: "Pay When It",
        highlight: "Arrives",
        subtitle:
          "EasyPaisa, JazzCash or Cash on Delivery — choose what suits you. Delivered in 3–5 working days.",
        cta: "Browse Products",
        to: "/products",
        image: products[1]?.image,
      },
      {
        id: "returns",
        eyebrow: "7 Day Return Policy",
        heading: "Shop With Total",
        highlight: "Confidence",
        subtitle:
          "Quality checked products with easy returns within 7 days and protected checkout every time.",
        cta: "Start Shopping",
        to: "/products",
        image: products[2]?.image,
      },
    ];

    if (activeEvent) {
      const live = getEventPhase(activeEvent, engine!.now) === "live";
      base.unshift({
        id: `event-${activeEvent.id}`,
        eyebrow: live ? "Sale is live now" : "Starting soon",
        heading: activeEvent.name,
        highlight:
          activeEvent.discount.type === "percentage"
            ? `${activeEvent.discount.value}% OFF`
            : `Rs ${activeEvent.discount.value.toLocaleString()} OFF`,
        subtitle:
          activeEvent.subtitle || activeEvent.description || "Limited time event pricing sitewide.",
        cta: live ? "Shop the Sale" : "Browse Products",
        to: "/products",
        image: activeEvent.bannerImage || activeEvent.logoImage || products[0]?.image,
      });
    }

    return base;
  }, [products, activeEvent, engine]);

  const sorted = useMemo(
    () => [...products].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
    [products],
  );

  const flashDeals = products.slice(0, 4);
  const trending = products.slice(4, 8).length ? products.slice(4, 8) : products.slice(0, 4);
  const newArrivals = sorted.slice(0, 4);
  const bestSellers = [...products].slice(-4).reverse();

  return (
    <>
      <HeroSlider slides={slides} />

<AIAssistantWidget products={products} />
      
      {activeEvent ? <EventCountdownSection event={activeEvent} now={engine!.now} /> : null}
      
      <CategoryStrip categories={categories} />

      <ProductRail
        title="Flash"
        highlight="Deals"
        subtitle="Hot picks moving fast — limited stock."
        products={flashDeals}
        loading={loading}
        accent="flash"
        emptyText="No deals live right now"
      />

      <ProductRail
        title="Trending"
        highlight="Products"
        subtitle="What shoppers are loving this week."
        products={trending}
        loading={loading}
      />

      <ProductRail
        title="New"
        highlight="Arrivals"
        subtitle="Fresh additions to the collection."
        products={newArrivals}
        loading={loading}
      />

      <ProductRail
        title="Best"
        highlight="Sellers"
        subtitle="Customer favourites, again and again."
        products={bestSellers}
        loading={loading}
      />

      {/* Perks */}
      <section className="border-y border-border/60 bg-card/30">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {perks.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card/50 p-4 backdrop-blur"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gold-gradient shadow-gold">
                <f.icon className="size-5 text-primary-foreground" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{f.title}</p>
                <p className="text-xs text-muted-foreground">{f.text}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <Reviews />

      <ContactSection />
    </>
  );
}
