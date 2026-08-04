import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StarPicker } from "./StarRating";
import { useFirebase } from "@/lib/firebase";
import {
  MAX_REVIEW_IMAGES,
  deleteOwnReview,
  reviewImages,
  submitProductReview,
  updateOwnReview,
  uploadReviewImages,
  validateReviewImage,
} from "@/lib/reviews";
import type { Order, Review } from "@/lib/types";

interface Props {
  order: Order | null;
  /** Existing review for this order, if the customer already wrote one. */
  existing?: Review | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Write / edit / delete a review for a delivered order. */
export function ReviewDialog({ order, existing, open, onOpenChange }: Props) {
  const { db, storage, user } = useFirebase();
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const [keptImages, setKeptImages] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setRating(existing?.rating ?? 5);
    setMessage(existing?.message ?? "");
    setKeptImages(existing ? reviewImages(existing) : []);
    setFiles([]);
    setProgress(null);
  }, [open, existing]);

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p)), [previews]);

  const totalImages = keptImages.length + files.length;

  const pickFiles = (list: FileList | null) => {
    if (!list) return;
    const next: File[] = [];
    for (const file of Array.from(list)) {
      const error = validateReviewImage(file);
      if (error) {
        toast.error(error);
        continue;
      }
      if (keptImages.length + files.length + next.length >= MAX_REVIEW_IMAGES) {
        toast.error(`You can attach up to ${MAX_REVIEW_IMAGES} photos.`);
        break;
      }
      next.push(file);
    }
    if (next.length) setFiles((f) => [...f, ...next]);
  };

  const save = async () => {
    if (!db || !order) return;
    if (!user) {
      toast.error("Please sign in to write a review.");
      return;
    }
    if (rating < 1) {
      toast.error("Please select a star rating.");
      return;
    }
    if (!message.trim()) {
      toast.error("Please write your review.");
      return;
    }
    const productId = order.productId?.trim();
    if (!productId && !existing) {
      toast.error("This older order isn't linked to a product, so it can't be reviewed.");
      return;
    }

    setSaving(true);
    try {
      let uploaded: string[] = [];
      if (files.length) {
        if (!storage) throw new Error("Image uploads are unavailable right now.");
        setProgress(`Uploading 0/${files.length} photos…`);
        uploaded = await uploadReviewImages(storage, user.uid, files, (done, total) =>
          setProgress(`Uploading ${done}/${total} photos…`),
        );
      }
      const images = [...keptImages, ...uploaded].slice(0, MAX_REVIEW_IMAGES);

      if (existing) {
        await updateOwnReview(db, existing.id, { rating, message, images });
        toast.success("Review updated.");
      } else {
        await submitProductReview(db, {
          productId: productId!,
          productName: order.productName,
          orderId: order.id,
          userId: user.uid,
          customerName: user.displayName || order.customerName || "Customer",
          rating,
          message,
          images,
        });
        toast.success("Thanks! Your review is now live on the product page.");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your review.");
    } finally {
      setSaving(false);
      setProgress(null);
    }
  };

  const remove = async () => {
    if (!db || !existing) return;
    setSaving(true);
    try {
      await deleteOwnReview(db, existing.id);
      toast.success("Review deleted.");
      onOpenChange(false);
    } catch {
      toast.error("Could not delete your review.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit your review" : "Write a review"}</DialogTitle>
          <DialogDescription>{order?.productName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Your Rating</Label>
            <StarPicker value={rating} onChange={setRating} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="review-msg">Your Review</Label>
            <Textarea
              id="review-msg"
              rows={4}
              maxLength={1000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="How was the product quality, fit and delivery?"
            />
            <p className="text-right text-xs text-muted-foreground">{message.length}/1000</p>
          </div>

          <div className="space-y-2">
            <Label>Photos (optional)</Label>
            <div className="flex flex-wrap gap-2">
              {keptImages.map((src) => (
                <div key={src} className="relative">
                  <img src={src} alt="Review" className="size-16 rounded-lg border object-cover" />
                  <button
                    type="button"
                    onClick={() => setKeptImages((k) => k.filter((i) => i !== src))}
                    className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-0.5 text-destructive-foreground"
                    aria-label="Remove photo"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              {previews.map((src, i) => (
                <div key={src} className="relative">
                  <img src={src} alt="Selected" className="size-16 rounded-lg border object-cover" />
                  <button
                    type="button"
                    onClick={() => setFiles((f) => f.filter((_, idx) => idx !== i))}
                    className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-0.5 text-destructive-foreground"
                    aria-label="Remove photo"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              {totalImages < MAX_REVIEW_IMAGES && (
                <label className="flex size-16 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border/60 text-muted-foreground hover:border-primary/50 hover:text-primary">
                  <ImagePlus className="size-5" />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      pickFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Up to {MAX_REVIEW_IMAGES} photos · JPG, PNG or WEBP · max 5MB each
            </p>
            {progress && <p className="text-xs text-primary">{progress}</p>}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {existing ? (
            <Button variant="ghost" className="text-destructive" onClick={remove} disabled={saving}>
              <Trash2 className="size-4" /> Delete
            </Button>
          ) : (
            <span />
          )}
          <Button variant="gold" onClick={save} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {existing ? "Save Changes" : "Submit Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
