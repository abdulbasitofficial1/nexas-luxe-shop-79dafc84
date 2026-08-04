import { Star } from "lucide-react";

/** Read-only star display. */
export function StarRating({
  value,
  size = "size-4",
  className = "",
}: {
  value: number;
  size?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-0.5 ${className}`}
      aria-label={`${value.toFixed(1)} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${size} ${
            i <= Math.round(value)
              ? "fill-primary text-primary"
              : "fill-transparent text-muted-foreground/40"
          }`}
        />
      ))}
    </div>
  );
}

/** Interactive 1–5 star picker. */
export function StarPicker({
  value,
  onChange,
  size = "size-8",
}: {
  value: number;
  onChange: (v: number) => void;
  size?: string;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          aria-label={`Rate ${i} star${i > 1 ? "s" : ""}`}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={`${size} ${
              i <= value ? "fill-primary text-primary" : "fill-transparent text-muted-foreground/40"
            }`}
          />
        </button>
      ))}
    </div>
  );
}
