import { useRef, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Send } from "lucide-react-native";
import { useAuthStore } from "@/src/store/auth";
import { useChatMessages, useSendChatMessage } from "@/src/hooks/useChat";
import { TopBar } from "@/src/components/TopBar";
import { LoadingScreen } from "@/src/components/LoadingScreen";
import { EmptyState } from "@/src/components/EmptyState";
import type { ChatMessage } from "@/src/types";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function MessageBubble({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
  return (
    <View style={[styles.bubbleRow, isOwn ? styles.bubbleRowOwn : styles.bubbleRowOther]}>
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn]}>{message.body}</Text>
        <Text style={[styles.bubbleTime, isOwn && styles.bubbleTimeOwn]}>{formatTime(message.createdAt)}</Text>
      </View>
    </View>
  );
}

export default function ProviderJobChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const listRef = useRef<FlatList>(null);
  const [draft, setDraft] = useState("");

  const { data: messages, isLoading } = useChatMessages(id, "provider");
  const sendMutation = useSendChatMessage(id, "provider");

  const handleSend = () => {
    const body = draft.trim();
    if (!body) return;
    sendMutation.mutate(body, {
      onSuccess: () => setDraft(""),
      onError: (err: any) => {
        const msg = err?.response?.data?.error ?? "Could not send your message. Please try again.";
        Alert.alert("Error", msg);
      },
    });
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={styles.header}>
        <TopBar title="Messages" />
      </View>

      <FlatList
        ref={listRef}
        data={messages ?? []}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <MessageBubble message={item} isOwn={item.senderUserId === user?.id} />}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={<EmptyState message="No messages yet — say hello!" />}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Type a message…"
          placeholderTextColor="#9CA3AF"
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!draft.trim() || sendMutation.isPending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!draft.trim() || sendMutation.isPending}
          activeOpacity={0.8}
        >
          {sendMutation.isPending
            ? <ActivityIndicator color="#fff" size="small" />
            : <Send size={18} color="#fff" />
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F9FAFB" },
  header: { paddingHorizontal: 20, paddingTop: 8 },
  list: { padding: 20, paddingTop: 0, gap: 10, flexGrow: 1 },
  bubbleRow: { flexDirection: "row" },
  bubbleRowOwn: { justifyContent: "flex-end" },
  bubbleRowOther: { justifyContent: "flex-start" },
  bubble: { maxWidth: "78%", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleOwn: { backgroundColor: "#006FFD", borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: "#fff", borderBottomLeftRadius: 4, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  bubbleText: { fontSize: 15, color: "#1A1A2E" },
  bubbleTextOwn: { color: "#fff" },
  bubbleTime: { fontSize: 10, color: "#9CA3AF", marginTop: 4, alignSelf: "flex-end" },
  bubbleTimeOwn: { color: "#DBEAFE" },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 10, padding: 16, paddingTop: 10, backgroundColor: "#F9FAFB", borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  input: { flex: 1, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: "#1A1A2E", maxHeight: 100 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#006FFD", justifyContent: "center", alignItems: "center" },
  sendBtnDisabled: { opacity: 0.5 },
});
