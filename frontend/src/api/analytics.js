import { apiBase, request } from "./client";

export function getDashboard() {
  return request(`${apiBase.analytics}/analytics/dashboard`);
}

