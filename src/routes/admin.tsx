import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { signOut } from "firebase/auth";
import { toast } from "sonner";
import { CheckCircle2, Loader2, LogOut, Pencil, Plus, ShieldAlert, Star, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import {
  addProduct,
  approveReview,
  deleteProduct,
  deleteReview,
  updateOrderStatus,
  updatePaymentVerified,
  updateProduct,
  useOrders,
  useProducts,
  useReviews,
  type ProductInput,
} from "@/lib/store";
import { ORDER_STATUSES, type OrderStatus, type Product } from "@/lib/types";
import { useChats, sendMessage } from "@/lib/store";

export const Route = createFileRoute("/admin")({
  component: Admin,
});

function Admin() {
  const { auth, user, ready } = useFirebase();
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
          You must be signed in as an administrator to view this page.
        </p>
        <Button variant="gold" className="mt-6" onClick={openAdminLogin}>
          Admin Login
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">
            Admin <span className="text-gold-gradient">Dashboard</span>
          </h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <Button
          variant="goldOutline"
          onClick={async () => {
            if (auth) await signOut(auth);
            toast.success("Logged out");
          }}
        >
          <LogOut className="size-4" /> Logout
        </Button>
      </div>

      <Tabs defaultValue="orders" className="mt-8">
       <TabsList>
  <TabsTrigger value="orders">Orders</TabsTrigger>
  <TabsTrigger value="products">Products</TabsTrigger>
  <TabsTrigger value="reviews">Reviews</TabsTrigger>
  <TabsTrigger value="chat">Chat</TabsTrigger>
</TabsList>
        <TabsContent value="orders" className="mt-6">
          <OrdersPanel />
        </TabsContent>
        <TabsContent value="products" className="mt-6">
          <ProductsPanel />
        </TabsContent>
        <TabsContent value="reviews" className="mt-6">
          <ReviewsPanel />
        </TabsContent>
         <TabsContent value="chat" className="mt-6">
  <ChatPanel />
</TabsContent>
      </Tabs>
    
    </div>
  );
}

const statusVariant: Record<OrderStatus, string> = {
  Pending: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
  Processing: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  Completed: "bg-green-500/15 text-green-400 border-green-500/30",
};

function OrdersPanel() {
  const { db } = useFirebase();
  const { orders, loading } = useOrders();
  const [term, setTerm] = useState("");
  const [filter, setFilter] = useState<"All" | OrderStatus>("All");

  const filtered = useMemo(() => {
    const t = term.toLowerCase().trim();
    return orders.filter((o) => {
      const matchStatus = filter === "All" || o.orderStatus === filter;
      const matchTerm =
        !t ||
        o.customerName.toLowerCase().includes(t) ||
        o.phoneNumber.toLowerCase().includes(t) ||
        o.productName.toLowerCase().includes(t) ||
        o.address.toLowerCase().includes(t);
      return matchStatus && matchTerm;
    });
  }, [orders, term, filter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by customer, phone, product..."
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={filter} onValueChange={(v) => setFilter(v as "All" | OrderStatus)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Statuses</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto text-sm text-muted-foreground">{filtered.length} order(s)</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">No orders found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => (
            <div key={o.id} className="rounded-xl border border-border/60 bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{o.productName}</p>
                  <p className="text-sm text-muted-foreground">
                    Rs {o.productPrice.toLocaleString()} × {o.quantity}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Badge variant="outline" className={statusVariant[o.orderStatus]}>
                    {o.orderStatus}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={
                      o.paymentVerified
                        ? "border-green-500/30 bg-green-500/15 text-green-400"
                        : "border-red-500/30 bg-red-500/15 text-red-400"
                    }
                  >
                    {o.paymentVerified ? "Payment Verified" : "Not Verified"}
                  </Badge>
                </div>
              </div>
              <div className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                <p><span className="text-muted-foreground">Customer:</span> {o.customerName}</p>
                <p><span className="text-muted-foreground">Phone:</span> {o.phoneNumber}</p>
                <p className="sm:col-span-2"><span className="text-muted-foreground">Address:</span> {o.address}</p>
                <p><span className="text-muted-foreground">Payment:</span> {o.paymentMethod}</p>
                <p><span className="text-muted-foreground">Transaction ID:</span> {o.transactionId || "—"}</p>
                <p><span className="text-muted-foreground">Subtotal:</span> Rs {(o.subtotal ?? o.productPrice * o.quantity).toLocaleString()}</p>
                <p><span className="text-muted-foreground">COD Fee:</span> Rs {(o.codFee ?? 0).toLocaleString()}</p>
                <p className="font-medium"><span className="text-muted-foreground font-normal">Total:</span> <span className="text-primary">Rs {(o.totalAmount ?? o.productPrice * o.quantity).toLocaleString()}</span></p>
                <p><span className="text-muted-foreground">Date:</span> {o.createdAt ? new Date(o.createdAt).toLocaleString() : "—"}</p>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Update status:</span>
                <Select
                  value={o.orderStatus}
                  onValueChange={async (v) => {
                    if (!db) return;
                    try {
                      await updateOrderStatus(db, o.id, v as OrderStatus);
                      toast.success("Order status updated");
                    } catch {
                      toast.error("Failed to update status");
                    }
                  }}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant={o.paymentVerified ? "outline" : "gold"}
                  onClick={async () => {
                    if (!db) return;
                    try {
                      await updatePaymentVerified(db, o.id, !o.paymentVerified);
                      toast.success(
                        o.paymentVerified ? "Marked as not verified" : "Payment verified",
                      );
                    } catch {
                      toast.error("Failed to update payment status");
                    }
                  }}
                >
                  {o.paymentVerified ? (
                    <>
                      <XCircle className="size-4" /> Mark Not Verified
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4" /> Mark Verified
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ProductFormState {
  name: string;
  price: number;
  category: string;
  description: string;
  images: string[];
  options: { name: string; values: string[] }[];
}

const emptyProduct: ProductFormState = {
  name: "",
  price: 0,
  category: "",
  description: "",
  images: [""],
  options: [],
};

function ProductsPanel() {
  const { db } = useFirebase();
  const { products, loading } = useProducts();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (p: Product) => {
    setEditing(p);
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{products.length} product(s)</span>
        <Button variant="gold" onClick={openNew}>
          <Plus className="size-4" /> Add Product
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : products.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">
          No products yet. Add your first product.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <div key={p.id} className="flex gap-3 rounded-xl border border-border/60 bg-card p-3">
              <img
                src={p.image}
                alt={p.name}
                className="size-16 shrink-0 rounded-lg object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='100%25' height='100%25' fill='%23222'/></svg>";
                }}
              />
              <div className="flex-1">
                <p className="line-clamp-1 font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.category}</p>
                <p className="text-sm text-primary">Rs {p.price.toLocaleString()}</p>
              </div>
              <div className="flex flex-col gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(p)} aria-label="Edit">
                  <Pencil className="size-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Delete" className="text-destructive">
                      <Trash2 className="size-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this product?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently remove &quot;{p.name}&quot;.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={async () => {
                          if (!db) return;
                          try {
                            await deleteProduct(db, p.id);
                            toast.success("Product deleted");
                          } catch {
                            toast.error("Failed to delete");
                          }
                        }}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}

      <ProductFormDialog open={open} onOpenChange={setOpen} editing={editing} />
    </div>
  );
}

function ProductFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Product | null;
}) {
  const { db } = useFirebase();
  const [form, setForm] = useState<ProductFormState>(emptyProduct);
  const [saving, setSaving] = useState(false);
  const [initId, setInitId] = useState<string | null>(null);

  // Sync form when dialog opens or target changes.
  const targetId = editing?.id ?? "new";
  if (open && initId !== targetId) {
    setInitId(targetId);
    setForm(
      editing
        ? {
            name: editing.name,
            price: editing.price,
            category: editing.category,
            description: editing.description,
            images:
              editing.images && editing.images.length
                ? [...editing.images]
                : [editing.image || ""],
            options: editing.options ? editing.options.map((o) => ({ ...o, values: [...o.values] })) : [],
          }
        : emptyProduct,
    );
  }
  if (!open && initId !== null) setInitId(null);

  // ---- Image field helpers ----
  const setImage = (i: number, value: string) =>
    setForm((f) => ({ ...f, images: f.images.map((img, idx) => (idx === i ? value : img)) }));
  const addImage = () => setForm((f) => ({ ...f, images: [...f.images, ""] }));
  const removeImage = (i: number) =>
    setForm((f) => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }));

  // ---- Option helpers ----
  const addOption = () =>
    setForm((f) => ({ ...f, options: [...f.options, { name: "", values: [""] }] }));
  const removeOption = (oi: number) =>
    setForm((f) => ({ ...f, options: f.options.filter((_, idx) => idx !== oi) }));
  const setOptionName = (oi: number, name: string) =>
    setForm((f) => ({
      ...f,
      options: f.options.map((o, idx) => (idx === oi ? { ...o, name } : o)),
    }));
  const addValue = (oi: number) =>
    setForm((f) => ({
      ...f,
      options: f.options.map((o, idx) => (idx === oi ? { ...o, values: [...o.values, ""] } : o)),
    }));
  const setValue = (oi: number, vi: number, value: string) =>
    setForm((f) => ({
      ...f,
      options: f.options.map((o, idx) =>
        idx === oi ? { ...o, values: o.values.map((v, vIdx) => (vIdx === vi ? value : v)) } : o,
      ),
    }));
  const removeValue = (oi: number, vi: number) =>
    setForm((f) => ({
      ...f,
      options: f.options.map((o, idx) =>
        idx === oi ? { ...o, values: o.values.filter((_, vIdx) => vIdx !== vi) } : o,
      ),
    }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.category.trim() || form.price <= 0) {
      toast.error("Name, price and category are required.");
      return;
    }
    const images = form.images.map((i) => i.trim()).filter(Boolean);
    if (images.length === 0) {
      toast.error("Please add at least one image URL.");
      return;
    }
    const options = form.options
      .map((o) => ({
        name: o.name.trim(),
        values: o.values.map((v) => v.trim()).filter(Boolean),
      }))
      .filter((o) => o.name && o.values.length > 0);

    if (!db) {
      toast.error("Store not connected.");
      return;
    }

    setSaving(true);
    try {
      const payload: ProductInput = {
        name: form.name.trim(),
        price: form.price,
        category: form.category.trim(),
        description: form.description.trim(),
        image: images[0],
        images,
        options,
      };
      if (editing) {
        await updateProduct(db, editing.id, payload);
        toast.success("Product updated");
      } else {
        await addProduct(db, payload);
        toast.success("Product added");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error("Failed to save product");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {editing ? "Edit Product" : "Add Product"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="p-name">Product Name</Label>
            <Input id="p-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-price">Product Price (Rs)</Label>
            <Input
              id="p-price"
              type="number"
              min={0}
              value={form.price || ""}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-cat">Category</Label>
            <Input id="p-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-desc">Description</Label>
            <Textarea id="p-desc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          {/* Product Images */}
          <div className="space-y-3 rounded-lg border border-border/60 p-3">
            <div className="flex items-center justify-between">
              <Label>Product Images</Label>
              <Button type="button" size="sm" variant="goldOutline" onClick={addImage}>
                <Plus className="size-4" /> Add Image
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              The first image is used as the main thumbnail.
            </p>
            <div className="space-y-3">
              {form.images.map((img, i) => (
                <div key={i} className="flex items-start gap-2">
                  {img.trim() ? (
                    <img
                      src={img.trim()}
                      alt={`Preview ${i + 1}`}
                      className="size-14 shrink-0 rounded-md border border-border/60 object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='56' height='56'><rect width='100%25' height='100%25' fill='%23222'/></svg>";
                      }}
                    />
                  ) : (
                    <div className="grid size-14 shrink-0 place-items-center rounded-md border border-dashed border-border/60 text-[10px] text-muted-foreground">
                      {i === 0 ? "Main" : `#${i + 1}`}
                    </div>
                  )}
                  <Input
                    value={img}
                    onChange={(e) => setImage(i, e.target.value)}
                    placeholder="https://..."
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="shrink-0 text-destructive"
                    onClick={() => removeImage(i)}
                    disabled={form.images.length === 1}
                    aria-label="Remove image"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Product Options */}
          <div className="space-y-3 rounded-lg border border-border/60 p-3">
            <div className="flex items-center justify-between">
              <Label>Product Options</Label>
              <Button type="button" size="sm" variant="goldOutline" onClick={addOption}>
                <Plus className="size-4" /> Add Option
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              e.g. Color → Black, White · Size → S, M, L
            </p>
            {form.options.length === 0 && (
              <p className="text-xs text-muted-foreground">No options added.</p>
            )}
            <div className="space-y-4">
              {form.options.map((opt, oi) => (
                <div key={oi} className="space-y-2 rounded-lg border border-border/60 bg-secondary/30 p-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={opt.name}
                      onChange={(e) => setOptionName(oi, e.target.value)}
                      placeholder="Option name (e.g. Color)"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="shrink-0 text-destructive"
                      onClick={() => removeOption(oi)}
                      aria-label="Remove option"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {opt.values.map((val, vi) => (
                      <div key={vi} className="flex items-center gap-2">
                        <Input
                          value={val}
                          onChange={(e) => setValue(oi, vi, e.target.value)}
                          placeholder={`Value ${vi + 1} (e.g. Black)`}
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="shrink-0 text-destructive"
                          onClick={() => removeValue(oi, vi)}
                          disabled={opt.values.length === 1}
                          aria-label="Remove value"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button type="button" size="sm" variant="ghost" onClick={() => addValue(oi)}>
                    <Plus className="size-4" /> Add Value
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <Button type="submit" variant="gold" className="w-full" disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {editing ? "Save Changes" : "Add Product"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReviewsPanel() {
  const { db } = useFirebase();
  const { reviews, loading } = useReviews(false);
  const [filter, setFilter] = useState<"All" | "Pending" | "Approved">("All");

  const filtered = useMemo(() => {
    return reviews.filter((r) =>
      filter === "All" ? true : filter === "Approved" ? r.approved : !r.approved,
    );
  }, [reviews, filter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Reviews</SelectItem>
            <SelectItem value="Pending">Pending Approval</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
          </SelectContent>
        </Select>
        <span className="ml-auto text-sm text-muted-foreground">{filtered.length} review(s)</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">No reviews found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-xl border border-border/60 bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{r.customerName}</span>
                    <span className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          className={`size-3.5 ${
                            i <= r.rating
                              ? "fill-primary text-primary"
                              : "fill-transparent text-muted-foreground/40"
                          }`}
                        />
                      ))}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    r.approved
                      ? "border-green-500/30 bg-green-500/15 text-green-400"
                      : "border-yellow-500/30 bg-yellow-500/15 text-yellow-500"
                  }
                >
                  {r.approved ? "Approved" : "Pending"}
                </Badge>
              </div>
              <p className="mt-3 text-sm text-foreground/90">{r.message}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant={r.approved ? "outline" : "gold"}
                  onClick={async () => {
                    if (!db) return;
                    try {
                      await approveReview(db, r.id, !r.approved);
                      toast.success(r.approved ? "Review hidden" : "Review approved");
                    } catch {
                      toast.error("Failed to update review");
                    }
                  }}
                >
                  {r.approved ? (
                    <>
                      <XCircle className="size-4" /> Unapprove
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4" /> Approve
                    </>
                  )}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="text-destructive">
                      <Trash2 className="size-4" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this review?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently remove the review from {r.customerName}.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={async () => {
                          if (!db) return;
                          try {
                            await deleteReview(db, r.id);
                            toast.success("Review deleted");
                          } catch {
                            toast.error("Failed to delete review");
                          }
                        }}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function ChatPanel() {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-6">
      <h2 className="mb-4 text-2xl font-bold">Customer Chats</h2>

      <div className="space-y-3">
        <div className="rounded-lg border p-3">
          <p className="font-medium">Customer</p>
          <p className="text-sm text-muted-foreground">
            Hello, is this product available?
          </p>
        </div>

        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
          <p className="font-medium text-primary">Admin</p>
          <p className="text-sm">Yes, it is available.</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          placeholder="Reply..."
          className="flex-1 rounded-lg border px-3 py-2"
        />
        <button className="rounded-lg bg-primary px-4 py-2 text-primary-foreground">
          Send
        </button>
      </div>
    </div>
  );
}

