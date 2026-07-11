import { MessageCircle } from "lucide-react";
import { WHATSAPP_INTL, WHATSAPP_NUMBER } from "@/lib/types";

export function CancellationNotice() {
  return (
    <div className="bg-gold-gradient text-primary-foreground">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-2 text-center text-xs font-medium sm:text-sm">
        <span>To cancel your order, contact us on WhatsApp:</span>
        <a
          href={`https://wa.me/${WHATSAPP_INTL}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-0.5 font-semibold underline-offset-2 transition-colors hover:bg-black/30"
        >
          <MessageCircle className="size-3.5" />
          {WHATSAPP_NUMBER}
        </a>
      </div>
    </div>
  );
}
