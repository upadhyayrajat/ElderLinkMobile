import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { useState, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { recurringBookingsApi } from "@/src/api/recurring-bookings";
import { parentsApi } from "@/src/api/parents";
import { servicesApi } from "@/src/api/services";
import { Field } from "@/src/components/Field";
import { TopBar } from "@/src/components/TopBar";
import type { RecurrenceFrequency } from "@/src/types";

const FREQUENCIES: { value: RecurrenceFrequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "monthly", label: "Monthly" },
];

const DAYS: { value: number; label: string }[] = [
  { value: 0, label: "S" },
  { value: 1, label: "M" },
  { value: 2, label: "T" },
  { value: 3, label: "W" },
  { value: 4, label: "T" },
  { value: 5, label: "F" },
  { value: 6, label: "S" },
];

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^\d{2}:\d{2}$/;

export default function NewRecurringBookingScreen() {
  const { serviceTypeId, serviceName, providerUserId } = useLocalSearchParams<{
    serviceTypeId: string;
    serviceName: string;
    providerUserId: string;
  }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedParentId, setSelectedParentId] = useState("");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("weekly");
  const [dayOfWeek, setDayOfWeek] = useState<number | null>(null);
  const [timeOfDay, setTimeOfDay] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: parents, isLoading: loadingParents } = useQuery({
    queryKey: ["parents"],
    queryFn: () => parentsApi.list().then((r) => r.data.data),
  });

  // Auto-select the only parent profile — onSuccess removed in React Query v5
  useEffect(() => {
    if (parents?.length === 1 && !selectedParentId) {
      setSelectedParentId(parents[0].id);
    }
  }, [parents]);

  const { data: services } = useQuery({
    queryKey: ["services"],
    queryFn: () => servicesApi.list().then((r) => r.data.data),
  });

  const service = services?.find((s) => s.id === serviceTypeId);
  const amountInPaise = service?.basePriceInPaise ?? 0;
  const platformFeeInPaise = Math.round(amountInPaise * 0.15);

  const mutation = useMutation({
    mutationFn: () => {
      if (!selectedParentId) throw new Error("Select a parent profile");
      if (!TIME_REGEX.test(timeOfDay)) throw new Error("Enter time as HH:MM");
      if (!DATE_REGEX.test(startDate)) throw new Error("Enter start date as YYYY-MM-DD");
      if (isNaN(new Date(startDate).getTime())) throw new Error("Invalid start date");

      // Compare as YYYY-MM-DD strings (not Date objects) — they sort correctly
      // lexically, and this sidesteps the timezone bug where new Date("YYYY-MM-DD")
      // parses as UTC midnight and can appear as "yesterday" once converted to a
      // local timezone behind UTC.
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      if (startDate < todayStr) throw new Error("Start date can't be in the past");

      if (endDate.trim()) {
        if (!DATE_REGEX.test(endDate)) throw new Error("Enter end date as YYYY-MM-DD");
        if (isNaN(new Date(endDate).getTime())) throw new Error("Invalid end date");
        if (endDate < startDate) throw new Error("End date must be on or after the start date");
      }

      return recurringBookingsApi.create({
        parentProfileId: selectedParentId,
        providerUserId,
        serviceTypeId,
        frequency,
        dayOfWeek: frequency === "weekly" && dayOfWeek !== null ? dayOfWeek : undefined,
        timeOfDay,
        startDate,
        endDate: endDate.trim() || undefined,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["recurring-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["family-bookings"] });
      Alert.alert(
        "Recurring booking created",
        `${res.data.generated} upcoming visit${res.data.generated === 1 ? "" : "s"} scheduled.`,
        [{ text: "OK", onPress: () => router.replace("/(family)/recurring" as any) }]
      );
    },
    onError: (err: unknown) => {
      const responseError = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      const msg = responseError ?? (err instanceof Error ? err.message : "Failed to create recurring booking. Please try again.");
      Alert.alert("Error", msg);
    },
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TopBar title="Set Up Recurring Booking" />

        {/* Service summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryService}>{serviceName ?? "Service"}</Text>
          {service && (
            <Text style={styles.summaryDuration}>{service.durationMinutes} min session</Text>
          )}
        </View>

        {/* Parent selection */}
        <Text style={styles.sectionTitle}>Who is this booking for?</Text>
        {loadingParents ? (
          <ActivityIndicator color="#006FFD" />
        ) : (parents ?? []).length === 0 ? (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              You need to add a parent profile before booking.
            </Text>
            <TouchableOpacity onPress={() => router.push("/(family)/parents/new" as any)}>
              <Text style={styles.warningLink}>Add parent profile →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.parentList}>
            {(parents ?? []).map((parent) => (
              <TouchableOpacity
                key={parent.id}
                style={[
                  styles.parentOption,
                  selectedParentId === parent.id && styles.parentOptionSelected,
                ]}
                onPress={() => setSelectedParentId(parent.id)}
                activeOpacity={0.8}
              >
                <View style={styles.parentOptionDot}>
                  {selectedParentId === parent.id && <View style={styles.parentOptionDotFill} />}
                </View>
                <View>
                  <Text style={styles.parentOptionName}>{parent.name}</Text>
                  <Text style={styles.parentOptionMeta}>{parent.age} yrs · {parent.city}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Frequency */}
        <Text style={styles.sectionTitle}>How often?</Text>
        <View style={styles.segmentRow}>
          {FREQUENCIES.map((f) => (
            <TouchableOpacity
              key={f.value}
              style={[styles.segment, frequency === f.value && styles.segmentSelected]}
              onPress={() => setFrequency(f.value)}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentText, frequency === f.value && styles.segmentTextSelected]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Day of week (weekly only) */}
        {frequency === "weekly" && (
          <>
            <Text style={styles.sectionTitle}>Which day? (optional)</Text>
            <View style={styles.dayRow}>
              {DAYS.map((d) => (
                <TouchableOpacity
                  key={d.value}
                  style={[styles.dayChip, dayOfWeek === d.value && styles.dayChipSelected]}
                  onPress={() => setDayOfWeek(dayOfWeek === d.value ? null : d.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dayChipText, dayOfWeek === d.value && styles.dayChipTextSelected]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Schedule */}
        <Text style={styles.sectionTitle}>When?</Text>
        <Field
          label="Time"
          value={timeOfDay}
          onChangeText={setTimeOfDay}
          placeholder="10:00"
          hint="24-hour format, e.g. 10:00 or 14:30"
          required
        />
        <Field
          label="Start date"
          value={startDate}
          onChangeText={setStartDate}
          placeholder="2026-07-15"
          hint="Format: YYYY-MM-DD"
          required
        />
        <Field
          label="End date"
          value={endDate}
          onChangeText={setEndDate}
          placeholder="2026-12-15"
          hint="Optional — leave blank for an ongoing booking"
        />

        {/* Pricing */}
        {service && (
          <View style={styles.priceCard}>
            <Text style={styles.priceTitle}>Pricing per visit</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Service fee</Text>
              <Text style={styles.priceValue}>₹{(amountInPaise / 100).toLocaleString("en-IN")}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Platform fee (15%)</Text>
              <Text style={styles.priceValue}>₹{(platformFeeInPaise / 100).toLocaleString("en-IN")}</Text>
            </View>
            <View style={[styles.priceRow, styles.priceTotal]}>
              <Text style={styles.priceTotalLabel}>Total per visit</Text>
              <Text style={styles.priceTotalValue}>
                ₹{((amountInPaise + platformFeeInPaise) / 100).toLocaleString("en-IN")}
              </Text>
            </View>
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, mutation.isPending && styles.btnDisabled]}
          onPress={() => mutation.mutate()}
          disabled={mutation.isPending || !selectedParentId}
          activeOpacity={0.85}
        >
          {mutation.isPending
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.submitBtnText}>Set Up Recurring Booking</Text>
          }
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          The first batch of upcoming visits will be scheduled immediately.
          Payment is collected per visit, same as a one-off booking.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: 20, paddingBottom: 48 },
  summaryCard: { backgroundColor: "#EEF4FF", borderRadius: 16, padding: 18, marginBottom: 24 },
  summaryService: { fontSize: 18, fontWeight: "700", color: "#1A1A2E" },
  summaryDuration: { fontSize: 14, color: "#6B7280", marginTop: 4 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12, marginTop: 8 },
  parentList: { gap: 10, marginBottom: 16 },
  parentOption: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: "#E5E7EB" },
  parentOptionSelected: { borderColor: "#006FFD", backgroundColor: "#F0F7FF" },
  parentOptionDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: "#006FFD", justifyContent: "center", alignItems: "center" },
  parentOptionDotFill: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#006FFD" },
  parentOptionName: { fontSize: 15, fontWeight: "600", color: "#1A1A2E" },
  parentOptionMeta: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  warningBox: { backgroundColor: "#FEF3C7", borderRadius: 12, padding: 16, marginBottom: 16 },
  warningText: { fontSize: 14, color: "#92400E", marginBottom: 8 },
  warningLink: { fontSize: 14, color: "#006FFD", fontWeight: "600" },
  segmentRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  segment: { flex: 1, backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#E5E7EB", borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  segmentSelected: { borderColor: "#006FFD", backgroundColor: "#F0F7FF" },
  segmentText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  segmentTextSelected: { color: "#006FFD" },
  dayRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  dayChip: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#E5E7EB", justifyContent: "center", alignItems: "center" },
  dayChipSelected: { borderColor: "#006FFD", backgroundColor: "#006FFD" },
  dayChipText: { fontSize: 14, fontWeight: "700", color: "#6B7280" },
  dayChipTextSelected: { color: "#fff" },
  priceCard: { backgroundColor: "#fff", borderRadius: 16, padding: 18, marginTop: 8, marginBottom: 20, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  priceTitle: { fontSize: 13, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  priceLabel: { fontSize: 14, color: "#6B7280" },
  priceValue: { fontSize: 14, color: "#374151" },
  priceTotal: { borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 10, marginTop: 4, marginBottom: 0 },
  priceTotalLabel: { fontSize: 15, fontWeight: "700", color: "#1A1A2E" },
  priceTotalValue: { fontSize: 16, fontWeight: "800", color: "#006FFD" },
  submitBtn: { backgroundColor: "#006FFD", borderRadius: 16, paddingVertical: 16, alignItems: "center", marginTop: 4 },
  btnDisabled: { opacity: 0.6 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  disclaimer: { fontSize: 12, color: "#9CA3AF", textAlign: "center", marginTop: 12 },
});
