import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { parentsApi, type CreateParentInput } from "@/src/api/parents";
import {
  ArrowLeft, Edit2, Save, User, MapPin, Phone, Heart, ShieldAlert,
} from "lucide-react-native";

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
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
      <Text style={styles.fieldLabel}>
        {label}{required && <Text style={{ color: "#EF4444" }}> *</Text>}
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

export default function ParentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: parent, isLoading } = useQuery({
    queryKey: ["parent", id],
    queryFn: () => parentsApi.get(id).then((r) => r.data.data),
    enabled: !!id,
  });

  // Edit form state — synced from parent on mount / parent change
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [mobilityNotes, setMobilityNotes] = useState("");
  const [medicalNotes, setMedicalNotes] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("+91");

  function enterEditMode() {
    if (!parent) return;
    setName(parent.name);
    setAge(String(parent.age));
    setAddress(parent.address);
    setCity(parent.city);
    setPincode(parent.pincode);
    setMobilityNotes(parent.mobilityNotes ?? "");
    setMedicalNotes(parent.medicalNotes ?? "");
    setEmergencyContactName(parent.emergencyContactName);
    setEmergencyContactPhone(parent.emergencyContactPhone);
    setEditing(true);
  }

  const updateMutation = useMutation({
    mutationFn: (input: Partial<CreateParentInput>) => parentsApi.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent", id] });
      queryClient.invalidateQueries({ queryKey: ["parents"] });
      setEditing(false);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? "Failed to save changes. Please try again.";
      Alert.alert("Error", msg);
    },
  });

  function validate(): string | null {
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
  }

  function handleSave() {
    const err = validate();
    if (err) { Alert.alert("Validation Error", err); return; }
    updateMutation.mutate({
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
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#006FFD" size="large" />
      </View>
    );
  }

  if (!parent) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Parent profile not found.</Text>
      </View>
    );
  }

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
          <Text style={styles.pageTitle}>{editing ? "Edit Profile" : "Parent Profile"}</Text>
          {!editing ? (
            <TouchableOpacity onPress={enterEditMode} style={styles.editBtn}>
              <Edit2 size={17} color="#006FFD" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 38 }} />
          )}
        </View>

        {/* Avatar block */}
        {!editing && (
          <View style={styles.avatarBlock}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{parent.name.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.avatarName}>{parent.name}</Text>
            <Text style={styles.avatarMeta}>{parent.age} years old · {parent.city}</Text>
          </View>
        )}

        {/* View mode */}
        {!editing && (
          <>
            <InfoSection title="Basic Information">
              <InfoRow icon={<User size={15} color="#6B7280" />} label="Full name" value={parent.name} />
              <InfoRow icon={<User size={15} color="#6B7280" />} label="Age" value={`${parent.age} years`} />
            </InfoSection>

            <InfoSection title="Address">
              <InfoRow icon={<MapPin size={15} color="#6B7280" />} label="Address" value={parent.address} />
              <InfoRow icon={<MapPin size={15} color="#6B7280" />} label="City & Pincode" value={`${parent.city} — ${parent.pincode}`} />
            </InfoSection>

            {(parent.mobilityNotes || parent.medicalNotes) && (
              <InfoSection title="Health Notes">
                {parent.mobilityNotes ? (
                  <InfoRow icon={<Heart size={15} color="#6B7280" />} label="Mobility" value={parent.mobilityNotes} />
                ) : null}
                {parent.medicalNotes ? (
                  <InfoRow icon={<Heart size={15} color="#6B7280" />} label="Medical" value={parent.medicalNotes} />
                ) : null}
              </InfoSection>
            )}

            <InfoSection title="Emergency Contact">
              <InfoRow icon={<ShieldAlert size={15} color="#EF4444" />} label="Name" value={parent.emergencyContactName} />
              <InfoRow icon={<Phone size={15} color="#EF4444" />} label="Phone" value={parent.emergencyContactPhone} />
            </InfoSection>
          </>
        )}

        {/* Edit mode */}
        {editing && (
          <>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            <Field label="Full name" value={name} onChangeText={setName} placeholder="e.g. Ramesh Kumar" required />
            <Field label="Age" value={age} onChangeText={setAge} placeholder="e.g. 72" keyboardType="numeric" maxLength={3} required />

            <Text style={styles.sectionTitle}>Address</Text>
            <Field label="Full address" value={address} onChangeText={setAddress} placeholder="House no., street, area" required />
            <Field label="City" value={city} onChangeText={setCity} placeholder="e.g. Delhi" required />
            <Field label="Pincode" value={pincode} onChangeText={setPincode} placeholder="e.g. 110001" keyboardType="numeric" maxLength={6} required />

            <Text style={styles.sectionTitle}>Health Notes (optional)</Text>
            <Field label="Mobility notes" value={mobilityNotes} onChangeText={setMobilityNotes} placeholder="e.g. uses a walker" />
            <Field label="Medical notes" value={medicalNotes} onChangeText={setMedicalNotes} placeholder="e.g. diabetic" />

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

            <View style={styles.editActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditing(false)}
                disabled={updateMutation.isPending}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, updateMutation.isPending && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={updateMutation.isPending}
                activeOpacity={0.85}
              >
                {updateMutation.isPending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Save size={16} color="#fff" />
                      <Text style={styles.saveBtnText}>Save Changes</Text>
                    </View>
                  )
                }
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
  editBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: "#EEF4FF", justifyContent: "center", alignItems: "center" },

  avatarBlock: { alignItems: "center", marginBottom: 24 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#EEF4FF", justifyContent: "center", alignItems: "center", marginBottom: 10 },
  avatarText: { fontSize: 28, fontWeight: "800", color: "#006FFD" },
  avatarName: { fontSize: 20, fontWeight: "700", color: "#1A1A2E" },
  avatarMeta: { fontSize: 14, color: "#6B7280", marginTop: 3 },

  section: { backgroundColor: "#fff", borderRadius: 16, padding: 18, marginBottom: 14, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  sectionTitle: { fontSize: 12, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14, marginTop: 8 },

  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  infoIcon: { marginTop: 1 },
  infoLabel: { fontSize: 11, color: "#9CA3AF", marginBottom: 1 },
  infoValue: { fontSize: 14, fontWeight: "600", color: "#1A1A2E" },

  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#1A1A2E" },
  hint: { fontSize: 12, color: "#9CA3AF", marginTop: 4 },

  editActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#fff" },
  cancelBtnText: { fontSize: 15, fontWeight: "600", color: "#374151" },
  saveBtn: { flex: 2, backgroundColor: "#006FFD", borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
