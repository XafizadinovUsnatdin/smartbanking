import { apiBase, request, requestBlob } from './client';
import type { Asset, AssetPhoto, OwnerType } from './types';

function qrRoot(): string {
  const base = apiBase.qr.replace(/\/+$/, '');
  return base.endsWith('/qr') ? base : `${base}/qr`;
}

export function qrPhotoUrl(photoId: string): string {
  return `${qrRoot()}/photos/${encodeURIComponent(photoId)}`;
}

export interface QrGenerateResponse {
  token: string;
  pngBase64: string;
}

export async function generateAssetQr(assetId: string): Promise<QrGenerateResponse> {
  return request<QrGenerateResponse>(`${qrRoot()}/assets/${assetId}`, { method: 'POST' });
}

export interface QrLookupResponse {
  assetId: string;
}

export async function lookupQr(token: string): Promise<QrLookupResponse> {
  return request<QrLookupResponse>(`${qrRoot()}/${encodeURIComponent(token)}`);
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
  return request<QrAssetView>(`${qrRoot()}/${encodeURIComponent(token)}/view`);
}

export interface BulkAssetQrTokenResponse {
  assetId: string;
  token: string;
  payload: string;
}

export async function bulkAssetQrTokens(assetIds: string[]): Promise<BulkAssetQrTokenResponse[]> {
  return request<BulkAssetQrTokenResponse[]>(`${qrRoot()}/assets/tokens`, {
    method: 'POST',
    body: JSON.stringify({ assetIds }),
  });
}

export async function downloadQrPhoto(photoId: string): Promise<Blob> {
  return requestBlob(qrPhotoUrl(photoId), {}, false);
}
