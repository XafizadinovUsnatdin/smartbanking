import { apiBase, request } from "./client";

export function generateQr(assetId) {
  return request(`${apiBase.qr}/qr/assets/${assetId}`, { method: "POST" });
}

export function lookupQr(token) {
  return request(`${apiBase.qr}/qr/${token}`);
}

export function viewQr(token) {
  return request(`${apiBase.qr}/qr/${token}/view`);
}
