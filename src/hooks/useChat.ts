import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chatApi } from "@/src/api/chat";

export type ChatRole = "family" | "provider";

const POLL_INTERVAL_MS = 5000;

export function useChatMessages(bookingId: string, role: ChatRole) {
  return useQuery({
    queryKey: ["chat", bookingId],
    queryFn: () =>
      (role === "family" ? chatApi.listAsFamily(bookingId) : chatApi.listAsProvider(bookingId))
        .then((r) => r.data.data),
    enabled: !!bookingId,
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useSendChatMessage(bookingId: string, role: ChatRole) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      role === "family" ? chatApi.sendAsFamily(bookingId, body) : chatApi.sendAsProvider(bookingId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat", bookingId] }),
  });
}
