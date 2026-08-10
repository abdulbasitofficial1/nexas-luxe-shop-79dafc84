import { useState } from "react";
import { getProductImageUrls } from "@/lib/product-display";
import type { Product } from "@/lib/types";

interface AIProductImageProps {
  product: Product;
  className?: string;
  alt?: string;
}

/** Product thumbnail with automatic fallback through all catalog images. */
export function AIProductImage({
  product,
  className = "h-full w-full object-cover",
  alt,
}: AIProductImageProps) {
  const imageUrls = getProductImageUrls(product);
  const [index, setIndex] = useState(0);
  const [exhausted, setExhausted] = useState(false);

  const currentUrl = imageUrls[index];

  if (!currentUrl || exhausted) {
    return (
      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
        No Image
      </div>
    );
  }

  return (
    <img
      src={currentUrl}
      alt={alt ?? product.name}
      loading="lazy"
      className={className}
      onError={() => {
        setIndex((previous) => {
          const next = previous + 1;
          if (next < imageUrls.length) return next;
          setExhausted(true);
          return previous;
        });
      }}
    />
  );
}
