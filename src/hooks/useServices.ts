import { useQuery } from "@tanstack/react-query";
import { servicesApi } from "@/src/api/services";

export function useServices() {
  return useQuery({
    queryKey: ["services"],
    queryFn: () => servicesApi.list().then((r) => r.data.data),
    staleTime: 10 * 60 * 1000, // service catalogue rarely changes
  });
}
