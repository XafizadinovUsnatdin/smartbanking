import { apiBase, request } from './client';
import type { AssetRequest, AssetRequestDemandSummary, AssetRequestFulfillResult, AssetRequestStatus } from './types';

export interface CreateAssetRequestItem {
  type: string;
  categoryCode: string;
  quantity: number;
}

export interface CreateAssetRequestBody {
  note?: string | null;
  items: CreateAssetRequestItem[];
}

export async function createAssetRequest(body: CreateAssetRequestBody): Promise<AssetRequest> {
  return request<AssetRequest>(`${apiBase.asset}/asset-requests`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function listMyAssetRequests(): Promise<AssetRequest[]> {
  return request<AssetRequest[]>(`${apiBase.asset}/asset-requests/me`);
}

export async function listAssetRequests(status?: AssetRequestStatus): Promise<AssetRequest[]> {
  const qs = new URLSearchParams();
  if (status) qs.set('status', status);
  return request<AssetRequest[]>(`${apiBase.asset}/asset-requests${qs.toString() ? `?${qs}` : ''}`);
}

export async function getAssetRequestDemandSummary(): Promise<AssetRequestDemandSummary[]> {
  return request<AssetRequestDemandSummary[]>(`${apiBase.asset}/asset-requests/demand-summary`);
}

export async function cancelAssetRequest(id: string, note?: string | null): Promise<AssetRequest> {
  return request<AssetRequest>(`${apiBase.asset}/asset-requests/${id}/cancel`, {
    method: 'PUT',
    body: JSON.stringify({ note: note || null }),
  });
}

export async function updateAssetRequestStatus(id: string, status: AssetRequestStatus, note?: string | null): Promise<AssetRequest> {
  return request<AssetRequest>(`${apiBase.asset}/asset-requests/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status, note: note || null }),
  });
}

export async function fulfillAssetRequest(id: string): Promise<AssetRequestFulfillResult> {
  return request<AssetRequestFulfillResult>(`${apiBase.asset}/asset-requests/${id}/fulfill`, {
    method: 'POST',
  });
}
