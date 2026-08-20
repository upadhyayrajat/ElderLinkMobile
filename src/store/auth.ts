// Auth store — persists tokens in Expo SecureStore, user in memory.
// On app cold start, loadSession() rehydrates from SecureStore.

import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/src/api/client";
import type { User, UserRole, SupportedLocale } from "@/src/types";

export interface AuthUser {
  id: string;
  phone: string;
  name: string;
  role: UserRole;
  consentGiven: boolean;
  preferredLocale: SupportedLocale;
}

interface AuthState {
  user: AuthUser | null;
  isLoaded: boolean;

  // Actions
  setSession: (user: AuthUser, accessToken: string, refreshToken: string) => Promise<void>;
  clearSession: () => Promise<void>;
  loadSession: () => Promise<void>;
  setConsentGiven: (value: boolean) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoaded: false,

  setSession: async (user, accessToken, refreshToken) => {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    // Store minimal user info for quick access (no sensitive data)
    await SecureStore.setItemAsync("elderlink_user", JSON.stringify(user));
    set({ user });
  },

  clearSession: async () => {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync("elderlink_user");
    set({ user: null });
  },

  // Called once on app launch in the root layout.
  // If tokens exist but are expired, the API interceptor will handle the 401.
  loadSession: async () => {
    try {
      const raw = await SecureStore.getItemAsync("elderlink_user");
      const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      if (raw && accessToken) {
        const user = JSON.parse(raw) as AuthUser;
        set({ user, isLoaded: true });
        return;
      }
    } catch {
      // corrupt storage — treat as logged out
    }
    set({ user: null, isLoaded: true });
  },

  // Called after POST /api/user/consent succeeds, once the access token has
  // also been refreshed so the new consentGiven claim actually takes effect.
  setConsentGiven: async (value) => {
    set((state) => {
      if (!state.user) return state;
      const user = { ...state.user, consentGiven: value };
      SecureStore.setItemAsync("elderlink_user", JSON.stringify(user));
      return { user };
    });
  },
}));
