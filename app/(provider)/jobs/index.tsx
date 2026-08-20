import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { bookingsApi } from "@/src/api/bookings";
import type { Booking, BookingStatus } from "@/src/types";
import { ChevronRight } from "lucide-react-native";

const STATUS_COLOR: Record<BookingStatus, string> = {
  pending:     "#F59E0B",
  confirmed:   "#006FFD",
  in_progress: "#10B981",
  completed:   "#6B7280",
  cancelled:   "#EF4444",
  disputed:    "#EF4444",
  refunded:    "#9CA3AF",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short",
  });
}

function formatPaise(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function JobRow({ item }: { item: Booking }) {
  const router = useRouter();
  const { t } = useTranslation();
  const color = STATUS_COLOR[item.status] ?? "#6B7280";
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push(`/(provider)/jobs/${item.id}` as any)}
      activeOpacity={0.8}
    >
      <View style={styles.rowLeft}>
        <Text style={styles.rowDate}>{formatDate(item.scheduledAt)}</Text>
        <Text style={styles.rowMeta}>{item.durationMinutes} min · {formatPaise(item.amountInPaise)}</Text>
      </View>
      <View style={styles.rowRight}>
        <View style={[styles.badge, { backgroundColor: color + "20" }]}>
          <Text style={[styles.badgeText, { color }]}>
            {t(`provider.jobs.status.${item.status}`, item.status.replace("_", " "))}
          </Text>
        </View>
        <ChevronRight size={16} color="#9CA3AF" />
      </View>
    </TouchableOpacity>
  );
}

export default function ProviderJobsScreen() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ["provider-bookings"],
    queryFn: () => bookingsApi.listForProvider().then((r) => r.data.data),
  });

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("provider.jobs.title")}</Text>
        <Text style={styles.count}>{(data ?? []).length} total</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#006FFD" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(b) => b.id}
          renderItem={({ item }) => <JobRow item={item} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t("provider.jobs.noJobs")}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F9FAFB" },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: "800", color: "#1A1A2E" },
  count: { fontSize: 14, color: "#6B7280", marginTop: 2 },
  list: { padding: 20, gap: 10 },
  row: { backgroundColor: "#fff", borderRadius: 14, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  rowLeft: { flex: 1 },
  rowDate: { fontSize: 15, fontWeight: "600", color: "#1A1A2E" },
  rowMeta: { fontSize: 13, color: "#6B7280", marginTop: 3 },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  empty: { flex: 1, alignItems: "center", paddingTop: 60 },
  emptyText: { fontSize: 15, color: "#6B7280" },
});
