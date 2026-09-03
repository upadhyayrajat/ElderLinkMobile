import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { Calendar } from "lucide-react-native";
import { BottomSheet } from "@/src/components/BottomSheet";

// Local-time YYYY-MM-DD, matching the string format the rest of the app's
// booking/recurring-booking logic already stores and compares dates as.
function toDateString(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function parseDateString(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function DateField({
  label, value, onChange, placeholder = "Select date", hint, required, minimumDate, maximumDate,
}: {
  label: string;
  value: string; // "YYYY-MM-DD" or ""
  onChange: (date: string) => void;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [iosTempDate, setIosTempDate] = useState<Date>(() => (value ? parseDateString(value) : new Date()));

  function openPicker() {
    setIosTempDate(value ? parseDateString(value) : new Date());
    setPickerOpen(true);
  }

  function handleAndroidChange(event: DateTimePickerEvent, selected?: Date) {
    setPickerOpen(false);
    if (event.type === "set" && selected) onChange(toDateString(selected));
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <TouchableOpacity style={styles.input} onPress={openPicker} activeOpacity={0.7}>
        <Text style={value ? styles.valueText : styles.placeholderText}>
          {value ? format(parseDateString(value), "d MMM yyyy") : placeholder}
        </Text>
        <Calendar size={18} color="#9CA3AF" />
      </TouchableOpacity>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

      {pickerOpen && Platform.OS === "android" && (
        <DateTimePicker
          value={value ? parseDateString(value) : new Date()}
          mode="date"
          display="default"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={handleAndroidChange}
        />
      )}

      {Platform.OS === "ios" && (
        <BottomSheet visible={pickerOpen} onClose={() => setPickerOpen(false)}>
          <Text style={styles.sheetTitle}>{label}</Text>
          <DateTimePicker
            value={iosTempDate}
            mode="date"
            display="inline"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={(_, selected) => selected && setIosTempDate(selected)}
          />
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => { onChange(toDateString(iosTempDate)); setPickerOpen(false); }}
            activeOpacity={0.85}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </BottomSheet>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 6 },
  required: { color: "#EF4444" },
  input: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  valueText: { fontSize: 15, color: "#1A1A2E" },
  placeholderText: { fontSize: 15, color: "#9CA3AF" },
  hint: { fontSize: 12, color: "#9CA3AF", marginTop: 4 },
  sheetTitle: { fontSize: 17, fontWeight: "700", color: "#1A1A2E", marginBottom: 12 },
  doneBtn: { backgroundColor: "#006FFD", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 16 },
  doneBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
