import { View, Text, StyleSheet } from "react-native";
import type { BookingStatus } from "@/src/types";

const COLOR: Record<BookingStatus, string> = {
  pending:     "#F59E0B",
  confirmed:   "#006FFD",
  in_progress: "#10B981",
  completed:   "#6B7280",
  cancelled:   "#EF4444",
  disputed:    "#EF4444",
  refunded:    "#9CA3AF",
};

const LABEL: Record<BookingStatus, string> = {
  pending:     "Pending",
  confirmed:   "Confirmed",
  in_progress: "In Progress",
  completed:   "Completed",
  cancelled:   "Cancelled",
  disputed:    "Disputed",
  refunded:    "Refunded",
};

interface StatusBadgeProps {
  status: BookingStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const color = COLOR[status] ?? "#6B7280";
  return (
    <View style={[styles.badge, { backgroundColor: color + "20" }]}>
      <Text style={[styles.text, { color }]}>{LABEL[status] ?? status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  text: { fontSize: 12, fontWeight: "700" },
});
