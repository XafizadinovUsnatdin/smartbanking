import { apiBase, request } from "./client";

export function listCategories() {
  return request(`${apiBase.asset}/asset-categories`);
}

export function createCategory(payload) {
  return request(`${apiBase.asset}/asset-categories`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateCategory(code, payload) {
  return request(`${apiBase.asset}/asset-categories/${code}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function deleteCategory(code) {
  return request(`${apiBase.asset}/asset-categories/${code}`, { method: "DELETE" });
}

