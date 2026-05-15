import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen overflow-hidden radar-grid">
      <div className="flex h-full min-h-0">
        <Sidebar />
        <main className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar />
          <div
            id="dashboard-scroll-area"
            className="mx-auto min-h-0 w-full max-w-[1500px] flex-1 overflow-y-auto scroll-smooth px-5 py-6 lg:px-8"
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
