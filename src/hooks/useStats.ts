import { useQuery } from "@tanstack/react-query";
import { statsApi } from "@/src/api/stats";

// Public, unauthenticated — used by the pre-login onboarding screen.
// Callers must render fine without this data: a slow/failed fetch on a
// fresh install should never block the primary "Get Started" action.
export function useStats() {
  return useQuery({
    queryKey: ["public-stats"],
    queryFn: () => statsApi.get().then((r) => r.data.data),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}
