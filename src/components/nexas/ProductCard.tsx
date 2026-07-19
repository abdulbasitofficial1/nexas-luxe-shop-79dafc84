import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Heart, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderModal } from "./OrderModal";
import { useCart } from "@/lib/cart-context";
import { useFirebase } from "@/lib/firebase";
import { addToWishlist, removeFromWishlist, useWishlist } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { db, user } = useFirebase();
  const { items } = useWishlist();
  const [orderOpen, setOrderOpen] = useState(false);

  const inWishlist = items.some((i) => i.id === product.id);

  const toggleWishlist = async () => {
    if (!user || !db) {
      toast.error("Please login to save items to your wishlist.");
      return;
    }
    try {
      if (inWishlist) {
        await removeFromWishlist(db, user.uid, product.id);
        toast.success("Removed from wishlist");
      } else {
        await addToWishlist(db, user.uid, {
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
        });
        toast.success("Added to wishlist");
      }
    } catch {
      toast.error("Failed to update wishlist");
    }
  };

  return (
    <>
      <div className="group flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-elegant transition-all duration-300 hover:-translate-y-1 hover:border-primary/50">
        <Link
  to="/products/$productId"
  params={{ productId: product.id }}
  className="relative block aspect-square overflow-hidden bg-secondary/40"
>
  <div className="absolute left-3 top-12 z-10 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white shadow-lg">
    🔥 SALE
  </div>

  <img
    src={product.image}
    alt={product.name}
    loading="lazy"
    className="size-full object-cover transition-transform duration-500 group-hover:scale-110"
  />

  <span className="absolute left-3 top-3 rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-primary backdrop-blur">
    {product.category}
  </span>
</Link>

        <button
          type="button"
          aria-label="Toggle wishlist"
          onClick={toggleWishlist}
          className="absolute right-3 top-3 z-10 hidden"
        />

        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <Link to="/products/$productId" params={{ productId: product.id }} className="min-w-0">
              <h3 className="line-clamp-1 font-display text-lg font-semibold transition-colors hover:text-primary">
                {product.name}
              </h3>
            </Link>
            <button
              type="button"
              onClick={toggleWishlist}
              aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
              className={cn(
                "shrink-0 rounded-full p-1.5 transition-colors",
                inWishlist ? "text-primary" : "text-muted-foreground hover:text-primary",
              )}
            >
              <Heart className={cn("size-5", inWishlist && "fill-current")} />
            </button>
          </div>
          <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
          <p className="mt-auto text-xl font-bold text-gold-gradient">
            Rs {product.price.toLocaleString()}
          </p>

          <div className="flex gap-2">
            <Button
              variant="goldOutline"
              size="sm"
              className="flex-1"
              onClick={() => {
                addItem(product);
                toast.success(`${product.name} added to cart`);
              }}
            >
              <ShoppingCart className="size-4" />
              Add
            </Button>
            <Button variant="gold" size="sm" className="flex-1" onClick={() => setOrderOpen(true)}>
              Place Order
            </Button>
          </div>
        </div>
      </div>

      <OrderModal product={product} open={orderOpen} onOpenChange={setOrderOpen} />
    </>
  );
}
