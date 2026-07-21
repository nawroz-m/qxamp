export type AuthUser = {
  uid: string;
  identifier: string;
};

const TOKEN_STORAGE_KEY = "quiz-auth-token";
const USER_STORAGE_KEY = "quiz-auth-user";

export function getStoredAuthToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function getStoredAuthUser() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function persistAuthSession(token: string, user: AuthUser) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredAuthSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(USER_STORAGE_KEY);
}

export function getAuthHeaders(tokenOverride?: string | null) {
  const token = tokenOverride ?? getStoredAuthToken();
  return token ? ({ Authorization: `Bearer ${token}` } as Record<string, string>) : ({} as Record<string, string>);
}
