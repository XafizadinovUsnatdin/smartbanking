const DEFAULTS = {
  identity: "http://localhost:8081",
  asset: "http://localhost:8082",
  audit: "http://localhost:8083",
  qr: "http://localhost:8084",
  analytics: "http://localhost:8085"
};

export const apiBase = {
  identity: import.meta.env.VITE_IDENTITY_API || DEFAULTS.identity,
  asset: import.meta.env.VITE_ASSET_API || DEFAULTS.asset,
  audit: import.meta.env.VITE_AUDIT_API || DEFAULTS.audit,
  qr: import.meta.env.VITE_QR_API || DEFAULTS.qr,
  analytics: import.meta.env.VITE_ANALYTICS_API || DEFAULTS.analytics
};

export function getAccessToken() {
  return localStorage.getItem("accessToken");
}

export function getRefreshToken() {
  return localStorage.getItem("refreshToken");
}

export function setTokens(accessToken, refreshToken) {
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
}

export function clearTokens() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

let refreshInFlight = null;

async function refreshTokens() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error("No refresh token");
  }
  const res = await fetch(`${apiBase.identity}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken })
  });
  if (!res.ok) {
    clearTokens();
    throw new Error("Session expired");
  }
  const data = await res.json();
  setTokens(data.accessToken, data.refreshToken);
  return data;
}

function isFormData(body) {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

async function doFetch(url, options = {}, retryOn401 = true, parseFn = (res) => res.json()) {
  const token = getAccessToken();
  const headers = { ...(options.headers || {}) };
  if (!headers["Content-Type"] && !isFormData(options.body)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401 && retryOn401 && getRefreshToken()) {
    try {
      if (!refreshInFlight) {
        refreshInFlight = refreshTokens().finally(() => {
          refreshInFlight = null;
        });
      }
      await refreshInFlight;
      return doFetch(url, options, false, parseFn);
    } catch (e) {
      clearTokens();
      throw e;
    }
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return parseFn(res);
}

export function request(url, options = {}, retryOn401 = true) {
  return doFetch(url, options, retryOn401, (res) => res.json());
}

export function requestBlob(url, options = {}, retryOn401 = true) {
  return doFetch(url, options, retryOn401, (res) => res.blob());
}

export function decodeJwtPayload(jwt) {
  if (!jwt) return null;
  const parts = jwt.split(".");
  if (parts.length < 2) return null;
  const payload = parts[1].replaceAll("-", "+").replaceAll("_", "/");
  const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
  try {
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export function getCurrentUserId() {
  const p = decodeJwtPayload(getAccessToken());
  return p?.sub || null;
}
