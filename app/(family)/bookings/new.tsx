import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bookingsApi } from "@/src/api/bookings";
import { parentsApi } from "@/src/api/parents";
import { servicesApi } from "@/src/api/services";
import { ArrowLeft, Calendar, User, FileText, ChevronDown } from "lucide-react-native";

function Field({
  label, value, onChangeText, placeholder, keyboardType, hint, multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric";
  hint?: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType ?? "default"}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export default function NewBookingScreen() {
  const { serviceTypeId, serviceName, providerProfileId } = useLocalSearchParams<{
    serviceTypeId: string;
    serviceName: string;
    providerProfileId: string;
  }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedParentId, setSelectedParentId] = useState("");
  const [scheduledDate, setScheduledDate] = useState(""); // YYYY-MM-DD
  const [scheduledTime, setScheduledTime] = useState(""); // HH:MM
  const [notes, setNotes] = useState("");

  const { data: parents, isLoading: loadingParents } = useQuery({
    queryKey: ["parents"],
    queryFn: () => parentsApi.list().then((r) => r.data.data),
    onSuccess: (data) => {
      if (data.length === 1 && !selectedParentId) {
        setSelectedParentId(data[0].id);
      }
    },
  });

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
      if (!scheduledDate.match(/^\d{4}-\d{2}-\d{2}$/)) throw new Error("Enter date as YYYY-MM-DD");
      if (!scheduledTime.match(/^\d{2}:\d{2}$/)) throw new Error("Enter time as HH:MM");

      const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}:00`);
      if (isNaN(scheduledAt.getTime())) throw new Error("Invalid date or time");
      if (scheduledAt <= new Date()) throw new Error("Please select a future date and time");

      return bookingsApi.create({
        parentProfileId: selectedParentId,
        providerProfileId,
        serviceTypeId,
        scheduledAt: scheduledAt.toISOString(),
        durationMinutes: service?.durationMinutes ?? 60,
        amountInPaise,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["family-bookings"] });
      router.replace(`/(family)/bookings/${res.data.data.id}` as any);
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { error?: string } } })?.response?.data?.error
          ?? "Failed to create booking. Please try again.";
      Alert.alert("Error", msg);
    },
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color="#1A1A2E" />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Confirm Booking</Text>
          <View style={{ width: 38 }} />
        </View>

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

        {/* Schedule */}
        <Text style={styles.sectionTitle}>When?</Text>
        <Field
          label="Date"
          value={scheduledDate}
          onChangeText={setScheduledDate}
          placeholder="2026-07-15"
          hint="Format: YYYY-MM-DD"
        />
        <Field
          label="Time"
          value={scheduledTime}
          onChangeText={setScheduledTime}
          placeholder="10:00"
          hint="24-hour format, e.g. 10:00 or 14:30"
        />

        {/* Notes */}
        <Text style={styles.sectionTitle}>Notes (optional)</Text>
        <Field
          label="Any special instructions?"
          value={notes}
          onChangeText={setNotes}
          placeholder="e.g. Please bring blood pressure monitor, ring doorbell twice"
          multiline
        />

        {/* Pricing */}
        {service && (
          <View style={styles.priceCard}>
            <Text style={styles.priceTitle}>Pricing</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Service fee</Text>
              <Text style={styles.priceValue}>₹{(amountInPaise / 100).toLocaleString("en-IN")}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Platform fee (15%)</Text>
              <Text style={styles.priceValue}>₹{(platformFeeInPaise / 100).toLocaleString("en-IN")}</Text>
            </View>
            <View style={[styles.priceRow, styles.priceTotal]}>
              <Text style={styles.priceTotalLabel}>Total</Text>
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
            : <Text style={styles.submitBtnText}>Confirm Booking</Text>
          }
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Payment will be collected when your caregiver confirms the booking.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: 20, paddingBottom: 48 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20, paddingTop: 8 },
  backBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: "#fff", justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  pageTitle: { fontSize: 17, fontWeight: "700", color: "#1A1A2E" },
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
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#1A1A2E" },
  inputMultiline: { minHeight: 90, textAlignVertical: "top" },
  hint: { fontSize: 12, color: "#9CA3AF", marginTop: 4 },
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
