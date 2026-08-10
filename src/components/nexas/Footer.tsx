import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Mail, MapPin, Phone, Twitter } from "lucide-react";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-[var(--gradient-dark)]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="space-y-4 md:col-span-2">
          <Logo size="md" onNavigate />
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            NexasStore brings you a curated luxury shopping experience across Pakistan —
            premium products, secure ordering, and fast delivery to your doorstep.
          </p>
          <div className="flex gap-3">
            {[Facebook, Instagram, Twitter].map((Icon, i) => (
              <a
                key={i}
                href="#"
                aria-label="Social link"
                className="flex size-9 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <Icon className="size-4" />
              </a>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-display text-lg font-semibold">Quick Links</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/" className="hover:text-primary">Home</Link>
            </li>
            <li>
              <Link to="/products" className="hover:text-primary">Shop</Link>
            </li>
            <li>
              <Link to="/cart" className="hover:text-primary">Cart</Link>
            </li>
            <li>
              <a href="/#contact" className="hover:text-primary">Contact</a>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h4 className="font-display text-lg font-semibold">Contact</h4>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Phone className="size-4 text-primary" />
              <a href="tel:03219965754" className="hover:text-primary">0321 9965754</a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="size-4 text-primary" />
              <a href="mailto:asifabdulbasit7@gmail.com" className="hover:text-primary break-all">
                asifabdulbasit7@gmail.com
              </a>
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="size-4 text-primary" />
              <span>Pakistan</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border/60 py-5">
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} NexasStore. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
