import Link from "next/link";
import { BarChart3, FileText, Gauge, Radar, Settings, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge, active: true },
  { href: "/dashboard#hidden-gems", label: "Hidden Gems", icon: Sparkles },
  { href: "/dashboard#signals", label: "Signals", icon: Radar },
  { href: "/dashboard#charts", label: "Charts", icon: BarChart3 },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="hidden w-72 shrink-0 border-r border-border/10 bg-[#2c1a1a]/82 px-4 py-5 backdrop-blur-xl lg:block">
      <div className="mb-8 rounded-2xl border border-border/10 bg-[#241616]/70 p-4 signal-glow">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-radar">
            <Radar className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide text-foreground">Trend Finder</p>
            <p className="text-xs text-muted-foreground/70">AI Signal Radar</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl border border-border/10 bg-muted/45 px-3 py-2">
          <span className="text-xs text-muted-foreground/75">Mode</span>
          <Badge variant="accent">Creator + Startup</Badge>
        </div>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={
              item.active
                ? "flex items-center gap-3 rounded-xl bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground shadow-radar"
                : "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground/75 transition hover:bg-muted hover:text-foreground"
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-8 rounded-2xl border border-secondary/20 bg-secondary/10 p-4">
        <p className="text-sm font-semibold text-secondary">Design rule</p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground/75">
          7.5/10 wow. Premium radar, not neon circus. Red means signal. Gold means momentum.
        </p>
      </div>
    </aside>
  );
}
