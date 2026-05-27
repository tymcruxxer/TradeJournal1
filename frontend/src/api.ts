import axios from "axios";
import type { AxiosError } from "axios";

import type { AuthUser } from "./types";

const TOKEN_STORAGE_KEY = "trading_journal_token";
const USER_STORAGE_KEY = "trading_journal_user";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
  timeout: 20000,
});

export const getDesktopAgentDownloadUrl = () => {
  const override = import.meta.env.VITE_DESKTOP_AGENT_DOWNLOAD_URL;

  if (override) {
    return override;
  }

  return `${api.defaults.baseURL}/downloads/desktop-sync-agent/windows`;
};

export const getAuthToken = () => localStorage.getItem(TOKEN_STORAGE_KEY);

export const getAuthUser = (): AuthUser | null => {
  const raw = localStorage.getItem(USER_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
};

export const setAuthToken = (token: string) => {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
};

export const setAuthUser = (user: AuthUser) => {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
};

export const setAuthSession = (token: string, user: AuthUser) => {
  setAuthToken(token);
  setAuthUser(user);
};

export const clearAuthToken = () => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
};

export const AUTH_SESSION_EXPIRED_EVENT = "trading-journal-auth-expired";

export function isAuthError(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

export function isNetworkError(error: unknown) {
  return axios.isAxiosError(error) && !error.response;
}

export function getApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again."
) {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  if (!error.response) {
    return "The backend is offline or unreachable. Check your connection and try again.";
  }

  const detail = error.response.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    if (typeof first?.msg === "string") {
      return first.msg;
    }
  }

  return fallback;
}

api.interceptors.request.use((config) => {
  const token = getAuthToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && getAuthToken()) {
      clearAuthToken();
      window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT));
    }

    return Promise.reject(error);
  }
);
