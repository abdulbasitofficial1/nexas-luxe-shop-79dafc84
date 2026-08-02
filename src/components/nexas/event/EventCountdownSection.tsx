import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sparkles, Tag, Timer } from "lucide-react";
import { FlipCountdown } from "./FlipCountdown";
import { EventParticles } from "./EventParticles";
import { eventBackgroundStyle, eventButtonStyle, hexA } from "./theme";
import { getEventPhase, type StoreEvent } from "@/lib/event-types";

export function EventCountdownSection({ event, now }: { event: StoreEvent; now: number }) {
  const phase = getEventPhase(event, now);
  const live = phase === "live";
  const target = live ? event.saleEndAt : event.saleStartAt;
  const { theme } = event;

  const discountLabel =
    event.discount.type === "percentage"
      ? `${event.discount.value}% OFF`
      : `Rs ${event.discount.value.toLocaleString()} OFF`;

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6" aria-label={`${event.name} countdown`}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative isolate overflow-hidden rounded-3xl border shadow-elegant"
        style={{ ...eventBackgroundStyle(event), borderColor: hexA(theme.accent, 0.3) }}
      >
        <EventParticles
          animation={theme.animation}
          colors={[theme.primary, theme.accent, "#ffffff"]}
        />

        <div className="relative z-10 grid items-center gap-6 p-6 text-center sm:p-9 md:grid-cols-[1.1fr_0.9fr] md:text-left">
          <div className="flex flex-col items-center gap-3 md:items-start">
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]"
              style={{
                background: hexA(theme.accent, 0.14),
                border: `1px solid ${hexA(theme.accent, 0.4)}`,
                color: theme.accent,
              }}
            >
              {live ? <Sparkles className="size-3.5" /> : <Timer className="size-3.5" />}
              {live ? "Live now" : "Starting soon"}
            </span>

            {event.logoImage ? (
              <img
                src={event.logoImage}
                alt={`${event.name} logo`}
                loading="lazy"
                className="h-12 w-auto object-contain"
              />
            ) : null}

            <h2 className="font-display text-3xl font-bold leading-tight text-white drop-shadow-[0_6px_24px_rgba(0,0,0,0.6)] sm:text-4xl">
              {event.name}
            </h2>

            {event.subtitle ? (
              <p className="max-w-lg text-sm text-white/75">{event.subtitle}</p>
            ) : null}

            <div
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 font-display text-xl font-bold"
              style={{
                background: hexA(theme.primary, 0.18),
                border: `1px solid ${hexA(theme.primary, 0.5)}`,
                color: theme.accent,
              }}
            >
              <Tag className="size-5" />
              {discountLabel}
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">
              {live ? "Ends in" : "Starts in"}
            </p>
            <FlipCountdown target={target} now={now} accent={theme.accent} size="lg" />
            <Link
              to="/products"
              className="inline-flex items-center justify-center rounded-xl px-7 py-3 text-sm font-semibold uppercase tracking-widest shadow-2xl transition-transform duration-200 hover:scale-105"
              style={eventButtonStyle(theme)}
            >
              {live ? "Shop the sale" : "Browse products"}
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
