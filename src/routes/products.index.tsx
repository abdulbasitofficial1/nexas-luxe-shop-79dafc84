import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ChevronDown,
  Filter,
  Loader2,
  PackageSearch,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { ProductCard } from "@/components/nexas/ProductCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useProducts } from "@/lib/store";

interface ProductSearch {
  search?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
}

export const Route = createFileRoute("/products/")({
  validateSearch: (search: Record<string, unknown>): ProductSearch => ({
    search:
      typeof search.search === "string" ? search.search : undefined,

    category:
      typeof search.category === "string"
        ? search.category
        : undefined,

    minPrice:
      typeof search.minPrice === "string"
        ? search.minPrice
        : undefined,

    maxPrice:
      typeof search.maxPrice === "string"
        ? search.maxPrice
        : undefined,

    sort:
      typeof search.sort === "string"
        ? search.sort
        : undefined,
  }),

  head: () => ({
    meta: [
      { title: "Shop All Products — NexasStore" },
      {
        name: "description",
        content:
          "Browse premium products at NexasStore. Search and filter by category and price.",
      },
    ],
  }),

  component: Products,
});

function Products() {
  const { products, loading } = useProducts();

  const {
    search,
    category,
    minPrice,
    maxPrice,
    sort,
  } = Route.useSearch();

  const navigate = useNavigate();

  const [filterOpen, setFilterOpen] = useState(false);

  const [draftMinPrice, setDraftMinPrice] = useState(
    minPrice ?? "",
  );

  const [draftMaxPrice, setDraftMaxPrice] = useState(
    maxPrice ?? "",
  );

  /* -------------------- Categories -------------------- */

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .map((p) => p.category)
            .filter(Boolean),
        ),
      ).sort(),
    [products],
  );

  /* -------------------- Search -------------------- */

  const setSearch = (value: string) => {
    navigate({
      to: "/products",
      search: {
        search: value || undefined,
        category,
        minPrice,
        maxPrice,
        sort,
      },
    });
  };

  /* -------------------- Category -------------------- */

  const setCategory = (value?: string) => {
    navigate({
      to: "/products",
      search: {
        search,
        category: value,
        minPrice,
        maxPrice,
        sort,
      },
    });
  };

  /* -------------------- Sort -------------------- */

  const setSort = (value?: string) => {
    navigate({
      to: "/products",
      search: {
        search,
        category,
        minPrice,
        maxPrice,
        sort: value,
      },
    });
  };

  /* -------------------- Price Filter -------------------- */

  const applyPriceFilter = (
    min?: string,
    max?: string,
  ) => {
    navigate({
      to: "/products",
      search: {
        search,
        category,
        minPrice: min || undefined,
        maxPrice: max || undefined,
        sort,
      },
    });

    setDraftMinPrice(min ?? "");
    setDraftMaxPrice(max ?? "");
    setFilterOpen(false);
  };

  /* -------------------- Clear Filters -------------------- */

  const clearFilters = () => {
    setDraftMinPrice("");
    setDraftMaxPrice("");

    navigate({
      to: "/products",
      search: {},
    });
  };

  /* -------------------- Filtered Products -------------------- */

  const filtered = useMemo(() => {
    const term = (search ?? "").toLowerCase().trim();

    const min = minPrice
      ? Number(minPrice)
      : undefined;

    const max = maxPrice
      ? Number(maxPrice)
      : undefined;

    const result = products.filter((p) => {
      const matchesCategory =
        !category || p.category === category;

      const matchesSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term);

      const matchesMinPrice =
        min === undefined || p.price >= min;

      const matchesMaxPrice =
        max === undefined || p.price <= max;

      return (
        matchesCategory &&
        matchesSearch &&
        matchesMinPrice &&
        matchesMaxPrice
      );
    });

    /* -------------------- Sorting -------------------- */

    if (sort === "price-low") {
      result.sort((a, b) => a.price - b.price);
    }

    if (sort === "price-high") {
      result.sort((a, b) => b.price - a.price);
    }

    if (sort === "name") {
      result.sort((a, b) =>
        a.name.localeCompare(b.name),
      );
    }

    return result;
  }, [
    products,
    category,
    search,
    minPrice,
    maxPrice,
    sort,
  ]);

  /* -------------------- Active Filter Count -------------------- */

  const activeFilterCount =
    (category ? 1 : 0) +
    (minPrice ? 1 : 0) +
    (maxPrice ? 1 : 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">

      {/* ==================== HEADER ==================== */}

      <div>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">
          Our{" "}
          <span className="text-gold-gradient">
            Collection
          </span>
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Discover premium products at NexasStore.
        </p>
      </div>

      {/* ==================== SEARCH ==================== */}

      <div className="mt-6">
        <div className="relative max-w-2xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            value={search ?? ""}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search products..."
            className="h-11 pl-9"
          />
        </div>
      </div>

      {/* ==================== FILTER BAR ==================== */}

      <div className="mt-6 rounded-2xl border border-border/60 bg-card shadow-sm">

        {/* Top row */}

        <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex flex-wrap items-center gap-2">

            {/* Filter Button */}

            <Button
              variant="outline"
              className="gap-2"
              onClick={() =>
                setFilterOpen(!filterOpen)
              }
            >
              <SlidersHorizontal className="size-4" />

              FILTER

              {activeFilterCount > 0 && (
                <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            {/* All */}

            <button
              onClick={() => setCategory(undefined)}
              className={`rounded-lg px-4 py-2 text-sm transition-colors ${
                !category
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              All
            </button>

            {/* Categories */}

            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-lg px-4 py-2 text-sm transition-colors ${
                  category === c
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {c}
              </button>
            ))}

          </div>

          {/* Sort */}

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Sort
            </span>

            <div className="relative">
              <select
                value={sort ?? "relevance"}
                onChange={(e) =>
                  setSort(
                    e.target.value === "relevance"
                      ? undefined
                      : e.target.value,
                  )
                }
                className="h-10 appearance-none rounded-lg border border-border bg-background px-4 pr-9 text-sm outline-none transition focus:border-primary"
              >
                <option value="relevance">
                  Relevance
                </option>

                <option value="price-low">
                  Price: Low to High
                </option>

                <option value="price-high">
                  Price: High to Low
                </option>

                <option value="name">
                  Name: A to Z
                </option>
              </select>

              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* ==================== FILTER PANEL ==================== */}

        {filterOpen && (
          <div className="border-t border-border/60 p-4">

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">
                  Filter Products
                </h3>

                <p className="text-xs text-muted-foreground">
                  Choose your preferred price range.
                </p>
              </div>

              <button
                onClick={() =>
                  setFilterOpen(false)
                }
                className="rounded-full p-2 text-muted-foreground hover:bg-secondary"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Price */}

            <div className="mt-5">

              <p className="mb-3 text-sm font-medium">
                Price Range
              </p>

              <div className="grid grid-cols-2 gap-3 sm:max-w-md">

                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    From
                  </label>

                  <Input
                    type="number"
                    min="0"
                    placeholder="Rs 0"
                    value={draftMinPrice}
                    onChange={(e) =>
                      setDraftMinPrice(
                        e.target.value,
                      )
                    }
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    To
                  </label>

                  <Input
                    type="number"
                    min="0"
                    placeholder="Rs 10000"
                    value={draftMaxPrice}
                    onChange={(e) =>
                      setDraftMaxPrice(
                        e.target.value,
                      )
                    }
                  />
                </div>

              </div>

              <Button
                variant="gold"
                className="mt-3"
                onClick={() =>
                  applyPriceFilter(
                    draftMinPrice,
                    draftMaxPrice,
                  )
                }
              >
                Apply Price
              </Button>
            </div>

            {/* Quick Price Filters */}

            <div className="mt-6">

              <p className="mb-3 text-sm font-medium">
                Quick Price Filters
              </p>

              <div className="flex flex-wrap gap-2">

                <button
                  onClick={() =>
                    applyPriceFilter(
                      undefined,
                      "500",
                    )
                  }
                  className="rounded-lg border border-border/60 px-4 py-2 text-sm transition hover:border-primary hover:bg-primary/5 hover:text-primary"
                >
                  Under 500
                </button>

                <button
                  onClick={() =>
                    applyPriceFilter(
                      "500",
                      "1000",
                    )
                  }
                  className="rounded-lg border border-border/60 px-4 py-2 text-sm transition hover:border-primary hover:bg-primary/5 hover:text-primary"
                >
                  500–1,000
                </button>

                <button
                  onClick={() =>
                    applyPriceFilter(
                      "1000",
                      "2000",
                    )
                  }
                  className="rounded-lg border border-border/60 px-4 py-2 text-sm transition hover:border-primary hover:bg-primary/5 hover:text-primary"
                >
                  1,000–2,000
                </button>

                <button
                  onClick={() =>
                    applyPriceFilter(
                      "2000",
                      undefined,
                    )
                  }
                  className="rounded-lg border border-border/60 px-4 py-2 text-sm transition hover:border-primary hover:bg-primary/5 hover:text-primary"
                >
                  2,000+
                </button>

              </div>
            </div>

            {/* Clear */}

            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="mt-5 text-sm font-medium text-destructive hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* ==================== QUICK FILTER ROW ==================== */}

        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 px-4 py-3">

          <Filter className="size-4 text-muted-foreground" />

          <span className="mr-2 text-sm font-medium">
            Filters:
          </span>

          <button
            onClick={() =>
              applyPriceFilter(
                undefined,
                "500",
              )
            }
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
              maxPrice === "500" &&
              !minPrice
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/60 text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            Under 500
          </button>

          <button
            onClick={() =>
              applyPriceFilter(
                "500",
                "1000",
              )
            }
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
              minPrice === "500" &&
              maxPrice === "1000"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/60 text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            500–1,000
          </button>

          <button
            onClick={() =>
              applyPriceFilter(
                "1000",
                "2000",
              )
            }
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
              minPrice === "1000" &&
              maxPrice === "2000"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/60 text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            1,000–2,000
          </button>

          <button
            onClick={() =>
              applyPriceFilter(
                "2000",
                undefined,
              )
            }
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
              minPrice === "2000" &&
              !maxPrice
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/60 text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            2,000+
          </button>

        </div>
      </div>

      {/* ==================== RESULT COUNT ==================== */}

      <div className="mt-6 flex items-center justify-between">

        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">
            {filtered.length}
          </span>{" "}
          {filtered.length === 1
            ? "product"
            : "products"}{" "}
          found
        </p>

        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="text-sm text-primary hover:underline"
          >
            Clear filters
          </button>
        )}

      </div>

      {/* ==================== PRODUCTS ==================== */}

      <div className="mt-5">

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/60 py-20 text-center">

            <PackageSearch className="size-10 text-muted-foreground" />

            <p className="font-medium">
              No products found
            </p>

            <p className="text-sm text-muted-foreground">
              Try a different search or filter.
            </p>

            <Button
              variant="outline"
              onClick={clearFilters}
            >
              Clear Filters
            </Button>

          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">

            {filtered.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
              />
            ))}

          </div>
        )}

      </div>
    </div>
  );
}