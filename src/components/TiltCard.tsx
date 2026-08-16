import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type TiltCardProps = {
  children: ReactNode;
  className?: string;
  intensity?: number;
  glow?: "violet" | "cyan" | "none";
};

export function TiltCard({ children, className, intensity = 10, glow = "violet" }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<{ rx: number; ry: number; mx: number; my: number; active: boolean }>({
    rx: 0,
    ry: 0,
    mx: 50,
    my: 50,
    active: false,
  });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setStyle({
      rx: (0.5 - py) * intensity * 2,
      ry: (px - 0.5) * intensity * 2,
      mx: px * 100,
      my: py * 100,
      active: true,
    });
  };

  return (
    <div className="scene-3d">
      <div
        ref={ref}
        onMouseMove={handleMove}
        onMouseLeave={() => setStyle((s) => ({ ...s, rx: 0, ry: 0, active: false }))}
        className={cn(
          "glass relative overflow-hidden transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform",
          glow === "violet" && "glow-violet",
          glow === "cyan" && "glow-cyan",
          className,
        )}
        style={{
          transform: `rotateX(${style.rx}deg) rotateY(${style.ry}deg) translateZ(0) scale(${style.active ? 1.015 : 1})`,
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500"
          style={{
            opacity: style.active ? 1 : 0,
            background: `radial-gradient(420px circle at ${style.mx}% ${style.my}%, color-mix(in oklab, var(--color-primary) 16%, transparent), transparent 70%)`,
          }}
        />
        <div className="relative" style={{ transform: "translateZ(40px)" }}>
          {children}
        </div>
      </div>
    </div>
  );
}