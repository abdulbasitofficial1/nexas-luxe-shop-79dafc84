import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { signOut } from "firebase/auth";
import { toast } from "sonner";
import { ImageIcon, Loader2, LogOut, Pencil, Plus, ShieldAlert, Trash2, Upload } from "lucide-react";
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
  deleteProduct,
  updateOrderStatus,
  updateProduct,
  uploadProductImage,
  useOrders,
  useProducts,
  ALLOWED_IMAGE_TYPES,
  type ProductInput,
} from "@/lib/store";
import { ORDER_STATUSES, type OrderStatus, type Product } from "@/lib/types";

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
        </TabsList>
        <TabsContent value="orders" className="mt-6">
          <OrdersPanel />
        </TabsContent>
        <TabsContent value="products" className="mt-6">
          <ProductsPanel />
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
                    Rs {o.productPrice.toLocaleString()} × {o.quantity} ={" "}
                    <span className="text-primary">Rs {(o.productPrice * o.quantity).toLocaleString()}</span>
                  </p>
                </div>
                <Badge variant="outline" className={statusVariant[o.orderStatus]}>
                  {o.orderStatus}
                </Badge>
              </div>
              <div className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                <p><span className="text-muted-foreground">Customer:</span> {o.customerName}</p>
                <p><span className="text-muted-foreground">Phone:</span> {o.phoneNumber}</p>
                <p className="sm:col-span-2"><span className="text-muted-foreground">Address:</span> {o.address}</p>
                <p><span className="text-muted-foreground">Payment:</span> {o.paymentMethod}</p>
                <p><span className="text-muted-foreground">Date:</span> {o.createdAt ? new Date(o.createdAt).toLocaleString() : "—"}</p>
              </div>
              <div className="mt-3 flex items-center gap-2">
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const emptyProduct: ProductInput = {
  name: "",
  price: 0,
  image: "",
  category: "",
  description: "",
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
  const { db, storage } = useFirebase();
  const [form, setForm] = useState<ProductInput>(emptyProduct);
  const [saving, setSaving] = useState(false);
  const [initId, setInitId] = useState<string | null>(null);

  // Image handling: choose between pasting a URL or uploading a file.
  const [mode, setMode] = useState<"url" | "upload">("url");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [urlOk, setUrlOk] = useState<boolean | null>(null);

  const resetImageState = () => {
    setMode("url");
    setFile(null);
    setFilePreview(null);
    setUploadPct(null);
    setUrlOk(null);
  };

  // Sync form when dialog opens or target changes.
  const targetId = editing?.id ?? "new";
  if (open && initId !== targetId) {
    setInitId(targetId);
    resetImageState();
    setForm(
      editing
        ? {
            name: editing.name,
            price: editing.price,
            image: editing.image,
            category: editing.category,
            description: editing.description,
          }
        : emptyProduct,
    );
  }
  if (!open && initId !== null) setInitId(null);

  const onPickFile = (f: File | null) => {
    setUploadPct(null);
    if (!f) {
      setFile(null);
      setFilePreview(null);
      return;
    }
    if (!ALLOWED_IMAGE_TYPES.includes(f.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      toast.error("Only JPG, JPEG, PNG and WEBP images are supported.");
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      toast.error("Image must be smaller than 8MB.");
      return;
    }
    setFile(f);
    setFilePreview(URL.createObjectURL(f));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.category.trim() || form.price <= 0) {
      toast.error("Name, price and category are required.");
      return;
    }
    const hasUrl = mode === "url" && form.image.trim();
    const hasUpload = mode === "upload" && file;
    if (!hasUrl && !hasUpload && !form.image.trim()) {
      toast.error("Provide an image URL or upload an image.");
      return;
    }
    if (!db) {
      toast.error("Store not connected.");
      return;
    }

    setSaving(true);
    try {
      let finalImage = form.image.trim();

      // Uploaded image takes priority over the URL.
      if (mode === "upload" && file) {
        if (!storage) {
          toast.error("Image storage is not available.");
          setSaving(false);
          return;
        }
        setUploadPct(0);
        finalImage = await uploadProductImage(storage, file, setUploadPct);
      }

      if (!finalImage) {
        toast.error("Provide an image URL or upload an image.");
        setSaving(false);
        return;
      }

      const payload = { ...form, image: finalImage };
      if (editing) {
        await updateProduct(db, editing.id, payload);
        toast.success("Product updated");
      } else {
        await addProduct(db, payload);
        toast.success("Product added");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(
        mode === "upload"
          ? "Image upload failed. Please try again."
          : "Failed to save product",
      );
      console.error(err);
    } finally {
      setSaving(false);
      setUploadPct(null);
    }
  };

  const previewSrc = mode === "upload" ? filePreview : form.image.trim() || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {editing ? "Edit Product" : "Add Product"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
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

          {/* Product image: URL or upload */}
          <div className="space-y-2 rounded-xl border border-border/60 bg-card/40 p-3">
            <Label>Product Image</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={mode === "url" ? "gold" : "goldOutline"}
                size="sm"
                onClick={() => setMode("url")}
              >
                <ImageIcon className="size-4" /> Image URL
              </Button>
              <Button
                type="button"
                variant={mode === "upload" ? "gold" : "goldOutline"}
                size="sm"
                onClick={() => setMode("upload")}
              >
                <Upload className="size-4" /> Upload Image
              </Button>
            </div>

            {mode === "url" ? (
              <div className="space-y-1.5">
                <Input
                  value={form.image}
                  onChange={(e) => {
                    setForm({ ...form, image: e.target.value });
                    setUrlOk(null);
                  }}
                  placeholder="https://..."
                />
                {form.image.trim() && urlOk === false && (
                  <p className="text-xs text-destructive">
                    This image URL could not be loaded. Try uploading the image instead.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <Input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                />
                <p className="text-xs text-muted-foreground">
                  JPG, JPEG, PNG or WEBP — great for Markaz images that don&apos;t load by URL.
                </p>
                {uploadPct !== null && (
                  <div className="space-y-1">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${uploadPct}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Uploading… {uploadPct}%</p>
                  </div>
                )}
              </div>
            )}

            {previewSrc && (
              <div className="mt-2 overflow-hidden rounded-lg border border-border/60">
                <img
                  src={previewSrc}
                  alt="Preview"
                  className="h-40 w-full object-cover"
                  onLoad={() => mode === "url" && setUrlOk(true)}
                  onError={() => mode === "url" && setUrlOk(false)}
                />
              </div>
            )}
          </div>

          <Button type="submit" variant="gold" className="w-full" disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {saving && uploadPct !== null
              ? "Uploading…"
              : editing
                ? "Save Changes"
                : "Add Product"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
