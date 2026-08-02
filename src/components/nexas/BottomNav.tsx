import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Heart, Home, LayoutGrid, Search, User } from "lucide-react";

const items = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/products", label: "Categories", icon: LayoutGrid, exact: false },
  { to: "/products", label: "Search", icon: Search, exact: false, key: "search" },
  { to: "/account", label: "Wishlist", icon: Heart, exact: false, key: "wishlist" },
  { to: "/account", label: "Profile", icon: User, exact: false },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-background/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      style={{ borderTopLeftRadius: "1.25rem", borderTopRightRadius: "1.25rem" }}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-2">
        {items.map((item, i) => {
          const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <li key={i} className="flex-1">
              <Link
                to={item.to}
                className="relative flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium"
              >
                {active && (
                  <motion.span
                    layoutId="bottom-nav-indicator"
                    className="absolute -top-px h-0.5 w-8 rounded-full bg-gold-gradient"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <motion.span whileTap={{ scale: 0.85 }}>
                  <Icon
                    className={active ? "size-5 text-primary" : "size-5 text-muted-foreground"}
                  />
                </motion.span>
                <span className={active ? "text-primary" : "text-muted-foreground"}>
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
