import { api } from "./client";
import type { User } from "@/src/types";

export interface SendOtpResponse {
  message: string;
}

type AuthUserResponse = Pick<User, "id" | "phone" | "name" | "role"> & { consentGiven: boolean };

export interface VerifyOtpResponse {
  status: "ok" | "new_user";
  accessToken?: string;
  refreshToken?: string;
  user?: AuthUserResponse;
  phone?: string;
}

export interface RegisterResponse {
  status: "ok";
  accessToken: string;
  refreshToken: string;
  user: AuthUserResponse;
}

export interface RefreshResponse {
  accessToken: string;
}

export const authApi = {
  sendOtp: (phone: string) =>
    api.post<SendOtpResponse>("/api/auth/mobile/send-otp", { phone }),

  verifyOtp: (phone: string, otp: string) =>
    api.post<VerifyOtpResponse>("/api/auth/mobile/verify-otp", { phone, otp }),

  register: (phone: string, name: string, role: "family" | "provider") =>
    api.post<RegisterResponse>("/api/auth/mobile/register", { phone, name, role }),

  // Explicit refresh, used right after granting consent so the new access
  // token actually carries an up-to-date consentGiven claim (the 401
  // interceptor in client.ts handles the implicit case; this is for when
  // we need a fresh token without having hit a 401 first).
  refresh: (refreshToken: string) =>
    api.post<RefreshResponse>("/api/auth/mobile/refresh", { refreshToken }),

  registerDevice: (token: string, platform: "android" | "ios") =>
    api.post("/api/notifications/register-device", { token, platform }),
};
