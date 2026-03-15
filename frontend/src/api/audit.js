import { apiBase, request } from "./client";

export function searchAudit({ entityId, entityType = "ASSET", from, to, page = 0, size = 50 }) {
  const params = new URLSearchParams();
  params.append("entityType", entityType);
  params.append("entityId", entityId);
  if (from) params.append("from", from);
  if (to) params.append("to", to);
  params.append("page", page);
  params.append("size", size);
  return request(`${apiBase.audit}/audit?${params.toString()}`);
}

