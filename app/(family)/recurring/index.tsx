import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useRecurringBookings, useCancelRecurringBooking } from "@/src/hooks/useRecurringBookings";
import { parentsApi } from "@/src/api/parents";
import { servicesApi } from "@/src/api/services";
import { TopBar } from "@/src/components/TopBar";
import { LoadingScreen } from "@/src/components/LoadingScreen";
import { EmptyState } from "@/src/components/EmptyState";
import type { RecurringBooking } from "@/src/types";

const FREQUENCY_LABEL: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  fortnightly: "Fortnightly",
  monthly: "Monthly",
};

const DAY_NAME = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string) {
  // Parse the "YYYY-MM-DD" string as local calendar components, not via
  // new Date(dateStr) — that parses as UTC midnight, which can render as
  // the previous day once converted to a timezone behind UTC.
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatPaise(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function RecurringRow({
  item, serviceName, parentName,
}: {
  item: RecurringBooking;
  serviceName: string;
  parentName: string;
}) {
  const cancelMutation = useCancelRecurringBooking();

  const handleCancel = () => {
    Alert.alert(
      "Cancel recurring booking",
      "This stops future visits from being scheduled. Already-scheduled visits are not affected.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, cancel",
          style: "destructive",
          onPress: () =>
            cancelMutation.mutate(item.id, {
              onError: () => Alert.alert("Error", "Could not cancel this recurring booking. Please try again."),
            }),
        },
      ]
    );
  };

  const schedule = [
    FREQUENCY_LABEL[item.frequency] ?? item.frequency,
    item.frequency === "weekly" && item.dayOfWeek != null ? DAY_NAME[item.dayOfWeek] : null,
    `at ${formatTime(item.timeOfDay)}`,
  ].filter(Boolean).join(" · ");

  const dateRange = item.endDate
    ? `${formatDate(item.startDate)} – ${formatDate(item.endDate)}`
    : `From ${formatDate(item.startDate)} · Ongoing`;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.serviceName}>{serviceName}</Text>
        <View style={[styles.pill, item.active ? styles.pillActive : styles.pillCancelled]}>
          <Text style={[styles.pillText, item.active ? styles.pillTextActive : styles.pillTextCancelled]}>
            {item.active ? "Active" : "Cancelled"}
          </Text>
        </View>
      </View>
      <Text style={styles.schedule}>{schedule}</Text>
      <Text style={styles.dateRange}>{dateRange}</Text>
      <View style={styles.cardBottom}>
        <Text style={styles.parentName}>For {parentName}</Text>
        <Text style={styles.price}>{formatPaise(item.amountInPaise)} / visit</Text>
      </View>
      {item.active && (
        <TouchableOpacity
          style={[styles.cancelBtn, cancelMutation.isPending && styles.btnDisabled]}
          onPress={handleCancel}
          disabled={cancelMutation.isPending}
          activeOpacity={0.8}
        >
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function RecurringBookingsScreen() {
  const router = useRouter();
  const { data: recurring, isLoading } = useRecurringBookings();

  const { data: parents } = useQuery({
    queryKey: ["parents"],
    queryFn: () => parentsApi.list().then((r) => r.data.data),
  });

  const { data: services } = useQuery({
    queryKey: ["services"],
    queryFn: () => servicesApi.list().then((r) => r.data.data),
  });

  if (isLoading) return <LoadingScreen />;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TopBar title="Recurring Bookings" />
      </View>

      <FlatList
        data={recurring ?? []}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <RecurringRow
            item={item}
            serviceName={services?.find((s) => s.id === item.serviceTypeId)?.name ?? "Service"}
            parentName={parents?.find((p) => p.id === item.parentProfileId)?.name ?? "your parent"}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            message="No recurring bookings yet. Set one up from any caregiver's profile."
            actionLabel="Browse services"
            onAction={() => router.push("/(family)/services" as any)}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F9FAFB" },
  header: { paddingHorizontal: 20, paddingTop: 8 },
  list: { padding: 20, gap: 12 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 18, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  serviceName: { fontSize: 16, fontWeight: "700", color: "#1A1A2E", flex: 1, marginRight: 8 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  pillActive: { backgroundColor: "#D1FAE5" },
  pillCancelled: { backgroundColor: "#F3F4F6" },
  pillText: { fontSize: 12, fontWeight: "700" },
  pillTextActive: { color: "#059669" },
  pillTextCancelled: { color: "#6B7280" },
  schedule: { fontSize: 14, color: "#374151", fontWeight: "500", marginBottom: 3 },
  dateRange: { fontSize: 13, color: "#6B7280", marginBottom: 12 },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 12 },
  parentName: { fontSize: 13, color: "#6B7280" },
  price: { fontSize: 14, fontWeight: "700", color: "#1A1A2E" },
  cancelBtn: { marginTop: 12, borderWidth: 1.5, borderColor: "#EF4444", borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  btnDisabled: { opacity: 0.5 },
  cancelBtnText: { fontSize: 14, fontWeight: "700", color: "#EF4444" },
});
