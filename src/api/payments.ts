import { api } from "./client";
import type { Payment } from "@/src/types";

export const paymentsApi = {
  getForBooking: (bookingId: string) =>
    api.get<{ data: Payment | null }>(`/api/family/bookings/${bookingId}/payment`),

  // returnUrl brings the checkout page back into this app via the
  // elderlink:// scheme once WebBrowser.openAuthSessionAsync catches it.
  createLink: (bookingId: string) =>
    api.post<{ data: { url: string } }>(`/api/family/bookings/${bookingId}/payment/link`, {
      returnUrl: "elderlink://payment-callback",
    }),
};
