import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sparkles, Tag, Timer } from "lucide-react";
import { FlipCountdown } from "./FlipCountdown";
import { EventParticles } from "./EventParticles";
import { eventBackgroundStyle, eventButtonStyle, hexA } from "./theme";
import { getEventPhase, type StoreEvent } from "@/lib/event-types";

export function EventHero({ event, now }: { event: StoreEvent; now: number }) {
  const phase = getEventPhase(event, now);
  const live = phase === "live";
  const target = live ? event.saleEndAt : event.saleStartAt;
  const { theme } = event;

  const discountLabel =
    event.discount.type === "percentage"
      ? `${event.discount.value}% OFF`
      : `Rs ${event.discount.value.toLocaleString()} OFF`;

  return (
    <section
      className="relative isolate overflow-hidden"
      style={eventBackgroundStyle(event)}
      aria-label={`${event.name} event`}
    >
      <EventParticles
        animation={theme.animation}
        colors={[theme.primary, theme.accent, "#ffffff"]}
      />

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center gap-7 px-4 py-16 text-center sm:px-6 sm:py-20">
        <motion.span
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em]"
          style={{
            background: hexA(theme.accent, 0.14),
            border: `1px solid ${hexA(theme.accent, 0.4)}`,
            color: theme.accent,
          }}
        >
          {live ? <Sparkles className="size-3.5" /> : <Timer className="size-3.5" />}
          {live ? "Sale is live now" : "Starting soon"}
        </motion.span>

        {event.logoImage ? (
          <motion.img
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            src={event.logoImage}
            alt={`${event.name} logo`}
            className="h-16 w-auto object-contain sm:h-20"
          />
        ) : null}

        <motion.h2
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="max-w-3xl font-display text-4xl font-bold leading-tight text-white drop-shadow-[0_6px_24px_rgba(0,0,0,0.6)] sm:text-6xl"
        >
          {event.name}
        </motion.h2>

        {event.subtitle ? (
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.14 }}
            className="max-w-2xl text-base text-white/80 sm:text-lg"
          >
            {event.subtitle}
          </motion.p>
        ) : null}

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.18 }}
          className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-display text-2xl font-bold sm:text-3xl"
          style={{
            background: hexA(theme.primary, 0.18),
            border: `1px solid ${hexA(theme.primary, 0.5)}`,
            color: theme.accent,
          }}
        >
          <Tag className="size-6" />
          {discountLabel}
        </motion.div>

        <div className="flex flex-col items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">
            {live ? "Sale ends in" : "Sale starts in"}
          </p>
          <FlipCountdown target={target} now={now} accent={theme.accent} size="lg" />
        </div>

        {event.description ? (
          <p className="max-w-2xl text-sm text-white/70">{event.description}</p>
        ) : null}

        <Link
          to="/products"
          className="mt-1 inline-flex items-center justify-center rounded-xl px-8 py-3.5 text-sm font-semibold uppercase tracking-widest shadow-2xl transition-transform duration-200 hover:scale-105"
          style={eventButtonStyle(theme)}
        >
          {live ? "Shop the sale" : "Browse products"}
        </Link>
      </div>
    </section>
  );
}
