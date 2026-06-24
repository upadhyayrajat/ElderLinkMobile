import { api } from "./client";
import type { ServiceType } from "@/src/types";

export const servicesApi = {
  list: () => api.get<{ data: ServiceType[] }>("/api/family/services"),
};
