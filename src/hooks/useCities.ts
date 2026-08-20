import { useQuery } from "@tanstack/react-query";
import { citiesApi } from "@/src/api/cities";

export function useCities(activeOnly = false) {
  return useQuery({
    queryKey: ["cities", activeOnly],
    queryFn: () => citiesApi.list(activeOnly).then((r) => r.data.data),
    staleTime: 30 * 60 * 1000, // city list is stable
  });
}
