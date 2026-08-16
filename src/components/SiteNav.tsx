import { Link } from "@tanstack/react-router";
import { AudioLines, LayoutDashboard, Sparkles, FlaskConical, Mic } from "lucide-react";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/record", label: "Record", icon: Mic },
  { to: "/new", label: "Upload Studio", icon: Sparkles },
  { to: "/evaluation", label: "Evaluation", icon: FlaskConical },
] as const;

export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary glow-violet">
            <AudioLines className="size-5" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">
            Echo<span className="text-gradient">Mind</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex items-center gap-2 rounded-full px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
              activeProps={{ className: "bg-secondary/80 text-foreground" }}
            >
              <Icon className="size-4" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}