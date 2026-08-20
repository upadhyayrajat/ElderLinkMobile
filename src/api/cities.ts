import { api } from "./client";
import type { City } from "@/src/types";

export const citiesApi = {
  list: (activeOnly?: boolean) =>
    api.get<{ data: City[] }>("/api/cities", { params: activeOnly ? { activeOnly: "true" } : undefined }),
};
