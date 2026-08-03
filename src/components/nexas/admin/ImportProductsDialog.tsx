import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, FileUp, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { useFirebase } from "@/lib/firebase";
import {
  applyProfit,
  importProducts,
  parseCsvFile,
  type ImportSummary,
  type ParsedProduct,
  type ProfitType,
} from "@/lib/csv-import";

type Step = "form" | "confirm" | "importing" | "done";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Categories that already exist in Firebase. */
  categories: string[];
}

/** Bulk product import dialog: CSV upload → profit → category → preview → import. */
export function ImportProductsDialog({ open, onOpenChange, categories }: Props) {
  const { db } = useFirebase();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("form");
  const [file, setFile] = useState<File | null>(null);
  const [profitType, setProfitType] = useState<ProfitType>("fixed");
  const [profitValue, setProfitValue] = useState<string>("500");
  const [category, setCategory] = useState("");
  const [parsing, setParsing] = useState(false);

  const [parsed, setParsed] = useState<ParsedProduct[]>([]);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const profit = useMemo(
    () => ({ type: profitType, value: Number.parseFloat(profitValue) || 0 }),
    [profitType, profitValue],
  );

  const reset = () => {
    setStep("form");
    setFile(null);
    setParsed([]);
    setParseWarnings([]);
    setSummary(null);
    setProgress({ done: 0, total: 0 });
    if (fileRef.current) fileRef.current.value = "";
  };

  const close = (v: boolean) => {
    if (step === "importing") return; // don't allow closing mid-import
    if (!v) reset();
    onOpenChange(v);
  };

  /** Validate inputs, parse the CSV and move to the confirmation step. */
  const handleContinue = async () => {
    if (!file) {
      toast.error("Please choose a CSV file first.");
      return;
    }
    if (!category) {
      toast.error("Please select a category.");
      return;
    }
    // Never auto-create categories — the category must already exist.
    if (!categories.includes(category)) {
      toast.error(
        `Category "${category}" does not exist. Please create the category first.`,
      );
      return;
    }
    if (!Number.isFinite(profit.value) || profit.value < 0) {
      toast.error("Enter a valid profit value.");
      return;
    }

    setParsing(true);
    try {
      const result = await parseCsvFile(file, profit);
      if (!result.products.length) {
        toast.error("No valid products found in this CSV.");
        return;
      }
      setParsed(result.products);
      setParseWarnings(result.errors);
      setStep("confirm");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid CSV file.");
    } finally {
      setParsing(false);
    }
  };

  /** Run the batched Firestore import. */
  const handleImport = async () => {
    if (!db) {
      toast.error("Database not ready. Please try again.");
      return;
    }
    setStep("importing");
    setProgress({ done: 0, total: parsed.length });
    toast.info("Import started");
    try {
      const result = await importProducts(db, parsed, category, (done, total) =>
        setProgress({ done, total }),
      );
      setSummary(result);
      setStep("done");
      if (result.failed && !result.imported && !result.updated) {
        toast.error("Import failed");
      } else {
        toast.success(
          `Import successful — ${result.imported} added, ${result.updated} updated`,
        );
      }
    } catch (err) {
      setStep("confirm");
      toast.error(err instanceof Error ? err.message : "Import failed");
    }
  };

  const preview = parsed.slice(0, 5);
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Import Products</DialogTitle>
          <DialogDescription>
            Upload a WooCommerce product CSV, set your profit and category.
          </DialogDescription>
        </DialogHeader>

        {/* ---------------- Step 1: form ---------------- */}
        {step === "form" && (
          <div className="space-y-6">
            <section className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Upload CSV
              </Label>
              <div className="rounded-xl border border-dashed border-border/70 p-4">
                <Input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  {file ? file.name : "Choose a WooCommerce CSV file."}
                </p>
              </div>
            </section>

            <section className="space-y-3">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Profit settings
              </Label>
              <RadioGroup
                value={profitType}
                onValueChange={(v) => setProfitType(v as ProfitType)}
                className="grid gap-2 sm:grid-cols-2"
              >
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 p-3 text-sm">
                  <RadioGroupItem value="fixed" id="profit-fixed" />
                  Fixed Profit (PKR)
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 p-3 text-sm">
                  <RadioGroupItem value="percentage" id="profit-pct" />
                  Percentage Profit (%)
                </label>
              </RadioGroup>
              <Input
                type="number"
                min={0}
                value={profitValue}
                onChange={(e) => setProfitValue(e.target.value)}
                placeholder={profitType === "fixed" ? "500" : "20"}
              />
              <p className="text-xs text-muted-foreground">
                Example: base price Rs 2,000 →{" "}
                <span className="font-medium text-primary">
                  Rs {applyProfit(2000, profit).toLocaleString()}
                </span>{" "}
                store price.
              </p>
            </section>

            <section className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Category
              </Label>
              {categories.length === 0 ? (
                <p className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  No categories exist yet. Please create a product with a category first.
                </p>
              ) : (
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground">
                Every imported product is assigned to this category.
              </p>
            </section>

            <DialogFooter>
              <Button variant="ghost" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button variant="gold" onClick={handleContinue} disabled={parsing}>
                {parsing ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
                Continue
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ---------------- Step 2: confirmation ---------------- */}
        {step === "confirm" && (
          <div className="space-y-4">
            <p className="text-sm">
              You are about to import{" "}
              <span className="font-semibold text-primary">{parsed.length}</span>{" "}
              products into <span className="font-semibold">{category}</span>.
            </p>

            {parseWarnings.length > 0 && (
              <ul className="space-y-1 rounded-lg border border-border/60 bg-secondary/30 p-3 text-xs text-muted-foreground">
                {parseWarnings.slice(0, 5).map((w) => (
                  <li key={w}>• {w}</li>
                ))}
              </ul>
            )}

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Preview (first 5)
              </p>
              {preview.map((p, i) => (
                <div
                  key={`${p.sku}-${i}`}
                  className="flex items-center gap-3 rounded-lg border border-border/60 p-2"
                >
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={p.name}
                      loading="lazy"
                      className="size-12 shrink-0 rounded object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
                      }}
                    />
                  ) : (
                    <div className="size-12 shrink-0 rounded bg-secondary" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Base Rs {p.basePrice.toLocaleString()} →{" "}
                      <span className="text-primary">Rs {p.price.toLocaleString()}</span>
                      {p.options.length > 0 && ` · ${p.options.length} option(s)`}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setStep("form")}>
                Cancel
              </Button>
              <Button variant="gold" onClick={handleImport}>
                <Upload className="size-4" /> Import
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ---------------- Step 3: progress ---------------- */}
        {step === "importing" && (
          <div className="space-y-3 py-4">
            <p className="text-sm">
              Importing product {Math.min(progress.done + 1, progress.total)} of{" "}
              {progress.total}...
            </p>
            <Progress value={pct} />
            <p className="text-xs text-muted-foreground">{pct}% complete</p>
          </div>
        )}

        {/* ---------------- Step 4: summary ---------------- */}
        {step === "done" && summary && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <CheckCircle2 className="size-4" /> Import finished
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              {[
                ["Imported", summary.imported],
                ["Updated", summary.updated],
                ["Skipped", summary.skipped],
                ["Failed", summary.failed],
              ].map(([label, value]) => (
                <div
                  key={label as string}
                  className="rounded-lg border border-border/60 p-3 text-center"
                >
                  <p className="text-lg font-semibold">{value as number}</p>
                  <p className="text-xs text-muted-foreground">{label as string}</p>
                </div>
              ))}
            </div>
            {summary.errors.length > 0 && (
              <ul className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-border/60 bg-secondary/30 p-3 text-xs text-muted-foreground">
                {summary.errors.map((e, i) => (
                  <li key={i}>• {e}</li>
                ))}
              </ul>
            )}
            <DialogFooter>
              <Button variant="gold" onClick={() => close(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
