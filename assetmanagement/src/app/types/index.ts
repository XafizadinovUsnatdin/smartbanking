export * from '../lib/api/types';

import type { AssetStatus } from '../lib/api/types';

export interface AssetStatistics {
  totalAssets: number;
  byStatus: Record<AssetStatus, number>;
  byCategory: Record<string, number>;
  byDepartment: Record<string, number>;
  recentlyAdded: number;
  aging: number;
}

