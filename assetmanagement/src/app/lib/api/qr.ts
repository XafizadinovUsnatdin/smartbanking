import { apiBase, request } from './client';
import type { Asset, AssetPhoto, OwnerType } from './types';

export interface QrGenerateResponse {
  token: string;
  pngBase64: string;
}

export async function generateAssetQr(assetId: string): Promise<QrGenerateResponse> {
  return request<QrGenerateResponse>(`${apiBase.qr}/qr/assets/${assetId}`, { method: 'POST' });
}

export interface QrLookupResponse {
  assetId: string;
}

export async function lookupQr(token: string): Promise<QrLookupResponse> {
  return request<QrLookupResponse>(`${apiBase.qr}/qr/${encodeURIComponent(token)}`);
}

export interface QrOwnerView {
  ownerType: OwnerType;
  ownerId: string;
  displayName?: string | null;
}

export interface QrAssetView {
  asset: Asset;
  owner?: QrOwnerView | null;
  photos: AssetPhoto[];
}

export async function viewQr(token: string): Promise<QrAssetView> {
  return request<QrAssetView>(`${apiBase.qr}/qr/${encodeURIComponent(token)}/view`);
}

export interface BulkAssetQrTokenResponse {
  assetId: string;
  token: string;
  payload: string;
}

export async function bulkAssetQrTokens(assetIds: string[]): Promise<BulkAssetQrTokenResponse[]> {
  return request<BulkAssetQrTokenResponse[]>(`${apiBase.qr}/qr/assets/tokens`, {
    method: 'POST',
    body: JSON.stringify({ assetIds }),
  });
}
