import { api } from "./client";
import type { City } from "@/src/types";

export const citiesApi = {
  list: () =>
    api.get<{ data: City[] }>("/api/cities"),
};
