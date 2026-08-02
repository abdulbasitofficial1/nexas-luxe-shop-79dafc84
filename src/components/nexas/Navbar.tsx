import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, Menu, Search, ShoppingCart, User, X } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCart } from "@/lib/cart-context";
import { useFirebase } from "@/lib/firebase";
import { cn } from "@/lib/utils";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/products", label: "Shop" },
  { to: "/track-order", label: "Track Order" },
];

export function Navbar() {
  const { count } = useCart();
  const { user } = useFirebase();
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/products", search: { search: term || undefined, category: undefined } });
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/60 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/50">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, x: -16, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="shrink-0"
        >
          <Logo secret size="md" />
        </motion.div>

        <nav className="ml-2 hidden items-center gap-6 lg:flex">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              activeProps={{ className: "text-primary" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          ))}
          <a
            href="/#contact"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            Contact
          </a>
        </nav>

        <form onSubmit={submitSearch} className="relative mx-auto hidden max-w-xl flex-1 sm:block">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search products..."
            aria-label="Search products"
            className="h-10 rounded-full border-border/60 bg-card/60 pl-10 backdrop-blur transition-shadow focus-visible:shadow-gold"
          />
        </form>

        <div className="ml-auto flex items-center gap-1 sm:ml-0">
          <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.88 }} className="hidden sm:block">
            <Link to="/account" aria-label="Wishlist">
              <Button variant="ghost" size="icon" className="rounded-full hover:text-primary">
                <Heart className="size-5" />
              </Button>
            </Link>
          </motion.div>

          <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.88 }} className="relative">
            <Link to="/cart" aria-label="Cart">
              <Button variant="ghost" size="icon" className="rounded-full hover:text-primary">
                <ShoppingCart className="size-5" />
              </Button>
              {count > 0 && (
                <span className="pointer-events-none absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-gold-gradient text-[10px] font-bold text-primary-foreground">
                  {count}
                </span>
              )}
            </Link>
          </motion.div>

          {user ? (
            <Link to="/account" aria-label="Account" className="ml-1 shrink-0">
              <Avatar className="size-9 border border-primary/40 transition-transform hover:scale-105">
                <AvatarImage src={user.photoURL ?? undefined} alt={user.displayName ?? "Account"} />
                <AvatarFallback className="bg-gold-gradient text-xs text-primary-foreground">
                  {(user.displayName || user.email || "U").slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
          ) : (
            <Link to="/account" aria-label="Login" className="shrink-0">
              <Button variant="goldOutline" size="sm" className="hidden rounded-full sm:inline-flex">
                <User className="size-4" /> Login
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:text-primary sm:hidden"
              >
                <User className="size-5" />
              </Button>
            </Link>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="rounded-full lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden border-t border-border/60 transition-[max-height] duration-300 lg:hidden",
          mobileOpen ? "max-h-96" : "max-h-0",
        )}
      >
        <div className="space-y-3 px-4 py-4">
          <form onSubmit={submitSearch} className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search products..."
              className="rounded-full pl-10"
            />
          </form>
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setMobileOpen(false)}
              className="block text-sm font-medium text-muted-foreground hover:text-primary"
            >
              {l.label}
            </Link>
          ))}
          <a
            href="/#contact"
            onClick={() => setMobileOpen(false)}
            className="block text-sm font-medium text-muted-foreground hover:text-primary"
          >
            Contact
          </a>
        </div>
      </div>
    </header>
  );
}
