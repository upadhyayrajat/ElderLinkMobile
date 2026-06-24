import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import * as Location from "expo-location";
import { bookingsApi } from "@/src/api/bookings";
import type { BookingStatus } from "@/src/types";
import { ArrowLeft, Calendar, Clock, DollarSign, MapPin } from "lucide-react-native";

const LOCATION_INTERVAL_MS = 30_000;

const STATUS_COLOR: Record<BookingStatus, string> = {
  pending:     "#F59E0B",
  confirmed:   "#006FFD",
  in_progress: "#10B981",
  completed:   "#6B7280",
  cancelled:   "#EF4444",
  disputed:    "#EF4444",
  refunded:    "#9CA3AF",
};

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending:     "Pending — Awaiting your acceptance",
  confirmed:   "Confirmed — Ready to start",
  in_progress: "In Progress — Sharing location",
  completed:   "Completed",
  cancelled:   "Cancelled",
  disputed:    "Disputed",
  refunded:    "Refunded",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function formatPaise(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function ActionButton({
  label, color, onPress, loading,
}: {
  label: string; color: string; onPress: () => void; loading?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, { backgroundColor: color }]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.85}
    >
      {loading
        ? <ActivityIndicator color="#fff" size="small" />
        : <Text style={styles.actionBtnText}>{label}</Text>
      }
    </TouchableOpacity>
  );
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: booking, isLoading } = useQuery({
    queryKey: ["provider-booking", id],
    queryFn: () => bookingsApi.listForProvider().then((r) => {
      const all = r.data.data;
      return all.find((b) => b.id === id) ?? null;
    }),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus: BookingStatus) => bookingsApi.updateStatus(id, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-booking", id] });
      queryClient.invalidateQueries({ queryKey: ["provider-bookings"] });
    },
    onError: () => Alert.alert("Error", "Could not update job status. Please try again."),
  });

  // Start or stop location sharing based on booking status.
  useEffect(() => {
    if (booking?.status !== "in_progress") {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
        locationIntervalRef.current = null;
      }
      return;
    }

    const startSharing = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location permission required",
          "Please allow location access so the family can track this visit in real time."
        );
        return;
      }

      const postLocation = async () => {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          await bookingsApi.postLocation(id, loc.coords.latitude, loc.coords.longitude);
        } catch {
          // Silent — network blip during an outing shouldn't surface as an error
        }
      };

      // Post immediately on start, then every 30 s
      postLocation();
      locationIntervalRef.current = setInterval(postLocation, LOCATION_INTERVAL_MS);
    };

    startSharing();

    return () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
        locationIntervalRef.current = null;
      }
    };
  }, [booking?.status, id]);

  const confirmTransition = (label: string, newStatus: BookingStatus) => {
    Alert.alert(
      `${label}?`,
      `Mark this job as "${label.toLowerCase()}"?`,
      [
        { text: "No", style: "cancel" },
        { text: "Yes", onPress: () => statusMutation.mutate(newStatus) },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#006FFD" size="large" />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Job not found.</Text>
      </View>
    );
  }

  const statusColor = STATUS_COLOR[booking.status] ?? "#6B7280";
  const isPending = statusMutation.isPending;
  const isSharingLocation = booking.status === "in_progress";

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Job Detail</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Status */}
      <View style={[styles.statusBar, { backgroundColor: statusColor + "15", borderColor: statusColor + "40" }]}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.statusText, { color: statusColor }]}>
          {STATUS_LABEL[booking.status] ?? booking.status}
        </Text>
      </View>

      {/* Live location sharing indicator */}
      {isSharingLocation && (
        <View style={styles.locationBanner}>
          <MapPin size={14} color="#10B981" />
          <Text style={styles.locationBannerText}>
            Sharing location with family every 30 s
          </Text>
        </View>
      )}

      {/* Schedule */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Schedule</Text>
        <InfoRow
          icon={<Calendar size={16} color="#6B7280" />}
          label="Date"
          value={formatDate(booking.scheduledAt)}
        />
        <InfoRow
          icon={<Clock size={16} color="#6B7280" />}
          label="Time & Duration"
          value={`${formatTime(booking.scheduledAt)} · ${booking.durationMinutes} min`}
        />
      </View>

      {/* Earnings */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your Earnings</Text>
        <InfoRow
          icon={<DollarSign size={16} color="#6B7280" />}
          label="Service fee (before platform cut)"
          value={formatPaise(booking.amountInPaise)}
        />
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Net payout (85%)</Text>
          <Text style={styles.totalValue}>
            {formatPaise(Math.round(booking.amountInPaise * 0.85))}
          </Text>
        </View>
      </View>

      {/* Notes */}
      {booking.notes ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Family Notes</Text>
          <Text style={styles.notesText}>{booking.notes}</Text>
        </View>
      ) : null}

      {/* Action buttons */}
      <View style={styles.actions}>
        {booking.status === "pending" && (
          <>
            <ActionButton
              label="Accept Job"
              color="#006FFD"
              loading={isPending}
              onPress={() => confirmTransition("Accept", "confirmed")}
            />
            <ActionButton
              label="Decline"
              color="#EF4444"
              loading={isPending}
              onPress={() => confirmTransition("Decline", "cancelled")}
            />
          </>
        )}
        {booking.status === "confirmed" && (
          <ActionButton
            label="Start Job"
            color="#10B981"
            loading={isPending}
            onPress={() => confirmTransition("Start", "in_progress")}
          />
        )}
        {booking.status === "in_progress" && (
          <ActionButton
            label="Mark as Complete"
            color="#6B7280"
            loading={isPending}
            onPress={() => {
              Alert.alert(
                "Complete job?",
                "Mark this job as completed? Location sharing will stop.",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Complete", onPress: () => statusMutation.mutate("completed") },
                ]
              );
            }}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: 20, paddingBottom: 48 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 15, color: "#6B7280" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20, paddingTop: 8 },
  backBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: "#fff", justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  pageTitle: { fontSize: 17, fontWeight: "700", color: "#1A1A2E" },
  statusBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: "700", flex: 1 },
  locationBanner: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#BBF7D0", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 14 },
  locationBannerText: { fontSize: 13, color: "#15803D", fontWeight: "500" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 18, marginBottom: 14, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  cardTitle: { fontSize: 13, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  infoIcon: { marginTop: 2 },
  infoLabel: { fontSize: 12, color: "#9CA3AF", marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: "600", color: "#1A1A2E" },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 10 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: 14, color: "#374151" },
  totalValue: { fontSize: 16, fontWeight: "800", color: "#10B981" },
  notesText: { fontSize: 14, color: "#374151", lineHeight: 20 },
  actions: { gap: 10, marginTop: 8 },
  actionBtn: { borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  actionBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
