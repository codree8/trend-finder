import type {
  DashboardWindow,
  TrendDetailSignal,
  TrendDetailSnapshot,
  TrendLifecycle,
  TrendLifecycleStatus,
  TrendMomentumDirection,
} from "@/lib/trends/types";

type LifecycleSnapshot = {
  window: DashboardWindow | string;
  trendScore: number;
  velocity: number;
  saturation: number;
  mentionCount: number;
  sourceCount: number;
  createdAt: string | Date;
};

type LifecycleSignal = Pick<
  TrendDetailSignal,
  "publishedAt" | "createdAt" | "source" | "qualityScore"
>;

type ComputeLifecycleInput = {
  snapshot: LifecycleSnapshot;
  snapshots?: LifecycleSnapshot[];
  signals?: LifecycleSignal[];
  now?: Date;
};

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function toDate(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function ageHours(value: string | Date | null | undefined, now: Date) {
  const date = toDate(value);
  if (!date) return Number.POSITIVE_INFINITY;
  return Math.max(0, (now.getTime() - date.getTime()) / 36e5);
}

function signalDate(signal: LifecycleSignal) {
  return signal.publishedAt ?? signal.createdAt;
}

function latestSignalAgeHours(
  signals: LifecycleSignal[],
  fallback: Date | string,
  now: Date,
) {
  const dates = signals
    .map((signal) => toDate(signalDate(signal)))
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => b.getTime() - a.getTime());

  return ageHours(dates[0] ?? fallback, now);
}

function freshnessFromAge(age: number) {
  if (age <= 12) return 100;
  if (age <= 24) return 92;
  if (age <= 48) return 82;
  if (age <= 72) return 70;
  if (age <= 168) return 54;
  if (age <= 336) return 34;
  return 16;
}

function latestByWindow(snapshots: LifecycleSnapshot[]) {
  const latest = new Map<string, LifecycleSnapshot>();

  for (const snapshot of snapshots) {
    const existing = latest.get(snapshot.window);
    const currentDate = toDate(snapshot.createdAt);
    const existingDate = toDate(existing?.createdAt);

    if (
      !existing ||
      (currentDate && existingDate && currentDate > existingDate)
    ) {
      latest.set(snapshot.window, snapshot);
    }
  }

  return latest;
}

function momentumFromSnapshots(
  current: LifecycleSnapshot,
  snapshots: LifecycleSnapshot[],
): TrendMomentumDirection {
  const latest = latestByWindow(snapshots);
  const day = latest.get("24h");
  const week = latest.get("7d");
  const month = latest.get("30d");
  const dayVsWeek = day && week ? day.trendScore - week.trendScore : null;
  const weekVsMonth = week && month ? week.trendScore - month.trendScore : null;

  if ((dayVsWeek !== null && dayVsWeek >= 8) || current.velocity >= 76) {
    return "up";
  }

  if (
    (dayVsWeek !== null && dayVsWeek <= -8) ||
    (weekVsMonth !== null && weekVsMonth <= -10)
  ) {
    return "down";
  }

  return "flat";
}

function lifecycleStatus(args: {
  snapshot: LifecycleSnapshot;
  freshnessScore: number;
  signalCount: number;
  momentum: TrendMomentumDirection;
  latestSignalAge: number;
}): TrendLifecycleStatus {
  const { snapshot, freshnessScore, signalCount, momentum, latestSignalAge } =
    args;

  if (latestSignalAge > 336 || freshnessScore <= 24) return "Dormant";
  if (latestSignalAge > 168 || freshnessScore <= 42) return "Stale";
  if (
    momentum === "down" ||
    (snapshot.velocity <= 36 && snapshot.trendScore >= 50)
  )
    return "Cooling";
  if (snapshot.saturation >= 72 && snapshot.trendScore >= 70) return "Peaking";
  if (momentum === "up" && snapshot.velocity >= 66 && signalCount >= 2)
    return "Accelerating";
  return "Emerging";
}

function stalenessRisk(status: TrendLifecycleStatus, freshnessScore: number) {
  if (status === "Dormant") return "high" as const;
  if (status === "Stale" || status === "Cooling") return "medium" as const;
  if (freshnessScore < 55) return "medium" as const;
  return "low" as const;
}

function statusSummary(
  status: TrendLifecycleStatus,
  freshnessScore: number,
  momentum: TrendMomentumDirection,
) {
  if (status === "Accelerating") {
    return `Fresh signals are increasing. Freshness is ${freshnessScore}/100 and momentum is moving up.`;
  }

  if (status === "Emerging") {
    return `The topic is still early. Freshness is ${freshnessScore}/100, with enough signal to keep watching.`;
  }

  if (status === "Peaking") {
    return `The topic is strong but close to saturation. Freshness is ${freshnessScore}/100, so timing matters.`;
  }

  if (status === "Cooling") {
    return `Momentum is weakening. Freshness is ${freshnessScore}/100 and the latest movement is ${momentum}.`;
  }

  if (status === "Stale") {
    return `The topic has older signal and needs new evidence before it deserves priority. Freshness is ${freshnessScore}/100.`;
  }

  return `The topic is mostly dormant. Freshness is ${freshnessScore}/100 and new signal is missing.`;
}

export function computeTrendLifecycle({
  snapshot,
  snapshots = [snapshot],
  signals = [],
  now = new Date(),
}: ComputeLifecycleInput): TrendLifecycle {
  const latestSignalAge = latestSignalAgeHours(
    signals,
    snapshot.createdAt,
    now,
  );
  const baseFreshness = freshnessFromAge(latestSignalAge);
  const sourceBonus = Math.min(12, snapshot.sourceCount * 3);
  const velocityBonus = Math.min(
    10,
    Math.max(0, snapshot.velocity - 55) * 0.35,
  );
  const signalBonus = Math.min(8, signals.length * 1.5);
  const freshnessScore = clampScore(
    baseFreshness + sourceBonus + velocityBonus + signalBonus,
  );
  const momentumDirection = momentumFromSnapshots(
    snapshot,
    snapshots.length ? snapshots : [snapshot],
  );
  const status = lifecycleStatus({
    snapshot,
    freshnessScore,
    signalCount: signals.length || snapshot.mentionCount,
    momentum: momentumDirection,
    latestSignalAge,
  });

  return {
    status,
    freshnessScore,
    momentumDirection,
    stalenessRisk: stalenessRisk(status, freshnessScore),
    latestSignalAgeHours: Number.isFinite(latestSignalAge)
      ? Math.round(latestSignalAge)
      : null,
    summary: statusSummary(status, freshnessScore, momentumDirection),
  };
}

export function lifecycleScoreMultiplier(lifecycle: TrendLifecycle) {
  if (lifecycle.status === "Dormant") return 0.55;
  if (lifecycle.status === "Stale") return 0.68;
  if (lifecycle.status === "Cooling") return 0.82;
  if (lifecycle.status === "Peaking") return 0.96;
  if (lifecycle.status === "Accelerating") return 1.08;
  return 1;
}
