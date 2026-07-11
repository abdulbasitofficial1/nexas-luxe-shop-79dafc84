import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, MessageSquareQuote, Send, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useFirebase } from "@/lib/firebase";
import { submitReview, useReviews } from "@/lib/store";

function Stars({
  value,
  size = "size-4",
  className = "",
}: {
  value: number;
  size?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-0.5 ${className}`} aria-label={`${value} out of 5 stars`}>
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

function RatingPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          aria-label={`Rate ${i} star${i > 1 ? "s" : ""}`}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={`size-7 ${
              i <= active ? "fill-primary text-primary" : "fill-transparent text-muted-foreground/40"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export function Reviews() {
  const { db } = useFirebase();
  const { reviews, loading } = useReviews(true);
  const [form, setForm] = useState({ customerName: "", rating: 0, message: "" });
  const [saving, setSaving] = useState(false);

  const average = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  }, [reviews]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName.trim() || !form.message.trim()) {
      toast.error("Please enter your name and review.");
      return;
    }
    if (form.rating < 1) {
      toast.error("Please select a star rating.");
      return;
    }
    if (!db) {
      toast.error("Store not connected.");
      return;
    }
    setSaving(true);
    try {
      await submitReview(db, {
        customerName: form.customerName.trim(),
        rating: form.rating,
        message: form.message.trim(),
      });
      toast.success("Thank you! Your review will appear once approved.");
      setForm({ customerName: "", rating: 0, message: "" });
    } catch {
      toast.error("Could not submit review. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section id="reviews" className="bg-card/40 scroll-mt-20 border-y border-border/60">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            Customer <span className="text-gold-gradient">Reviews</span>
          </h2>
          <p className="mt-3 text-muted-foreground">
            What our customers say about their NexasStore experience.
          </p>

          {reviews.length > 0 && (
            <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-primary/30 bg-primary/5 px-5 py-2.5">
              <span className="font-display text-2xl font-bold text-primary">
                {average.toFixed(1)}
              </span>
              <Stars value={average} />
              <span className="text-sm text-muted-foreground">
                ({reviews.length} review{reviews.length > 1 ? "s" : ""})
              </span>
            </div>
          )}
        </div>

        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          {/* Reviews list */}
          <div>
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="size-8 animate-spin text-primary" />
              </div>
            ) : reviews.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/60 py-16 text-center">
                <MessageSquareQuote className="size-10 text-muted-foreground" />
                <p className="font-medium">No reviews yet</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Be the first to share your experience with NexasStore.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {reviews.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-col rounded-xl border border-border/60 bg-card p-5 shadow-elegant"
                  >
                    <Stars value={r.rating} />
                    <p className="mt-3 flex-1 text-sm text-foreground/90">&ldquo;{r.message}&rdquo;</p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="font-semibold">{r.customerName}</span>
                      <span className="text-xs text-muted-foreground">
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit form */}
          <form
            onSubmit={submit}
            className="h-fit space-y-4 rounded-xl border border-border/60 bg-card p-6 shadow-elegant"
          >
            <h3 className="font-display text-xl font-semibold">Write a Review</h3>
            <div className="space-y-1.5">
              <Label htmlFor="r-name">Your Name</Label>
              <Input
                id="r-name"
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                placeholder="Your name"
                maxLength={60}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Rating</Label>
              <RatingPicker value={form.rating} onChange={(v) => setForm({ ...form, rating: v })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-msg">Your Review</Label>
              <Textarea
                id="r-msg"
                rows={4}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Share your experience..."
                maxLength={500}
              />
            </div>
            <Button type="submit" variant="gold" className="w-full" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Submit Review
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
