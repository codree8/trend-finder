import { buildActionQueueFromData } from "@/lib/trends/action-queue";
import {
  getDashboardTrends,
  normalizeDashboardWindow,
} from "@/lib/trends/get-dashboard-trends";
import {
  buildWatchlistResponseFromRows,
  listSavedTrendRows,
} from "@/lib/trends/watchlist";
import type {
  ActionQueueResponse,
  DashboardTrendsResponse,
  DashboardWindow,
  WatchlistResponse,
} from "@/lib/trends/types";

export type TrendWorkspaceData = {
  window: DashboardWindow;
  generatedAt: string;
  dashboardData: DashboardTrendsResponse;
  watchlistData: WatchlistResponse;
  actionQueue: ActionQueueResponse;
};

export async function loadTrendWorkspaceData(
  requestedWindow: DashboardWindow = "7d",
): Promise<TrendWorkspaceData> {
  const window = normalizeDashboardWindow(requestedWindow);
  const [dashboardData, savedRows] = await Promise.all([
    getDashboardTrends(window),
    listSavedTrendRows(),
  ]);
  const generatedAt = new Date().toISOString();
  const watchlistData = buildWatchlistResponseFromRows({
    requestedWindow: window,
    rows: savedRows,
    dashboardData,
    generatedAt,
  });
  const actionQueue = buildActionQueueFromData({
    requestedWindow: window,
    dashboardData,
    watchlistData,
    generatedAt,
  });

  return {
    window,
    generatedAt,
    dashboardData,
    watchlistData,
    actionQueue,
  };
}
