import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, MessageSquareQuote, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/nexas/reviews/StarRating";
import { reviewImages } from "@/lib/reviews";
import { useReviews } from "@/lib/store";

/**
 * Homepage testimonials — shows the newest verified-buyer reviews.
 * Reviews can only be written by customers from a delivered order, so the
 * submission form lives in the account area instead of here.
 */
export function Reviews() {
  const { reviews, loading } = useReviews(true);

  const latest = useMemo(
    () => [...reviews].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)).slice(0, 6),
    [reviews],
  );

  const average = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  }, [reviews]);

  return (
    <section id="reviews" className="scroll-mt-20 border-y border-border/60 bg-card/40">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            Customer <span className="text-gold-gradient">Reviews</span>
          </h2>
          <p className="mt-3 text-muted-foreground">
            Real feedback from customers who received their orders.
          </p>

          {reviews.length > 0 && (
            <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-primary/30 bg-primary/5 px-5 py-2.5">
              <span className="font-display text-2xl font-bold text-primary">
                {average.toFixed(1)}
              </span>
              <StarRating value={average} />
              <span className="text-sm text-muted-foreground">
                ({reviews.length} review{reviews.length > 1 ? "s" : ""})
              </span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : latest.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/60 py-16 text-center">
            <MessageSquareQuote className="size-10 text-muted-foreground" />
            <p className="font-medium">No reviews yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Place an order and share your experience once it arrives.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {latest.map((r) => {
              const imgs = reviewImages(r);
              return (
                <div
                  key={r.id}
                  className="flex flex-col rounded-xl border border-border/60 bg-card p-5 shadow-elegant"
                >
                  <StarRating value={r.rating} />
                  <p className="mt-3 flex-1 text-sm text-foreground/90">
                    &ldquo;{r.message}&rdquo;
                  </p>
                  {imgs.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {imgs.slice(0, 3).map((src) => (
                        <img
                          key={src}
                          src={src}
                          alt="Customer photo"
                          loading="lazy"
                          className="size-14 rounded-lg border border-border/60 object-cover"
                        />
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-semibold">{r.customerName}</span>
                    <span className="text-xs text-muted-foreground">
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""}
                    </span>
                  </div>
                  {r.productName && (
                    <span className="mt-1 truncate text-xs text-primary">{r.productName}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="size-4 text-primary" />
            Only verified buyers can post a review.
          </p>
          <Button asChild variant="goldOutline">
            <Link to="/account">Review your order</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
