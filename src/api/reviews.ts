import { api } from "./client";
import type { Review } from "@/src/types";

export interface CreateReviewInput {
  rating: number;
  comment?: string;
}

export const reviewsApi = {
  // Family user rates the provider after a completed booking.
  createFamilyReview: (bookingId: string, input: CreateReviewInput) =>
    api.post<{ data: Review }>(`/api/family/bookings/${bookingId}/review`, input),

  // Provider rates the family user after a completed booking.
  createProviderReview: (bookingId: string, input: CreateReviewInput) =>
    api.post<{ data: Review }>(`/api/provider/bookings/${bookingId}/review`, input),
};
