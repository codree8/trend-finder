"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export function AppShell({ children }: { children: ReactNode }) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="h-[100dvh] overflow-hidden radar-grid">
      <div className="flex h-full min-h-0">
        <Sidebar
          isMobileOpen={isMobileNavOpen}
          onMobileClose={() => setIsMobileNavOpen(false)}
        />
        <main className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar onOpenMobileNav={() => setIsMobileNavOpen(true)} />
          <div
            id="dashboard-scroll-area"
            className="mx-auto min-h-0 w-full max-w-[1500px] flex-1 overflow-y-auto scroll-smooth px-3 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-5 sm:py-6 lg:px-8"
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
