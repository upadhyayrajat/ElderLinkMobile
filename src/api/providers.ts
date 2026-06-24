import { api } from "./client";
import type { ProviderProfile } from "@/src/types";

export interface SearchProvidersParams {
  serviceTypeId: string;
  city: string;
}

export interface ProviderSearchResult extends ProviderProfile {
  providerName: string;
  recentReviews: Array<{ rating: number; comment?: string }>;
}

export const providersApi = {
  search: (params: SearchProvidersParams) =>
    api.get<{ data: ProviderSearchResult[] }>("/api/family/providers", { params }),

  get: (id: string) =>
    api.get<{ data: ProviderProfile }>(`/api/family/providers/${id}`),
};
