import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Radar, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ProductStateCardVariant = "empty" | "error" | "loading" | "success";

const iconMap: Record<ProductStateCardVariant, LucideIcon> = {
  empty: Radar,
  error: AlertTriangle,
  loading: Loader2,
  success: CheckCircle2,
};

export function ProductStateCard({
  variant = "empty",
  title,
  description,
  action,
  secondaryAction,
  className,
}: {
  variant?: ProductStateCardVariant;
  title: string;
  description: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
}) {
  const Icon = iconMap[variant];

  return (
    <Card className={cn("border-border/10 bg-card/70", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "rounded-2xl p-3",
              variant === "error"
                ? "bg-primary/15 text-primary"
                : "bg-secondary/15 text-secondary",
            )}
          >
            <Icon className={cn("h-5 w-5", variant === "loading" ? "animate-spin" : "")} />
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <p className="mt-2 text-sm leading-6 text-muted-foreground/78">
              {description}
            </p>
          </div>
        </div>
      </CardHeader>
      {(action || secondaryAction) ? (
        <CardContent className="flex flex-wrap gap-2 pt-0">
          {action}
          {secondaryAction ? <Button asChild variant="ghost" size="sm">{secondaryAction}</Button> : null}
        </CardContent>
      ) : null}
    </Card>
  );
}
