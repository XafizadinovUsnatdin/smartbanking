import { createContext, useContext, useMemo, useState } from 'react';
import { clearTokens, decodeJwtPayload, getAccessToken, setTokens } from '../lib/api/client';
import { login as apiLogin } from '../lib/api/identity';

export interface AuthUser {
  userId: string;
  username: string;
  roles: string[];
}

export interface AuthContextValue {
  accessToken: string | null;
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function parseUserFromToken(token: string | null): AuthUser | null {
  const payload = decodeJwtPayload(token);
  if (!payload?.sub || !payload?.usr) return null;
  return {
    userId: String(payload.sub),
    username: String(payload.usr),
    roles: Array.isArray(payload.roles) ? payload.roles.map(String) : [],
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(() => getAccessToken());

  const user = useMemo(() => parseUserFromToken(accessToken), [accessToken]);

  const value: AuthContextValue = useMemo(
    () => ({
      accessToken,
      user,
      async login(username: string, password: string) {
        const tokens = await apiLogin(username, password);
        setTokens(tokens.accessToken, tokens.refreshToken);
        setAccessToken(tokens.accessToken);
      },
      logout() {
        clearTokens();
        setAccessToken(null);
      },
    }),
    [accessToken, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}

