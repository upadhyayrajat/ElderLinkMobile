// Base Axios instance for all API calls.
// Automatically attaches the Bearer access token from the auth store.
// On 401, attempts a silent token refresh once, then logs the user out.

import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "@/src/lib/env";

export const ACCESS_TOKEN_KEY  = "elderlink_access_token";
export const REFRESH_TOKEN_KEY = "elderlink_refresh_token";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
});

// Request interceptor — attach Bearer token
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401 with silent refresh
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest._retried) {
      return Promise.reject(error);
    }

    originalRequest._retried = true;

    if (isRefreshing) {
      return new Promise((resolve) => {
        refreshQueue.push((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          resolve(api(originalRequest));
        });
      });
    }

    isRefreshing = true;

    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (!refreshToken) throw new Error("no_refresh_token");

      const { data } = await axios.post(`${API_BASE_URL}/api/auth/mobile/refresh`, {
        refreshToken,
      });

      const newAccessToken: string = data.accessToken;
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, newAccessToken);

      refreshQueue.forEach((cb) => cb(newAccessToken));
      refreshQueue = [];

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch {
      // Refresh failed — clear tokens so the auth store detects the logout
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  }
);
