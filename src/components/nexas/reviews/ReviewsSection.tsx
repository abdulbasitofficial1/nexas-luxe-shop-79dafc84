import { useState } from "react";
import { Loader2, MessageSquareQuote } from "lucide-react";
import { StarRating } from "./StarRating";
import { computeStats, reviewImages, useProductReviews } from "@/lib/reviews";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { Review } from "@/lib/types";

function RatingBar({ star, count, total }: { star: number; count: number; total: number }) {
  const pct = total ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-8 shrink-0 text-muted-foreground">{star}★</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right text-muted-foreground">{count}</span>
    </div>
  );
}

function ReviewCard({ review, onImage }: { review: Review; onImage: (src: string) => void }) {
  const imgs = reviewImages(review);
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-elegant">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{review.customerName}</span>
          {review.orderId && (
            <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-medium text-green-400">
              Verified Purchase
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ""}
        </span>
      </div>
      <StarRating value={review.rating} className="mt-2" />
      <p className="mt-2 whitespace-pre-line text-sm text-foreground/90">{review.message}</p>
      {imgs.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {imgs.map((src) => (
            <button key={src} type="button" onClick={() => onImage(src)}>
              <img
                src={src}
                alt="Customer review photo"
                loading="lazy"
                className="size-20 rounded-lg border border-border/60 object-cover transition-transform hover:scale-105"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Full review block for the product details page: stats + list. */
export function ReviewsSection({ productId }: { productId: string }) {
  const { reviews, loading } = useProductReviews(productId);
  const [filter, setFilter] = useState<number | "all">("all");
  const [lightbox, setLightbox] = useState<string | null>(null);

  const stats = computeStats(reviews);
  const visible = filter === "all" ? reviews : reviews.filter((r) => Math.round(r.rating) === filter);

  return (
    <section className="mt-16">
      <h2 className="font-display text-2xl font-bold sm:text-3xl">
        Customer <span className="text-gold-gradient">Reviews</span>
      </h2>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-7 animate-spin text-primary" />
        </div>
      ) : stats.total === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 py-12 text-center">
          <MessageSquareQuote className="size-8 text-muted-foreground" />
          <p className="font-medium">No reviews yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Only customers who received this product can leave a review.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-6 rounded-xl border border-border/60 bg-card/60 p-5 sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="text-center sm:pr-6">
              <p className="font-display text-4xl font-bold text-primary">
                {stats.average.toFixed(1)}
              </p>
              <StarRating value={stats.average} className="mt-1 justify-center" />
              <p className="mt-1 text-xs text-muted-foreground">
                {stats.total} review{stats.total > 1 ? "s" : ""}
              </p>
            </div>
            <div className="space-y-1.5">
              {[5, 4, 3, 2, 1].map((s) => (
                <RatingBar key={s} star={s} count={stats.breakdown[s] ?? 0} total={stats.total} />
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {(["all", 5, 4, 3, 2, 1] as const).map((f) => (
              <button
                key={String(f)}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  filter === f
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/60 text-muted-foreground hover:border-primary/50"
                }`}
              >
                {f === "all" ? "All" : `${f} ★`}
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {visible.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reviews with this rating.</p>
            ) : (
              visible.map((r) => <ReviewCard key={r.id} review={r} onImage={setLightbox} />)
            )}
          </div>
        </>
      )}

      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-2xl p-2">
          {lightbox && (
            <img src={lightbox} alt="Review photo" className="max-h-[75vh] w-full rounded-lg object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
