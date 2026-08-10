import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarClock,
  Copy,
  Eye,
  Loader2,
  Plus,
  Rocket,
  ShieldAlert,
  Sparkles,
  Trash2,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useFirebase } from "@/lib/firebase";
import { useUI } from "@/lib/ui-context";
import { useProducts } from "@/lib/store";
import { useEventEngine } from "@/lib/event-context";
import { createEvent, deleteEvent, updateEvent } from "@/lib/events";
import { FlipCountdown } from "@/components/nexas/event/FlipCountdown";
import {
  EVENT_ANIMATIONS,
  EVENT_BACKGROUND_STYLES,
  EVENT_BUTTON_STYLES,
  EVENT_PRESETS,
  PHASE_CLASS,
  PHASE_LABEL,
  getEventPhase,
  makeEmptyEvent,
  slugify,
  type EventInput,
  type StoreEvent,
} from "@/lib/event-types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/events")({
  component: EventsAdmin,
  head: () => ({
    meta: [
      { title: "Smart Event Engine — NexasStore Admin" },
      {
        name: "description",
        content:
          "Schedule sales, configure countdowns, themes and automatic discounts for the NexasStore storefront.",
      },
      { property: "og:title", content: "Smart Event Engine — NexasStore Admin" },
      {
        property: "og:description",
        content: "Schedule sales, countdowns and automatic discounts for NexasStore.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

/** Convert epoch ms <-> value accepted by <input type="datetime-local">. */
function toLocalInput(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): number {
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? Date.now() : ms;
}

function EventsAdmin() {
  const { user, ready } = useFirebase();
  const { openAdminLogin } = useUI();

  if (!ready) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <ShieldAlert className="mx-auto size-12 text-primary" />
        <h1 className="mt-4 font-display text-2xl font-bold">Admin Access Required</h1>
        <p className="mt-2 text-muted-foreground">
          Sign in as an administrator to manage store events.
        </p>
        <Button variant="gold" className="mt-6" onClick={openAdminLogin}>
          Admin Login
        </Button>
      </div>
    );
  }

  return <EventsPanel />;
}

function EventsPanel() {
  const { db } = useFirebase();
  const { events, loading, now, previewEventId, setPreviewEventId } = useEventEngine();
  const { products } = useProducts();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StoreEvent | null>(null);
  const [draft, setDraft] = useState<EventInput>(() => makeEmptyEvent());

  const stats = useMemo(() => {
    const phases = events.map((e) => getEventPhase(e, now));
    return {
      total: events.length,
      live: phases.filter((p) => p === "live").length,
      upcoming: phases.filter((p) => p === "scheduled" || p === "countdown").length,
      expired: phases.filter((p) => p === "expired").length,
    };
  }, [events, now]);

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category))).filter(Boolean).sort(),
    [products],
  );

  const openCreate = () => {
    setEditing(null);
    setDraft(makeEmptyEvent());
    setDialogOpen(true);
  };

  const openEdit = (event: StoreEvent) => {
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = event;
    setEditing(event);
    setDraft({ ...rest, discount: { ...rest.discount }, theme: { ...rest.theme } });
    setDialogOpen(true);
  };

  const duplicate = async (event: StoreEvent) => {
    if (!db) return;
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = event;
    await createEvent(db, {
      ...rest,
      name: `${rest.name} (Copy)`,
      slug: slugify(`${rest.name}-copy`),
      status: "draft",
      enabled: false,
    });
    toast.success("Event duplicated as a draft");
  };

  const save = async () => {
    if (!db) return toast.error("Store not connected.");
    if (!draft.name.trim()) return toast.error("Event name is required.");
    if (draft.saleEndAt <= draft.saleStartAt)
      return toast.error("Sale end must be after the sale start.");
    if (draft.countdownStartAt > draft.saleStartAt)
      return toast.error("Countdown must begin before the sale starts.");
    if (draft.discount.value <= 0) return toast.error("Discount value must be greater than 0.");

    const payload: EventInput = {
      ...draft,
      name: draft.name.trim(),
      slug: draft.slug.trim() || slugify(draft.name),
    };

    try {
      if (editing) {
        await updateEvent(db, editing.id, payload);
        toast.success("Event updated");
      } else {
        await createEvent(db, payload);
        toast.success("Event created");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Could not save the event.");
    }
  };

  const setStatus = async (event: StoreEvent, status: StoreEvent["status"], enabled: boolean) => {
    if (!db) return;
    await updateEvent(db, event.id, { status, enabled });
    toast.success(`Event ${status === "cancelled" ? "cancelled" : enabled ? "activated" : "paused"}`);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="mb-6 text-muted-foreground">
        <Link to="/admin">
          <ArrowLeft className="size-4" /> Back to dashboard
        </Link>
      </Button>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">
            Smart <span className="text-gold-gradient">Event Engine</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Schedule sales once — countdowns, themes, discounts and launches run automatically.
          </p>
        </div>
        <Button variant="gold" onClick={openCreate}>
          <Plus className="size-4" /> New Event
        </Button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Events" value={stats.total} icon={CalendarClock} />
        <StatCard label="Live Now" value={stats.live} icon={Rocket} />
        <StatCard label="Upcoming" value={stats.upcoming} icon={Sparkles} />
        <StatCard label="Expired" value={stats.expired} icon={CalendarClock} />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : events.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border/70 p-14 text-center">
          <Sparkles className="mx-auto size-10 text-primary" />
          <p className="mt-3 font-semibold">No events yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first scheduled sale to activate the engine.
          </p>
          <Button variant="gold" className="mt-6" onClick={openCreate}>
            <Plus className="size-4" /> Create Event
          </Button>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {events.map((event) => {
            const phase = getEventPhase(event, now);
            const target = phase === "live" ? event.saleEndAt : event.saleStartAt;
            const affected = products.filter((p) => {
              const d = event.discount;
              if (d.applyTo === "all") return true;
              if (d.applyTo === "categories") return d.categories.includes(p.category);
              return d.productIds.includes(p.id);
            }).length;

            return (
              <div
                key={event.id}
                className="rounded-2xl border border-border/60 bg-card p-5 shadow-elegant"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-xl font-bold">{event.name}</h2>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          PHASE_CLASS[phase],
                        )}
                      >
                        {PHASE_LABEL[phase]}
                      </span>
                      {previewEventId === event.id && (
                        <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
                          Previewing
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{event.subtitle}</p>
                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        Countdown: {new Date(event.countdownStartAt).toLocaleString()}
                      </span>
                      <span>Starts: {new Date(event.saleStartAt).toLocaleString()}</span>
                      <span>Ends: {new Date(event.saleEndAt).toLocaleString()}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary">
                        {event.discount.type === "percentage"
                          ? `${event.discount.value}% off`
                          : `Rs ${event.discount.value} off`}
                      </span>
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-muted-foreground">
                        {affected} product{affected === 1 ? "" : "s"} affected
                      </span>
                      <span className="flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-muted-foreground">
                        <span
                          className="size-3 rounded-full"
                          style={{ background: event.theme.primary }}
                        />
                        {event.theme.animation}
                      </span>
                    </div>
                  </div>

                  {(phase === "live" || phase === "countdown") && (
                    <div className="rounded-xl bg-black/40 p-3">
                      <p className="mb-2 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
                        {phase === "live" ? "Ends in" : "Starts in"}
                      </p>
                      <FlipCountdown
                        target={target}
                        now={now}
                        accent={event.theme.accent}
                        size="sm"
                      />
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
                  <Button size="sm" variant="goldOutline" onClick={() => openEdit(event)}>
                    <Pencil className="size-4" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setPreviewEventId(previewEventId === event.id ? null : event.id)
                    }
                  >
                    <Eye className="size-4" />
                    {previewEventId === event.id ? "Stop Preview" : "Preview"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => duplicate(event)}>
                    <Copy className="size-4" /> Duplicate
                  </Button>

                  {event.status !== "cancelled" && (
                    <Button
                      size="sm"
                      variant={event.enabled ? "outline" : "gold"}
                      onClick={() =>
                        setStatus(event, event.enabled ? "draft" : "scheduled", !event.enabled)
                      }
                    >
                      {event.enabled ? "Pause" : "Activate"}
                    </Button>
                  )}

                  {event.status === "cancelled" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setStatus(event, "scheduled", true)}
                    >
                      Restore
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setStatus(event, "cancelled", false)}
                    >
                      Cancel
                    </Button>
                  )}

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive" className="ml-auto">
                        <Trash2 className="size-4" /> Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this event?</AlertDialogTitle>
                        <AlertDialogDescription>
                          "{event.name}" will be permanently removed. Product prices are never
                          modified, so nothing else changes.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            if (!db) return;
                            if (previewEventId === event.id) setPreviewEventId(null);
                            await deleteEvent(db, event.id);
                            toast.success("Event deleted");
                          }}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <EventFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        draft={draft}
        setDraft={setDraft}
        categories={categories}
        products={products.map((p) => ({ id: p.id, name: p.name }))}
        editing={Boolean(editing)}
        onSave={save}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Rocket;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className="size-4 text-primary" />
      </div>
      <p className="mt-2 font-display text-3xl font-bold text-gold-gradient">{value}</p>
    </div>
  );
}

interface FormProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  draft: EventInput;
  setDraft: (v: EventInput) => void;
  categories: string[];
  products: { id: string; name: string }[];
  editing: boolean;
  onSave: () => void;
}

function EventFormDialog({
  open,
  onOpenChange,
  draft,
  setDraft,
  categories,
  products,
  editing,
  onSave,
}: FormProps) {
  const patch = (partial: Partial<EventInput>) => setDraft({ ...draft, ...partial });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Event" : "Create Event"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Presets */}
          <div>
            <Label>Quick preset</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {EVENT_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() =>
                    patch({
                      name: draft.name || preset.label,
                      subtitle: preset.subtitle,
                      theme: { ...preset.theme },
                    })
                  }
                  className="flex items-center gap-2 rounded-full border border-border/60 px-3 py-1.5 text-xs transition-colors hover:border-primary"
                >
                  <span
                    className="size-3 rounded-full"
                    style={{ background: preset.theme.primary }}
                  />
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="ev-name">Event name</Label>
              <Input
                id="ev-name"
                value={draft.name}
                maxLength={80}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder="Eid ul Fitr Mega Sale"
              />
            </div>
            <div>
              <Label htmlFor="ev-slug">Slug</Label>
              <Input
                id="ev-slug"
                value={draft.slug}
                maxLength={80}
                onChange={(e) => patch({ slug: slugify(e.target.value) })}
                placeholder="eid-ul-fitr-mega-sale"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="ev-sub">Subtitle</Label>
            <Input
              id="ev-sub"
              value={draft.subtitle}
              maxLength={140}
              onChange={(e) => patch({ subtitle: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="ev-desc">Description</Label>
            <Textarea
              id="ev-desc"
              value={draft.description}
              maxLength={500}
              rows={3}
              onChange={(e) => patch({ description: e.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="ev-banner">Banner image URL</Label>
              <Input
                id="ev-banner"
                value={draft.bannerImage}
                onChange={(e) => patch({ bannerImage: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="ev-bg">Background image URL</Label>
              <Input
                id="ev-bg"
                value={draft.backgroundImage}
                onChange={(e) => patch({ backgroundImage: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="ev-logo">Logo image URL</Label>
              <Input
                id="ev-logo"
                value={draft.logoImage}
                onChange={(e) => patch({ logoImage: e.target.value })}
              />
            </div>
          </div>

          {/* Schedule */}
          <div className="rounded-xl border border-border/60 p-4">
            <p className="mb-3 text-sm font-semibold">Schedule</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="ev-cd">Countdown starts</Label>
                <Input
                  id="ev-cd"
                  type="datetime-local"
                  value={toLocalInput(draft.countdownStartAt)}
                  onChange={(e) => patch({ countdownStartAt: fromLocalInput(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="ev-start">Sale starts</Label>
                <Input
                  id="ev-start"
                  type="datetime-local"
                  value={toLocalInput(draft.saleStartAt)}
                  onChange={(e) => patch({ saleStartAt: fromLocalInput(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="ev-end">Sale ends</Label>
                <Input
                  id="ev-end"
                  type="datetime-local"
                  value={toLocalInput(draft.saleEndAt)}
                  onChange={(e) => patch({ saleEndAt: fromLocalInput(e.target.value) })}
                />
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              The sale launches and ends by itself at these times — no manual action needed.
            </p>
          </div>

          {/* Discount */}
          <div className="rounded-xl border border-border/60 p-4">
            <p className="mb-3 text-sm font-semibold">Discount rules</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Type</Label>
                <Select
                  value={draft.discount.type}
                  onValueChange={(v) =>
                    patch({ discount: { ...draft.discount, type: v as "percentage" | "fixed" } })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed amount (Rs)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="ev-val">Value</Label>
                <Input
                  id="ev-val"
                  type="number"
                  min={1}
                  value={draft.discount.value}
                  onChange={(e) =>
                    patch({
                      discount: { ...draft.discount, value: Number(e.target.value) || 0 },
                    })
                  }
                />
              </div>
              <div>
                <Label>Apply to</Label>
                <Select
                  value={draft.discount.applyTo}
                  onValueChange={(v) =>
                    patch({
                      discount: {
                        ...draft.discount,
                        applyTo: v as "all" | "categories" | "products",
                      },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All products</SelectItem>
                    <SelectItem value="categories">Selected categories</SelectItem>
                    <SelectItem value="products">Selected products</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {draft.discount.applyTo === "categories" && (
              <div className="mt-4 flex flex-wrap gap-2">
                {categories.length === 0 && (
                  <p className="text-xs text-muted-foreground">No categories yet.</p>
                )}
                {categories.map((c) => {
                  const on = draft.discount.categories.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() =>
                        patch({
                          discount: {
                            ...draft.discount,
                            categories: on
                              ? draft.discount.categories.filter((x) => x !== c)
                              : [...draft.discount.categories, c],
                          },
                        })
                      }
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs transition-colors",
                        on
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border/60 text-muted-foreground",
                      )}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            )}

            {draft.discount.applyTo === "products" && (
              <div className="mt-4 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border/60 p-2">
                {products.length === 0 && (
                  <p className="text-xs text-muted-foreground">No products yet.</p>
                )}
                {products.map((p) => {
                  const on = draft.discount.productIds.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-secondary/50"
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          patch({
                            discount: {
                              ...draft.discount,
                              productIds: on
                                ? draft.discount.productIds.filter((x) => x !== p.id)
                                : [...draft.discount.productIds, p.id],
                            },
                          })
                        }
                      />
                      <span className="truncate">{p.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Theme */}
          <div className="rounded-xl border border-border/60 p-4">
            <p className="mb-3 text-sm font-semibold">Theme</p>
            <div className="grid gap-4 sm:grid-cols-3">
              {(["primary", "secondary", "accent"] as const).map((key) => (
                <div key={key}>
                  <Label htmlFor={`ev-${key}`} className="capitalize">
                    {key} colour
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      id={`ev-${key}`}
                      type="color"
                      value={draft.theme[key]}
                      onChange={(e) =>
                        patch({ theme: { ...draft.theme, [key]: e.target.value } })
                      }
                      className="h-9 w-12 cursor-pointer rounded border border-border/60 bg-transparent"
                    />
                    <Input
                      value={draft.theme[key]}
                      onChange={(e) =>
                        patch({ theme: { ...draft.theme, [key]: e.target.value } })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Button style</Label>
                <Select
                  value={draft.theme.buttonStyle}
                  onValueChange={(v) =>
                    patch({
                      theme: { ...draft.theme, buttonStyle: v as (typeof EVENT_BUTTON_STYLES)[number] },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_BUTTON_STYLES.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Background style</Label>
                <Select
                  value={draft.theme.backgroundStyle}
                  onValueChange={(v) =>
                    patch({
                      theme: {
                        ...draft.theme,
                        backgroundStyle: v as (typeof EVENT_BACKGROUND_STYLES)[number],
                      },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_BACKGROUND_STYLES.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Celebration animation</Label>
                <Select
                  value={draft.theme.animation}
                  onValueChange={(v) =>
                    patch({
                      theme: { ...draft.theme, animation: v as (typeof EVENT_ANIMATIONS)[number] },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_ANIMATIONS.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/60 p-4">
            <div>
              <p className="text-sm font-semibold">Activate this event</p>
              <p className="text-xs text-muted-foreground">
                When on, the storefront follows the schedule automatically.
              </p>
            </div>
            <Switch
              checked={draft.enabled}
              onCheckedChange={(v) =>
                patch({ enabled: v, status: v ? "scheduled" : "draft" })
              }
            />
          </div>

          <div className="flex justify-end gap-2 pb-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="gold" onClick={onSave}>
              {editing ? "Save changes" : "Create event"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
