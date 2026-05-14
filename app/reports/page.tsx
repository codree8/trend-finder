import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Copy } from "lucide-react";

export default function ReportsPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.32em] text-secondary">Reports</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">HTML intelligence report</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground/80">
            This starter includes the visual report area. In the next phase, this page will generate standalone HTML, CSV and JSON exports from saved trend snapshots.
          </p>
        </div>

        <Card className="signal-glow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary/15 p-3 text-primary">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>Weekly AI Signal Report</CardTitle>
                <CardDescription>Executive summary, hidden gems, content gaps and source evidence.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button><Download className="mr-2 h-4 w-4" />Export HTML</Button>
            <Button variant="secondary"><Download className="mr-2 h-4 w-4" />Export CSV</Button>
            <Button variant="outline"><Copy className="mr-2 h-4 w-4" />Copy ideas</Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
