import { api } from "./client";
import type { ChatMessage } from "@/src/types";

export const chatApi = {
  listAsFamily: (bookingId: string) =>
    api.get<{ data: ChatMessage[] }>(`/api/family/bookings/${bookingId}/chat`),
  sendAsFamily: (bookingId: string, body: string) =>
    api.post<{ data: ChatMessage }>(`/api/family/bookings/${bookingId}/chat`, { body }),

  listAsProvider: (bookingId: string) =>
    api.get<{ data: ChatMessage[] }>(`/api/provider/bookings/${bookingId}/chat`),
  sendAsProvider: (bookingId: string, body: string) =>
    api.post<{ data: ChatMessage }>(`/api/provider/bookings/${bookingId}/chat`, { body }),
};
