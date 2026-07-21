import { useQuery } from "@tanstack/react-query";
import { providersApi, type SearchProvidersParams } from "@/src/api/providers";

export function useProviders(params: SearchProvidersParams) {
  return useQuery({
    queryKey: ["providers", params.serviceTypeId, params.city],
    queryFn: () => providersApi.search(params).then((r) => r.data.data),
    enabled: !!(params.serviceTypeId && params.city),
  });
}

export function useProvider(id: string) {
  return useQuery({
    queryKey: ["provider", id],
    queryFn: () => providersApi.get(id).then((r) => r.data.data),
    enabled: !!id,
  });
}
