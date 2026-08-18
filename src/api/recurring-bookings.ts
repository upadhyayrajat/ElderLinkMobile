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
}

export const recurringBookingsApi = {
  list: () =>
    api.get<{ data: RecurringBooking[] }>("/api/family/recurring"),

  create: (input: CreateRecurringBookingInput) =>
    api.post<{ data: RecurringBooking; generated: number }>("/api/family/recurring", input),

  // The backend only supports a one-way cancel (active -> false); there is
  // no pause/resume/get-by-id endpoint.
  cancel: (id: string) =>
    api.patch<{ data: RecurringBooking }>(`/api/family/recurring/${id}`),
};
