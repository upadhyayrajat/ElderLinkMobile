import { api } from "./client";
import type { Review } from "@/src/types";

export interface CreateReviewInput {
  bookingId: string;
  revieweeUserId: string;
  rating: number;
  comment?: string;
}

export const reviewsApi = {
  create: (input: CreateReviewInput) =>
    api.post<{ data: Review }>("/api/reviews", input),

  getForBooking: (bookingId: string) =>
    api.get<{ data: Review[] }>(`/api/reviews?bookingId=${bookingId}`),
};
