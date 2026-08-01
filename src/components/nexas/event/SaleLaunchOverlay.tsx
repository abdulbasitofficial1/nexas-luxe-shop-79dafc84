import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { PartyPopper } from "lucide-react";
import { EventParticles } from "./EventParticles";
import { eventButtonStyle, hexA } from "./theme";
import { useOptionalEventEngine } from "@/lib/event-context";

/** Full-screen celebration shown the moment a scheduled sale goes live. */
export function SaleLaunchOverlay() {
  const engine = useOptionalEventEngine();
  const event = engine?.justLaunched ?? null;

  useEffect(() => {
    if (!event || !engine) return;
    const id = setTimeout(() => engine.dismissLaunch(), 7000);
    return () => clearTimeout(id);
  }, [event, engine]);

  if (!engine || !event) return null;
  const { theme } = event;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center px-4"
        style={{ background: hexA(theme.secondary, 0.9), backdropFilter: "blur(8px)" }}
        role="dialog"
        aria-label={`${event.name} is now live`}
      >
        <EventParticles
          animation={theme.animation === "none" ? "confetti" : theme.animation}
          colors={[theme.primary, theme.accent, "#ffffff"]}
          burst
        />

        <motion.div
          initial={{ scale: 0.85, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 180, damping: 18 }}
          className="relative z-10 w-full max-w-lg rounded-3xl border p-8 text-center shadow-2xl"
          style={{
            borderColor: hexA(theme.primary, 0.5),
            background: hexA(theme.secondary, 0.85),
          }}
        >
          <PartyPopper className="mx-auto size-12" style={{ color: theme.accent }} />
          <p
            className="mt-4 text-xs font-semibold uppercase tracking-[0.3em]"
            style={{ color: theme.accent }}
          >
            The wait is over
          </p>
          <h2 className="mt-2 font-display text-4xl font-bold text-white">{event.name}</h2>
          <p className="mt-2 text-lg font-semibold" style={{ color: theme.primary }}>
            {event.discount.type === "percentage"
              ? `${event.discount.value}% OFF is now live`
              : `Rs ${event.discount.value.toLocaleString()} OFF is now live`}
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/products"
              onClick={() => engine.dismissLaunch()}
              className="rounded-xl px-6 py-3 text-sm font-semibold uppercase tracking-widest"
              style={eventButtonStyle(theme)}
            >
              Shop the sale
            </Link>
            <button
              type="button"
              onClick={() => engine.dismissLaunch()}
              className="rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold uppercase tracking-widest text-white/80 transition-colors hover:bg-white/10"
            >
              Later
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
