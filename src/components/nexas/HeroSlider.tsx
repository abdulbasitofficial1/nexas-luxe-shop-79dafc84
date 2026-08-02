import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

export interface HeroSlide {
  id: string;
  eyebrow: string;
  heading: string;
  highlight?: string;
  subtitle: string;
  cta: string;
  to: string;
  image?: string;
}

const DURATION = 5000;

export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const count = slides.length;

  const go = useCallback((n: number) => setIndex((i) => (i + n + count) % count), [count]);

  useEffect(() => {
    if (count < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), DURATION);
    return () => clearInterval(id);
  }, [count, index]);

  if (!count) return null;
  const slide = slides[index]!;

  return (
    <section
      className="relative isolate overflow-hidden bg-[var(--gradient-dark)]"
      aria-label="Featured highlights"
    >
      <div className="pointer-events-none absolute -left-24 top-0 size-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 size-80 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative mx-auto grid min-h-[300px] max-w-7xl items-center gap-6 px-4 py-10 sm:min-h-[380px] sm:px-6 sm:py-14 md:grid-cols-[1.1fr_0.9fr]">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="text-center md:text-left"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
              <Sparkles className="size-3.5" />
              {slide.eyebrow}
            </span>

            <h1 className="mt-4 font-display text-3xl font-bold leading-tight sm:text-5xl">
              {slide.heading}{" "}
              {slide.highlight ? (
                <span className="text-gold-gradient">{slide.highlight}</span>
              ) : null}
            </h1>

            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base md:mx-0">
              {slide.subtitle}
            </p>

            <Link
              to={slide.to}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gold-gradient px-7 py-3 text-sm font-semibold text-primary-foreground shadow-gold transition-transform duration-200 hover:scale-105"
            >
              {slide.cta} <ArrowRight className="size-4" />
            </Link>
          </motion.div>
        </AnimatePresence>

        <div className="relative hidden aspect-[4/3] md:block">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id + "-art"}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 overflow-hidden rounded-3xl border border-primary/20 bg-card/60 shadow-elegant backdrop-blur"
            >
              {slide.image ? (
                <img
                  src={slide.image}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover"
                />
              ) : (
                <div className="grid size-full place-items-center">
                  <span className="select-none font-display text-5xl font-black text-primary/10">
                    Nexas Luxe
                  </span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous slide"
            className="absolute left-2 top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-border/60 bg-background/60 text-foreground backdrop-blur transition-colors hover:text-primary sm:left-4"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next slide"
            className="absolute right-2 top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-border/60 bg-background/60 text-foreground backdrop-blur transition-colors hover:text-primary sm:right-4"
          >
            <ChevronRight className="size-5" />
          </button>

          <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index}
                className={
                  i === index
                    ? "h-1.5 w-7 rounded-full bg-gold-gradient transition-all"
                    : "h-1.5 w-2.5 rounded-full bg-foreground/25 transition-all hover:bg-foreground/50"
                }
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
