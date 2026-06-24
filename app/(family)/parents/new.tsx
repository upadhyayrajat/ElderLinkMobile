import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { parentsApi, type CreateParentInput } from "@/src/api/parents";
import { ArrowLeft } from "lucide-react-native";

function Field({
  label, value, onChangeText, placeholder, keyboardType, maxLength, required, hint,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "phone-pad";
  maxLength?: number;
  required?: boolean;
  hint?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}{required && <Text style={styles.required}> *</Text>}
      </Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType ?? "default"}
        maxLength={maxLength}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export default function AddParentScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [mobilityNotes, setMobilityNotes] = useState("");
  const [medicalNotes, setMedicalNotes] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("+91");

  const mutation = useMutation({
    mutationFn: (input: CreateParentInput) => parentsApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parents"] });
      router.replace("/(family)/parents" as any);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error ?? "Failed to add parent profile. Please try again.";
      Alert.alert("Error", msg);
    },
  });

  const validate = (): string | null => {
    if (name.trim().length < 2) return "Name must be at least 2 characters.";
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 50 || ageNum > 120) return "Age must be between 50 and 120.";
    if (address.trim().length < 5) return "Enter a full address (at least 5 characters).";
    if (city.trim().length < 2) return "Enter a city name.";
    if (!/^\d{6}$/.test(pincode)) return "Pincode must be exactly 6 digits.";
    if (emergencyContactName.trim().length < 2) return "Enter the emergency contact's name.";
    if (!/^\+91[6-9]\d{9}$/.test(emergencyContactPhone)) {
      return "Emergency phone must be a valid Indian number: +91XXXXXXXXXX";
    }
    return null;
  };

  const handleSubmit = () => {
    const err = validate();
    if (err) { Alert.alert("Validation Error", err); return; }

    mutation.mutate({
      name: name.trim(),
      age: parseInt(age, 10),
      address: address.trim(),
      city: city.trim(),
      pincode,
      mobilityNotes: mobilityNotes.trim() || undefined,
      medicalNotes: medicalNotes.trim() || undefined,
      emergencyContactName: emergencyContactName.trim(),
      emergencyContactPhone,
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color="#1A1A2E" />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Add Parent Profile</Text>
          <View style={{ width: 38 }} />
        </View>

        <Text style={styles.sectionTitle}>Basic Information</Text>
        <Field label="Full name" value={name} onChangeText={setName} placeholder="e.g. Ramesh Kumar" required />
        <Field label="Age" value={age} onChangeText={setAge} placeholder="e.g. 72" keyboardType="numeric" maxLength={3} required />

        <Text style={styles.sectionTitle}>Address</Text>
        <Field label="Full address" value={address} onChangeText={setAddress} placeholder="House no., street, area" required />
        <Field label="City" value={city} onChangeText={setCity} placeholder="e.g. Delhi" required />
        <Field label="Pincode" value={pincode} onChangeText={setPincode} placeholder="e.g. 110001" keyboardType="numeric" maxLength={6} required />

        <Text style={styles.sectionTitle}>Health Notes (optional)</Text>
        <Field label="Mobility notes" value={mobilityNotes} onChangeText={setMobilityNotes} placeholder="e.g. uses a walker, difficulty with stairs" />
        <Field label="Medical notes" value={medicalNotes} onChangeText={setMedicalNotes} placeholder="e.g. diabetic, blood pressure medication" />

        <Text style={styles.sectionTitle}>Emergency Contact</Text>
        <Field label="Contact name" value={emergencyContactName} onChangeText={setEmergencyContactName} placeholder="e.g. Priya Sharma" required />
        <Field
          label="Contact phone"
          value={emergencyContactPhone}
          onChangeText={setEmergencyContactPhone}
          placeholder="+91XXXXXXXXXX"
          keyboardType="phone-pad"
          maxLength={13}
          required
          hint="Format: +91 followed by 10-digit mobile number"
        />

        <TouchableOpacity
          style={[styles.submitBtn, mutation.isPending && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={mutation.isPending}
          activeOpacity={0.8}
        >
          {mutation.isPending
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.submitBtnText}>Save Profile</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: 20, paddingBottom: 48 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24, paddingTop: 8 },
  backBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: "#fff", justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  pageTitle: { fontSize: 17, fontWeight: "700", color: "#1A1A2E" },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12, marginTop: 8 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 6 },
  required: { color: "#EF4444" },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#1A1A2E" },
  hint: { fontSize: 12, color: "#9CA3AF", marginTop: 4 },
  submitBtn: { backgroundColor: "#006FFD", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 24 },
  btnDisabled: { opacity: 0.6 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
