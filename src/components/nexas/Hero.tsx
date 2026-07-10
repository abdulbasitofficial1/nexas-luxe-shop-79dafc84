import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-[var(--gradient-dark)]">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute -left-32 top-0 size-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 size-96 rounded-full bg-primary/10 blur-3xl" />

      {/* Large integrated watermark text */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <span className="select-none whitespace-nowrap font-display text-[22vw] font-black leading-none text-primary/[0.05]">
          NexasStore
        </span>
      </div>

      <div className="relative mx-auto flex max-w-7xl flex-col items-center px-4 py-24 text-center sm:px-6 sm:py-32">
        <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
          <Sparkles className="size-3.5" />
          Pakistan&apos;s Premium Online Store
        </div>

        <h1
          className="animate-fade-up mt-6 max-w-4xl font-display text-4xl font-bold leading-tight sm:text-6xl"
          style={{ animationDelay: "0.1s" }}
        >
          Luxury Shopping, <span className="text-gold-gradient">Delivered</span> to Your Door
        </h1>

        <p
          className="animate-fade-up mt-5 max-w-xl text-base text-muted-foreground sm:text-lg"
          style={{ animationDelay: "0.2s" }}
        >
          Discover a handpicked collection of premium products at NexasStore. Elegant, secure,
          and effortless — the finest online shopping experience in Pakistan.
        </p>

        <div
          className="animate-fade-up mt-9 flex flex-wrap items-center justify-center gap-4"
          style={{ animationDelay: "0.3s" }}
        >
          <Button asChild variant="gold" size="lg">
            <Link to="/products">
              Shop Now <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="goldOutline" size="lg">
            <a href="#contact">Contact Us</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
