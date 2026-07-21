import { View, Text, TextInput, StyleSheet } from "react-native";

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "phone-pad" | "email-address";
  maxLength?: number;
  required?: boolean;
  hint?: string;
  multiline?: boolean;
  editable?: boolean;
  secureTextEntry?: boolean;
}

export function Field({
  label, value, onChangeText, placeholder, keyboardType,
  maxLength, required, hint, multiline, editable = true, secureTextEntry,
}: FieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <TextInput
        style={[
          styles.input,
          multiline && styles.multiline,
          !editable && styles.disabled,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType ?? "default"}
        maxLength={maxLength}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        editable={editable}
        secureTextEntry={secureTextEntry}
        textAlignVertical={multiline ? "top" : "center"}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 6 },
  required: { color: "#EF4444" },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1A1A2E",
  },
  multiline: { minHeight: 90 },
  disabled: { backgroundColor: "#F3F4F6", color: "#9CA3AF" },
  hint: { fontSize: 12, color: "#9CA3AF", marginTop: 4 },
});
