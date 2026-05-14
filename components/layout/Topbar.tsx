import { Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Topbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-border/10 bg-[#241616]/72 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1500px] items-center justify-between gap-4 px-5 lg:px-8">
        <div className="hidden min-w-0 flex-1 items-center gap-3 rounded-2xl border border-border/10 bg-card/50 px-4 py-2 md:flex">
          <Search className="h-4 w-4 text-muted-foreground/60" />
          <span className="text-sm text-muted-foreground/65">Search trends, repos, sources, content angles...</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-secondary/20 bg-secondary/10 px-3 py-1.5 text-xs text-secondary md:flex">
            <ShieldCheck className="h-3.5 w-3.5" />
            English-only signal scan
          </div>
          <Button size="sm">Scan Trends Now</Button>
        </div>
      </div>
    </header>
  );
}
