import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderModal } from "./OrderModal";
import { useCart } from "@/lib/cart-context";
import type { Product } from "@/lib/types";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [orderOpen, setOrderOpen] = useState(false);

  return (
    <>
      <div className="group flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-elegant transition-all duration-300 hover:-translate-y-1 hover:border-primary/50">
        <Link
          to="/products/$productId"
          params={{ productId: product.id }}
          className="relative block aspect-square overflow-hidden bg-secondary/40"
        >
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><rect width='100%25' height='100%25' fill='%23222'/><text x='50%25' y='50%25' fill='%23888' font-size='20' text-anchor='middle' dominant-baseline='middle'>No Image</text></svg>";
            }}
          />
          <span className="absolute left-3 top-3 rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-primary backdrop-blur">
            {product.category}
          </span>
        </Link>

        <div className="flex flex-1 flex-col gap-3 p-4">
          <Link to="/products/$productId" params={{ productId: product.id }}>
            <h3 className="line-clamp-1 font-display text-lg font-semibold transition-colors hover:text-primary">
              {product.name}
            </h3>
          </Link>
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
