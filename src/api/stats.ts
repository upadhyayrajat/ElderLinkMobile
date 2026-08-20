import { api } from "@/src/api/client";

export interface PublicStats {
  verifiedProviderCount: number;
  averageRating: number | null;
}

export const statsApi = {
  get: () => api.get<{ data: PublicStats }>("/api/stats"),
};
