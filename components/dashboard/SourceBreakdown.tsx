"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sourceBreakdown } from "@/lib/data/mock-trends";

export function SourceBreakdown() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Signal Sources</CardTitle>
        <CardDescription>Where the current signal is coming from.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sourceBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="source" tick={{ fill: "#f3e7e2", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#f3e7e2", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#2c1a1a", border: "1px solid rgba(231,210,203,.16)", borderRadius: 14, color: "#fff8f5" }}
              />
              <Bar dataKey="signals" fill="#dda936" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
