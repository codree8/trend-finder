"use client";

import { useEffect, useState } from "react";
import { Eye, Presentation, Sparkles, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  defaultProductPreferences,
  productPreferencesChangedEvent,
  readProductPreferences,
  updateProductPreferences,
  type ProductExperienceMode,
} from "@/lib/preferences/product-preferences";
import { cn } from "@/lib/utils";

const experienceCopy: Record<
  ProductExperienceMode,
  {
    label: string;
    title: string;
    description: string;
    icon: LucideIcon;
  }
> = {
  standard: {
    label: "Standard",
    title: "Standard workspace",
    description:
      "Full product workspace with your saved visibility and report preferences.",
    icon: Eye,
  },
  demo: {
    label: "Demo",
    title: "Demo mode active",
    description:
      "Adds a guided, cleaner explanation layer for showing the product without changing real data.",
    icon: Sparkles,
  },
  pitch: {
    label: "Pitch",
    title: "Pitch mode active",
    description:
      "Keeps the story focused on outcomes, exports and decision flow. Admin machinery stays out of sight.",
    icon: Presentation,
  },
};

export function ProductExperienceBanner({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const [experienceMode, setExperienceMode] = useState<ProductExperienceMode>(
    defaultProductPreferences.experienceMode,
  );

  useEffect(() => {
    function handlePreferenceChange() {
      setExperienceMode(readProductPreferences().experienceMode);
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
  }, []);

  if (experienceMode === "standard" && compact) return null;

  const copy = experienceCopy[experienceMode];
  const Icon = copy.icon;

  return (
    <div
      className={cn(
        "rounded-2xl border border-secondary/20 bg-secondary/10 p-4",
        experienceMode === "standard" ? "border-border/10 bg-card/60" : null,
        className,
      )}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-foreground">{copy.title}</p>
              <Badge variant={experienceMode === "standard" ? "muted" : "secondary"}>
                {copy.label}
              </Badge>
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground/75">
              {copy.description}
            </p>
          </div>
        </div>

        {experienceMode !== "standard" ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() =>
              updateProductPreferences((current) => ({
                ...current,
                experienceMode: "standard",
              }))
            }
          >
            Exit mode
          </Button>
        ) : null}
      </div>
    </div>
  );
}
