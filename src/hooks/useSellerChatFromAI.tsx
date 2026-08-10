import { useCallback, useMemo, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { toast } from "sonner";

import { ChatModal } from "@/components/nexas/ChatModal";
import { cleanProductImageUrl } from "@/lib/product-display";
import type { Product } from "@/lib/types";

interface UseSellerChatFromAIOptions {
  products: Product[];
  currentProductId?: string;
}

export function useSellerChatFromAI({
  products,
  currentProductId,
}: UseSellerChatFromAIOptions) {
  const params = useParams({ strict: false });
  const routeProductId =
    typeof params.productId === "string" ? params.productId : undefined;

  const [chatOpen, setChatOpen] = useState(false);
  const [chatProductId, setChatProductId] = useState<string | undefined>();

  const chatProduct = useMemo(() => {
    const targetId =
      chatProductId ?? currentProductId ?? routeProductId;

    if (targetId) {
      const matched = products.find((product) => product.id === targetId);
      if (matched) return matched;
    }

    return products[0] ?? null;
  }, [chatProductId, currentProductId, routeProductId, products]);

  const onChatWithSeller = useCallback(
    (productId?: string) => {
      const resolvedId =
        productId ?? currentProductId ?? routeProductId ?? products[0]?.id;

      if (!resolvedId) {
        toast.error("No products available to start seller chat.");
        return;
      }

      const product = products.find((item) => item.id === resolvedId);
      if (!product) {
        toast.error("Product not found. Please try again.");
        return;
      }

      setChatProductId(resolvedId);
      setChatOpen(true);
    },
    [currentProductId, routeProductId, products],
  );

  const chatModal = (
    <ChatModal
      open={chatOpen}
      onOpenChange={setChatOpen}
      product={
        chatProduct
          ? {
              id: chatProduct.id,
              name: chatProduct.name,
              image: cleanProductImageUrl(chatProduct.image),
            }
          : null
      }
    />
  );

  return {
    onChatWithSeller,
    chatModal,
  };
}
