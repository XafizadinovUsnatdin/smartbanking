type ServiceName = 'identity' | 'asset' | 'audit' | 'qr' | 'analytics';

const DEFAULTS: Record<ServiceName, string> = {
  identity: 'http://localhost:8081',
  asset: 'http://localhost:8082',
  audit: 'http://localhost:8083',
  qr: 'http://localhost:8084',
  analytics: 'http://localhost:8085',
};

export const apiBase: Record<ServiceName, string> = {
  identity: import.meta.env.VITE_IDENTITY_API || DEFAULTS.identity,
  asset: import.meta.env.VITE_ASSET_API || DEFAULTS.asset,
  audit: import.meta.env.VITE_AUDIT_API || DEFAULTS.audit,
  qr: import.meta.env.VITE_QR_API || DEFAULTS.qr,
  analytics: import.meta.env.VITE_ANALYTICS_API || DEFAULTS.analytics,
};

export function getAccessToken(): string | null {
  return localStorage.getItem('accessToken');
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('refreshToken');
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}

export function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

let refreshInFlight: Promise<unknown> | null = null;

async function refreshTokens() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token');
  }
  const res = await fetch(`${apiBase.identity}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    clearTokens();
    throw new Error('Session expired');
  }
  const data = (await res.json()) as { accessToken: string; refreshToken: string };
  setTokens(data.accessToken, data.refreshToken);
  return data;
}

function isFormData(body: unknown): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData;
}

async function doFetch<T>(
  url: string,
  options: RequestInit = {},
  retryOn401 = true,
  parseFn: (res: Response) => Promise<T> = (res) => res.json() as Promise<T>,
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = { ...(options.headers as Record<string, string> | undefined) };

  if (!headers['Content-Type'] && !isFormData(options.body)) {
    headers['Content-Type'] = 'application/json';
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
      return doFetch<T>(url, options, false, parseFn);
    } catch (e) {
      clearTokens();
      throw e;
    }
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null as T;
  return parseFn(res);
}

export function request<T>(url: string, options: RequestInit = {}, retryOn401 = true) {
  return doFetch<T>(url, options, retryOn401, (res) => res.json() as Promise<T>);
}

export function requestBlob(url: string, options: RequestInit = {}, retryOn401 = true) {
  return doFetch<Blob>(url, options, retryOn401, (res) => res.blob());
}

export function decodeJwtPayload(jwt: string | null): any | null {
  if (!jwt) return null;
  const parts = jwt.split('.');
  if (parts.length < 2) return null;
  const payload = parts[1].replaceAll('-', '+').replaceAll('_', '/');
  const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
  try {
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export function getCurrentUserId(): string | null {
  const p = decodeJwtPayload(getAccessToken());
  return p?.sub || null;
}
