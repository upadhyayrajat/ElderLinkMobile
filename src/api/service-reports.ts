import { api } from "./client";
import type { ServiceReport } from "@/src/types";

export interface CreateServiceReportInput {
  bookingId: string;
  summary: string;
  photos?: { uri: string; name: string; type: string }[]; // from expo-image-picker
  elderMood: "happy" | "neutral" | "sad";
  vitalsNoted?: string;
  followUpRecommended: boolean;
  followUpNotes?: string;
}

export const serviceReportsApi = {
  // Provider submits a report after completing a booking.
  // The backend expects multipart/form-data (text fields + photo files), not JSON.
  create: (input: CreateServiceReportInput) => {
    const form = new FormData();
    form.append("bookingId", input.bookingId);
    form.append("summary", input.summary);
    form.append("elderMood", input.elderMood);
    if (input.vitalsNoted) form.append("vitalsNoted", input.vitalsNoted);
    form.append("followUpRecommended", String(input.followUpRecommended));
    if (input.followUpNotes) form.append("followUpNotes", input.followUpNotes);
    for (const photo of input.photos ?? []) {
      form.append("photos", photo as unknown as Blob);
    }
    return api.post<{ data: ServiceReport }>("/api/provider/reports", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  // Family views the report for a completed booking
  getForBooking: (bookingId: string) =>
    api.get<{ data: ServiceReport | null }>(`/api/family/bookings/${bookingId}/report`),
};
