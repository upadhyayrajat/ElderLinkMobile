import { api } from "./client";
import type { RecurringBooking, RecurrenceFrequency } from "@/src/types";

export interface CreateRecurringBookingInput {
  parentProfileId: string;
  providerUserId: string;
  serviceTypeId: string;
  frequency: RecurrenceFrequency;
  dayOfWeek?: number;
  timeOfDay: string;
  startDate: string;
  endDate?: string;
  amountInPaise: number;
}

export const recurringBookingsApi = {
  list: () =>
    api.get<{ data: RecurringBooking[] }>("/api/family/recurring-bookings"),

  get: (id: string) =>
    api.get<{ data: RecurringBooking }>(`/api/family/recurring-bookings/${id}`),

  create: (input: CreateRecurringBookingInput) =>
    api.post<{ data: RecurringBooking }>("/api/family/recurring-bookings", input),

  pause: (id: string) =>
    api.patch<{ data: RecurringBooking }>(`/api/family/recurring-bookings/${id}`, { active: false }),

  resume: (id: string) =>
    api.patch<{ data: RecurringBooking }>(`/api/family/recurring-bookings/${id}`, { active: true }),

  cancel: (id: string) =>
    api.delete(`/api/family/recurring-bookings/${id}`),
};
