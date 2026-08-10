import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProducts } from "@/lib/store";
import { useSellerChatFromAI } from "@/hooks/useSellerChatFromAI";
import { AIAssistantPanel } from "./AIAssistantPanel";

export function NexasAI() {
  const { products, loading } = useProducts();
  const [open, setOpen] = useState(false);
  const { onChatWithSeller, chatModal } = useSellerChatFromAI({ products });

  if (loading) {
    return null;
  }

  return (
    <>
      <AIAssistantPanel
        open={open}
        onOpenChange={setOpen}
        products={products}
        onChatWithSeller={onChatWithSeller}
      />

      {chatModal}

      {!open && (
        <Button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open Nexas AI"
          className="
            fixed bottom-20 right-4 z-50
            size-14 rounded-full
            border border-yellow-500/40
            bg-black text-yellow-400
            shadow-[0_0_25px_rgba(234,179,8,0.30)]
            transition-all duration-300
            hover:scale-110
            hover:bg-black
            hover:text-yellow-300
            sm:bottom-6 sm:right-6 sm:size-16
          "
        >
          <span className="relative flex items-center justify-center">
            <MessageCircle className="size-6 sm:size-7" />
            <span
              className="
                absolute -right-1 -top-1
                size-3 rounded-full
                border-2 border-black
                bg-yellow-400
              "
            />
          </span>
        </Button>
      )}
    </>
  );
}
