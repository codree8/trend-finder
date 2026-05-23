import type { DashboardMode, DashboardWindow } from "@/lib/trends/types";
import { Button } from "@/components/ui/button";
import { aiCategories } from "@/lib/config/ai-categories";

type Props = {
  mode: DashboardMode;
  setMode: (mode: DashboardMode) => void;
  window: DashboardWindow;
  setWindow: (window: DashboardWindow) => void;
  category: string;
  setCategory: (category: string) => void;
};

const modes: DashboardMode[] = [
  "All",
  "Technical",
  "Creator",
  "Startup",
  "Research",
];
const windows: DashboardWindow[] = ["24h", "7d", "30d"];

export function TrendFilters({
  mode,
  setMode,
  window,
  setWindow,
  category,
  setCategory,
}: Props) {
  return (
    <div className="w-full rounded-2xl border border-border/10 bg-card/72 p-3 shadow-card backdrop-blur xl:max-w-xl">
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {modes.map((item) => (
          <Button
            key={item}
            size="sm"
            variant={mode === item ? "default" : "ghost"}
            onClick={() => setMode(item)}
            className="w-full sm:w-auto"
          >
            {item}
          </Button>
        ))}
      </div>
      <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap sm:items-center">
        <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
          {windows.map((item) => (
            <Button
              key={item}
              size="sm"
              variant={window === item ? "secondary" : "outline"}
              onClick={() => setWindow(item)}
              className="w-full sm:w-auto"
            >
              {item}
            </Button>
          ))}
        </div>
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="h-9 w-full rounded-xl border border-border/15 bg-muted px-3 text-sm text-foreground outline-none ring-0 focus:border-secondary/40 sm:w-auto sm:min-w-[170px]"
        >
          <option>All</option>
          {aiCategories.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
