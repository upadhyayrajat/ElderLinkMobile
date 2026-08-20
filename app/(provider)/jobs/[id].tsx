import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { bookingsApi } from "@/src/api/bookings";
import { serviceReportsApi, type CreateServiceReportInput } from "@/src/api/service-reports";
import { reviewsApi } from "@/src/api/reviews";
import type { BookingStatus } from "@/src/types";
import { ArrowLeft, Calendar, Clock, DollarSign, MapPin, X, CheckCircle2, Star } from "lucide-react-native";

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

const MAX_REPORT_PHOTOS = 5;
type ElderMood = "happy" | "neutral" | "sad";
const MOOD_OPTIONS: { value: ElderMood; label: string; color: string }[] = [
  { value: "happy", label: "Happy", color: "#10B981" },
  { value: "neutral", label: "Neutral", color: "#F59E0B" },
  { value: "sad", label: "Sad", color: "#EF4444" },
];

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

  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");

  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [summary, setSummary] = useState("");
  const [elderMood, setElderMood] = useState<ElderMood | null>(null);
  const [vitalsNoted, setVitalsNoted] = useState("");
  const [followUpRecommended, setFollowUpRecommended] = useState(false);
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [photos, setPhotos] = useState<{ uri: string; name: string; type: string }[]>([]);

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

  const reportMutation = useMutation({
    mutationFn: (input: CreateServiceReportInput) => serviceReportsApi.create(input),
    onSuccess: () => setReportSubmitted(true),
    onError: (err: any) => {
      if (err?.response?.status === 409) {
        // Already submitted (e.g. in a previous session) — nothing more to do here.
        setReportSubmitted(true);
        return;
      }
      const msg = err?.response?.data?.error ?? "Could not submit the report. Please try again.";
      Alert.alert("Error", msg);
    },
  });

  const pickPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow photo library access to attach visit photos.");
      return;
    }
    const remaining = MAX_REPORT_PHOTOS - photos.length;
    if (remaining <= 0) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.6,
    });
    if (result.canceled) return;
    const picked = result.assets.slice(0, remaining).map((a, i) => ({
      uri: a.uri,
      name: a.fileName ?? `photo-${Date.now()}-${i}.jpg`,
      type: a.mimeType ?? "image/jpeg",
    }));
    setPhotos((prev) => [...prev, ...picked]);
  };

  const submitReport = () => {
    if (summary.trim().length < 10) {
      Alert.alert("Validation Error", "Please write at least a brief summary (10+ characters).");
      return;
    }
    if (!elderMood) {
      Alert.alert("Validation Error", "Please select how the elder seemed during the visit.");
      return;
    }
    reportMutation.mutate({
      bookingId: id,
      summary: summary.trim(),
      elderMood,
      vitalsNoted: vitalsNoted.trim() || undefined,
      followUpRecommended,
      followUpNotes: followUpRecommended ? (followUpNotes.trim() || undefined) : undefined,
      photos,
    });
  };

  const reviewMutation = useMutation({
    mutationFn: () => reviewsApi.createProviderReview(id, { rating, comment: reviewComment.trim() || undefined }),
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

      {/* Visit report */}
      {booking.status === "completed" && (
        reportSubmitted ? (
          <View style={styles.reportDoneCard}>
            <CheckCircle2 size={20} color="#10B981" />
            <Text style={styles.reportDoneText}>Visit report submitted</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Submit Visit Report</Text>

            <Text style={styles.reportLabel}>How did the elder seem? <Text style={styles.required}>*</Text></Text>
            <View style={styles.moodRow}>
              {MOOD_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.moodOption,
                    { borderColor: opt.color + "40" },
                    elderMood === opt.value && { backgroundColor: opt.color + "20", borderColor: opt.color },
                  ]}
                  onPress={() => setElderMood(opt.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.moodOptionText, elderMood === opt.value && { color: opt.color }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.reportLabel}>Summary <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.reportTextArea}
              value={summary}
              onChangeText={setSummary}
              placeholder="What did you do during this visit?"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Text style={styles.reportLabel}>Vitals noted (optional)</Text>
            <TextInput
              style={styles.reportInput}
              value={vitalsNoted}
              onChangeText={setVitalsNoted}
              placeholder="e.g. BP looked high, seemed tired"
              placeholderTextColor="#9CA3AF"
            />

            <TouchableOpacity
              style={styles.followUpRow}
              onPress={() => setFollowUpRecommended((v) => !v)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, followUpRecommended && styles.checkboxChecked]}>
                {followUpRecommended && <CheckCircle2 size={14} color="#fff" />}
              </View>
              <Text style={styles.followUpLabel}>Recommend a follow-up</Text>
            </TouchableOpacity>

            {followUpRecommended && (
              <TextInput
                style={styles.reportInput}
                value={followUpNotes}
                onChangeText={setFollowUpNotes}
                placeholder="What should the family follow up on?"
                placeholderTextColor="#9CA3AF"
              />
            )}

            <Text style={styles.reportLabel}>Photos (optional, up to {MAX_REPORT_PHOTOS})</Text>
            <View style={styles.photoRow}>
              {photos.map((photo, i) => (
                <View key={photo.uri} style={styles.photoThumbWrap}>
                  <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
                  <TouchableOpacity
                    style={styles.photoRemove}
                    onPress={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <X size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {photos.length < MAX_REPORT_PHOTOS && (
                <TouchableOpacity style={styles.photoAdd} onPress={pickPhotos}>
                  <Text style={styles.photoAddText}>+ Add</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#006FFD", marginTop: 20 }, reportMutation.isPending && styles.btnDisabled]}
              onPress={submitReport}
              disabled={reportMutation.isPending}
              activeOpacity={0.85}
            >
              {reportMutation.isPending
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.actionBtnText}>Submit Report</Text>
              }
            </TouchableOpacity>
          </View>
        )
      )}

      {/* Rate family */}
      {booking.status === "completed" && (
        reviewSubmitted ? (
          <View style={styles.reportDoneCard}>
            <CheckCircle2 size={20} color="#10B981" />
            <Text style={styles.reportDoneText}>Thanks for your rating!</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Rate This Family</Text>
            <StarRating rating={rating} onChange={setRating} />
            <TextInput
              style={[styles.reportInput, { minHeight: 70, marginTop: 16, textAlignVertical: "top" }]}
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholder="Add a comment (optional)"
              placeholderTextColor="#9CA3AF"
              multiline
            />
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#006FFD", marginTop: 16 }, reviewMutation.isPending && styles.btnDisabled]}
              onPress={submitReview}
              disabled={reviewMutation.isPending}
              activeOpacity={0.85}
            >
              {reviewMutation.isPending
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.actionBtnText}>Submit Rating</Text>
              }
            </TouchableOpacity>
          </View>
        )
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
  btnDisabled: { opacity: 0.6 },
  reportDoneCard: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#BBF7D0", borderRadius: 14, padding: 16 },
  reportDoneText: { fontSize: 14, fontWeight: "600", color: "#15803D" },
  reportLabel: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8, marginTop: 14 },
  required: { color: "#EF4444" },
  reportInput: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#1A1A2E" },
  reportTextArea: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#1A1A2E", minHeight: 90 },
  moodRow: { flexDirection: "row", gap: 8 },
  moodOption: { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  moodOptionText: { fontSize: 13, fontWeight: "700", color: "#6B7280" },
  followUpRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: "#D1D5DB", alignItems: "center", justifyContent: "center" },
  checkboxChecked: { backgroundColor: "#006FFD", borderColor: "#006FFD" },
  followUpLabel: { fontSize: 14, color: "#374151", fontWeight: "500" },
  photoRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  photoThumbWrap: { position: "relative" },
  photoThumb: { width: 64, height: 64, borderRadius: 10, backgroundColor: "#F3F4F6" },
  photoRemove: { position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: "#1A1A2E", alignItems: "center", justifyContent: "center" },
  photoAdd: { width: 64, height: 64, borderRadius: 10, borderWidth: 1.5, borderColor: "#D1D5DB", borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  photoAddText: { fontSize: 11, fontWeight: "600", color: "#6B7280" },
});
