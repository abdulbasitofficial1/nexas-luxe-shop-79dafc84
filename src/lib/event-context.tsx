import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useEvents, useNow } from "./events";
import {
  getEventPhase,
  getEventPricing,
  type EventPhase,
  type EventPricing,
  type StoreEvent,
} from "./event-types";
import type { Product } from "./types";

const PREVIEW_KEY = "nexas-event-preview";

interface EventContextValue {
  now: number;
  events: StoreEvent[];
  loading: boolean;
  /** The event currently driving the storefront (live, else nearest countdown). */
  activeEvent: StoreEvent | null;
  phase: EventPhase | null;
  /** True while the storefront is being previewed by an admin. */
  previewing: boolean;
  previewEventId: string | null;
  setPreviewEventId: (id: string | null) => void;
  /** Discounted pricing for a product under the active event, or null. */
  priceFor: (product: Pick<Product, "id" | "price" | "category">) => EventPricing | null;
  /** Fires once when a scheduled sale flips from countdown to live. */
  justLaunched: StoreEvent | null;
  dismissLaunch: () => void;
}

const EventContext = createContext<EventContextValue | undefined>(undefined);

export function EventProvider({ children }: { children: ReactNode }) {
  const { events, loading } = useEvents();
  const now = useNow(1000);
  const [previewEventId, setPreviewIdState] = useState<string | null>(null);
  const [justLaunched, setJustLaunched] = useState<StoreEvent | null>(null);
  const prevPhaseRef = useRef<Record<string, EventPhase>>({});

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PREVIEW_KEY);
      if (raw) setPreviewIdState(raw);
    } catch {
      /* ignore */
    }
  }, []);

  const setPreviewEventId = useCallback((id: string | null) => {
    setPreviewIdState(id);
    try {
      if (id) sessionStorage.setItem(PREVIEW_KEY, id);
      else sessionStorage.removeItem(PREVIEW_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const previewEvent = useMemo(
    () => (previewEventId ? (events.find((e) => e.id === previewEventId) ?? null) : null),
    [events, previewEventId],
  );

  /** Auto-selected event: a live sale wins, otherwise the soonest countdown. */
  const scheduledEvent = useMemo(() => {
    const live = events
      .filter((e) => getEventPhase(e, now) === "live")
      .sort((a, b) => b.saleStartAt - a.saleStartAt);
    if (live.length) return live[0]!;

    const counting = events
      .filter((e) => getEventPhase(e, now) === "countdown")
      .sort((a, b) => a.saleStartAt - b.saleStartAt);
    return counting[0] ?? null;
    // `now` only matters at second granularity for phase flips
  }, [events, now]);

  const activeEvent = previewEvent ?? scheduledEvent;
  const phase = activeEvent ? getEventPhase(activeEvent, now) : null;

  // Detect the countdown -> live transition so the sale launches itself.
  useEffect(() => {
    events.forEach((e) => {
      const current = getEventPhase(e, now);
      const previous = prevPhaseRef.current[e.id];
      if (previous === "countdown" && current === "live") {
        setJustLaunched(e);
      }
      prevPhaseRef.current[e.id] = current;
    });
  }, [events, now]);

  const priceFor = useCallback(
    (product: Pick<Product, "id" | "price" | "category">) =>
      getEventPricing(activeEvent, product, now, { force: Boolean(previewEvent) }),
    [activeEvent, now, previewEvent],
  );

  const value = useMemo<EventContextValue>(
    () => ({
      now,
      events,
      loading,
      activeEvent,
      phase,
      previewing: Boolean(previewEvent),
      previewEventId,
      setPreviewEventId,
      priceFor,
      justLaunched,
      dismissLaunch: () => setJustLaunched(null),
    }),
    [
      now,
      events,
      loading,
      activeEvent,
      phase,
      previewEvent,
      previewEventId,
      setPreviewEventId,
      priceFor,
      justLaunched,
    ],
  );

  return <EventContext.Provider value={value}>{children}</EventContext.Provider>;
}

export function useEventEngine() {
  const ctx = useContext(EventContext);
  if (!ctx) throw new Error("useEventEngine must be used within EventProvider");
  return ctx;
}

/** Safe variant for components that may render outside the provider. */
export function useOptionalEventEngine() {
  return useContext(EventContext);
}
