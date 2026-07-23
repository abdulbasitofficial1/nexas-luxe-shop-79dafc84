import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { doc, updateDoc } from "firebase/firestore";
import {
  Heart,
  Home,
  Loader2,
  LogOut,
  MapPin,
  Package,
  Pencil,
  Plus,
  Settings as SettingsIcon,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFirebase } from "@/lib/firebase";
import {
  addAddress,
  deleteAddress,
  removeFromWishlist,
  resetPassword,
  signIn,
  signInWithGoogle,
  signOut,
  signUp,
  updateAddress,
  updateUserEmail,
  updateUserPassword,
  updateUserProfile,
  useAddresses,
  useUserOrders,
  useUserProfile,
  useWishlist,
} from "@/lib/auth";
import type { Address } from "@/lib/types";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Your Account — NexasStore" },
      { name: "description", content: "Manage your NexasStore profile, orders, wishlist, and saved addresses." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user, ready } = useFirebase();
  if (!ready) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }
  return user ? <Dashboard /> : <AuthGate />;
}

/* -------------------- Auth (login / signup / forgot) -------------------- */

function AuthGate() {
  const { auth, db } = useFirebase();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db) return;
    setLoading(true);
    try {
      if (mode === "login") {
        await signIn(auth, db, email.trim(), password);
        toast.success("Welcome back!");
      } else if (mode === "signup") {
        await signUp(auth, db, name.trim(), email.trim(), password);
        toast.success("Account created!");
      } else {
        await resetPassword(auth, email.trim());
        toast.success("Password reset email sent.");
        setMode("login");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (!auth || !db) return;
    setLoading(true);
    try {
      await signInWithGoogle(auth, db);
      toast.success("Signed in with Google!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-10">
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="font-display text-2xl">
            {mode === "login" && "Welcome Back"}
            {mode === "signup" && "Create Your Account"}
            {mode === "forgot" && "Reset Your Password"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {mode === "login" && "Sign in to view your orders and wishlist."}
            {mode === "signup" && "Join NexasStore for a premium experience."}
            {mode === "forgot" && "We'll email you a reset link."}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="a-name">Full Name</Label>
                <Input id="a-name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="a-email">Email</Label>
              <Input id="a-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            {mode !== "forgot" && (
              <div className="space-y-1.5">
                <Label htmlFor="a-pass">Password</Label>
                <Input
                  id="a-pass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
            )}
            <Button type="submit" variant="gold" className="w-full" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              {mode === "login" && "Login"}
              {mode === "signup" && "Sign Up"}
              {mode === "forgot" && "Send Reset Link"}
            </Button>
          </form>

          {mode !== "forgot" && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>
              <Button type="button" variant="goldOutline" className="w-full" onClick={handleGoogle} disabled={loading}>
                Continue with Google
              </Button>
            </>
          )}

          <div className="flex flex-col gap-1 text-center text-sm">
            {mode === "login" && (
              <>
                <button type="button" className="text-primary hover:underline" onClick={() => setMode("forgot")}>
                  Forgot password?
                </button>
                <button type="button" className="text-muted-foreground hover:text-primary" onClick={() => setMode("signup")}>
                  Don't have an account? <span className="text-primary">Sign up</span>
                </button>
              </>
            )}
            {mode === "signup" && (
              <button type="button" className="text-muted-foreground hover:text-primary" onClick={() => setMode("login")}>
                Already have an account? <span className="text-primary">Login</span>
              </button>
            )}
            {mode === "forgot" && (
              <button type="button" className="text-muted-foreground hover:text-primary" onClick={() => setMode("login")}>
                Back to login
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------- Dashboard -------------------- */

function Dashboard() {
  const { auth, user } = useFirebase();
  const { profile } = useUserProfile();

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    toast.success("Signed out.");
  };

  const name = profile?.name || user?.displayName || "Customer";
  const initials = name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col items-start gap-4 rounded-2xl border border-border/60 bg-card p-6 shadow-elegant sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="size-16 border-2 border-primary/40">
            <AvatarImage src={profile?.photoURL || user?.photoURL || undefined} alt={name} />
            <AvatarFallback className="bg-gold-gradient text-primary-foreground">{initials || "U"}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-display text-2xl font-bold">{name}</h1>
            <p className="text-sm text-muted-foreground">{profile?.email || user?.email}</p>
            {profile?.createdAt && (
              <p className="text-xs text-muted-foreground">
                Member since {new Date(profile.createdAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
        <Button variant="goldOutline" onClick={handleLogout}>
          <LogOut className="size-4" /> Logout
        </Button>
      </div>

      <Tabs defaultValue="profile" className="flex flex-col gap-6 md:flex-row">
        <TabsList className="flex h-auto w-full flex-row overflow-x-auto rounded-xl bg-card p-2 md:w-56 md:flex-col md:items-stretch">
          <TabsTrigger value="profile" className="justify-start gap-2"><UserIcon className="size-4" /> Profile</TabsTrigger>
          <TabsTrigger value="orders" className="justify-start gap-2"><Package className="size-4" /> Orders</TabsTrigger>
          <TabsTrigger value="wishlist" className="justify-start gap-2"><Heart className="size-4" /> Wishlist</TabsTrigger>
          <TabsTrigger value="addresses" className="justify-start gap-2"><MapPin className="size-4" /> Addresses</TabsTrigger>
          <TabsTrigger value="settings" className="justify-start gap-2"><SettingsIcon className="size-4" /> Settings</TabsTrigger>
        </TabsList>

        <div className="flex-1">
          <TabsContent value="profile"><ProfileTab /></TabsContent>
          <TabsContent value="orders"><OrdersTab /></TabsContent>
          <TabsContent value="wishlist"><WishlistTab /></TabsContent>
          <TabsContent value="addresses"><AddressesTab /></TabsContent>
          <TabsContent value="settings"><SettingsTab /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

/* -------------------- Tabs -------------------- */

function ProfileTab() {
  const { user } = useFirebase();
  const { profile } = useUserProfile();
  return (
    <Card>
      <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <InfoRow label="Full Name" value={profile?.name || user?.displayName || "—"} />
        <InfoRow label="Email" value={profile?.email || user?.email || "—"} />
        <InfoRow
          label="Account Created"
          value={profile?.createdAt ? new Date(profile.createdAt).toLocaleString() : "—"}
        />
        <InfoRow label="User ID" value={user?.uid ?? "—"} />
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-secondary/30 p-3">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 break-all font-medium">{value}</p>
    </div>
  );
}

function OrdersTab() {
  const { orders, loading } = useUserOrders();
  const { db } = useFirebase();
  const [now, setNow] = useState(Date.now());

useEffect(() => {
  const timer = setInterval(() => {
    setNow(Date.now());
  }, 60000);

  return () => clearInterval(timer);
}, []);

  if (loading) return <LoaderBlock />;
  if (!orders.length) return <EmptyBlock icon={<Package className="size-8" />} title="No orders yet" hint="Your placed orders will appear here." />;
  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <Card key={o.id}>
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row">
            {o.productImage ? (
              <img src={o.productImage} alt={o.productName} className="size-24 rounded-lg object-cover" />
            ) : (
              <div className="flex size-24 items-center justify-center rounded-lg bg-secondary/50 text-muted-foreground">
                <Package className="size-6" />
              </div>
            )}
            <div className="flex flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{o.productName}</h3>
                <Badge variant={o.orderStatus === "Completed" ? "default" : "secondary"}>{o.orderStatus}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Quantity: {o.quantity}</p>
              <p className="text-sm text-muted-foreground">
                {o.createdAt ? new Date(o.createdAt).toLocaleString() : ""}
              </p>
              <p className="mt-1 font-bold text-gold-gradient">Rs {o.totalAmount.toLocaleString()}</p>
              {o.orderStatus !== "Cancelled" &&
 o.orderStatus !== "Completed" &&
 o.createdAt &&
now - o.createdAt <= 5 * 60 * 60 * 1000 && (
  <Button
    variant="destructive"
    size="sm"
    onClick={async () => {
      if (!db) return;

      const reason = prompt("Why do you want to cancel this order?");
      if (!reason) return;

      await updateDoc(doc(db, "orders", o.id), {
        orderStatus: "Cancelled",
        cancelReason: reason,
        cancelledAt: Date.now(),
      });

      toast.success("Order cancelled");
    }}
  >
    Cancel Order
  </Button>
)}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function WishlistTab() {
  const { db, user } = useFirebase();
  const { items, loading } = useWishlist();
  if (loading) return <LoaderBlock />;
  if (!items.length) return <EmptyBlock icon={<Heart className="size-8" />} title="Your wishlist is empty" hint="Tap the heart on any product to save it." />;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((it) => (
        <Card key={it.id}>
          <CardContent className="flex gap-3 p-3">
            <Link to="/products/$productId" params={{ productId: it.id }} className="shrink-0">
              <img src={it.image} alt={it.name} className="size-20 rounded-lg object-cover" />
            </Link>
            <div className="flex flex-1 flex-col">
              <Link to="/products/$productId" params={{ productId: it.id }} className="font-medium hover:text-primary">
                {it.name}
              </Link>
              <p className="mt-auto text-sm font-bold text-gold-gradient">Rs {it.price.toLocaleString()}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                if (!db || !user) return;
                await removeFromWishlist(db, user.uid, it.id);
                toast.success("Removed from wishlist");
              }}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AddressesTab() {
  const { db, user } = useFirebase();
  const { addresses, loading } = useAddresses();
  const [editing, setEditing] = useState<Address | null>(null);
  const [open, setOpen] = useState(false);

  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (a: Address) => { setEditing(a); setOpen(true); };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Saved Addresses</CardTitle>
        <Button variant="gold" size="sm" onClick={openNew}><Plus className="size-4" /> Add</Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <LoaderBlock />
        ) : !addresses.length ? (
          <EmptyBlock icon={<Home className="size-8" />} title="No saved addresses" hint="Add one for faster checkout." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {addresses.map((a) => (
              <div key={a.id} className="rounded-lg border border-border/60 bg-secondary/30 p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{a.label}</p>
                    <p className="text-sm">{a.fullName}</p>
                    <p className="text-sm text-muted-foreground">{a.phone}</p>
                    <p className="text-sm text-muted-foreground">{a.line1}, {a.city}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Pencil className="size-4" /></Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        if (!db || !user) return;
                        await deleteAddress(db, user.uid, a.id);
                        toast.success("Address deleted");
                      }}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <AddressDialog open={open} onOpenChange={setOpen} editing={editing} />
    </Card>
  );
}

function AddressDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Address | null;
}) {
  const { db, user } = useFirebase();
  const [form, setForm] = useState({ label: "", fullName: "", phone: "", line1: "", city: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        editing
          ? { label: editing.label, fullName: editing.fullName, phone: editing.phone, line1: editing.line1, city: editing.city }
          : { label: "", fullName: "", phone: "", line1: "", city: "" },
      );
    }
  }, [open, editing]);

  const save = async () => {
    if (!db || !user) return;
    setSaving(true);
    try {
      if (editing) await updateAddress(db, user.uid, editing.id, form);
      else await addAddress(db, user.uid, form);
      toast.success(editing ? "Address updated" : "Address added");
      onOpenChange(false);
    } catch {
      toast.error("Failed to save address");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? "Edit Address" : "New Address"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Label (Home, Office)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          <Input placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Textarea placeholder="Address line" value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} rows={2} />
          <Input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
        <DialogFooter>
          <Button variant="gold" onClick={save} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SettingsTab() {
  const { auth, db, user } = useFirebase();
  const [name, setName] = useState(user?.displayName ?? "");
  const [photoURL, setPhotoURL] = useState(user?.photoURL ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const saveProfile = async () => {
    if (!auth || !db) return;
    setLoading(true);
    try {
      await updateUserProfile(auth, db, { name, photoURL });
      toast.success("Profile updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally { setLoading(false); }
  };

  const saveEmail = async () => {
    if (!auth || !db) return;
    setLoading(true);
    try {
      await updateUserEmail(auth, db, email);
      toast.success("Email updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed — you may need to re-login.");
    } finally { setLoading(false); }
  };

  const savePassword = async () => {
    if (!auth) return;
    setLoading(true);
    try {
      await updateUserPassword(auth, password);
      toast.success("Password updated");
      setPassword("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed — you may need to re-login.");
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5"><Label>Full Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Profile Picture URL</Label><Input value={photoURL} onChange={(e) => setPhotoURL(e.target.value)} placeholder="https://..." /></div>
          <Button variant="gold" onClick={saveProfile} disabled={loading}>Save Profile</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Update Email</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button variant="gold" onClick={saveEmail} disabled={loading}>Update Email</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" minLength={6} />
          <Button variant="gold" onClick={savePassword} disabled={loading || password.length < 6}>Update Password</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function LoaderBlock() {
  return <div className="flex justify-center py-8"><Loader2 className="size-6 animate-spin text-primary" /></div>;
}
function EmptyBlock({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
      {icon}
      <p className="font-medium text-foreground">{title}</p>
      <p className="text-sm">{hint}</p>
    </div>
  );
}
