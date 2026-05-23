"use client";

import {
  Bar,
  BarChart,
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
import type { SourceBreakdownItem } from "@/lib/trends/types";

export function SourceBreakdown({ data }: { data: SourceBreakdownItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Signal Sources</CardTitle>
        <CardDescription>
          Where the current signal is coming from.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[190px] sm:h-[220px]">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 10, right: 6, left: -28, bottom: 0 }}
              >
                <XAxis
                  dataKey="source"
                  tick={{ fill: "#f3e7e2", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#f3e7e2", fontSize: 10 }}
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
                <Bar dataKey="signals" fill="#dda936" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-2xl border border-border/10 bg-[#160d0d]/38 text-sm text-muted-foreground/70">
              No source signals found for this window yet.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
