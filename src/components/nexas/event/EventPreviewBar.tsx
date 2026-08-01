import { Eye, X } from "lucide-react";
import { useOptionalEventEngine } from "@/lib/event-context";

/** Sticky bar shown while an admin previews an event on the live storefront. */
export function EventPreviewBar() {
  const engine = useOptionalEventEngine();
  if (!engine?.previewing || !engine.activeEvent) return null;

  return (
    <div className="sticky top-0 z-[60] flex items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-xs font-semibold text-black">
      <Eye className="size-4" />
      <span>
        Previewing event: <strong>{engine.activeEvent.name}</strong> — visible only to you.
      </span>
      <button
        type="button"
        onClick={() => engine.setPreviewEventId(null)}
        className="inline-flex items-center gap-1 rounded-full bg-black/15 px-2.5 py-1 transition-colors hover:bg-black/25"
      >
        <X className="size-3" /> Exit preview
      </button>
    </div>
  );
}
