"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TrendTimelinePoint } from "@/lib/trends/types";

export function TrendTimeline({ data }: { data: TrendTimelinePoint[] }) {
  const hasSignal = data.some(
    (item) => item.hot > 0 || item.trend > 0 || item.baseline > 0,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trend Timeline</CardTitle>
        <CardDescription>
          24h hot signal, 7d trend signal and 30d baseline movement.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[220px]">
          {hasSignal ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 10, right: 12, left: -20, bottom: 0 }}
              >
                <XAxis
                  dataKey="day"
                  tick={{ fill: "#f3e7e2", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#f3e7e2", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#2c1a1a",
                    border: "1px solid rgba(231,210,203,.16)",
                    borderRadius: 14,
                    color: "#fff8f5",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="hot"
                  stroke="#a60d0e"
                  strokeWidth={3}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="trend"
                  stroke="#dda936"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="baseline"
                  stroke="#b55c38"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-2xl border border-border/10 bg-[#160d0d]/38 text-sm text-muted-foreground/70">
              Timeline will fill after you run more than one scan.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
