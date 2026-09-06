import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { collection, doc, writeBatch } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFirebase } from "@/lib/firebase";
import { cleanProductImageUrl } from "@/lib/product-display";
import { isStorageUrl } from "@/lib/product-images";
import { uploadProductFile, validateImageFile } from "@/lib/product-upload";
import { ProductImage } from "@/components/nexas/ProductImage";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categories: string[];
}

interface OptionRow {
  name: string;
  values: string;
}

interface FormRow {
  name: string;
  price: string;
  category: string;
  description: string;
  /** Final image URLs (Storage download URLs or pasted https URLs). */
  images: string[];
  /** Pasted-URL input, not yet added to `images`. */
  urlInput: string;
  options: OptionRow[];
  /** In-flight uploads: file name → 0-100. */
  uploads: { name: string; percent: number }[];
}

const COUNTS = [1, 2, 3, 4] as const;
const MAX_PRODUCTS = 4;

const emptyRow = (): FormRow => ({
  name: "",
  price: "",
  category: "",
  description: "",
  images: [],
  urlInput: "",
  options: [],
  uploads: [],
});

export function BulkAddProductsDialog({ open, onOpenChange, categories }: Props) {
  const { db, storage } = useFirebase();
  const [count, setCount] = useState<number | null>(null);
  const [rows, setRows] = useState<FormRow[]>([]);
  const [saving, setSaving] = useState(false);

  const uploading = rows.some((r) => r.uploads.length > 0);

  const reset = () => {
    setCount(null);
    setRows([]);
  };

  const close = (v: boolean) => {
    if (saving || uploading) return;
    if (!v) reset();
    onOpenChange(v);
  };

  const pickCount = (n: number) => {
    setCount(n);
    setRows(Array.from({ length: n }, emptyRow));
  };

  const patch = (i: number, p: Partial<FormRow> | ((r: FormRow) => Partial<FormRow>)) =>
    setRows((rs) =>
      rs.map((r, idx) => (idx === i ? { ...r, ...(typeof p === "function" ? p(r) : p) } : r)),
    );

  const addUrl = (i: number) => {
    const row = rows[i];
    const url = cleanProductImageUrl(row.urlInput);
    if (!url) return toast.error("Enter a valid image URL (https://…).");
    if (url.startsWith("blob:")) return toast.error("Temporary browser links cannot be saved.");
    patch(i, (r) => ({
      images: r.images.includes(url) ? r.images : [...r.images, url],
      urlInput: "",
    }));
  };

  const removeImage = (i: number, url: string) =>
    patch(i, (r) => ({ images: r.images.filter((u) => u !== url) }));

  const handleFiles = async (i: number, files: FileList | null) => {
    if (!files?.length) return;
    if (!storage) return toast.error("Storage not connected.");
    const valid: File[] = [];
    for (const f of Array.from(files)) {
      const err = validateImageFile(f);
      if (err) toast.error(err);
      else valid.push(f);
    }
    if (!valid.length) return;

    patch(i, { uploads: valid.map((f) => ({ name: f.name, percent: 0 })) });
    for (let k = 0; k < valid.length; k++) {
      try {
        const url = await uploadProductFile(storage, valid[k], (percent) =>
          patch(i, (r) => ({
            uploads: r.uploads.map((u, idx) => (idx === k ? { ...u, percent } : u)),
          })),
        );
        patch(i, (r) => ({ images: r.images.includes(url) ? r.images : [...r.images, url] }));
      } catch {
        toast.error(`Failed to upload ${valid[k].name}`);
      }
    }
    patch(i, { uploads: [] });
  };

  const saveAll = async () => {
    if (!db) return toast.error("Store not connected.");
    if (uploading) return toast.error("Please wait for image uploads to finish.");

    // Validate every product before writing anything.
    const payloads: Record<string, unknown>[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const label = `Product ${i + 1}`;
      const name = r.name.trim();
      const category = r.category.trim();
      const price = Number(String(r.price).replace(/[^0-9.]/g, ""));
      const images = r.images.map((u) => cleanProductImageUrl(u)).filter((u) => u && !u.startsWith("blob:"));
      if (!name) return toast.error(`${label}: name is required.`);
      if (!Number.isFinite(price) || price <= 0) return toast.error(`${label}: enter a valid price.`);
      if (!category) return toast.error(`${label}: category is required.`);
      if (!images.length) return toast.error(`${label}: add at least one image.`);
      const options = r.options
        .map((o) => ({
          name: o.name.trim(),
          values: o.values.split(",").map((v) => v.trim()).filter(Boolean),
        }))
        .filter((o) => o.name && o.values.length);
      payloads.push({
        name,
        price,
        category,
        description: r.description.trim(),
        image: images[0],
        images,
        options,
        createdAt: Date.now(),
      });
    }

    setSaving(true);
    try {
      const batch = writeBatch(db);
      const col = collection(db, "products");
      for (const p of payloads) batch.set(doc(col), p);
      await batch.commit();
      toast.success(payloads.length === 1 ? "Product saved" : `${payloads.length} products saved`);
      reset();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save products");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Add Products</DialogTitle>
          <DialogDescription>
            Choose how many products to add (up to {MAX_PRODUCTS}), fill in each one, then save them all
            at once.
          </DialogDescription>
        </DialogHeader>

        <datalist id="bulk-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">How many products?</span>
          {COUNTS.map((n) => (
            <Button
              key={n}
              type="button"
              size="sm"
              variant={count === n ? "gold" : "goldOutline"}
              onClick={() => pickCount(n)}
              disabled={saving || uploading}
            >
              {n}
            </Button>
          ))}
        </div>

        <div className="space-y-4">
          {rows.map((row, i) => (
            <ProductRowForm
              key={i}
              index={i}
              row={row}
              disabled={saving}
              onChange={(p) => patch(i, p)}
              onAddUrl={() => addUrl(i)}
              onRemoveImage={(u) => removeImage(i, u)}
              onFiles={(f) => handleFiles(i, f)}
            />
          ))}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => close(false)} disabled={saving || uploading}>
            Cancel
          </Button>
          <Button variant="gold" onClick={saveAll} disabled={saving || uploading || !rows.length}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save All Products{rows.length > 1 ? ` (${rows.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProductRowForm({
  index,
  row,
  disabled,
  onChange,
  onAddUrl,
  onRemoveImage,
  onFiles,
}: {
  index: number;
  row: FormRow;
  disabled: boolean;
  onChange: (p: Partial<FormRow>) => void;
  onAddUrl: () => void;
  onRemoveImage: (url: string) => void;
  onFiles: (files: FileList | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const id = (f: string) => `bulk-${index}-${f}`;
  const uploading = row.uploads.length > 0;

  const setOption = (oi: number, p: Partial<OptionRow>) =>
    onChange({ options: row.options.map((o, idx) => (idx === oi ? { ...o, ...p } : o)) });

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-card p-4">
      <p className="font-display text-lg">Product {index + 1}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={id("name")}>Product Name</Label>
          <Input id={id("name")} value={row.name} onChange={(e) => onChange({ name: e.target.value })} disabled={disabled} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("price")}>Price (Rs)</Label>
          <Input
            id={id("price")}
            type="number"
            min={0}
            value={row.price}
            onChange={(e) => onChange({ price: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("cat")}>Category</Label>
          <Input
            id={id("cat")}
            list="bulk-categories"
            value={row.category}
            onChange={(e) => onChange({ category: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("desc")}>Description</Label>
          <Textarea
            id={id("desc")}
            rows={2}
            value={row.description}
            onChange={(e) => onChange({ description: e.target.value })}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Images</Label>
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Paste image URL (https://…)"
            value={row.urlInput}
            onChange={(e) => onChange({ urlInput: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onAddUrl();
              }
            }}
            className="min-w-[200px] flex-1"
            disabled={disabled}
          />
          <Button type="button" variant="goldOutline" size="sm" onClick={onAddUrl} disabled={disabled}>
            <Plus className="size-4" /> Add URL
          </Button>
          <Button
            type="button"
            variant="goldOutline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={disabled || uploading}
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
            Upload From Gallery
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              onFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {row.uploads.map((u) => (
          <div key={u.name} className="space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span className="truncate">{u.name}</span>
              <span>{u.percent}%</span>
            </div>
            <Progress value={u.percent} />
          </div>
        ))}

        {row.images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {row.images.map((url, k) => (
              <div
                key={url}
                className={cn(
                  "relative size-16 overflow-hidden rounded-md border border-border/60",
                  k === 0 && "ring-2 ring-primary",
                )}
                title={k === 0 ? "Main image" : isStorageUrl(url) ? "Stored image" : "External link"}
              >
                <ProductImage src={url} alt="" className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => onRemoveImage(url)}
                  className="absolute right-0.5 top-0.5 rounded-full bg-background/80 p-0.5"
                  aria-label="Remove image"
                  disabled={disabled}
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Options (e.g. Size, Color)</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange({ options: [...row.options, { name: "", values: "" }] })}
            disabled={disabled}
          >
            <Plus className="size-4" /> Add Option
          </Button>
        </div>
        {row.options.map((o, oi) => (
          <div key={oi} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
            <Input
              placeholder="Option name"
              value={o.name}
              onChange={(e) => setOption(oi, { name: e.target.value })}
              disabled={disabled}
            />
            <Input
              placeholder="Values, comma separated (S, M, L)"
              value={o.values}
              onChange={(e) => setOption(oi, { values: e.target.value })}
              disabled={disabled}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onChange({ options: row.options.filter((_, idx) => idx !== oi) })}
              aria-label="Remove option"
              disabled={disabled}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
