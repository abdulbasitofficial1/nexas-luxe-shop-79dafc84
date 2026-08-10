import { useOptionalEventEngine } from "@/lib/event-context";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

interface Props {
  product: Pick<Product, "id" | "price" | "category">;
  size?: "sm" | "lg";
  className?: string;
}

/** Price block that automatically applies the live event discount. */
export function EventPrice({ product, size = "sm", className }: Props) {
  const engine = useOptionalEventEngine();
  const pricing = engine?.priceFor(product) ?? null;

  if (!pricing) {
    return (
      <p
        className={cn(
          "font-bold text-gold-gradient",
          size === "lg" ? "text-3xl" : "text-xl",
          className,
        )}
      >
        Rs {product.price.toLocaleString()}
      </p>
    );
  }

  const accent = engine?.activeEvent?.theme.primary;

  return (
    <div className={cn("flex flex-wrap items-baseline gap-2", className)}>
      <span
        className={cn("font-bold", size === "lg" ? "text-3xl" : "text-xl")}
        style={accent ? { color: accent } : undefined}
      >
        Rs {pricing.final.toLocaleString()}
      </span>
      <span
        className={cn(
          "text-muted-foreground line-through",
          size === "lg" ? "text-lg" : "text-sm",
        )}
      >
        Rs {pricing.original.toLocaleString()}
      </span>
      <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
        Save {pricing.percent}%
      </span>
    </div>
  );
}

/** Corner ribbon for product cards during a live event. */
export function EventDiscountBadge({ product }: { product: Pick<Product, "id" | "price" | "category"> }) {
  const engine = useOptionalEventEngine();
  const pricing = engine?.priceFor(product) ?? null;
  const event = engine?.activeEvent;
  if (!pricing || !event) return null;

  return (
    <div
      className="absolute right-3 top-3 z-10 rounded-full px-3 py-1 text-xs font-bold shadow-lg"
      style={{ background: event.theme.primary, color: "#fff" }}
    >
      -{pricing.percent}%
    </div>
  );
}
