import type { DashboardMode, DashboardWindow } from "@/lib/trends/types";
import { Button } from "@/components/ui/button";
import { aiCategories } from "@/lib/config/source-presets";

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
      <div className="flex flex-wrap gap-2">
        {modes.map((item) => (
          <Button
            key={item}
            size="sm"
            variant={mode === item ? "default" : "ghost"}
            onClick={() => setMode(item)}
          >
            {item}
          </Button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {windows.map((item) => (
          <Button
            key={item}
            size="sm"
            variant={window === item ? "secondary" : "outline"}
            onClick={() => setWindow(item)}
          >
            {item}
          </Button>
        ))}
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="h-9 rounded-xl border border-border/15 bg-muted px-3 text-sm text-foreground outline-none ring-0 focus:border-secondary/40"
        >
          <option>All</option>
          {aiCategories.map((item) => (
            <option key={item}>{item}</option>
          ))}
          <option>General AI</option>
        </select>
      </div>
    </div>
  );
}
