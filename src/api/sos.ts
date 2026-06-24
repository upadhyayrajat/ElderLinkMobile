import { api } from "./client";
import type { SosEvent } from "@/src/types";

export const sosApi = {
  trigger: (parentProfileId: string, latitude?: number, longitude?: number) =>
    api.post<{ data: SosEvent }>("/api/family/sos", {
      parentProfileId,
      latitude,
      longitude,
    }),

  resolve: (sosEventId: string, resolutionNotes?: string) =>
    api.patch<{ data: SosEvent }>(`/api/family/sos/${sosEventId}/resolve`, {
      resolutionNotes,
    }),
};
