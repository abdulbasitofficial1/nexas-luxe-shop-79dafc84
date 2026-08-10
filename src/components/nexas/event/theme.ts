import type { CSSProperties } from "react";
import type { EventTheme, StoreEvent } from "@/lib/event-types";

/** Background layer style derived from the event theme. */
export function eventBackgroundStyle(event: StoreEvent): CSSProperties {
  const { primary, secondary, accent, backgroundStyle } = event.theme;
  switch (backgroundStyle) {
    case "solid":
      return { background: secondary };
    case "image":
      return event.backgroundImage
        ? {
            backgroundImage: `linear-gradient(to bottom, ${hexA(secondary, 0.72)}, ${hexA(secondary, 0.94)}), url(${event.backgroundImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }
        : { background: `linear-gradient(135deg, ${secondary}, ${primary})` };
    case "mesh":
      return {
        background: `radial-gradient(60% 80% at 15% 20%, ${hexA(primary, 0.55)} 0%, transparent 60%), radial-gradient(50% 70% at 85% 15%, ${hexA(accent, 0.4)} 0%, transparent 60%), radial-gradient(70% 90% at 50% 110%, ${hexA(primary, 0.35)} 0%, transparent 70%), ${secondary}`,
      };
    case "gradient":
    default:
      return {
        background: `linear-gradient(135deg, ${secondary} 0%, ${mix(secondary, primary)} 55%, ${primary} 100%)`,
      };
  }
}

export function eventButtonStyle(theme: EventTheme): CSSProperties {
  switch (theme.buttonStyle) {
    case "outline":
      return {
        background: "transparent",
        border: `1.5px solid ${theme.primary}`,
        color: theme.primary,
      };
    case "glass":
      return {
        background: hexA(theme.accent, 0.16),
        border: `1px solid ${hexA(theme.accent, 0.45)}`,
        color: theme.accent,
        backdropFilter: "blur(10px)",
      };
    case "gradient":
      return {
        background: `linear-gradient(120deg, ${theme.primary}, ${theme.accent})`,
        color: readable(theme.primary),
        border: "none",
      };
    case "solid":
    default:
      return { background: theme.primary, color: readable(theme.primary), border: "none" };
  }
}

function clamp(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function parse(hex: string): [number, number, number] {
  const h = hex.replace("#", "").trim();
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h.padEnd(6, "0").slice(0, 6);
  return [
    parseInt(full.slice(0, 2), 16) || 0,
    parseInt(full.slice(2, 4), 16) || 0,
    parseInt(full.slice(4, 6), 16) || 0,
  ];
}

/** hex + alpha -> rgba() string. */
export function hexA(hex: string, alpha: number): string {
  const [r, g, b] = parse(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function mix(a: string, b: string, ratio = 0.5): string {
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  return `rgb(${clamp(r1 + (r2 - r1) * ratio)}, ${clamp(g1 + (g2 - g1) * ratio)}, ${clamp(b1 + (b2 - b1) * ratio)})`;
}

/** Pick black or white text for a background colour. */
export function readable(hex: string): string {
  const [r, g, b] = parse(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#0b0b0b" : "#ffffff";
}
