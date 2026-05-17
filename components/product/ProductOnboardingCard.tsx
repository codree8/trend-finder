"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Compass, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  defaultProductPreferences,
  markOnboardingDismissed,
  productPreferencesChangedEvent,
  readProductPreferences,
  updateProductPreferences,
} from "@/lib/preferences/product-preferences";

export function ProductOnboardingCard() {
  const [isVisible, setIsVisible] = useState(
    !defaultProductPreferences.onboardingDismissed,
  );

  useEffect(() => {
    function handlePreferenceChange() {
      setIsVisible(!readProductPreferences().onboardingDismissed);
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

  if (!isVisible) return null;

  return (
    <section className="rounded-3xl border border-secondary/20 bg-[#160d0d]/78 p-5 shadow-card signal-glow">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
            <Compass className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">First run</Badge>
              <Badge variant="muted">Product workspace</Badge>
            </div>
            <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-foreground">
              Start with the clean product setup.
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground/78">
              Keep the dashboard readable, use a 7-day brief by default, export
              PDF first, and keep admin diagnostics in the Admin workspace. No
              fake data, no background delivery switch hiding in the bushes.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              updateProductPreferences({
                ...defaultProductPreferences,
                onboardingDismissed: true,
              });
              setIsVisible(false);
            }}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Use recommended setup
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              markOnboardingDismissed();
              setIsVisible(false);
            }}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Got it
          </Button>
        </div>
      </div>
    </section>
  );
}
