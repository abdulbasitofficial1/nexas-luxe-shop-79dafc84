import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ChatModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Contact Seller</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="h-64 overflow-y-auto rounded-lg border p-3">
            <p>No messages yet.</p>
          </div>

          <div className="flex gap-2">
            <Input placeholder="Type message..." />
            <Button>Send</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
