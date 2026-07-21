import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bookingsApi, type CreateBookingInput } from "@/src/api/bookings";
import type { BookingStatus } from "@/src/types";

export function useFamilyBookings() {
  return useQuery({
    queryKey: ["family-bookings"],
    queryFn: () => bookingsApi.list().then((r) => r.data.data),
  });
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: ["booking", id],
    queryFn: () => bookingsApi.get(id).then((r) => r.data.data),
    enabled: !!id,
  });
}

export function useProviderBookings() {
  return useQuery({
    queryKey: ["provider-bookings"],
    queryFn: () => bookingsApi.listForProvider().then((r) => r.data.data),
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBookingInput) => bookingsApi.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["family-bookings"] }),
  });
}

export function useUpdateBookingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: BookingStatus }) =>
      bookingsApi.updateStatus(id, status),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["provider-bookings"] });
      qc.invalidateQueries({ queryKey: ["booking", id] });
    },
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bookingsApi.cancelAsFamily(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["family-bookings"] });
      qc.invalidateQueries({ queryKey: ["booking", id] });
    },
  });
}
