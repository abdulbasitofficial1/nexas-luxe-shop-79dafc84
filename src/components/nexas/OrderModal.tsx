import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFirebase } from "@/lib/firebase";
import { placeOrder } from "@/lib/store";
import {
  COD_FEE,
  PAYMENT_ACCOUNTS,
  PAYMENT_METHODS,
  type Product,
} from "@/lib/types";

interface OrderModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormState {
  name: string;
  phone: string;
  address: string;
  quantity: string;
  payment: string;
  transactionId: string;
}

const empty: FormState = {
  name: "",
  phone: "",
  address: "",
  quantity: "1",
  payment: "",
  transactionId: "",
};

const needsTxn = (payment: string) =>
  payment === "EasyPaisa" || payment === "JazzCash";

export function OrderModal({ product, open, onOpenChange }: OrderModalProps) {
  const { db } = useFirebase();
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const qty = Math.max(1, Number(form.quantity) || 1);
  const subtotal = product ? product.price * qty : 0;
  const codFee = form.payment === "Cash on Delivery" ? COD_FEE : 0;
  const totalAmount = subtotal + codFee;

  const validate = () => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) next.name = "Name is required.";
    if (!form.phone.trim()) next.phone = "Phone number is required.";
    else if (!/^[0-9+\-\s]{7,15}$/.test(form.phone.trim()))
      next.phone = "Enter a valid phone number.";
    if (!form.address.trim()) next.address = "Address is required.";
    const q = Number(form.quantity);
    if (!form.quantity.trim() || Number.isNaN(q) || q < 1)
      next.quantity = "Quantity is required.";
    if (!form.payment) next.payment = "Select a payment method.";
    if (needsTxn(form.payment) && !form.transactionId.trim())
      next.transactionId = "Transaction ID is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !product) return;
    if (!db) {
      toast.error("Store is not connected. Please try again.");
      return;
    }
    setSubmitting(true);
    try {
      await placeOrder(db, {
        customerName: form.name.trim(),
        phoneNumber: form.phone.trim(),
        address: form.address.trim(),
        quantity: qty,
        paymentMethod: form.payment,
        transactionId: needsTxn(form.payment) ? form.transactionId.trim() : "",
        productName: product.name,
        productPrice: product.price,
      });
      toast.success("Order placed successfully! We'll contact you shortly.");
      setForm(empty);
      setErrors({});
      onOpenChange(false);
    } catch {
      toast.error("Failed to place order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Place Your Order</DialogTitle>
          <DialogDescription>
            {product ? (
              <span>
                {product.name} — <span className="font-semibold text-primary">Rs {product.price.toLocaleString()}</span>
              </span>
            ) : (
              "Complete the form to order."
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="o-name">Name</Label>
            <Input id="o-name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Full name" />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="o-phone">Phone Number</Label>
            <Input id="o-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="03XX XXXXXXX" />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="o-address">Address</Label>
            <Textarea id="o-address" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Delivery address" rows={2} />
            {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="o-qty">Quantity</Label>
            <Input id="o-qty" type="number" min={1} value={form.quantity} onChange={(e) => set("quantity", e.target.value)} />
            {errors.quantity && <p className="text-xs text-destructive">{errors.quantity}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <Select value={form.payment} onValueChange={(v) => set("payment", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.payment && <p className="text-xs text-destructive">{errors.payment}</p>}
          </div>

          {needsTxn(form.payment) && (
            <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <p className="text-sm">
                {form.payment} Number:{" "}
                <span className="font-semibold text-primary">
                  {PAYMENT_ACCOUNTS[form.payment]}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                Send payment to {PAYMENT_ACCOUNTS[form.payment]} and enter your Transaction ID.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="o-txn">Transaction ID</Label>
                <Input
                  id="o-txn"
                  value={form.transactionId}
                  onChange={(e) => set("transactionId", e.target.value)}
                  placeholder="e.g. 1234567890"
                />
                {errors.transactionId && (
                  <p className="text-xs text-destructive">{errors.transactionId}</p>
                )}
              </div>
            </div>
          )}

          {form.payment === "Cash on Delivery" && (
            <div className="rounded-lg border border-border/60 bg-secondary/40 p-3 text-sm">
              Cash on Delivery charges: Rs {COD_FEE}
            </div>
          )}

          {product && (
            <div className="space-y-1 rounded-lg border border-border/60 bg-secondary/40 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>Rs {subtotal.toLocaleString()}</span>
              </div>
              {codFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">COD Fee</span>
                  <span>Rs {codFee.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border/60 pt-1 font-semibold">
                <span>Total</span>
                <span className="text-primary">Rs {totalAmount.toLocaleString()}</span>
              </div>
            </div>
          )}

          <Button type="submit" variant="gold" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Confirm Order
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
