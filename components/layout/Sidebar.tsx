"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import {
  BarChart3,
  BookmarkCheck,
  FileText,
  Gauge,
  ListChecks,
  Lightbulb,
  Newspaper,
  Radar,
  Settings,
  ShieldCheck,
  Sparkles,
  Wrench,
  Rocket,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  defaultProductPreferences,
  productPreferencesChangedEvent,
  readPreferredWorkspaceView,
  readProductPreferences,
  writePreferredWorkspaceView,
  type ProductPreferences,
  type WorkspaceView,
} from "@/lib/preferences/product-preferences";
import { cn } from "@/lib/utils";
const sectionIds = [
  "dashboard-overview",
  "charts",
  "hidden-gems",
  "creator-mode",
  "signals",
] as const;

type DashboardSectionId = (typeof sectionIds)[number];
type NavItem = {
  id?: DashboardSectionId;
  href: string;
  label: string;
  icon: LucideIcon;
};

type DisabledNavItem = {
  label: string;
  icon: LucideIcon;
  reason: string;
};

const dashboardSections: NavItem[] = [
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
];

const productRouteItems: NavItem[] = [
  { href: "/watchlist", label: "Watchlist", icon: BookmarkCheck },
  { href: "/action-queue", label: "Action Queue", icon: ListChecks },
  { href: "/daily-brief", label: "Daily Brief", icon: Newspaper },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/demo", label: "Demo Flow", icon: Rocket },
  { href: "/settings", label: "Settings", icon: Settings },
];

const adminRouteItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/daily-brief", label: "Daily Brief", icon: Newspaper },
  { href: "/admin/beta-readiness", label: "Beta QA", icon: ListChecks },
  { href: "/admin/scoring-lab", label: "Scoring Lab", icon: SlidersHorizontal },
  { href: "/admin/deployment-readiness", label: "Deployment", icon: Rocket },
  { href: "/demo", label: "Demo Flow", icon: Sparkles },
  { href: "/admin/automation", label: "Boundaries", icon: ShieldCheck },
  { href: "/settings", label: "Settings", icon: Settings },
];

const adminComingSoonItems: DisabledNavItem[] = [
  { label: "Scan Health", icon: Radar, reason: "coming soon" },
  { label: "Export QA", icon: BarChart3, reason: "covered in Reports" },
  { label: "System Diagnostics", icon: Wrench, reason: "coming soon" },
];

function readDashboardSectionFromHash(): DashboardSectionId {
  if (typeof window === "undefined") return "dashboard-overview";

  const hashId = window.location.hash.replace("#", "");
  return sectionIds.includes(hashId as DashboardSectionId)
    ? (hashId as DashboardSectionId)
    : "dashboard-overview";
}

function getHydrationSafeWorkspaceView(pathname: string): WorkspaceView {
  return pathname.startsWith("/admin") ? "admin" : defaultProductPreferences.defaultWorkspace;
}

function isSameRoute(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/" || pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>(() =>
    getHydrationSafeWorkspaceView(pathname),
  );
  const [activeDashboardSection, setActiveDashboardSection] =
    useState<DashboardSectionId>("dashboard-overview");
  const [preferences, setPreferences] = useState<ProductPreferences>(
    defaultProductPreferences,
  );

  const isDashboard = pathname === "/dashboard" || pathname === "/";
  const isAdminView = workspaceView === "admin";

  const navItems = useMemo(() => {
    if (isAdminView) return adminRouteItems;

    const visibleDashboardSections = dashboardSections.filter((item) => {
      if (item.id === "charts") {
        return (
          preferences.dashboardSections.charts ||
          preferences.dashboardSections.sourceBreakdown ||
          preferences.dashboardSections.trendTimeline
        );
      }
      if (item.id === "hidden-gems") return preferences.dashboardSections.hiddenGems;
      if (item.id === "creator-mode") return preferences.dashboardSections.creatorMode;
      if (item.id === "signals") return preferences.dashboardSections.signals;
      return true;
    });

    const visibleProductRoutes = productRouteItems.filter((item) => {
      if (item.href === "/watchlist") return preferences.dashboardSections.watchlist;
      if (item.href === "/action-queue") return preferences.dashboardSections.actionQueue;
      return true;
    });

    return [...visibleDashboardSections, ...visibleProductRoutes];
  }, [isAdminView, preferences.dashboardSections]);

  useEffect(() => {
    if (isDashboard) {
      setActiveDashboardSection(readDashboardSectionFromHash());
    }
  }, [isDashboard, pathname]);

  useEffect(() => {
    function handlePreferenceChange() {
      const nextPreferences = readProductPreferences();
      setPreferences(nextPreferences);
      setWorkspaceView(readPreferredWorkspaceView(pathname));
    }

    handlePreferenceChange();

    window.addEventListener(productPreferencesChangedEvent, handlePreferenceChange);
    window.addEventListener("storage", handlePreferenceChange);

    return () => {
      window.removeEventListener(
        productPreferencesChangedEvent,
        handlePreferenceChange,
      );
      window.removeEventListener("storage", handlePreferenceChange);
    };
  }, [pathname]);

  useEffect(() => {
    if (!isDashboard || isAdminView) return;

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
  }, [isAdminView, isDashboard]);

  function handleWorkspaceChange(nextView: WorkspaceView) {
    setWorkspaceView(nextView);
    writePreferredWorkspaceView(nextView);
  }

  function handleDashboardNavClick(
    event: MouseEvent<HTMLAnchorElement>,
    sectionId: DashboardSectionId,
  ) {
    if (!isDashboard || isAdminView) return;

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
          <span className="text-xs text-muted-foreground/75">Lens</span>
          <Badge variant="accent">Creator + Startup</Badge>
        </div>

        <div className="mt-3 rounded-xl border border-border/10 bg-[#0f0808]/35 p-2">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-xs text-muted-foreground/75">View</span>
            <Badge variant={isAdminView ? "secondary" : "muted"}>
              {isAdminView ? "Admin" : "Product"}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-1">
            {(["product", "admin"] as const).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => handleWorkspaceChange(view)}
                className={cn(
                  "rounded-lg px-2 py-1.5 text-xs font-medium transition",
                  workspaceView === view
                    ? "bg-primary text-primary-foreground shadow-radar"
                    : "text-muted-foreground/75 hover:bg-muted hover:text-foreground",
                )}
              >
                {view === "product" ? "Product" : "Admin"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const isDashboardSection = !isAdminView && item.id;
          const isActive = isDashboardSection
            ? isDashboard && activeDashboardSection === item.id
            : isSameRoute(pathname, item.href);

          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              onClick={
                item.id
                  ? (event) => handleDashboardNavClick(event, item.id as DashboardSectionId)
                  : undefined
              }
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

        {isAdminView ? (
          <div className="pt-3">
            <p className="px-3 pb-2 text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">
              Diagnostics
            </p>
            <div className="space-y-1">
              {adminComingSoonItems.map((item) => (
                <div
                  key={item.label}
                  className="flex cursor-not-allowed items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground/38"
                  aria-disabled="true"
                >
                  <span className="flex items-center gap-3">
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </span>
                  <span className="text-[0.65rem] uppercase tracking-[0.16em]">
                    {item.reason}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
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
