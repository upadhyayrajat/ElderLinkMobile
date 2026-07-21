import { useQuery } from "@tanstack/react-query";
import { citiesApi } from "@/src/api/cities";

export function useCities() {
  return useQuery({
    queryKey: ["cities"],
    queryFn: () => citiesApi.list().then((r) => r.data.data),
    staleTime: 30 * 60 * 1000, // city list is stable
  });
}
