import { apiBase, request } from './client';
import type { Asset, AssetPhoto, OwnerType } from './types';

export interface QrGenerateResponse {
  token: string;
  pngBase64: string;
}

export async function generateAssetQr(assetId: string): Promise<QrGenerateResponse> {
  const base = apiBase.qr.replace(/\/+$/, '');
  const root = base.endsWith('/qr') ? base : `${base}/qr`;
  return request<QrGenerateResponse>(`${root}/assets/${assetId}`, { method: 'POST' });
}

export interface QrLookupResponse {
  assetId: string;
}

export async function lookupQr(token: string): Promise<QrLookupResponse> {
  const base = apiBase.qr.replace(/\/+$/, '');
  const root = base.endsWith('/qr') ? base : `${base}/qr`;
  return request<QrLookupResponse>(`${root}/${encodeURIComponent(token)}`);
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
  const base = apiBase.qr.replace(/\/+$/, '');
  const root = base.endsWith('/qr') ? base : `${base}/qr`;
  return request<QrAssetView>(`${root}/${encodeURIComponent(token)}/view`);
}

export interface BulkAssetQrTokenResponse {
  assetId: string;
  token: string;
  payload: string;
}

export async function bulkAssetQrTokens(assetIds: string[]): Promise<BulkAssetQrTokenResponse[]> {
  const base = apiBase.qr.replace(/\/+$/, '');
  const root = base.endsWith('/qr') ? base : `${base}/qr`;
  return request<BulkAssetQrTokenResponse[]>(`${root}/assets/tokens`, {
    method: 'POST',
    body: JSON.stringify({ assetIds }),
  });
}
