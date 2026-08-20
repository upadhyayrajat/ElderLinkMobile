import { api } from "./client";
import type { SupportedLocale } from "@/src/types";

// DPDP Act 2023 compliance — consent + right to erasure.
export const userApi = {
  recordConsent: () => api.post("/api/user/consent"),

  requestErasure: () => api.delete<{ message: string }>("/api/user/erasure"),

  updateLocale: (locale: SupportedLocale) =>
    api.patch<{ data: { locale: SupportedLocale } }>("/api/user/locale", { locale }),
};
