"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { timelineData } from "@/lib/data/mock-trends";

export function TrendTimeline() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Trend Timeline</CardTitle>
        <CardDescription>24h hot signal, 7d trend signal and 30d baseline movement.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timelineData} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fill: "#f3e7e2", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#f3e7e2", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#2c1a1a", border: "1px solid rgba(231,210,203,.16)", borderRadius: 14, color: "#fff8f5" }}
              />
              <Line type="monotone" dataKey="hot" stroke="#a60d0e" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="trend" stroke="#dda936" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="baseline" stroke="#b55c38" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
