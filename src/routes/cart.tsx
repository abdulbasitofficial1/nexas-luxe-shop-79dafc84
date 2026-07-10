import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useCart } from "@/lib/cart-context";
import { useFirebase } from "@/lib/firebase";
import { placeOrder } from "@/lib/store";
import { PAYMENT_METHODS } from "@/lib/types";

export const Route = createFileRoute("/cart")({
  component: Cart,
});

function Cart() {
  const { items, total, setQuantity, removeItem, clear } = useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-4xl font-bold">
        Your <span className="text-gold-gradient">Cart</span>
      </h1>

      {items.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-4 rounded-xl border border-dashed border-border/60 py-20 text-center">
          <ShoppingBag className="size-12 text-muted-foreground" />
          <p className="font-medium">Your cart is empty</p>
          <Button asChild variant="gold">
            <Link to="/products">Start Shopping</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex gap-4 rounded-xl border border-border/60 bg-card p-4"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="size-20 shrink-0 rounded-lg object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><rect width='100%25' height='100%25' fill='%23222'/></svg>";
                  }}
                />
                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-medium">{item.name}</h3>
                      <p className="text-sm text-muted-foreground">{item.category}</p>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                      aria-label="Remove"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-center rounded-lg border border-border/60">
                      <button
                        className="px-3 py-1.5 hover:text-primary"
                        onClick={() => setQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        className="px-3 py-1.5 hover:text-primary"
                        onClick={() => setQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    <p className="font-semibold text-primary">
                      Rs {(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            <button onClick={clear} className="text-sm text-muted-foreground hover:text-destructive">
              Clear cart
            </button>
          </div>

          <div className="h-fit rounded-xl border border-border/60 bg-card p-6">
            <h2 className="font-display text-xl font-semibold">Order Summary</h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>Rs {total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery</span>
                <span>Calculated at delivery</span>
              </div>
            </div>
            <div className="mt-4 flex justify-between border-t border-border/60 pt-4 text-lg font-bold">
              <span>Total</span>
              <span className="text-gold-gradient">Rs {total.toLocaleString()}</span>
            </div>
            <Button variant="gold" className="mt-6 w-full" onClick={() => setCheckoutOpen(true)}>
              Checkout
            </Button>
          </div>
        </div>
      )}

      <CheckoutModal open={checkoutOpen} onOpenChange={setCheckoutOpen} />
    </div>
  );
}

interface FormState {
  name: string;
  phone: string;
  address: string;
  payment: string;
}
const empty: FormState = { name: "", phone: "", address: "", payment: "" };

function CheckoutModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { items, total, clear } = useCart();
  const { db } = useFirebase();
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof FormState, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const validate = () => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) next.name = "Name is required.";
    if (!form.phone.trim()) next.phone = "Phone number is required.";
    if (!form.address.trim()) next.address = "Address is required.";
    if (!form.payment) next.payment = "Select a payment method.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!db) {
      toast.error("Store is not connected.");
      return;
    }
    setSubmitting(true);
    try {
      for (const item of items) {
        await placeOrder(db, {
          customerName: form.name.trim(),
          phoneNumber: form.phone.trim(),
          address: form.address.trim(),
          quantity: item.quantity,
          paymentMethod: form.payment,
          productName: item.name,
          productPrice: item.price,
        });
      }
      toast.success("Order placed successfully! We'll contact you shortly.");
      clear();
      setForm(empty);
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
          <DialogTitle className="font-display text-2xl">Checkout</DialogTitle>
          <DialogDescription>
            Total: <span className="font-semibold text-primary">Rs {total.toLocaleString()}</span> ·{" "}
            {items.length} item(s)
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="ck-name">Name</Label>
            <Input id="ck-name" value={form.name} onChange={(e) => set("name", e.target.value)} />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ck-phone">Phone Number</Label>
            <Input id="ck-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="03XX XXXXXXX" />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ck-addr">Address</Label>
            <Textarea id="ck-addr" rows={2} value={form.address} onChange={(e) => set("address", e.target.value)} />
            {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
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
          <Button type="submit" variant="gold" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Confirm Order
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
