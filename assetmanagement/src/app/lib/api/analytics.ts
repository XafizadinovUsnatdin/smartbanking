import { apiBase, request } from './client';

export interface AssetStatusCount {
  status: string;
  count: number;
}

export interface AssetCategoryCount {
  categoryCode: string;
  count: number;
}

export interface DashboardAnalytics {
  byStatus: AssetStatusCount[];
  byCategory: AssetCategoryCount[];
}

export async function getDashboardAnalytics(): Promise<DashboardAnalytics> {
  return request<DashboardAnalytics>(`${apiBase.analytics}/analytics/dashboard`);
}

