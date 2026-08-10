import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
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
import { useFirebase } from "@/lib/firebase";
import { useUI } from "@/lib/ui-context";

export function AdminLoginModal() {
  const { auth } = useFirebase();
  const { adminLoginOpen, closeAdminLogin } = useUI();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      toast.error("Authentication not ready.");
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      toast.success("Welcome back, Admin!");
      setEmail("");
      setPassword("");
      closeAdminLogin();
      navigate({ to: "/admin" });
    } catch {
      toast.error("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={adminLoginOpen} onOpenChange={(o) => (o ? null : closeAdminLogin())}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-gold-gradient shadow-gold">
            <ShieldCheck className="size-6 text-primary-foreground" />
          </div>
          <DialogTitle className="text-center font-display text-2xl">Admin Login</DialogTitle>
          <DialogDescription className="text-center">
            Restricted access. Authorized personnel only.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="a-email">Email</Label>
            <Input
              id="a-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@nexasstore.com"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="a-pass">Password</Label>
            <Input
              id="a-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <Button type="submit" variant="gold" className="w-full" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            Login
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
