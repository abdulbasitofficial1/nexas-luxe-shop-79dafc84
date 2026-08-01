import { useEffect, useRef } from "react";
import type { EventAnimation } from "@/lib/event-types";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  rot: number;
  vr: number;
}

interface Props {
  animation: EventAnimation;
  colors: string[];
  /** Short celebratory burst instead of an ambient loop. */
  burst?: boolean;
  className?: string;
}

/**
 * Lightweight canvas particle layer. Purely decorative, respects
 * prefers-reduced-motion and never blocks pointer events.
 */
export function EventParticles({ animation, colors, burst = false, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (animation === "none") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);
    const onResize = () => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener("resize", onResize);

    const pick = () => colors[Math.floor(Math.random() * colors.length)] ?? "#d4af37";
    const particles: Particle[] = [];

    const spawn = (count: number, originX?: number, originY?: number) => {
      for (let i = 0; i < count; i += 1) {
        const ox = originX ?? Math.random() * width;
        const oy = originY ?? -20;
        let vx = (Math.random() - 0.5) * 1.5;
        let vy = 1 + Math.random() * 2;
        let size = 4 + Math.random() * 5;
        let maxLife = 200 + Math.random() * 160;

        if (animation === "fireworks") {
          const angle = Math.random() * Math.PI * 2;
          const speed = 1.5 + Math.random() * 3.5;
          vx = Math.cos(angle) * speed;
          vy = Math.sin(angle) * speed;
          size = 2 + Math.random() * 2.5;
          maxLife = 60 + Math.random() * 40;
        } else if (animation === "balloons") {
          vy = -(0.6 + Math.random() * 1.1);
          vx = (Math.random() - 0.5) * 0.4;
          size = 10 + Math.random() * 10;
          maxLife = 400;
        } else if (animation === "snow") {
          vy = 0.5 + Math.random();
          vx = (Math.random() - 0.5) * 0.6;
          size = 2 + Math.random() * 3;
          maxLife = 500;
        } else if (animation === "sparkles") {
          vy = (Math.random() - 0.5) * 0.6;
          vx = (Math.random() - 0.5) * 0.6;
          size = 1.5 + Math.random() * 2.5;
          maxLife = 70 + Math.random() * 60;
        }

        particles.push({
          x: ox,
          y: oy,
          vx,
          vy,
          size,
          color: pick(),
          life: 0,
          maxLife,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.2,
        });
      }
    };

    if (burst) {
      if (animation === "fireworks") {
        for (let i = 0; i < 6; i += 1) {
          spawn(45, Math.random() * width, Math.random() * height * 0.6);
        }
      } else {
        spawn(160);
      }
    }

    let frame = 0;
    let raf = 0;

    const loop = () => {
      frame += 1;
      ctx.clearRect(0, 0, width, height);

      if (!burst) {
        const cadence =
          animation === "snow" ? 6 : animation === "balloons" ? 40 : animation === "sparkles" ? 4 : 8;
        if (frame % cadence === 0) {
          if (animation === "fireworks") {
            if (frame % 90 === 0) spawn(40, Math.random() * width, Math.random() * height * 0.55);
          } else if (animation === "balloons") {
            spawn(1, Math.random() * width, height + 20);
          } else if (animation === "sparkles") {
            spawn(2, Math.random() * width, Math.random() * height);
          } else {
            spawn(2);
          }
        }
      } else if (frame > 260 && particles.length === 0) {
        return;
      }

      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const p = particles[i]!;
        p.life += 1;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;

        if (animation === "confetti") p.vy += 0.02;
        if (animation === "fireworks") {
          p.vy += 0.05;
          p.vx *= 0.985;
        }
        if (animation === "snow") p.x += Math.sin((p.life + p.size) / 30) * 0.4;
        if (animation === "balloons") p.x += Math.sin(p.life / 40) * 0.3;

        const fade = 1 - p.life / p.maxLife;
        if (fade <= 0 || p.y > height + 60 || p.y < -80) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, fade));
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;

        if (animation === "confetti") {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else if (animation === "balloons") {
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 0.7, p.size, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = p.color;
          ctx.globalAlpha *= 0.5;
          ctx.beginPath();
          ctx.moveTo(0, p.size);
          ctx.lineTo(0, p.size * 2.2);
          ctx.stroke();
        } else if (animation === "sparkles") {
          ctx.beginPath();
          for (let s = 0; s < 4; s += 1) {
            const a = (Math.PI / 2) * s;
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a) * p.size * 2.5, Math.sin(a) * p.size * 2.5);
          }
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [animation, colors, burst]);

  if (animation === "none") return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className ?? "pointer-events-none absolute inset-0 size-full"}
    />
  );
}
