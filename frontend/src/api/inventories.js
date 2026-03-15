import { apiBase, request } from "./client";

export function listInventories() {
  return request(`${apiBase.asset}/inventories`);
}

export function createInventory(payload) {
  return request(`${apiBase.asset}/inventories`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getInventory(id) {
  return request(`${apiBase.asset}/inventories/${id}`);
}

export function scanInventory(id, payload) {
  return request(`${apiBase.asset}/inventories/${id}/scan`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function closeInventory(id) {
  return request(`${apiBase.asset}/inventories/${id}/close`, { method: "POST" });
}

export function getInventoryReport(id) {
  return request(`${apiBase.asset}/inventories/${id}/report`);
}

