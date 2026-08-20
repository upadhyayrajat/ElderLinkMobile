import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { recurringBookingsApi, type CreateRecurringBookingInput } from "@/src/api/recurring-bookings";

export function useRecurringBookings() {
  return useQuery({
    queryKey: ["recurring-bookings"],
    queryFn: () => recurringBookingsApi.list().then((r) => r.data.data),
  });
}

export function useCreateRecurringBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRecurringBookingInput) => recurringBookingsApi.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recurring-bookings"] }),
  });
}

export function useCancelRecurringBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => recurringBookingsApi.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recurring-bookings"] }),
  });
}
