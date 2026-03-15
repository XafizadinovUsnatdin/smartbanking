import { apiBase, request, setTokens, clearTokens } from "./client";

export async function login(username, password) {
  const data = await request(`${apiBase.identity}/auth/login`, {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
  setTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function register(username, password, fullName) {
  return request(`${apiBase.identity}/auth/register`, {
    method: "POST",
    body: JSON.stringify({ username, password, fullName })
  });
}

export function logout() {
  clearTokens();
}

