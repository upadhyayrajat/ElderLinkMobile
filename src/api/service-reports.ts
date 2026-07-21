import { api } from "./client";
import type { ServiceReport } from "@/src/types";

export interface CreateServiceReportInput {
  bookingId: string;
  summary: string;
  photoUrls?: string[];
  elderMood: "happy" | "neutral" | "sad";
  vitalsNoted?: string;
  followUpRecommended: boolean;
  followUpNotes?: string;
}

export const serviceReportsApi = {
  // Provider submits a report after completing a booking
  create: (input: CreateServiceReportInput) =>
    api.post<{ data: ServiceReport }>("/api/provider/service-reports", input),

  // Family views the report for a completed booking
  getForBooking: (bookingId: string) =>
    api.get<{ data: ServiceReport }>(`/api/family/bookings/${bookingId}/report`),
};
