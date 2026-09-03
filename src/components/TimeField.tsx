import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { Clock } from "lucide-react-native";
import { BottomSheet } from "@/src/components/BottomSheet";

// 24-hour HH:MM, matching the string format the rest of the app's
// booking/recurring-booking logic already stores and combines with a date.
function toTimeString(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function parseTimeString(s: string): Date {
  const [h, m] = s.split(":").map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
}

export function TimeField({
  label, value, onChange, placeholder = "Select time", hint, required,
}: {
  label: string;
  value: string; // "HH:MM" (24-hour) or ""
  onChange: (time: string) => void;
  placeholder?: string;
  hint?: string;
  required?: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [iosTempTime, setIosTempTime] = useState<Date>(() => (value ? parseTimeString(value) : new Date()));

  function openPicker() {
    setIosTempTime(value ? parseTimeString(value) : new Date());
    setPickerOpen(true);
  }

  function handleAndroidChange(event: DateTimePickerEvent, selected?: Date) {
    setPickerOpen(false);
    if (event.type === "set" && selected) onChange(toTimeString(selected));
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <TouchableOpacity style={styles.input} onPress={openPicker} activeOpacity={0.7}>
        {/* Always shown as 12-hour with AM/PM here, regardless of the
            device's own time-format setting, so the value in the field is
            never ambiguous — the native picker below still follows the
            device's 12/24-hour preference while picking. */}
        <Text style={value ? styles.valueText : styles.placeholderText}>
          {value ? format(parseTimeString(value), "h:mm a") : placeholder}
        </Text>
        <Clock size={18} color="#9CA3AF" />
      </TouchableOpacity>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

      {pickerOpen && Platform.OS === "android" && (
        <DateTimePicker
          value={value ? parseTimeString(value) : new Date()}
          mode="time"
          display="default"
          onChange={handleAndroidChange}
        />
      )}

      {Platform.OS === "ios" && (
        <BottomSheet visible={pickerOpen} onClose={() => setPickerOpen(false)}>
          <Text style={styles.sheetTitle}>{label}</Text>
          <DateTimePicker
            value={iosTempTime}
            mode="time"
            display="spinner"
            onChange={(_, selected) => selected && setIosTempTime(selected)}
          />
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => { onChange(toTimeString(iosTempTime)); setPickerOpen(false); }}
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
