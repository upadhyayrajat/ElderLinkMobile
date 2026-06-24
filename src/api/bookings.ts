import { api } from "./client";
import type { Booking, BookingStatus } from "@/src/types";

export interface CreateBookingInput {
  parentProfileId: string;
  providerProfileId: string;
  serviceTypeId: string;
  scheduledAt: string;
  durationMinutes: number;
  amountInPaise: number;
  notes?: string;
}

export const bookingsApi = {
  list: () =>
    api.get<{ data: Booking[] }>("/api/family/bookings"),

  get: (id: string) =>
    api.get<{ data: Booking }>(`/api/family/bookings/${id}`),

  create: (input: CreateBookingInput) =>
    api.post<{ data: Booking }>("/api/family/bookings", input),

  // Provider-side
  listForProvider: () =>
    api.get<{ data: Booking[] }>("/api/provider/bookings"),

  updateStatus: (id: string, status: BookingStatus) =>
    api.patch<{ data: Booking }>(`/api/provider/bookings/${id}/status`, { status }),

  cancelAsFamily: (id: string) =>
    api.patch<{ data: Booking }>(`/api/family/bookings/${id}`, { status: "cancelled" }),

  postLocation: (id: string, lat: number, lng: number) =>
    api.post<{ ok: boolean }>(`/api/provider/bookings/${id}/location`, { lat, lng }),
};
