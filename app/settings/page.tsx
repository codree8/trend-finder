import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sourcePresets } from "@/lib/config/source-presets";

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.32em] text-secondary">Settings</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Source presets</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground/80">
            These presets control the first version of the filter logic: technical, creator, startup and research modes.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {sourcePresets.map((preset) => (
            <Card key={preset.id}>
              <CardHeader>
                <CardTitle>{preset.label}</CardTitle>
                <CardDescription>{preset.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {preset.sources.map((source) => (
                    <span key={source} className="rounded-full border border-border/15 bg-muted px-3 py-1 text-xs text-muted-foreground">
                      {source}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
