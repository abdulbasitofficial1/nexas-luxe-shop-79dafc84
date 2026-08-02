import { AnimatePresence, motion } from "framer-motion";
import { splitDuration } from "@/lib/event-types";
import { cn } from "@/lib/utils";

interface FlipCountdownProps {
  target: number;
  now: number;
  accent?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: {
    box: "h-8 w-8 text-base",
    label: "text-[8px]",
    gap: "gap-1",
  },

  md: {
    box: "h-10 w-9 text-lg sm:h-14 sm:w-12 sm:text-2xl",
    label: "text-[8px] sm:text-[10px]",
    gap: "gap-1 sm:gap-2",
  },

lg: {
  box: "h-10 w-9 text-lg sm:h-14 sm:w-12 sm:text-2xl lg:h-20 lg:w-16 lg:text-4xl",
  label: "text-[8px] sm:text-[9px] lg:text-[10px]",
  gap: "gap-1 sm:gap-2 lg:gap-2",
},
} as const;

function FlipDigit({
  value,
  sizeClass,
  accent,
}: {
  value: string;
  sizeClass: string;
  accent?: string;
}) {
  return (
    <span
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-lg border font-display font-bold tabular-nums",
        "border-white/15 bg-black/55 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.9)] backdrop-blur",
        sizeClass,
      )}
      style={accent ? { color: accent } : undefined}
    >
      {/* hinge line */}
      <span className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-px bg-white/15" />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ rotateX: -90, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          exit={{ rotateX: 90, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
          className="block"
          style={{ transformOrigin: "center" }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function Unit({
  value,
  label,
  size,
  accent,
}: {
  value: number;
  label: string;
  size: keyof typeof SIZES;
  accent?: string;
}) {
  const s = SIZES[size];
  const padded = String(value).padStart(2, "0");
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={cn("flex", s.gap)}>
        {padded.split("").map((d, i) => (
          <FlipDigit key={i} value={d} sizeClass={s.box} accent={accent} />
        ))}
      </div>
      <span className={cn("font-medium uppercase tracking-[0.18em] text-white/60", s.label)}>
        {label}
      </span>
    </div>
  );
}

export function FlipCountdown({
  target,
  now,
  accent,
  size = "md",
  className,
}: FlipCountdownProps) {
  const t = splitDuration(target - now);
  const urgent = t.total > 0 && t.total < 60 * 60 * 1000;

return (
  <div
    className={cn(
      "flex items-start justify-center gap-1 sm:gap-2 lg:gap-3",
      urgent && "animate-pulse",
      className,
    )}
    role="timer"
    aria-live="off"
  >
    <Unit value={t.days} label="Day" size={size} accent={accent} />
    <Unit value={t.hours} label="Hr" size={size} accent={accent} />
    <Unit value={t.minutes} label="Min" size={size} accent={accent} />
    <Unit value={t.seconds} label="Sec" size={size} accent={accent} />
  </div>
);
}
