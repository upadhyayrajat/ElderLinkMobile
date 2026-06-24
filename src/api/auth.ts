import { api } from "./client";
import type { User } from "@/src/types";

export interface SendOtpResponse {
  message: string;
}

export interface VerifyOtpResponse {
  status: "ok" | "new_user";
  accessToken?: string;
  refreshToken?: string;
  user?: Pick<User, "id" | "phone" | "name" | "role">;
  phone?: string;
}

export const authApi = {
  sendOtp: (phone: string) =>
    api.post<SendOtpResponse>("/api/auth/mobile/send-otp", { phone }),

  verifyOtp: (phone: string, otp: string) =>
    api.post<VerifyOtpResponse>("/api/auth/mobile/verify-otp", { phone, otp }),

  registerDevice: (token: string, platform: "android" | "ios") =>
    api.post("/api/notifications/register-device", { token, platform }),
};
