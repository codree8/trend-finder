"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TrendRadarPoint } from "@/lib/trends/types";

export function TrendRadar({ data }: { data: TrendRadarPoint[] }) {
  const hasSignal = data.some((item) => item.value > 0);

  return (
    <Card className="signal-glow">
      <CardHeader>
        <CardTitle>Signal Radar</CardTitle>
        <CardDescription>
          Central radar view for velocity, source diversity, trend strength,
          hidden-gem potential and creator opportunity.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] rounded-2xl border border-border/10 bg-[#160d0d]/45 p-2 sm:h-[360px] sm:p-4 xl:h-[420px]">
          {hasSignal ? (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data} outerRadius="72%">
                <PolarGrid stroke="rgba(251, 236, 194, 0.16)" />
                <PolarAngleAxis
                  dataKey="axis"
                  tick={{ fill: "#f3e7e2", fontSize: 11 }}
                />
                <Radar
                  name="Signal"
                  dataKey="value"
                  stroke="#a60d0e"
                  fill="#a60d0e"
                  fillOpacity={0.34}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center px-4 text-center text-sm leading-6 text-muted-foreground/70">
              Run a scan to generate the first radar profile from current signals.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
