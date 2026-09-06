import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { repairProductImages, type RepairProgress } from "@/lib/image-repair";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function RepairImagesDialog({ open, onOpenChange }: Props) {
  const { db, storage } = useFirebase();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<RepairProgress | null>(null);
  const [done, setDone] = useState(false);
  const stopRef = useRef(false);

  const close = (v: boolean) => {
    if (running) return;
    if (!v) {
      setProgress(null);
      setDone(false);
    }
    onOpenChange(v);
  };

  const start = async () => {
    if (!db || !storage) {
      toast.error("Store not connected.");
      return;
    }
    stopRef.current = false;
    setRunning(true);
    setDone(false);
    try {
      const result = await repairProductImages(db, storage, setProgress, () => stopRef.current);
      setProgress(result);
      setDone(true);
      toast.success(
        `Image repair completed: ${result.processed} products checked, ${result.imagesRepaired} images repaired, ${result.failed} failed.`,
      );
    } catch (err) {
      console.error(err);
      toast.error("Image repair failed. Check your connection and try again.");
    } finally {
      setRunning(false);
    }
  };

  const pct = progress && progress.total ? Math.round((progress.processed / progress.total) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Repair Product Images</DialogTitle>
          <DialogDescription>
            Scans every product, copies old remote images into your own storage and updates the
            product with the new links. Names, prices and other details are not touched.
          </DialogDescription>
        </DialogHeader>

        {progress ? (
          <div className="space-y-3 rounded-xl border border-border/60 bg-card p-4 text-sm">
            <p className="font-medium">
              {done ? "Image repair completed" : "Repairing images..."}
            </p>
            <Progress value={pct} />
            <p className="text-muted-foreground">
              {progress.processed} / {progress.total} products
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="Updated" value={progress.updated} />
              <Stat label="Images repaired" value={progress.imagesRepaired} />
              <Stat label="Failed" value={progress.failed} />
            </div>
            {done && (
              <p className="text-muted-foreground">
                {progress.processed} products checked, {progress.imagesRepaired} images repaired,{" "}
                {progress.failed} failed.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Safe to run more than once — images already stored with us are skipped.
          </p>
        )}

        <DialogFooter>
          {running ? (
            <Button variant="ghost" onClick={() => (stopRef.current = true)}>
              Stop after current batch
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => close(false)}>
              Close
            </Button>
          )}
          <Button variant="gold" onClick={start} disabled={running}>
            {running ? <Loader2 className="size-4 animate-spin" /> : <Wrench className="size-4" />}
            {done ? "Run Again" : "Start Repair"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-secondary/40 p-2">
      <p className="font-display text-lg">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
