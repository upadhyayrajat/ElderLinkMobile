import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Image, TextInput,
} from "react-native";
import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bookingsApi } from "@/src/api/bookings";
import { serviceReportsApi } from "@/src/api/service-reports";
import { reviewsApi } from "@/src/api/reviews";
import type { BookingStatus } from "@/src/types";
import { ArrowLeft, Calendar, Clock, User, DollarSign, Heart, Star, CheckCircle2 } from "lucide-react-native";

function StarRating({ rating, onChange }: { rating: number; onChange: (n: number) => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity key={n} onPress={() => onChange(n)} activeOpacity={0.7}>
          <Star size={32} color={n <= rating ? "#F59E0B" : "#D1D5DB"} fill={n <= rating ? "#F59E0B" : "transparent"} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const MOOD_LABEL: Record<string, { label: string; color: string }> = {
  happy: { label: "Happy", color: "#10B981" },
  neutral: { label: "Neutral", color: "#F59E0B" },
  sad: { label: "Sad", color: "#EF4444" },
};

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
  pending:     "Pending",
  confirmed:   "Confirmed",
  in_progress: "In Progress",
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
      <View>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");

  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking", id],
    queryFn: () => bookingsApi.get(id).then((r) => r.data.data),
    enabled: !!id,
  });

  const { data: report } = useQuery({
    queryKey: ["service-report", id],
    queryFn: () => serviceReportsApi.getForBooking(id).then((r) => r.data.data),
    enabled: !!id && booking?.status === "completed",
  });

  const cancelMutation = useMutation({
    mutationFn: () => bookingsApi.cancelAsFamily(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking", id] });
      queryClient.invalidateQueries({ queryKey: ["family-bookings"] });
    },
    onError: () => Alert.alert("Error", "Could not cancel the booking. Please try again."),
  });

  const reviewMutation = useMutation({
    mutationFn: () => reviewsApi.createFamilyReview(id, { rating, comment: reviewComment.trim() || undefined }),
    onSuccess: () => setReviewSubmitted(true),
    onError: (err: any) => {
      if (err?.response?.status === 409) {
        setReviewSubmitted(true);
        return;
      }
      Alert.alert("Error", err?.response?.data?.error ?? "Could not submit your rating. Please try again.");
    },
  });

  const submitReview = () => {
    if (rating < 1) {
      Alert.alert("Validation Error", "Please select a star rating.");
      return;
    }
    reviewMutation.mutate();
  };

  const handleCancel = () => {
    Alert.alert(
      "Cancel booking",
      "Are you sure you want to cancel this booking?",
      [
        { text: "No", style: "cancel" },
        { text: "Yes, cancel", style: "destructive", onPress: () => cancelMutation.mutate() },
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
        <Text style={styles.errorText}>Booking not found.</Text>
      </View>
    );
  }

  const statusColor = STATUS_COLOR[booking.status] ?? "#6B7280";
  const canCancel = booking.status === "pending" || booking.status === "confirmed";

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Booking Detail</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Status badge */}
      <View style={[styles.statusBadge, { backgroundColor: statusColor + "18", borderColor: statusColor + "40" }]}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.statusText, { color: statusColor }]}>
          {STATUS_LABEL[booking.status] ?? booking.status}
        </Text>
      </View>

      {/* Service + date */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Service Details</Text>
        <InfoRow
          icon={<Calendar size={16} color="#6B7280" />}
          label="Scheduled"
          value={`${formatDate(booking.scheduledAt)} at ${formatTime(booking.scheduledAt)}`}
        />
        <InfoRow
          icon={<Clock size={16} color="#6B7280" />}
          label="Duration"
          value={`${booking.durationMinutes} minutes`}
        />
      </View>

      {/* Pricing */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Payment</Text>
        <InfoRow
          icon={<DollarSign size={16} color="#6B7280" />}
          label="Service fee"
          value={formatPaise(booking.amountInPaise)}
        />
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total (incl. platform fee)</Text>
          <Text style={styles.totalValue}>
            {formatPaise(booking.amountInPaise + booking.platformFeeInPaise)}
          </Text>
        </View>
      </View>

      {/* Notes */}
      {booking.notes ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Notes</Text>
          <Text style={styles.notesText}>{booking.notes}</Text>
        </View>
      ) : null}

      {/* Visit report */}
      {report && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Visit Report</Text>
          <InfoRow
            icon={<Heart size={16} color={MOOD_LABEL[report.elderMood]?.color ?? "#6B7280"} />}
            label="Elder's mood"
            value={MOOD_LABEL[report.elderMood]?.label ?? report.elderMood}
          />
          <Text style={styles.reportSummary}>{report.summary}</Text>
          {report.vitalsNoted ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.infoLabel}>Vitals noted</Text>
              <Text style={styles.reportSummary}>{report.vitalsNoted}</Text>
            </>
          ) : null}
          {report.followUpRecommended && (
            <View style={styles.followUpBanner}>
              <Text style={styles.followUpBannerText}>
                Follow-up recommended{report.followUpNotes ? `: ${report.followUpNotes}` : ""}
              </Text>
            </View>
          )}
          {report.photoUrls.length > 0 && (
            <ScrollView horizontal style={styles.photoScroll} showsHorizontalScrollIndicator={false}>
              {report.photoUrls.map((url) => (
                <Image key={url} source={{ uri: url }} style={styles.reportPhoto} />
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* Rate provider */}
      {booking.status === "completed" && (
        reviewSubmitted ? (
          <View style={styles.reviewDoneCard}>
            <CheckCircle2 size={20} color="#10B981" />
            <Text style={styles.reviewDoneText}>Thanks for your rating!</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Rate Your Provider</Text>
            <StarRating rating={rating} onChange={setRating} />
            <TextInput
              style={styles.reviewInput}
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholder="Add a comment (optional)"
              placeholderTextColor="#9CA3AF"
              multiline
            />
            <TouchableOpacity
              style={[styles.submitReviewBtn, reviewMutation.isPending && styles.btnDisabled]}
              onPress={submitReview}
              disabled={reviewMutation.isPending}
              activeOpacity={0.85}
            >
              {reviewMutation.isPending
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.submitReviewBtnText}>Submit Rating</Text>
              }
            </TouchableOpacity>
          </View>
        )
      )}

      {/* Cancel button */}
      {canCancel && (
        <TouchableOpacity
          style={[styles.cancelBtn, cancelMutation.isPending && styles.btnDisabled]}
          onPress={handleCancel}
          disabled={cancelMutation.isPending}
          activeOpacity={0.8}
        >
          {cancelMutation.isPending
            ? <ActivityIndicator color="#EF4444" size="small" />
            : <Text style={styles.cancelBtnText}>Cancel Booking</Text>
          }
        </TouchableOpacity>
      )}
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
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, marginBottom: 20 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: "700" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 18, marginBottom: 14, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  cardTitle: { fontSize: 13, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  infoIcon: { marginTop: 2 },
  infoLabel: { fontSize: 12, color: "#9CA3AF", marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: "600", color: "#1A1A2E" },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 10 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: 14, color: "#374151" },
  totalValue: { fontSize: 16, fontWeight: "800", color: "#1A1A2E" },
  notesText: { fontSize: 14, color: "#374151", lineHeight: 20 },
  cancelBtn: { marginTop: 8, borderWidth: 1.5, borderColor: "#EF4444", borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  btnDisabled: { opacity: 0.5 },
  cancelBtnText: { fontSize: 15, fontWeight: "700", color: "#EF4444" },
  reportSummary: { fontSize: 14, color: "#374151", lineHeight: 20, marginTop: 4 },
  followUpBanner: { backgroundColor: "#FEF3C7", borderRadius: 10, padding: 12, marginTop: 12 },
  followUpBannerText: { fontSize: 13, color: "#92400E", fontWeight: "600" },
  photoScroll: { marginTop: 14 },
  reportPhoto: { width: 88, height: 88, borderRadius: 10, marginRight: 8, backgroundColor: "#F3F4F6" },
  reviewDoneCard: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#BBF7D0", borderRadius: 14, padding: 16 },
  reviewDoneText: { fontSize: 14, fontWeight: "600", color: "#15803D" },
  reviewInput: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#1A1A2E", minHeight: 70, marginTop: 16, textAlignVertical: "top" },
  submitReviewBtn: { backgroundColor: "#006FFD", borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 16 },
  submitReviewBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
