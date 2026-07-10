import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { toast } from "sonner";
import { ArrowLeft, Loader2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderModal } from "@/components/nexas/OrderModal";
import { useFirebase } from "@/lib/firebase";
import { useCart } from "@/lib/cart-context";
import type { Product } from "@/lib/types";

export const Route = createFileRoute("/products/$productId")({
  component: ProductDetails,
});

function ProductDetails() {
  const { productId } = useParams({ from: "/products/$productId" });
  const { db, ready } = useFirebase();
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [orderOpen, setOrderOpen] = useState(false);

  useEffect(() => {
    if (!db) {
      if (ready) setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "products", productId));
        if (active) {
          setProduct(snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<Product, "id">) }) : null);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [db, ready, productId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">Product not found</h1>
        <p className="mt-2 text-muted-foreground">This product may have been removed.</p>
        <Button asChild variant="gold" className="mt-6">
          <Link to="/products">Back to shop</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="mb-6 text-muted-foreground">
        <Link to="/products">
          <ArrowLeft className="size-4" /> Back to shop
        </Link>
      </Button>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-secondary/40">
          <img
            src={product.image}
            alt={product.name}
            className="aspect-square w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'><rect width='100%25' height='100%25' fill='%23222'/><text x='50%25' y='50%25' fill='%23888' font-size='24' text-anchor='middle' dominant-baseline='middle'>No Image</text></svg>";
            }}
          />
        </div>

        <div className="flex flex-col">
          <span className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {product.category}
          </span>
          <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl">{product.name}</h1>
          <p className="mt-4 text-3xl font-bold text-gold-gradient">
            Rs {product.price.toLocaleString()}
          </p>
          <p className="mt-6 leading-relaxed text-muted-foreground">{product.description}</p>

          <div className="mt-8 flex items-center gap-4">
            <div className="flex items-center rounded-lg border border-border/60">
              <button
                className="px-4 py-2 text-lg hover:text-primary"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
              >
                −
              </button>
              <span className="w-10 text-center font-medium">{qty}</span>
              <button
                className="px-4 py-2 text-lg hover:text-primary"
                onClick={() => setQty((q) => q + 1)}
              >
                +
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              variant="goldOutline"
              size="lg"
              onClick={() => {
                addItem(product, qty);
                toast.success(`${product.name} added to cart`);
              }}
            >
              <ShoppingCart className="size-4" /> Add to Cart
            </Button>
            <Button variant="gold" size="lg" onClick={() => setOrderOpen(true)}>
              Place Order
            </Button>
          </div>
        </div>
      </div>

      <OrderModal product={product} open={orderOpen} onOpenChange={setOrderOpen} />
    </div>
  );
}
