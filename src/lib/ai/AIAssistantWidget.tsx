import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Product } from "@/lib/types";
import { AIAssistantPanel } from "./AIAssistantPanel";

interface AIAssistantWidgetProps {
  products: Product[];
  onChatWithSeller?: () => void;
  currentProductId?: string;
}

export function AIAssistantWidget({
  products,
  onChatWithSeller,
  currentProductId,
}: AIAssistantWidgetProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* AI Panel */}
      <AIAssistantPanel
        open={open}
        onOpenChange={setOpen}
        products={products}
        onChatWithSeller={onChatWithSeller}
        currentProductId={currentProductId}
      />

      {/* Floating AI Button */}
      {!open && (
        <Button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open Nexas AI"
          className="
            fixed bottom-5 right-5 z-50
            size-14 rounded-full
            border border-yellow-500/40
            bg-black text-yellow-400
            shadow-[0_0_25px_rgba(234,179,8,0.25)]
            transition-all duration-300
            hover:scale-110
            hover:bg-black
            hover:text-yellow-300
            sm:bottom-6 sm:right-6 sm:size-16
          "
        >
          <span className="relative flex items-center justify-center">
           <Sparkles className="size-6 sm:size-7" />

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

      {/* Close Button */}
      {open && (
        <Button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close Nexas AI"
          className="
            fixed bottom-5 right-5 z-50
            size-14 rounded-full
            border border-yellow-500/40
            bg-black text-yellow-400
            shadow-[0_0_25px_rgba(234,179,8,0.25)]
            transition-all duration-300
            hover:scale-110
            hover:bg-black
            hover:text-yellow-300
            sm:bottom-6 sm:right-6 sm:size-16
          "
        >
          <X className="size-6" />
        </Button>
      )}
    </>
  );
}
