import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { PackageSearch } from "lucide-react";
import { ProductCard } from "./ProductCard";
import type { Product } from "@/lib/types";

interface Props {
  title: string;
  highlight?: string;
  subtitle?: string;
  products: Product[];
  loading?: boolean;
  emptyText?: string;
  accent?: "gold" | "flash";
}

function Skeletons() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-border/60 bg-card/60"
          aria-hidden="true"
        >
          <div className="aspect-square animate-pulse bg-secondary/60" />
          <div className="space-y-2 p-3">
            <div className="h-3 w-3/4 animate-pulse rounded bg-secondary/60" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-secondary/50" />
            <div className="h-7 w-full animate-pulse rounded bg-secondary/40" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProductRail({
  title,
  highlight,
  subtitle,
  products,
  loading,
  emptyText = "Nothing here yet — check back soon.",
  accent = "gold",
}: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10"
    >
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            {title} {highlight ? <span className="text-gold-gradient">{highlight}</span> : null}
          </h2>
          {subtitle ? (
            <p className="mt-1 truncate text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
          ) : null}
        </div>
        <Link
          to="/products"
          className={
            accent === "flash"
              ? "shrink-0 rounded-full border border-primary/40 px-3 py-1.5 text-xs font-semibold text-primary"
              : "shrink-0 text-xs font-medium text-primary hover:underline"
          }
        >
          View all
        </Link>
      </div>

      {loading ? (
        <Skeletons />
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border/60 py-14 text-center">
          <PackageSearch className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">{emptyText}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </motion.section>
  );
}
