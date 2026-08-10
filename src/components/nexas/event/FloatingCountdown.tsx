import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, X } from "lucide-react";
import { FlipCountdown } from "./FlipCountdown";
import { hexA } from "./theme";
import { useOptionalEventEngine } from "@/lib/event-context";
import { getEventPhase } from "@/lib/event-types";

/** Persistent floating countdown widget shown on every page. */
export function FloatingCountdown() {
  const engine = useOptionalEventEngine();
  const [dismissed, setDismissed] = useState(false);

  const event = engine?.activeEvent ?? null;
  if (!engine || !event || dismissed) return null;

  const phase = getEventPhase(event, engine.now);
  if (phase !== "live" && phase !== "countdown") return null;

  const live = phase === "live";
  const target = live ? event.saleEndAt : event.saleStartAt;
  const { theme } = event;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.95 }}
        transition={{ duration: 0.35 }}
        className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 sm:left-auto sm:right-5 sm:translate-x-0"
      >
        <div
          className="relative overflow-hidden rounded-2xl border p-3.5 shadow-2xl backdrop-blur-xl"
          style={{
            background: hexA(theme.secondary, 0.92),
            borderColor: hexA(theme.primary, 0.45),
          }}
        >
          <button
            type="button"
            aria-label="Dismiss countdown"
            onClick={() => setDismissed(true)}
            className="absolute right-2 top-2 rounded-full p-1 text-white/50 transition-colors hover:text-white"
          >
            <X className="size-4" />
          </button>

          <p
            className="mb-2 pr-6 text-xs font-semibold uppercase tracking-[0.18em]"
            style={{ color: theme.accent }}
          >
            {live ? `${event.name} — ends in` : `${event.name} — starts in`}
          </p>

          <FlipCountdown target={target} now={engine.now} accent={theme.accent} size="sm" />

          <Link
            to="/products"
            className="mt-3 flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-semibold uppercase tracking-widest"
            style={{ background: hexA(theme.primary, 0.2), color: theme.accent }}
          >
            Shop now <ChevronRight className="size-3.5" />
          </Link>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
