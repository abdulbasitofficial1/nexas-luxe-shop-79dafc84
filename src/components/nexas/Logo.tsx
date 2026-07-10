import { useNavigate } from "@tanstack/react-router";
import { useRef } from "react";
import { useUI } from "@/lib/ui-context";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  /** When true, 5 quick clicks reveal the hidden admin login. */
  secret?: boolean;
  onNavigate?: boolean;
}

const sizes = {
  sm: { icon: 24, text: "text-lg" },
  md: { icon: 32, text: "text-2xl" },
  lg: { icon: 40, text: "text-3xl" },
};

export function Logo({ className, size = "md", secret = false, onNavigate = true }: LogoProps) {
  const navigate = useNavigate();
  const { openAdminLogin } = useUI();
  const clicks = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const s = sizes[size];

  const handleClick = () => {
    if (secret) {
      clicks.current += 1;
      if (timer.current) clearTimeout(timer.current);
      if (clicks.current >= 5) {
        clicks.current = 0;
        openAdminLogin();
        return;
      }
      timer.current = setTimeout(() => {
        clicks.current = 0;
      }, 1200);
    }
    if (onNavigate) navigate({ to: "/" });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="NexasStore home"
      className={cn("group flex items-center gap-2.5 select-none", className)}
    >
      <span className="relative inline-flex items-center justify-center rounded-lg bg-gold-gradient p-1.5 shadow-gold transition-transform duration-300 group-hover:scale-105">
        <svg
          width={s.icon}
          height={s.icon}
          viewBox="0 0 32 32"
          fill="none"
          className="text-primary-foreground"
          aria-hidden
        >
          <path
            d="M8 10h16l-1.4 15.2a2 2 0 0 1-2 1.8H11.4a2 2 0 0 1-2-1.8L8 10Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M12 12V9a4 4 0 0 1 8 0v3"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <text
            x="16"
            y="23"
            textAnchor="middle"
            fontFamily="Playfair Display, serif"
            fontSize="10"
            fontWeight="700"
            fill="currentColor"
          >
            N
          </text>
        </svg>
      </span>
      <span className={cn("font-display font-bold tracking-tight", s.text)}>
        <span className="text-foreground">Nexas</span>
        <span className="text-gold-gradient">Store</span>
      </span>
    </button>
  );
}
