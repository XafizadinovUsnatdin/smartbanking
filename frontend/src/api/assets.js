import { apiBase, request, requestBlob } from "./client";

export function listAssets({ q, categoryCode, status, page = 0, size = 20 }) {
  const params = new URLSearchParams();
  if (q) params.append("q", q);
  if (categoryCode) params.append("categoryCode", categoryCode);
  if (status) params.append("status", status);
  params.append("page", page);
  params.append("size", size);
  return request(`${apiBase.asset}/assets?${params.toString()}`);
}

export function listAgingAssets({ days = 365, categoryCode, status, includeTerminal = false, page = 0, size = 20 }) {
  const params = new URLSearchParams();
  params.append("days", String(days));
  if (categoryCode) params.append("categoryCode", categoryCode);
  if (status) params.append("status", status);
  params.append("includeTerminal", String(includeTerminal));
  params.append("page", page);
  params.append("size", size);
  return request(`${apiBase.asset}/assets/aging?${params.toString()}`);
}

export function getAsset(id) {
  return request(`${apiBase.asset}/assets/${id}`);
}

export function getCurrentAssignment(id) {
  return request(`${apiBase.asset}/assets/${id}/assignment`);
}

export function getAssignmentHistory(id) {
  return request(`${apiBase.asset}/assets/${id}/assignments`);
}

export function getStatusHistory(id) {
  return request(`${apiBase.asset}/assets/${id}/status-history`);
}

export function createAsset(payload) {
  return request(`${apiBase.asset}/assets`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateAsset(id, payload) {
  return request(`${apiBase.asset}/assets/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function assignAsset(id, payload) {
  return request(`${apiBase.asset}/assets/${id}/assign`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function returnAsset(id, payload) {
  return request(`${apiBase.asset}/assets/${id}/return`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function changeStatus(id, payload) {
  return request(`${apiBase.asset}/assets/${id}/status`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function listPhotos(assetId) {
  return request(`${apiBase.asset}/assets/${assetId}/photos`);
}

export function uploadPhoto(assetId, file) {
  const form = new FormData();
  form.append("file", file);
  return request(`${apiBase.asset}/assets/${assetId}/photos`, {
    method: "POST",
    body: form
  });
}

export function downloadPhoto(downloadUrl) {
  return requestBlob(`${apiBase.asset}${downloadUrl}`, { method: "GET" });
}
