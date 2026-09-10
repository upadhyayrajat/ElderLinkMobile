import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentsApi } from "@/src/api/payments";

export function usePayment(bookingId: string) {
  return useQuery({
    queryKey: ["payment", bookingId],
    queryFn: () => paymentsApi.getForBooking(bookingId).then((r) => r.data.data),
    enabled: !!bookingId,
  });
}

export function useCreatePaymentLink(bookingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => paymentsApi.createLink(bookingId).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payment", bookingId] }),
  });
}
