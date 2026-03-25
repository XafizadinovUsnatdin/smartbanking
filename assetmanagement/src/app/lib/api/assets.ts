import { apiBase, request, requestBlob } from './client';
import type {
  Asset,
  AssetAssignment,
  AssignedAsset,
  AssetAvailableSummary,
  AssetCategory,
  AssetPhoto,
  AssetStatus,
  AssetStatusHistory,
  OwnerType,
  PageResponse,
} from './types';

const CACHE_TTL_MS = 60_000;
let categoriesCache: { value: AssetCategory[]; expiresAt: number } | null = null;
let categoriesInflight: Promise<AssetCategory[]> | null = null;

function invalidateCategoriesCache() {
  categoriesCache = null;
  categoriesInflight = null;
}

export interface AssetSearchParams {
  q?: string;
  categoryCode?: string;
  status?: AssetStatus;
  page?: number;
  size?: number;
  sort?: string;
}

export async function listAssets(params: AssetSearchParams = {}): Promise<PageResponse<Asset>> {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.categoryCode) qs.set('categoryCode', params.categoryCode);
  if (params.status) qs.set('status', params.status);
  if (typeof params.page === 'number') qs.set('page', String(params.page));
  if (typeof params.size === 'number') qs.set('size', String(params.size));
  if (params.sort) qs.set('sort', params.sort);
  const url = `${apiBase.asset}/assets${qs.toString() ? `?${qs}` : ''}`;
  return request<PageResponse<Asset>>(url);
}

export interface AssignedAssetsParams {
  ownerType: OwnerType;
  ownerId: string;
  q?: string;
  categoryCode?: string;
  status?: AssetStatus;
  page?: number;
  size?: number;
}

export async function listAssignedAssets(params: AssignedAssetsParams): Promise<PageResponse<AssignedAsset>> {
  const qs = new URLSearchParams();
  qs.set('ownerType', params.ownerType);
  qs.set('ownerId', params.ownerId);
  if (params.q) qs.set('q', params.q);
  if (params.categoryCode) qs.set('categoryCode', params.categoryCode);
  if (params.status) qs.set('status', params.status);
  if (typeof params.page === 'number') qs.set('page', String(params.page));
  if (typeof params.size === 'number') qs.set('size', String(params.size));
  return request<PageResponse<AssignedAsset>>(`${apiBase.asset}/assets/assigned?${qs.toString()}`);
}

export interface OwnerRef {
  ownerType: OwnerType;
  ownerId: string;
}

export interface BulkAssignedAssetsParams {
  owners: OwnerRef[];
  q?: string;
  categoryCode?: string;
  status?: AssetStatus;
  page?: number;
  size?: number;
}

export async function listAssignedAssetsBulk(params: BulkAssignedAssetsParams): Promise<PageResponse<AssignedAsset>> {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.categoryCode) qs.set('categoryCode', params.categoryCode);
  if (params.status) qs.set('status', params.status);
  if (typeof params.page === 'number') qs.set('page', String(params.page));
  if (typeof params.size === 'number') qs.set('size', String(params.size));

  const url = `${apiBase.asset}/assets/assigned/bulk${qs.toString() ? `?${qs.toString()}` : ''}`;
  return request<PageResponse<AssignedAsset>>(url, {
    method: 'POST',
    body: JSON.stringify({ owners: params.owners }),
  });
}

export interface AgingParams {
  days?: number;
  q?: string;
  categoryCode?: string;
  status?: AssetStatus;
  includeTerminal?: boolean;
  page?: number;
  size?: number;
}

export async function listAgingAssets(params: AgingParams = {}): Promise<PageResponse<Asset>> {
  const qs = new URLSearchParams();
  qs.set('days', String(params.days ?? 365));
  if (params.q) qs.set('q', params.q);
  if (params.categoryCode) qs.set('categoryCode', params.categoryCode);
  if (params.status) qs.set('status', params.status);
  if (typeof params.includeTerminal === 'boolean') qs.set('includeTerminal', String(params.includeTerminal));
  if (typeof params.page === 'number') qs.set('page', String(params.page));
  if (typeof params.size === 'number') qs.set('size', String(params.size));
  return request<PageResponse<Asset>>(`${apiBase.asset}/assets/aging?${qs.toString()}`);
}

export async function getAsset(id: string): Promise<Asset> {
  return request<Asset>(`${apiBase.asset}/assets/${id}`);
}

export interface CreateAssetRequest {
  name: string;
  type: string;
  categoryCode: string;
  serialNumber: string;
  description?: string | null;
  inventoryTag?: string | null;
  model?: string | null;
  vendor?: string | null;
  purchaseDate?: string | null;
  warrantyUntil?: string | null;
  cost?: string | number | null;
}

export async function createAsset(body: CreateAssetRequest): Promise<Asset> {
  return request<Asset>(`${apiBase.asset}/assets`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export interface UpdateAssetRequest {
  name: string;
  type: string;
  categoryCode: string;
  serialNumber: string;
  description?: string | null;
  inventoryTag?: string | null;
  model?: string | null;
  vendor?: string | null;
  purchaseDate?: string | null;
  warrantyUntil?: string | null;
  cost?: string | number | null;
}

export async function updateAsset(id: string, body: UpdateAssetRequest): Promise<Asset> {
  return request<Asset>(`${apiBase.asset}/assets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export interface AssignRequest {
  ownerType: OwnerType;
  ownerId: string;
  reason?: string | null;
}

export async function assignAsset(id: string, body: AssignRequest): Promise<Asset> {
  return request<Asset>(`${apiBase.asset}/assets/${id}/assign`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export interface ReturnRequest {
  reason: string;
  nextStatus?: Exclude<AssetStatus, 'ASSIGNED'>;
}

export async function returnAsset(id: string, body: ReturnRequest): Promise<Asset> {
  return request<Asset>(`${apiBase.asset}/assets/${id}/return`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export interface ChangeStatusRequest {
  toStatus: Exclude<AssetStatus, 'ASSIGNED'>;
  reason?: string | null;
}

export async function changeAssetStatus(id: string, body: ChangeStatusRequest): Promise<Asset> {
  return request<Asset>(`${apiBase.asset}/assets/${id}/status`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getCurrentAssignment(assetId: string): Promise<AssetAssignment | null> {
  return request<AssetAssignment | null>(`${apiBase.asset}/assets/${assetId}/assignment`);
}

export async function listCurrentAssignments(assetIds: string[]): Promise<AssetAssignment[]> {
  return request<AssetAssignment[]>(`${apiBase.asset}/assets/assignments/current`, {
    method: 'POST',
    body: JSON.stringify({ assetIds }),
  });
}

export async function listAssignmentHistory(assetId: string): Promise<AssetAssignment[]> {
  return request<AssetAssignment[]>(`${apiBase.asset}/assets/${assetId}/assignments`);
}

export async function listStatusHistory(assetId: string): Promise<AssetStatusHistory[]> {
  return request<AssetStatusHistory[]>(`${apiBase.asset}/assets/${assetId}/status-history`);
}

export async function listCategories(): Promise<AssetCategory[]> {
  const now = Date.now();
  if (categoriesCache && categoriesCache.expiresAt > now) {
    return categoriesCache.value;
  }
  if (categoriesInflight) {
    return categoriesInflight;
  }
  categoriesInflight = request<AssetCategory[]>(`${apiBase.asset}/asset-categories`)
    .then((value) => {
      categoriesCache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
      return value;
    })
    .finally(() => {
      categoriesInflight = null;
    });
  return categoriesInflight;
}

export interface AssetSummaryStatusRow {
  status: AssetStatus;
  count: number;
}

export interface AssetSummaryCategoryRow {
  categoryCode: string;
  count: number;
}

export interface AssetSummary {
  byStatus: AssetSummaryStatusRow[];
  byCategory: AssetSummaryCategoryRow[];
}

export async function getAssetSummary(): Promise<AssetSummary> {
  return request<AssetSummary>(`${apiBase.asset}/assets/summary`);
}

export interface CreateCategoryRequest {
  code: string;
  name: string;
}

export async function createCategory(body: CreateCategoryRequest): Promise<AssetCategory> {
  const res = await request<AssetCategory>(`${apiBase.asset}/asset-categories`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  invalidateCategoriesCache();
  return res;
}

export interface UpdateCategoryRequest {
  name: string;
}

export async function updateCategory(code: string, body: UpdateCategoryRequest): Promise<AssetCategory> {
  const res = await request<AssetCategory>(`${apiBase.asset}/asset-categories/${encodeURIComponent(code)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  invalidateCategoriesCache();
  return res;
}

export async function deleteCategory(code: string): Promise<void> {
  await request<void>(`${apiBase.asset}/asset-categories/${encodeURIComponent(code)}`, { method: 'DELETE' });
  invalidateCategoriesCache();
}

export interface ActiveOwnerSummary {
  ownerType: OwnerType;
  ownerId: string;
  count: number;
}

export async function getActiveOwnerSummary(): Promise<ActiveOwnerSummary[]> {
  return request<ActiveOwnerSummary[]>(`${apiBase.asset}/assets/assignments/active-summary`);
}

export async function getActiveAssignmentSummary(): Promise<AssetSummary> {
  return request<AssetSummary>(`${apiBase.asset}/assets/assignments/active-asset-summary`);
}

export async function getAvailableSummary(status: AssetStatus = 'REGISTERED'): Promise<AssetAvailableSummary[]> {
  const qs = new URLSearchParams();
  qs.set('status', status);
  return request<AssetAvailableSummary[]>(`${apiBase.asset}/assets/available-summary?${qs.toString()}`);
}

export async function deleteAsset(assetId: string, reason?: string | null): Promise<void> {
  await request<void>(`${apiBase.asset}/assets/${assetId}`, {
    method: 'DELETE',
    body: JSON.stringify({ reason: reason || null }),
  });
}

export async function listPhotos(assetId: string): Promise<AssetPhoto[]> {
  return request<AssetPhoto[]>(`${apiBase.asset}/assets/${assetId}/photos`);
}

export interface LatestPhotoResponse {
  assetId: string;
  photoId: string;
  downloadUrl: string;
}

export async function listLatestPhotos(assetIds: string[]): Promise<LatestPhotoResponse[]> {
  return request<LatestPhotoResponse[]>(`${apiBase.asset}/assets/photos/latest`, {
    method: 'POST',
    body: JSON.stringify({ assetIds }),
  });
}

export async function uploadPhoto(assetId: string, file: File): Promise<AssetPhoto> {
  const form = new FormData();
  form.append('file', file);
  return request<AssetPhoto>(`${apiBase.asset}/assets/${assetId}/photos`, {
    method: 'POST',
    body: form,
  });
}

export async function downloadPhotoBlob(photo: AssetPhoto): Promise<Blob> {
  const url = `${apiBase.asset}${photo.downloadUrl.startsWith('/') ? '' : '/'}${photo.downloadUrl}`;
  return requestBlob(url);
}

export async function downloadAssetPhotoByUrl(downloadUrl: string, signal?: AbortSignal): Promise<Blob> {
  const url = `${apiBase.asset}${downloadUrl.startsWith('/') ? '' : '/'}${downloadUrl}`;
  return requestBlob(url, { signal });
}
