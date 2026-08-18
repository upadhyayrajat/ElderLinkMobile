import { api } from "./client";

// DPDP Act 2023 compliance — consent + right to erasure.
export const userApi = {
  recordConsent: () => api.post("/api/user/consent"),

  requestErasure: () => api.delete<{ message: string }>("/api/user/erasure"),
};
