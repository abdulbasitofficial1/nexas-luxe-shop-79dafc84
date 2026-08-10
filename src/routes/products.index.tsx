import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { Loader2, PackageSearch, Search } from "lucide-react";
import { ProductCard } from "@/components/nexas/ProductCard";
import { Input } from "@/components/ui/input";
import { useProducts } from "@/lib/store";

interface ProductSearch {
  search?: string;
  category?: string;
}

export const Route = createFileRoute("/products/")({
  validateSearch: (search: Record<string, unknown>): ProductSearch => ({
    search: typeof search.search === "string" ? search.search : undefined,
    category: typeof search.category === "string" ? search.category : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Shop All Products — NexasStore" },
      {
        name: "description",
        content: "Browse premium products at NexasStore. Search and filter by category.",
      },
    ],
  }),
  component: Products,
});

function Products() {
  const { products, loading } = useProducts();
  const { search, category } = Route.useSearch();
  const navigate = useNavigate();

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category))).sort(),
    [products],
  );

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory = !category || p.category === category;
      const term = (search ?? "").toLowerCase().trim();
      const matchesSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [products, category, search]);

  const setSearch = (value: string) =>
    navigate({ to: "/products", search: { search: value || undefined, category } });
  const setCategory = (value?: string) =>
    navigate({ to: "/products", search: { search, category: value } });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-4xl font-bold">
        Our <span className="text-gold-gradient">Collection</span>
      </h1>

      <div className="mt-6 flex flex-col gap-4">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search ?? ""}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategory(undefined)}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
              !category
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/60 text-muted-foreground hover:text-primary"
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                category === c
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 text-muted-foreground hover:text-primary"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/60 py-20 text-center">
            <PackageSearch className="size-10 text-muted-foreground" />
            <p className="font-medium">No products found</p>
            <p className="text-sm text-muted-foreground">
              Try a different search or{" "}
              <Link to="/products" search={{}} className="text-primary underline">
                clear filters
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
