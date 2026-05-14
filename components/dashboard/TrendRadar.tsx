"use client";

import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { radarData } from "@/lib/data/mock-trends";

export function TrendRadar() {
  return (
    <Card className="signal-glow">
      <CardHeader>
        <CardTitle>Signal Radar</CardTitle>
        <CardDescription>
          Central radar view for velocity, novelty, source diversity and creator gap. This is the controlled wow section, not the neon circus.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[420px] rounded-2xl border border-border/10 bg-[#160d0d]/45 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius="75%">
              <PolarGrid stroke="rgba(251, 236, 194, 0.16)" />
              <PolarAngleAxis dataKey="axis" tick={{ fill: "#f3e7e2", fontSize: 12 }} />
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
        </div>
      </CardContent>
    </Card>
  );
}
