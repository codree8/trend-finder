"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type MouseEvent } from "react";
import {
  BarChart3,
  BookmarkCheck,
  FileText,
  Gauge,
  Newspaper,
  ListChecks,
  Lightbulb,
  Radar,
  Settings,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const dashboardSections = [
  {
    id: "dashboard-overview",
    href: "/dashboard",
    label: "Dashboard",
    icon: Gauge,
  },
  { id: "charts", href: "/dashboard#charts", label: "Charts", icon: BarChart3 },
  {
    id: "hidden-gems",
    href: "/dashboard#hidden-gems",
    label: "Hidden Gems",
    icon: Sparkles,
  },
  {
    id: "creator-mode",
    href: "/dashboard#creator-mode",
    label: "Creator Mode",
    icon: Lightbulb,
  },
  { id: "signals", href: "/dashboard#signals", label: "Signals", icon: Radar },
] as const;

const routeItems = [
  { href: "/watchlist", label: "Watchlist", icon: BookmarkCheck },
  { href: "/action-queue", label: "Action Queue", icon: ListChecks },
  { href: "/daily-brief", label: "Daily Brief", icon: Newspaper },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

const sectionIds = dashboardSections.map((item) => item.id);

type DashboardSectionId = (typeof sectionIds)[number];

function getInitialDashboardSection(): DashboardSectionId {
  if (typeof window === "undefined") return "dashboard-overview";

  const hashId = window.location.hash.replace("#", "");
  return sectionIds.includes(hashId as DashboardSectionId)
    ? (hashId as DashboardSectionId)
    : "dashboard-overview";
}

export function Sidebar() {
  const pathname = usePathname();
  const [activeDashboardSection, setActiveDashboardSection] =
    useState<DashboardSectionId>(getInitialDashboardSection);

  const isDashboard = pathname === "/dashboard";

  useEffect(() => {
    if (!isDashboard) return;

    const scrollRoot = document.getElementById("dashboard-scroll-area");
    if (!scrollRoot) return;

    let animationFrame = 0;

    const updateActiveSection = () => {
      animationFrame = 0;

      const rootRect = scrollRoot.getBoundingClientRect();
      const activationLine = rootRect.top + 160;

      const visibleSections = sectionIds
        .map((id) => {
          const section = document.getElementById(id);
          if (!section) return null;

          const rect = section.getBoundingClientRect();

          return {
            id,
            top: rect.top,
            bottom: rect.bottom,
          };
        })
        .filter(
          (
            section,
          ): section is {
            id: DashboardSectionId;
            top: number;
            bottom: number;
          } => section !== null,
        );

      const activeFromLine = visibleSections
        .filter((section) => section.top <= activationLine)
        .at(-1);

      const activeFromViewport = visibleSections.find(
        (section) =>
          section.top < rootRect.bottom && section.bottom > rootRect.top,
      );

      const nextActive =
        activeFromLine?.id ?? activeFromViewport?.id ?? "dashboard-overview";

      setActiveDashboardSection((current) =>
        current === nextActive ? current : nextActive,
      );
    };

    const requestActiveSectionUpdate = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(updateActiveSection);
    };

    updateActiveSection();

    scrollRoot.addEventListener("scroll", requestActiveSectionUpdate, {
      passive: true,
    });
    window.addEventListener("resize", requestActiveSectionUpdate);

    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      scrollRoot.removeEventListener("scroll", requestActiveSectionUpdate);
      window.removeEventListener("resize", requestActiveSectionUpdate);
    };
  }, [isDashboard]);

  function handleDashboardNavClick(
    event: MouseEvent<HTMLAnchorElement>,
    sectionId: DashboardSectionId,
  ) {
    if (!isDashboard) return;

    const target = document.getElementById(sectionId);
    if (!target) return;

    event.preventDefault();
    setActiveDashboardSection(sectionId);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#${sectionId}`);
  }

  return (
    <aside className="hidden h-screen w-72 shrink-0 overflow-y-auto border-r border-border/10 bg-[#2c1a1a]/82 px-4 py-5 backdrop-blur-xl lg:sticky lg:top-0 lg:block">
      <div className="mb-8 rounded-2xl border border-border/10 bg-[#241616]/70 p-4 signal-glow">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-radar">
            <Radar className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide text-foreground">
              Trend Finder
            </p>
            <p className="text-xs text-muted-foreground/70">AI Signal Radar</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl border border-border/10 bg-muted/45 px-3 py-2">
          <span className="text-xs text-muted-foreground/75">Mode</span>
          <Badge variant="accent">Creator + Startup</Badge>
        </div>
      </div>

      <nav className="space-y-1">
        {dashboardSections.map((item) => {
          const isActive = isDashboard && activeDashboardSection === item.id;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={(event) => handleDashboardNavClick(event, item.id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                isActive
                  ? "bg-primary text-primary-foreground shadow-radar"
                  : "text-muted-foreground/75 hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        {routeItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                isActive
                  ? "bg-primary text-primary-foreground shadow-radar"
                  : "text-muted-foreground/75 hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 rounded-2xl border border-secondary/20 bg-secondary/10 p-4">
        <p className="text-sm font-semibold text-secondary">Design rule</p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground/75">
          7.5/10 wow. Premium radar, not neon circus. Red means signal. Gold
          means momentum.
        </p>
      </div>
    </aside>
  );
}
