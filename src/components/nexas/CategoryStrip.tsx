import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export interface CategoryItem {
  name: string;
  count: number;
  image?: string;
}

export function CategoryStrip({ categories }: { categories: CategoryItem[] }) {
  if (!categories.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">
          Shop by <span className="text-gold-gradient">Category</span>
        </h2>
        <Link to="/products" className="text-xs font-medium text-primary hover:underline">
          See all
        </Link>
      </div>

      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        {categories.map((c) => (
          <motion.div
            key={c.name}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.95 }}
            className="snap-start"
          >
            <Link
              to="/products"
              search={{ category: c.name, search: undefined }}
              className="flex w-20 shrink-0 flex-col items-center gap-2 text-center sm:w-24"
            >
              <span className="grid size-16 place-items-center overflow-hidden rounded-full border border-primary/30 bg-card/70 shadow-elegant backdrop-blur sm:size-20">
                {c.image ? (
                  <img
                    src={c.image}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover"
                  />
                ) : (
                  <Sparkles className="size-6 text-primary" />
                )}
              </span>
              <span className="line-clamp-2 text-[11px] font-medium leading-tight sm:text-xs">
                {c.name}
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
